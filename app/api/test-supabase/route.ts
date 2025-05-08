import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // 测试环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    const urlStatus = supabaseUrl ? '已设置' : '未设置'
    const keyStatus = supabaseKey ? '已设置' : '未设置'
    
    // 测试连接
    let connectionTest, tablesTest, categoriesTest, dishesTest = null
    let categoriesError, dishesError, ordersError = null
    
    try {
      // 测试基本连接
      const { data, error } = await supabase.from('categories').select('count()', { count: 'exact' })
      connectionTest = {
        success: !error,
        message: error ? error.message : '连接成功',
        data
      }
    } catch (error: any) {
      connectionTest = {
        success: false,
        message: error.message || '未知错误',
        error
      }
    }
    
    // 获取数据库表列表
    try {
      // 这个方法可能需要额外权限
      const { data, error } = await supabase.rpc('get_tables')
      tablesTest = {
        success: !error,
        tables: data || [],
        error: error ? error.message : null
      }
    } catch (error: any) {
      tablesTest = {
        success: false,
        message: error.message || '无法获取表列表',
        error
      }
    }
    
    // 测试categories表
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(1)
      
      categoriesTest = {
        success: !error,
        exists: true,
        sample: data
      }
    } catch (error: any) {
      categoriesError = error.message || '未知错误'
      categoriesTest = {
        success: false,
        exists: false,
        error: categoriesError
      }
    }
    
    // 测试dishes表
    try {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .limit(1)
      
      dishesTest = {
        success: !error,
        exists: true,
        sample: data
      }
    } catch (error: any) {
      dishesError = error.message || '未知错误'
      dishesTest = {
        success: false,
        exists: false,
        error: dishesError
      }
    }
    
    // 尝试插入测试数据
    let insertTest = null
    try {
      // 尝试插入测试分类
      const testCategoryId = `test-${Date.now()}`
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          id: testCategoryId,
          name: '测试分类',
          color: 'bg-emerald-500',
          description: '测试用'
        }])
        .select()
      
      if (error) throw error
      
      // 如果插入成功，则删除测试数据
      await supabase
        .from('categories')
        .delete()
        .eq('id', testCategoryId)
      
      insertTest = {
        success: true,
        message: '插入测试成功'
      }
    } catch (error: any) {
      insertTest = {
        success: false,
        message: error.message || '插入测试失败',
        error
      }
    }
    
    // 返回所有测试结果
    return NextResponse.json({
      env: {
        supabaseUrl: urlStatus,
        supabaseKey: keyStatus
      },
      connection: connectionTest,
      tables: tablesTest,
      categories: categoriesTest,
      dishes: dishesTest,
      insertTest
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: true,
      message: error.message || '未知错误',
      stack: error.stack
    }, { status: 500 })
  }
} 