"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, RefreshCw, Settings, Database, ShoppingBasket, Image } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface OrderItem {
  dishName: string
  quantity: number
  price: number
  note?: string
}

interface Order {
  id: string
  items: OrderItem[]
  customer_name: string
  customer_email?: string
  notes?: string
  created_at: string
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载订单数据
  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/orders')
      
      if (!response.ok) {
        throw new Error('加载订单失败')
      }
      
      const data = await response.json()
      setOrders(data.orders)
    } catch (err) {
      console.error('获取订单时出错:', err)
      setError('无法加载订单，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadOrders()
  }, [])

  // 计算订单总价
  const calculateOrderTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
    } catch (err) {
      return dateStr
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-emerald-600">Sunny的点菜平台 - 管理后台</h1>
        </div>
        <Button onClick={loadOrders} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* 添加管理菜单 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin">
          <Button variant="outline" className="flex items-center gap-2">
            <ShoppingBasket className="h-4 w-4" />
            订单管理
          </Button>
        </Link>
        <Link href="/storage-admin">
          <Button variant="outline" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            存储管理
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
          <CardDescription>查看和管理所有订单</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">加载中...</div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">{error}</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center">暂无订单</div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">全部订单</TabsTrigger>
                <TabsTrigger value="today">今日订单</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <div className="space-y-6">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} formatDate={formatDate} calculateTotal={calculateOrderTotal} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="today">
                <div className="space-y-6">
                  {orders
                    .filter((order) => {
                      const orderDate = new Date(order.created_at)
                      const today = new Date()
                      return (
                        orderDate.getDate() === today.getDate() &&
                        orderDate.getMonth() === today.getMonth() &&
                        orderDate.getFullYear() === today.getFullYear()
                      )
                    })
                    .map((order) => (
                      <OrderCard key={order.id} order={order} formatDate={formatDate} calculateTotal={calculateOrderTotal} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 订单卡片组件
function OrderCard({
  order,
  formatDate,
  calculateTotal,
}: {
  order: Order
  formatDate: (date: string) => string
  calculateTotal: (items: OrderItem[]) => number
}) {
  const total = calculateTotal(order.items)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">订单 #{order.id}</CardTitle>
            <CardDescription>{formatDate(order.created_at)}</CardDescription>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">¥{total.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{order.items.length} 个菜品</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <div>顾客: <span className="font-medium">{order.customer_name}</span></div>
            {order.customer_email && <div>邮箱: {order.customer_email}</div>}
          </div>

          {order.notes && (
            <div className="text-sm">
              <span className="font-medium">备注:</span> {order.notes}
            </div>
          )}

          <Separator className="my-2" />

          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium">菜品</th>
                <th className="text-center font-medium">数量</th>
                <th className="text-right font-medium">价格</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="py-2">
                    <div>{item.dishName}</div>
                    {item.note && <div className="text-xs text-muted-foreground">{item.note}</div>}
                  </td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">¥{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <td colSpan={2} className="text-right pt-2">总计</td>
                <td className="text-right pt-2">¥{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
} 