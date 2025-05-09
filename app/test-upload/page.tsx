'use client';

import { useState } from 'react';
import Image from 'next/image';
import { processImage, uploadImageToStorage, checkStorageAvailability } from '@/lib/imageUpload';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function TestUploadPage() {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [storageStatus, setStorageStatus] = useState<{
    checked: boolean;
    ready: boolean;
    message?: string;
  }>({
    checked: false,
    ready: false
  });

  // 检查存储状态
  const checkStorage = async () => {
    try {
      setErrorMessage('');
      const result = await checkStorageAvailability();
      setStorageStatus(result);
      return result.ready;
    } catch (error: any) {
      setErrorMessage(`检查存储状态失败: ${error.message || '未知错误'}`);
      return false;
    }
  };

  // 测试Supabase连接
  const testConnection = async () => {
    try {
      setErrorMessage('');
      // 测试基本连接
      const { data: testData, error: testError } = await supabase.from('categories').select('count').limit(1);
      
      if (testError) {
        setErrorMessage(`Supabase连接测试失败: ${testError.message}`);
        return;
      }
      
      // 检查存储服务
      const isStorageReady = await checkStorage();
      
      if (isStorageReady) {
        setErrorMessage('连接测试成功! Supabase和存储服务都可用。');
      }
    } catch (error: any) {
      setErrorMessage(`测试连接失败: ${error.message || '未知错误'}`);
    }
  };

  // 处理图片选择
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage('');
      // 处理并压缩图片
      const processedImage = await processImage(file);
      setImagePreview(processedImage);
    } catch (error: any) {
      console.error('图片处理失败:', error);
      setErrorMessage(`图片处理失败: ${error.message || '未知错误'}`);
    }
  };

  // 上传图片
  const uploadImage = async () => {
    if (!imagePreview) {
      setErrorMessage('请先选择图片');
      return;
    }

    // 检查存储状态
    if (!storageStatus.checked) {
      const isStorageReady = await checkStorage();
      if (!isStorageReady) {
        return;
      }
    }

    try {
      setIsUploading(true);
      setErrorMessage('');
      
      // 上传图片
      const imageUrl = await uploadImageToStorage(imagePreview, 'test');
      
      if (imageUrl === '/placeholder.svg') {
        throw new Error('图片上传失败');
      }
      
      setUploadedUrl(imageUrl);
      setErrorMessage(`图片上传成功! URL: ${imageUrl}`);
    } catch (error: any) {
      console.error('上传图片失败:', error);
      setErrorMessage(`上传图片失败: ${error.message || '未知错误'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">图片上传测试</h1>
      
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={testConnection}
          className="w-full"
        >
          测试Supabase连接
        </Button>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">上传图片</h2>
          
          <div className="space-y-4">
            <div>
              <input
                type="file"
                id="test-image"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <label htmlFor="test-image">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    {imagePreview ? "更换图片" : "选择图片"}
                  </span>
                </Button>
              </label>
            </div>
            
            {imagePreview && (
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                <Image 
                  src={imagePreview} 
                  alt="预览" 
                  fill 
                  className="object-contain" 
                />
              </div>
            )}
            
            <Button 
              onClick={uploadImage} 
              disabled={!imagePreview || isUploading}
              className="w-full"
            >
              {isUploading ? "上传中..." : "上传图片"}
            </Button>
          </div>
        </div>
        
        {uploadedUrl && uploadedUrl !== '/placeholder.svg' && (
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">上传结果</h2>
            <div className="relative aspect-video rounded-lg overflow-hidden border mb-2">
              <Image 
                src={uploadedUrl} 
                alt="已上传" 
                fill 
                className="object-contain" 
              />
            </div>
            <div className="text-xs break-all bg-gray-100 p-2 rounded">
              {uploadedUrl}
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div className={`p-3 rounded-lg ${errorMessage.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {errorMessage}
          </div>
        )}
        
        {storageStatus.checked && (
          <div className={`p-3 rounded-lg ${storageStatus.ready ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <p className="font-medium">存储状态: {storageStatus.ready ? '可用 ✅' : '不可用 ❌'}</p>
            {storageStatus.message && <p className="text-sm mt-1">{storageStatus.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
} 