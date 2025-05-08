"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const testConnection = async () => {
      try {
        // 测试Supabase连接
        const response = await fetch('/api/test-supabase')
        const data = await response.json()
        setConnectionStatus(data)
      } catch (err: any) {
        console.error('测试连接时出错:', err)
        setError(err.message || '未知错误')
      } finally {
        setLoading(false)
      }
    }
    
    testConnection()
  }, [])
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">系统连接测试</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">环境变量检查</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '已设置 ✅' : '未设置 ❌'}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已设置 ✅' : '未设置 ❌'}</p>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Supabase 连接测试</h2>
        {loading ? (
          <p>测试连接中...</p>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-lg text-red-800">
            <p>测试失败: {error}</p>
          </div>
        ) : connectionStatus ? (
          <div className="bg-gray-100 p-4 rounded-lg">
            <p>连接状态: {connectionStatus.success ? '成功 ✅' : '失败 ❌'}</p>
            <p>连接信息: {connectionStatus.connection}</p>
            <h3 className="font-semibold mt-4">表状态:</h3>
            <ul className="list-disc list-inside pl-4">
              <li>Categories: {connectionStatus.tableStatus?.categories}</li>
              <li>Dishes: {connectionStatus.tableStatus?.dishes}</li>
              <li>Orders: {connectionStatus.tableStatus?.orders}</li>
            </ul>
          </div>
        ) : (
          <p>未获取到连接信息</p>
        )}
      </div>
      
      <div className="flex gap-4">
        <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg">
          返回首页
        </Link>
        <Link href="/admin" className="px-4 py-2 bg-green-500 text-white rounded-lg">
          管理后台
        </Link>
        <Link href="/api/init-db" className="px-4 py-2 bg-yellow-500 text-white rounded-lg">
          初始化数据
        </Link>
      </div>
    </div>
  )
} 