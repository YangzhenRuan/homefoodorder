"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DebugPage() {
  // 分类测试状态
  const [categoryTest, setCategoryTest] = useState({
    id: `test-${Date.now()}`,
    name: '测试分类',
    color: 'bg-emerald-500',
    description: '测试用分类'
  })
  
  // 菜品测试状态
  const [dishTest, setDishTest] = useState({
    name: '测试菜品',
    description: '测试用菜品',
    price: 9.99,
    image: '/placeholder.svg',
    category_id: '',
  })
  
  // 响应结果
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [insertCount, setInsertCount] = useState(0)
  
  // 测试连接
  const testConnection = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/test-supabase')
      const data = await res.json()
      setResponse(data)
    } catch (error: any) {
      setResponse({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }
  
  // 测试插入分类
  const testInsertCategory = async () => {
    try {
      setLoading(true)
      // 更新ID以确保唯一性
      const uniqueId = `test-${Date.now()}-${insertCount}`
      setCategoryTest(prev => ({ ...prev, id: uniqueId }))
      
      const testData = { ...categoryTest, id: uniqueId }
      
      const res = await fetch('/api/debug-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'categories',
          data: testData
        })
      })
      
      const data = await res.json()
      setResponse(data)
      setInsertCount(prev => prev + 1)
    } catch (error: any) {
      setResponse({ success: false, message: error.message })
    } finally {
      setLoading(false)
    }
  }
  
  // 测试插入菜品
  const testInsertDish = async () => {
    try {
      setLoading(true)
      
      // 如果未指定分类ID，使用最近创建的测试分类ID
      const dishData = { 
        ...dishTest,
        category_id: dishTest.category_id || categoryTest.id
      }
      
      const res = await fetch('/api/debug-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'dishes',
          data: dishData
        })
      })
      
      const data = await res.json()
      setResponse(data)
      setInsertCount(prev => prev + 1)
    } catch (error: any) {
      setResponse({ success: false, message: error.message })
    } finally {
      setLoading(false)
    }
  }
  
  // 处理分类表单输入变化
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCategoryTest(prev => ({ ...prev, [name]: value }))
  }
  
  // 处理菜品表单输入变化
  const handleDishChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setDishTest(prev => ({ 
      ...prev, 
      [name]: name === 'price' ? parseFloat(value) : value 
    }))
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Supabase 数据库调试工具</h1>
      
      <Tabs defaultValue="connection">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="connection">测试连接</TabsTrigger>
          <TabsTrigger value="category">测试分类插入</TabsTrigger>
          <TabsTrigger value="dish">测试菜品插入</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>数据库连接测试</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">点击下方按钮测试与Supabase的连接以及表结构</p>
            </CardContent>
            <CardFooter>
              <Button onClick={testConnection} disabled={loading}>
                {loading ? '测试中...' : '测试连接'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="category">
          <Card>
            <CardHeader>
              <CardTitle>测试分类插入</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="id">ID</Label>
                  <Input 
                    id="id" 
                    name="id" 
                    value={categoryTest.id} 
                    onChange={handleCategoryChange}
                  />
                </div>
                <div>
                  <Label htmlFor="name">分类名称</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={categoryTest.name} 
                    onChange={handleCategoryChange}
                  />
                </div>
                <div>
                  <Label htmlFor="color">颜色</Label>
                  <Input 
                    id="color" 
                    name="color" 
                    value={categoryTest.color} 
                    onChange={handleCategoryChange}
                  />
                </div>
                <div>
                  <Label htmlFor="description">描述</Label>
                  <Input 
                    id="description" 
                    name="description" 
                    value={categoryTest.description} 
                    onChange={handleCategoryChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={testInsertCategory} disabled={loading}>
                {loading ? '插入中...' : '测试插入分类'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="dish">
          <Card>
            <CardHeader>
              <CardTitle>测试菜品插入</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dish-name">菜品名称</Label>
                  <Input 
                    id="dish-name" 
                    name="name" 
                    value={dishTest.name} 
                    onChange={handleDishChange}
                  />
                </div>
                <div>
                  <Label htmlFor="dish-description">描述</Label>
                  <Textarea 
                    id="dish-description" 
                    name="description" 
                    value={dishTest.description} 
                    onChange={handleDishChange}
                  />
                </div>
                <div>
                  <Label htmlFor="dish-price">价格</Label>
                  <Input 
                    id="dish-price" 
                    name="price" 
                    type="number"
                    step="0.01"
                    value={dishTest.price} 
                    onChange={handleDishChange}
                  />
                </div>
                <div>
                  <Label htmlFor="dish-image">图片URL</Label>
                  <Input 
                    id="dish-image" 
                    name="image" 
                    value={dishTest.image} 
                    onChange={handleDishChange}
                  />
                </div>
                <div>
                  <Label htmlFor="dish-category">分类ID</Label>
                  <Input 
                    id="dish-category" 
                    name="category_id" 
                    value={dishTest.category_id} 
                    onChange={handleDishChange}
                    placeholder={categoryTest.id}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    留空将使用测试分类的ID: {categoryTest.id}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={testInsertDish} disabled={loading}>
                {loading ? '插入中...' : '测试插入菜品'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {response && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>响应结果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
              {JSON.stringify(response, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 