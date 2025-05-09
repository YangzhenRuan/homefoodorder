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
    // 检查存储桶是否存在 (或是否有权限访问)
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('获取存储桶列表错误:', bucketError);
      // 抛出错误，让调用者处理
      throw new Error(`检查存储桶权限失败: ${bucketError.message}`);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'food-images');
    
    // 如果存储桶不存在或无权访问，则直接报错，不再尝试创建
    if (!bucketExists) {
      console.error('存储桶 \'food-images\' 不存在或无权限访问。请在 Supabase Dashboard 中检查。');
      throw new Error('存储桶 \'food-images\' 不存在或无权限访问。');
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
        return '/placeholder.svg'; // Or throw?
      }
    } else {
      // 服务器环境
      console.error('不支持在服务器端上传图片');
      throw new Error('图片上传只能在客户端进行'); // Throw error instead of returning placeholder
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
      throw error; // Re-throw the error
    }
    
    // 获取图片的公共URL
    const { data: publicUrlData } = supabase.storage
      .from('food-images')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
        console.error('获取图片公共 URL 失败');
        throw new Error('获取图片公共 URL 失败');
    }
    
    console.log('图片上传成功:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.error('处理图片错误:', error);
    // console.error('错误详情:', error.message || '未知错误'); // Logged by previous catches
    // 不再返回占位符，而是重新抛出错误，让调用者知道操作失败
    throw error; 
  }
};

// 添加重试机制的上传函数
export const uploadWithRetry = async (imageDataUrl: string, prefix = 'dishes', retries = 2): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 调用已修改的 uploadImageToStorage，它现在会在失败时抛出错误
      return await uploadImageToStorage(imageDataUrl, prefix);
    } catch (error) {
      if (attempt === retries) {
        console.error(`上传失败，已重试${retries}次:`, error);
        throw error; // Re-throw the error after final attempt
      }
      // 等待时间随着重试次数增加
      const delay = 1000 * (attempt + 1);
      console.log(`上传尝试 ${attempt + 1} 失败，将在 ${delay}ms 后重试...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // 如果所有重试都失败，代码不应该到达这里，因为最后一次尝试会抛出错误
  // 但为了类型安全和明确性，可以抛出一个最终错误
  throw new Error('图片上传失败，已达到最大重试次数。');
};