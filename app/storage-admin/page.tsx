'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, RefreshCw, Database, Image } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { checkStorageAvailability } from '@/lib/imageUpload';
import Link from 'next/link';

export default function StorageAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [storageStatus, setStorageStatus] = useState<{
    checked: boolean;
    ready: boolean;
    message?: string;
  }>({
    checked: false,
    ready: false
  });
  const [fixResult, setFixResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 检查存储状态
  const checkStorage = async () => {
    setIsLoading(true);
    try {
      const result = await checkStorageAvailability();
      setStorageStatus(result);
    } catch (error: any) {
      setStorageStatus({
        checked: true,
        ready: false,
        message: `检查失败: ${error.message || '未知错误'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 修复RLS策略
  const fixRlsPolicy = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const response = await fetch('/api/fix-storage-rls');
      const data = await response.json();

      setFixResult({
        success: data.success,
        message: data.message
      });

      // 如果修复成功，重新检查存储状态
      if (data.success) {
        setTimeout(checkStorage, 1000);
      }
    } catch (error: any) {
      setFixResult({
        success: false,
        message: `请求失败: ${error.message || '未知错误'}`
      });
    } finally {
      setIsFixing(false);
    }
  };

  // 组件加载时检查存储状态
  useEffect(() => {
    checkStorage();
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="text-emerald-700 hover:text-emerald-600 mr-4">
            ← 返回主页
          </Link>
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center">
            <Database className="h-6 w-6 mr-2" />
            存储管理
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 存储状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2" />
                存储桶状态
              </CardTitle>
              <CardDescription>检查您的Supabase存储桶状态和权限</CardDescription>
            </CardHeader>
            <CardContent>
              {storageStatus.checked ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`mr-2 p-1 rounded-full ${storageStatus.ready ? 'bg-green-100' : 'bg-red-100'}`}>
                      {storageStatus.ready ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <span className="font-medium">
                      存储状态: {storageStatus.ready ? '可用' : '不可用'}
                    </span>
                  </div>
                  
                  {!storageStatus.ready && storageStatus.message && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>错误</AlertTitle>
                      <AlertDescription>
                        {storageStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-emerald-700">正在检查存储状态...</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={checkStorage}
                disabled={isLoading}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    检查中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新检查
                  </>
                )}
              </Button>
              
              <Button
                onClick={fixRlsPolicy}
                disabled={isFixing || isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    修复中...
                  </>
                ) : (
                  '修复RLS策略'
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* 修复结果卡片 */}
          {fixResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {fixResult.success ? (
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                  )}
                  修复结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant={fixResult.success ? 'default' : 'destructive'}>
                  <AlertTitle>{fixResult.success ? '成功' : '失败'}</AlertTitle>
                  <AlertDescription>
                    {fixResult.message}
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setFixResult(null)}
                  variant="outline"
                  className="w-full"
                >
                  关闭
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>存储桶RLS策略说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Supabase存储的行级安全策略(RLS)控制着谁可以上传、查看和管理存储桶中的文件。</p>
              
              <div className="space-y-2">
                <h3 className="font-medium">常见问题:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>"无法创建存储桶: new row violates row-level security policy" - 这表示当前用户没有向storage.objects表插入数据的权限。</li>
                  <li>"无法上传到存储桶" - 可能是RLS策略或权限问题。</li>
                  <li>"无法访问文件" - 可能是RLS的SELECT策略有问题。</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">修复方法:</h3>
                <p>点击"修复RLS策略"按钮会执行以下操作:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>检查并创建(如果不存在)"food-images"存储桶</li>
                  <li>为storage.objects表添加允许匿名访问的RLS策略</li>
                  <li>授予anon角色对storage.objects表的权限</li>
                  <li>进行测试上传以验证配置是否正确</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 