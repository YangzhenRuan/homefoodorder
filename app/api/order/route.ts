import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { ordersTable } from "@/lib/supabase"

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // 使用环境变量
    pass: process.env.EMAIL_PASS, // 使用环境变量
  },
})

// Order item interface
interface OrderItem {
  dishName: string
  quantity: number
  price: number
  note?: string
}

// Order interface
interface Order {
  items: OrderItem[]
  customerName: string
  customerEmail?: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json()

    // 验证请求体
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "订单中必须包含至少一个菜品。" }, { status: 400 })
    }

    // 创建新订单
    const order: Order = {
      items: body.items,
      customerName: body.customerName || "顾客",
      customerEmail: body.customerEmail,
      notes: body.notes
    }

    // 存储到Supabase
    try {
      const savedOrder = await ordersTable.create({
        items: order.items,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        notes: order.notes
      })
      
      console.log("订单已保存到数据库", savedOrder)
      
      // 准备邮件内容
      const emailContent = generateEmailContent(order)

      // 发送邮件通知
      await sendEmailNotification(order, emailContent)

      // 返回成功响应
      return NextResponse.json(
        {
          success: true,
          message: "订单已成功接收",
          orderId: savedOrder.id,
        },
        { status: 200 },
      )
    } catch (dbError) {
      console.error("保存订单到数据库失败:", dbError)
      return NextResponse.json({ error: "保存订单失败" }, { status: 500 })
    }
  } catch (error) {
    console.error("处理订单时出错:", error)
    return NextResponse.json({ error: "处理订单失败" }, { status: 500 })
  }
}

// 处理其他HTTP方法
export async function GET() {
  return NextResponse.json({ error: "不允许的方法" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "不允许的方法" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "不允许的方法" }, { status: 405 })
}

// 生成邮件内容的辅助函数
function generateEmailContent(order: Order): string {
  // 计算订单总价
  const totalPrice = order.items.reduce((total, item) => total + (item.price * item.quantity), 0)
  
  let content = `
    <h1>收到新订单</h1>
    <p><strong>顾客:</strong> ${order.customerName}</p>
    ${order.customerEmail ? `<p><strong>邮箱:</strong> ${order.customerEmail}</p>` : ""}
    ${order.notes ? `<p><strong>备注:</strong> ${order.notes}</p>` : ""}
    <p><strong>时间:</strong> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
    <h2>订单内容:</h2>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>菜品</th>
        <th>数量</th>
        <th>单价</th>
        <th>小计</th>
        <th>备注</th>
      </tr>
  `

  order.items.forEach((item) => {
    const itemTotal = item.price * item.quantity
    content += `
      <tr>
        <td>${item.dishName}</td>
        <td>${item.quantity}</td>
        <td>¥${item.price.toFixed(2)}</td>
        <td>¥${itemTotal.toFixed(2)}</td>
        <td>${item.note || ""}</td>
      </tr>
    `
  })

  content += `
      <tr>
        <td colspan="3"><strong>总计</strong></td>
        <td colspan="2"><strong>¥${totalPrice.toFixed(2)}</strong></td>
      </tr>
    </table>
    <p>谢谢您的订单！</p>
  `

  return content
}

// 发送邮件通知的辅助函数
async function sendEmailNotification(order: Order, emailContent: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER, // 如果设置了餐厅邮箱则使用，否则发给自己
      subject: `新订单 - 来自${order.customerName}`,
      html: emailContent,
    }

    // 发送邮件
    await transporter.sendMail(mailOptions)
    console.log("订单通知邮件发送成功")
  } catch (error) {
    console.error("发送邮件通知失败:", error)
    // 我们不在这里抛出异常，以避免API因邮件发送失败而失败
    // 在生产环境中，你可能希望实现重试机制或队列
  }
}
