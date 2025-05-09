import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 检查food-images存储桶是否存在
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      return NextResponse.json({
        success: false,
        message: `无法获取存储桶列表: ${bucketError.message}`,
        error: bucketError
      }, { status: 500 });
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'food-images');
    
    // 如果存储桶不存在，创建一个
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('food-images', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        return NextResponse.json({
          success: false,
          message: `创建存储桶失败: ${createError.message}`,
          error: createError
        }, { status: 500 });
      }
    }
    
    // 为storage.objects表添加RLS策略
    const storagePolicies = `
    -- 删除可能存在的旧策略以避免冲突
    DROP POLICY IF EXISTS "允许匿名读取存储对象" ON storage.objects;
    DROP POLICY IF EXISTS "允许匿名上传存储对象" ON storage.objects;
    DROP POLICY IF EXISTS "允许匿名更新存储对象" ON storage.objects;
    DROP POLICY IF EXISTS "允许匿名删除存储对象" ON storage.objects;
    
    -- 为storage.objects表创建策略
    CREATE POLICY "允许匿名读取存储对象" ON storage.objects
      FOR SELECT USING (true);
      
    CREATE POLICY "允许匿名上传存储对象" ON storage.objects
      FOR INSERT WITH CHECK (true);
      
    CREATE POLICY "允许匿名更新存储对象" ON storage.objects
      FOR UPDATE USING (true) WITH CHECK (true);
      
    CREATE POLICY "允许匿名删除存储对象" ON storage.objects
      FOR DELETE USING (true);
      
    -- 授予anon角色权限
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon;
    GRANT USAGE ON SCHEMA storage TO anon;
    `;
    
    // 执行SQL脚本
    const { error: policyError } = await supabase.rpc('execute_sql', {
      sql: storagePolicies
    });
    
    if (policyError) {
      return NextResponse.json({
        success: false,
        message: `设置存储桶策略失败: ${policyError.message}`,
        error: policyError
      }, { status: 500 });
    }
    
    // 测试存储桶权限
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testPath = `test/storage-test-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('food-images')
      .upload(testPath, testBlob, { upsert: true });
    
    if (uploadError) {
      return NextResponse.json({
        success: false,
        message: `测试上传失败: ${uploadError.message}`,
        error: uploadError
      }, { status: 500 });
    }
    
    // 测试成功后删除测试文件
    await supabase.storage
      .from('food-images')
      .remove([testPath]);
    
    return NextResponse.json({
      success: true,
      message: '存储桶RLS策略已成功设置',
      bucketExists: bucketExists ? '存储桶已存在' : '存储桶已创建',
      policiesApplied: true
    });
    
  } catch (error: any) {
    console.error('修复存储RLS策略出错:', error);
    
    return NextResponse.json({
      success: false,
      message: `处理请求时出错: ${error.message || '未知错误'}`,
      error: error
    }, { status: 500 });
  }
} 