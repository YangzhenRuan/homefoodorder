import { NextResponse } from "next/server"
import { ordersTable } from "@/lib/supabase"

export async function GET() {
  try {
    // 从Supabase获取所有订单
    const orders = await ordersTable.getAll()
    
    // 返回成功响应
    return NextResponse.json({ 
      success: true, 
      orders 
    })
  } catch (error) {
    console.error("获取订单时出错:", error)
    return NextResponse.json({ 
      error: "获取订单失败" 
    }, { 
      status: 500 
    })
  }
}

// 处理其他HTTP方法
export async function POST() {
  return NextResponse.json({ error: "不允许的方法" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "不允许的方法" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "不允许的方法" }, { status: 405 })
} 