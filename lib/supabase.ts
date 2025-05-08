import { createClient } from '@supabase/supabase-js'

// 从环境变量中获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseKey)

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
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        id: category.id,
        name: category.name,
        color: category.color,
        description: category.description || `${category.name}分类`
      }])
      .select()
    
    if (error) throw error
    return data?.[0]
  },

  // 删除分类
  delete: async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
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
      
      if (error) throw error
      return data?.[0]
    })

    const results = await Promise.all(promises)
    return results
  },

  // 删除菜品
  delete: async (id: number) => {
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
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