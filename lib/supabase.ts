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
  }
} 