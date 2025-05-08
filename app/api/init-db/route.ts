import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const results: Record<string, any> = {}
    
    // 插入分类数据
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .insert([
        { id: 'main', name: '主菜', description: '主要菜品' },
        { id: 'appetizer', name: '开胃菜', description: '前菜与开胃菜' },
        { id: 'dessert', name: '甜点', description: '甜品和饮料' }
      ])
      .select()
    
    results.categories = {
      success: !categoriesError,
      error: categoriesError ? categoriesError.message : null,
      data: categoriesData
    }
    
    // 插入菜品数据
    const { data: dishesData, error: dishesError } = await supabase
      .from('dishes')
      .insert([
        { 
          name: '宫保鸡丁', 
          description: '经典川菜，鸡肉配以花生和辣椒', 
          price: 38.00, 
          image: '/kung-pao-chicken.jpg',
          category_id: 'main'
        },
        { 
          name: '水饺', 
          description: '传统北方饺子，内馅丰富', 
          price: 28.00, 
          image: '/dumplings.jpg',
          category_id: 'appetizer'
        },
        {
          name: '巧克力慕斯',
          description: '浓郁丝滑的巧克力甜点',
          price: 22.00,
          image: '/chocolate-mousse.jpg',
          category_id: 'dessert'
        }
      ])
      .select()
    
    results.dishes = {
      success: !dishesError,
      error: dishesError ? dishesError.message : null,
      data: dishesData
    }
    
    // 创建一个测试订单
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          items: [
            {
              dishName: '宫保鸡丁',
              quantity: 1,
              price: 38.00,
              note: '不要辣'
            },
            {
              dishName: '水饺',
              quantity: 2,
              price: 28.00,
              note: ''
            }
          ],
          customer_name: '测试用户',
          customer_email: 'test@example.com',
          notes: '这是一个测试订单'
        }
      ])
      .select()
    
    results.order = {
      success: !orderError,
      error: orderError ? orderError.message : null,
      data: orderData
    }

    return NextResponse.json({
      success: true,
      message: "数据初始化操作完成",
      results
    })
  } catch (error: any) {
    console.error("初始化数据时出错:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "未知错误"
    }, {
      status: 500
    })
  }
} 