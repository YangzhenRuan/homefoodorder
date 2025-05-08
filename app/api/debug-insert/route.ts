import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table, data } = body

    // 记录请求信息
    console.log(`尝试插入到表 ${table}:`, data)

    if (!table || !data) {
      return NextResponse.json({
        success: false,
        message: "缺少必要参数: table 和 data",
      }, { status: 400 })
    }

    // 尝试插入数据
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()

    if (error) {
      // 获取详细的错误信息
      const errorDetails = {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }

      console.error(`插入到 ${table} 表失败:`, errorDetails)

      return NextResponse.json({
        success: false,
        error: errorDetails,
        requestData: data
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功插入到 ${table} 表`
    })

  } catch (error: any) {
    console.error("API处理出错:", error)
    
    return NextResponse.json({
      success: false,
      message: error.message || "服务器内部错误",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
} 