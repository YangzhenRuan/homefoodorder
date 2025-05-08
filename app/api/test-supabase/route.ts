import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // 简单连接测试 - 尝试获取一个系统表
    const { data: connectionTest, error: connectionError } = await supabase
      .from('_prisma_migrations')
      .select('*')
      .limit(1)
    
    // 尝试获取orders表
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    // 尝试获取categories表  
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    // 尝试获取dishes表
    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select('*')
      .limit(1)
    
    return NextResponse.json({ 
      success: true, 
      connection: connectionError ? "有错误，但Supabase连接成功" : "连接成功",
      tableStatus: {
        orders: ordersError ? `未找到orders表: ${ordersError.message}` : "已找到orders表",
        categories: categoriesError ? `未找到categories表: ${categoriesError.message}` : "已找到categories表",
        dishes: dishesError ? `未找到dishes表: ${dishesError.message}` : "已找到dishes表"
      },
      message: "Supabase连接成功"
    })
  } catch (error: any) {
    console.error("测试Supabase时出错:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "未知错误"
    }, { 
      status: 500 
    })
  }
} 