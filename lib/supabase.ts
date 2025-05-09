import { createClient } from '@supabase/supabase-js'

// 从环境变量中获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 检查环境变量是否存在
if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase环境变量! 请确保设置了NEXT_PUBLIC_SUPABASE_URL和NEXT_PUBLIC_SUPABASE_ANON_KEY。')
}

// 创建Supabase客户端
export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      persistSession: false // 避免在SSR环境中的问题
    },
  }
)

// 检查Supabase连接和存储桶是否有效的辅助函数
export const checkSupabaseConnection = async () => {
  try {
    // 检查表连接
    const { data, error } = await supabase.from('categories').select('count').limit(1)
    if (error) throw error
    
    // 尝试检查存储桶
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.warn('Supabase存储桶检查失败:', bucketError.message);
        return { 
          success: true, 
          storageReady: false,
          message: '数据库连接成功，但存储服务可能不可用'
        };
      }
      
      const bucketExists = buckets?.some(bucket => bucket.name === 'food-images');
      
      if (!bucketExists) {
        console.log('food-images存储桶不存在，将在需要时自动创建');
      }
      
      return { 
        success: true, 
        storageReady: true,
        bucketExists 
      };
    } catch (storageError: any) {
      console.warn('检查存储服务时出错:', storageError.message);
      return { 
        success: true, 
        storageReady: false,
        message: '数据库连接成功，但存储服务检查失败' 
      };
    }
  } catch (error: any) {
    console.error('Supabase连接测试失败:', error.message)
    return { 
      success: false, 
      error: error.message,
      details: !supabaseUrl || !supabaseKey ? '未找到Supabase环境变量' : '环境变量已设置但连接失败'
    }
  }
}

// 菜品分类表操作
export const categoriesTable = {
  // 获取所有分类
  getAll: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },
  
  // 获取单个分类
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // 创建新分类
  create: async (category: {
    id: string,
    name: string,
    color: string,
    description?: string
  }) => {
    // 检查是否已存在该ID的分类
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category.id)
      .single();
      
    if (existingCategory) {
      throw new Error(`分类ID '${category.id}' 已存在`);
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        id: category.id,
        name: category.name,
        color: category.color,
        description: category.description || `${category.name}分类`
      }])
      .select()
    
    if (error) {
      console.error('创建分类错误:', error);
      throw error;
    }
    return data?.[0]
  },

  // 删除分类
  delete: async (id: string) => {
    // 先检查是否有菜品关联此分类
    const { data: relatedDishes, error: checkError } = await supabase
      .from('dishes')
      .select('id')
      .eq('category_id', id);
    
    if (checkError) {
      console.error('检查关联菜品错误:', checkError);
      throw checkError;
    }
    
    // 如果有关联菜品，先删除这些菜品
    if (relatedDishes && relatedDishes.length > 0) {
      const { error: deleteRelatedError } = await supabase
        .from('dishes')
        .delete()
        .eq('category_id', id);
      
      if (deleteRelatedError) {
        console.error('删除关联菜品错误:', deleteRelatedError);
        throw deleteRelatedError;
      }
    }
    
    // 删除分类
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('删除分类错误:', error);
      throw error;
    }
    
    return true;
  }
}

// 菜品表操作
export const dishesTable = {
  // 获取所有菜品
  getAll: async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },
  
  // 按分类获取菜品
  getByCategory: async (categoryId: string) => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('category_id', categoryId)
      .order('name')
    
    if (error) throw error
    return data
  },
  
  // 获取单个菜品
  getById: async (id: number) => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // 创建新菜品
  create: async (dish: {
    name: string,
    description: string,
    price: number,
    image: string,
    category_ids: string[]
  }) => {
    if (!dish.category_ids || dish.category_ids.length === 0) {
      throw new Error('至少需要选择一个分类');
    }
    
    // 检查所有分类是否存在
    for (const categoryId of dish.category_ids) {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();
        
      if (error || !data) {
        throw new Error(`分类 '${categoryId}' 不存在，请先创建此分类`);
      }
    }
    
    // 为每个分类创建一条记录
    const promises = dish.category_ids.map(async (categoryId) => {
      const { data, error } = await supabase
        .from('dishes')
        .insert([{
          name: dish.name,
          description: dish.description,
          price: dish.price,
          image: dish.image,
          category_id: categoryId
        }])
        .select()
      
      if (error) {
        console.error('创建菜品错误:', error);
        throw error;
      }
      return data?.[0]
    })

    try {
      const results = await Promise.all(promises)
      return results
    } catch (error) {
      console.error('批量创建菜品错误:', error);
      throw error;
    }
  },

  // 删除菜品
  delete: async (id: number) => {
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('删除菜品错误:', error);
      throw error;
    }
    
    return true
  }
}

// 订单表操作
export const ordersTable = {
  // 创建订单
  create: async (order: {
    items: any[],
    customer_name: string,
    customer_email?: string,
    notes?: string
  }) => {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        items: order.items,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        notes: order.notes,
        created_at: new Date().toISOString()
      }])
      .select()
    
    if (error) throw error
    return data?.[0]
  },
  
  // 获取所有订单
  getAll: async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 更新订单图片
  updateImages: async (id: string, images: string[]) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ images })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data?.[0]
  }
} 