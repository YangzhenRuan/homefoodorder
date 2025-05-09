import { supabase } from "./supabase";

// 检查是否在客户端环境
const isClient = typeof window !== 'undefined';

// 图片处理函数，压缩图片尺寸
export const processImage = (file: File, maxWidth = 800): Promise<string> => {
  // 如果不在客户端环境，返回一个错误
  if (!isClient) {
    return Promise.reject(new Error('图片处理只能在客户端进行'));
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        // 限制图片最大尺寸
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.floor(height * (maxWidth / width));
          width = maxWidth;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 使用较低质量导出以减小文件大小
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
};

// 上传图片到Supabase存储并返回URL
export const uploadImageToStorage = async (imageDataUrl: string, prefix = 'dishes'): Promise<string> => {
  if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
    console.error('无效的图片数据');
    return '/placeholder.svg';
  }
  
  try {
    // 检查存储桶是否存在
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'food-images');
    
    if (bucketError) {
      console.error('获取存储桶列表错误:', bucketError);
      throw bucketError;
    }
    
    // 如果存储桶不存在，则创建
    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket('food-images', {
        public: true, // 设置为公开访问
        fileSizeLimit: 5242880, // 5MB限制
      });
      
      if (createBucketError) {
        console.error('创建存储桶错误:', createBucketError);
        throw createBucketError;
      }
      
      console.log('成功创建food-images存储桶');
    }
    
    // 生成文件名 - 添加随机字符串避免并发冲突
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${Date.now()}_${randomStr}.jpg`;
    const filePath = `${prefix}/${fileName}`;
    
    // 将base64格式的图片转换为Blob
    // 正确处理base64数据
    let blob;
    
    if (isClient) {
      // 浏览器环境
      try {
        // 获取MIME类型和base64内容
        const parts = imageDataUrl.split(';base64,');
        if (parts.length !== 2) {
          throw new Error('无效的base64格式');
        }
        
        const base64Data = parts[1];
        const contentType = parts[0].replace('data:', '');
        
        // 将base64转换为Uint8Array
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        blob = new Blob(byteArrays, { type: contentType });
      } catch (blobError) {
        console.error('转换base64为Blob出错:', blobError);
        return '/placeholder.svg';
      }
    } else {
      // 服务器环境
      console.error('不支持在服务器端上传图片');
      return '/placeholder.svg';
    }
    
    // 上传图片到Supabase存储
    console.log('正在上传图片到Supabase存储...');
    const { data, error } = await supabase.storage
      .from('food-images')
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: true // 允许覆盖
      });
    
    if (error) {
      console.error('上传图片错误:', error);
      console.error('错误详情:', {
        message: error.message,
        name: error.name
      });
      return '/placeholder.svg';
    }
    
    // 获取图片的公共URL
    const { data: publicUrl } = supabase.storage
      .from('food-images')
      .getPublicUrl(filePath);
    
    console.log('图片上传成功:', publicUrl.publicUrl);
    return publicUrl.publicUrl;
  } catch (error: any) {
    console.error('处理图片错误:', error);
    console.error('错误详情:', error.message || '未知错误');
    return '/placeholder.svg';
  }
};

// 添加重试机制的上传函数
export const uploadWithRetry = async (imageDataUrl: string, prefix = 'dishes', retries = 2): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadImageToStorage(imageDataUrl, prefix);
    } catch (error) {
      if (attempt === retries) {
        console.error(`上传失败，已重试${retries}次:`, error);
        throw error;
      }
      // 等待时间随着重试次数增加
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      console.log(`重试上传，第${attempt + 1}次...`);
    }
  }
  return '/placeholder.svg';
};

// 验证Supabase存储是否可用
export const checkStorageAvailability = async () => {
  try {
    // 检查storage API是否可用
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Supabase存储验证失败:', bucketError);
      return {
        checked: true,
        ready: false,
        message: `存储服务不可用: ${bucketError.message}`
      };
    }
    
    // 检查food-images存储桶是否存在
    const bucketExists = buckets?.some(bucket => bucket.name === 'food-images');
    
    if (!bucketExists) {
      // 尝试创建存储桶
      try {
        const { error: createError } = await supabase.storage.createBucket('food-images', {
          public: true,
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error('创建存储桶失败:', createError);
          return {
            checked: true,
            ready: false,
            message: `无法创建存储桶: ${createError.message}`
          };
        }
        
        console.log('成功创建food-images存储桶');
      } catch (error: any) {
        console.error('创建存储桶时发生错误:', error);
        return {
          checked: true,
          ready: false,
          message: `创建存储桶时出错: ${error.message || '未知错误'}`
        };
      }
    }
    
    // 测试上传小型测试文件
    try {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testPath = `test/storage-test-${Date.now()}.txt`;
      
      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(testPath, testBlob, { upsert: true });
      
      if (uploadError) {
        console.error('测试上传失败:', uploadError);
        return {
          checked: true,
          ready: false,
          message: `测试上传失败: ${uploadError.message}`
        };
      }
      
      // 测试成功后删除测试文件
      await supabase.storage
        .from('food-images')
        .remove([testPath]);
      
      return {
        checked: true,
        ready: true
      };
    } catch (error: any) {
      console.error('测试上传时发生错误:', error);
      return {
        checked: true,
        ready: false,
        message: `测试上传时出错: ${error.message || '未知错误'}`
      };
    }
  } catch (error: any) {
    console.error('验证存储时发生错误:', error);
    return {
      checked: true,
      ready: false,
      message: `验证存储时出错: ${error.message || '未知错误'}`
    };
  }
}; 