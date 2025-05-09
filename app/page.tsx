"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ShoppingCart, X, Plus, ArrowLeft, History, Camera, Tag, Search, Filter, Edit, Trash } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Types
interface Category {
  id: string
  name: string
  color: string
}

interface Dish {
  id: number
  name: string
  description: string
  price: number
  image: string
  categoryIds: string[] // Array of category IDs
}

interface CartItem {
  dish: Dish
  quantity: number
}

interface CustomerInfo {
  name: string
  note: string
}

// New type for order history
interface OrderHistory {
  id: string
  items: CartItem[]
  customerInfo: CustomerInfo
  totalPrice: number
  orderDate: Date
  images: string[] // URLs or data URLs for images
}

// Jellycat-inspired colors
const jellycatColors = {
  primary: "bg-emerald-500", // Main green
  primaryHover: "hover:bg-emerald-600",
  primaryText: "text-emerald-500",
  primaryLight: "bg-emerald-100",
  primaryLightText: "text-emerald-700",
  secondary: "bg-orange-400", // Secondary orange
  secondaryHover: "hover:bg-orange-500",
  secondaryText: "text-orange-400",
  secondaryLight: "bg-orange-100",
  secondaryLightText: "text-orange-700",
  accent1: "bg-yellow-300", // Accent colors for categories
  accent2: "bg-pink-300",
  accent3: "bg-purple-300",
  accent4: "bg-blue-300",
  accent5: "bg-teal-300",
}

// Available colors for categories - Jellycat-inspired palette
const categoryColors = [
  jellycatColors.primary,
  jellycatColors.secondary,
  jellycatColors.accent1,
  jellycatColors.accent2,
  jellycatColors.accent3,
  jellycatColors.accent4,
  jellycatColors.accent5,
  "bg-emerald-300",
  "bg-orange-300",
  "bg-lime-300",
  "bg-rose-300",
  "bg-sky-300",
]

// 新增导入Supabase客户端和表操作函数
import { supabase, categoriesTable, dishesTable, ordersTable, checkSupabaseConnection } from "@/lib/supabase"

// 添加图片处理函数，压缩图片尺寸
const processImage = (file: File, maxWidth = 800): Promise<string> => {
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

export default function FoodOrderingPage() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    note: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // State for add dish modal
  const [showAddDishModal, setShowAddDishModal] = useState(false)
  const [newDish, setNewDish] = useState<Omit<Dish, "id">>({
    name: "",
    description: "",
    price: 0,
    image: "",
    categoryIds: [],
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  // State for category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState<Omit<Category, "id">>({
    name: "",
    color: categoryColors[0],
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // State for order history
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([])
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [mealImage, setMealImage] = useState<File | null>(null)
  const [mealImagePreview, setMealImagePreview] = useState<string>("")

  // 添加编辑菜品相关状态
  const [showEditDishModal, setShowEditDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editDishForm, setEditDishForm] = useState<Omit<Dish, "id">>({
    name: "",
    description: "",
    price: 0,
    image: "",
    categoryIds: [],
  });

  // 使用useEffect加载数据
  useEffect(() => {
    loadData();
    fetchOrderHistory();
  }, []);

  // 加载分类和菜品数据
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // 首先检查Supabase连接
      const connectionCheck = await checkSupabaseConnection();
      if (!connectionCheck.success) {
        throw new Error(`Supabase连接失败: ${connectionCheck.error}. ${connectionCheck.details}`);
      }
      
      // 加载分类数据
      const categoriesData = await categoriesTable.getAll();
      if (categoriesData) {
        const formattedCategories: Category[] = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color || jellycatColors.primary // 使用默认颜色如果没有设置
        }));
        setCategories(formattedCategories);
      }
      
      // 加载菜品数据
      const dishesData = await dishesTable.getAll();
      if (dishesData) {
        try {
          // 首先按id分组菜品，因为一个菜品可能有多个分类
          const dishGroups: { [key: string]: any[] } = {};
          
          dishesData.forEach(dish => {
            const name = dish.name;
            if (!dishGroups[name]) {
              dishGroups[name] = [];
            }
            dishGroups[name].push(dish);
          });
          
          // 然后将分组的菜品格式化为前端需要的结构
          const formattedDishes: Dish[] = Object.values(dishGroups).map(dishGroup => {
            const firstDish = dishGroup[0];
            
            // 处理图片 - 检测是否为base64编码并确保其有效
            let imageUrl = "/placeholder.svg";
            if (firstDish.image) {
              // 如果图片是base64数据，使用占位图像
              if (firstDish.image.startsWith('data:image')) {
                // 截取base64数据，防止过大 (只保留开头部分作为调试用途)
                console.log(`菜品 ${firstDish.name} 使用了base64图片，建议改为URL引用`);
                imageUrl = "/placeholder.svg";
              } else {
                imageUrl = firstDish.image;
              }
            }
            
            return {
              id: firstDish.id,
              name: firstDish.name,
              description: firstDish.description || "",
              price: firstDish.price || 0,
              image: imageUrl,
              categoryIds: dishGroup.map(d => d.category_id)
            };
          });
          
          setDishes(formattedDishes);
        } catch (formatError: any) {
          console.error('菜品数据格式化失败:', formatError);
          setLoadError(`菜品数据处理错误: ${formatError.message}`);
        }
      }
    } catch (error: any) {
      console.error('加载数据失败:', error);
      setLoadError(error.message || '无法加载数据，请检查网络连接和环境变量配置');
      
      // 如果错误看起来与环境变量有关，则提供更具体的错误信息
      if (error.message && (
          error.message.includes('环境变量') || 
          error.message.includes('API key') ||
          error.message.includes('URL')
        )) {
        setLoadError('Supabase配置错误：请确保在Vercel上设置了NEXT_PUBLIC_SUPABASE_URL和NEXT_PUBLIC_SUPABASE_ANON_KEY环境变量。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 只在开发环境保存到localStorage的逻辑，发布后可以移除
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem("categories", JSON.stringify(categories))
    }
  }, [categories])

  useEffect(() => {
    if (dishes.length > 0) {
      localStorage.setItem("dishes", JSON.stringify(dishes))
    }
  }, [dishes])

  useEffect(() => {
    if (orderHistory.length > 0) {
      localStorage.setItem("orderHistory", JSON.stringify(orderHistory))
    }
  }, [orderHistory])

  // Filter dishes based on active category and search term
  const filteredDishes = dishes.filter((dish) => {
    // Filter by category if one is selected
    const matchesCategory = activeCategory ? dish.categoryIds.includes(activeCategory) : true

    // Filter by search term
    const matchesSearch = searchTerm
      ? dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dish.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true

    return matchesCategory && matchesSearch
  })

  // Get category by ID
  const getCategoryById = (id: string) => {
    return categories.find((category) => category.id === id)
  }

  // Add dish to cart
  const addToCart = (dish: Dish) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.dish.id === dish.id)

      if (existingItem) {
        return prevCart.map((item) => (item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        return [...prevCart, { dish, quantity: 1 }]
      }
    })
  }

  // Remove dish from cart
  const removeFromCart = (dishId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.dish.id !== dishId))
  }

  // Update quantity
  const updateQuantity = (dishId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(dishId)
      return
    }

    setCart((prevCart) => prevCart.map((item) => (item.dish.id === dishId ? { ...item, quantity: newQuantity } : item)))
  }

  // Calculate total price
  const totalPrice = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)

  // Submit order
  const submitOrder = () => {
    setShowConfirmation(true)
  }

  // Handle customer info change
  const handleCustomerInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCustomerInfo((prev) => ({ ...prev, [name]: value }))
  }

  // 新增函数：从Supabase获取订单历史
  const fetchOrderHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      if (data) {
        // 转换Supabase订单数据为前端OrderHistory格式
        const formattedOrders: OrderHistory[] = data.map(order => ({
          id: order.id,
          items: order.items.map((item: any) => ({
            dish: {
              id: item.dishId || 0,
              name: item.dishName,
              description: '',
              price: item.price,
              image: '/placeholder.svg',
              categoryIds: []
            },
            quantity: item.quantity
          })),
          customerInfo: {
            name: order.customer_name,
            note: order.notes || ''
          },
          totalPrice: order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
          orderDate: new Date(order.created_at),
          images: order.images || []
        }))
        
        setOrderHistory(formattedOrders)
      }
    } catch (error) {
      console.error("获取订单历史失败:", error)
    }
  }

  // Confirm order
  const confirmOrder = async () => {
    setIsSubmitting(true)
    try {
      // 准备订单数据
      const orderItems = cart.map(item => ({
        dishId: item.dish.id,
        dishName: item.dish.name,
        quantity: item.quantity,
        price: item.dish.price,
        note: ''  // 这里可以添加每个菜品的备注功能
      }))

      // 发送到API
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: orderItems,
          customerName: customerInfo.name,
          customerEmail: '', // 这里可以添加邮箱输入字段
          notes: customerInfo.note
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '订单提交失败')
      }

      // 创建新的订单历史记录
      const newOrder: OrderHistory = {
        id: result.orderId.toString(),
        items: [...cart],
        customerInfo: { ...customerInfo },
        totalPrice,
        orderDate: new Date(),
        images: [],
      }

      // 添加到订单历史并刷新数据
      await fetchOrderHistory()

      // 显示完成信息
      setOrderComplete(true)
    } catch (error) {
      console.error("处理订单失败:", error)
      alert("订单处理出错，请重试。")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset order flow
  const startNewOrder = () => {
    setCart([])
    setShowConfirmation(false)
    setOrderComplete(false)
    setCustomerInfo({
      name: "",
      note: "",
    })
  }

  // Handle image upload for new dish
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)

    try {
      // 处理并压缩图片
      const processedImage = await processImage(file);
      setImagePreview(processedImage);
    } catch (error) {
      console.error('图片处理失败:', error);
      alert('图片处理失败，请尝试使用较小的图片');
      setImageFile(null);
    }
  }

  // Handle image upload for meal in order history
  const handleMealImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMealImage(file)

    try {
      // 处理并压缩图片
      const processedImage = await processImage(file);
      setMealImagePreview(processedImage);
    } catch (error) {
      console.error('图片处理失败:', error);
      alert('图片处理失败，请尝试使用较小的图片');
      setMealImage(null);
    }
  }

  // 修改添加图片到订单的功能
  const addMealImageToOrder = async () => {
    if (!selectedOrderId || !mealImagePreview || !mealImage) return

    try {
      // 检查图片大小
      if (mealImagePreview.length > 200000) { // 约200KB
        alert("图片太大，请使用较小的图片或减小图片尺寸");
        return;
      }
      
      // 将图片上传到Supabase存储
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${selectedOrderId}/${fileName}`;
      
      // 将base64格式的图片转换为Blob
      const base64Data = mealImagePreview.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
      
      // 上传图片到Supabase存储
      const { data, error } = await supabase.storage
        .from('meal-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      // 获取图片的公共URL
      const { data: publicUrl } = supabase.storage
        .from('meal-images')
        .getPublicUrl(filePath);
      
      // 更新订单表中的图片记录
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          images: [...(orderHistory.find(o => o.id === selectedOrderId)?.images || []), publicUrl.publicUrl]
        })
        .eq('id', selectedOrderId);
      
      if (updateError) {
        throw updateError;
      }
      
      // 在本地更新图片预览
      setOrderHistory((prev) =>
        prev.map((order) =>
          order.id === selectedOrderId ? { 
            ...order, 
            images: [...order.images, publicUrl.publicUrl] 
          } : order
        )
      );

      // 重新获取所有订单数据以确保同步
      await fetchOrderHistory();

      // Reset image state
      setMealImage(null);
      setMealImagePreview("");
      
      alert("照片上传成功！");
    } catch (error) {
      console.error("上传图片失败:", error);
      alert("上传图片失败，请重试");
    }
  }

  // Handle new dish form change
  const handleNewDishChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewDish((prev) => ({
      ...prev,
      [name]: name === "price" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  // Toggle category selection for a dish
  const toggleDishCategory = (categoryId: string) => {
    setNewDish((prev) => {
      const categoryIds = prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId]
      return { ...prev, categoryIds }
    })
  }

  // Add new dish
  const addNewDish = async () => {
    // Validate form
    if (!newDish.name || !newDish.description || newDish.price <= 0) {
      alert("请填写所有必填字段");
      return;
    }

    if (newDish.categoryIds.length === 0) {
      alert("请至少选择一个分类");
      return;
    }

    try {
      // Use image preview if available, otherwise use placeholder
      const dishImage = imagePreview || "/placeholder.svg";
      
      // 确保图片不是base64编码，或者如果是base64，确保它不太大
      let finalImageUrl = "/placeholder.svg";
      if (dishImage.startsWith('data:image')) {
        // 如果是base64图片，检查大小 - 如果超过某个阈值，使用占位图
        if (dishImage.length > 200000) { // 约200KB
          console.warn("图片太大，使用占位图");
          finalImageUrl = "/placeholder.svg";
        } else {
          finalImageUrl = dishImage;
        }
      } else {
        finalImageUrl = dishImage;
      }

      // 同步到数据库
      console.log("正在保存菜品到数据库:", {
        name: newDish.name,
        description: newDish.description,
        price: newDish.price,
        image: finalImageUrl,
        category_ids: newDish.categoryIds
      });
      
      const result = await dishesTable.create({
        name: newDish.name,
        description: newDish.description,
        price: newDish.price,
        image: finalImageUrl,
        category_ids: newDish.categoryIds
      });
      
      if (result && result.length > 0) {
        // 获取插入成功的菜品的第一个ID
        const newId = result[0]?.id || Math.max(0, ...dishes.map((d) => d.id)) + 1;
        
        // 创建新菜品对象
        const dishToAdd: Dish = {
          id: newId,
          name: newDish.name,
          description: newDish.description,
          price: newDish.price,
          image: finalImageUrl,
          categoryIds: newDish.categoryIds,
        };
        
        // 保存到本地状态
        setDishes((prev) => [...prev, dishToAdd]);
        
        // Reset form
        setNewDish({
          name: "",
          description: "",
          price: 0,
          image: "",
          categoryIds: [],
        });
        setImageFile(null);
        setImagePreview("");
        setShowAddDishModal(false);
        
        alert("菜品添加成功");
      }
    } catch (error: any) {
      console.error("添加菜品失败:", error);
      
      // 尝试获取更详细的错误信息
      let errorDetail = '';
      if (error.code) errorDetail += ` 错误代码: ${error.code}.`;
      if (error.message) errorDetail += ` 消息: ${error.message}.`;
      if (error.details) errorDetail += ` 详情: ${error.details}.`;
      if (error.hint) errorDetail += ` 提示: ${error.hint}.`;
      
      alert(`添加菜品失败: ${errorDetail || '未知错误'}`);
    }
  }

  // Handle new category form change
  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewCategory((prev) => ({ ...prev, [name]: value }))
  }

  // Add new category
  const addNewCategory = async () => {
    // Validate form
    if (!newCategory.name) {
      alert("请输入分类名称")
      return
    }

    try {
      // Create new category with generated ID
      const categoryId = newCategory.name.toLowerCase().replace(/\s+/g, "-")

      // Check if category with this ID already exists
      if (categories.some((cat) => cat.id === categoryId)) {
        alert("此名称的分类已存在")
        return
      }

      const categoryToAdd: Category = {
        id: categoryId,
        name: newCategory.name,
        color: newCategory.color,
      }

      // 同步到数据库
      try {
        console.log("正在保存分类到数据库:", categoryToAdd)
        const result = await categoriesTable.create({
          id: categoryId,
          name: newCategory.name,
          color: newCategory.color,
          description: `${newCategory.name}分类`
        })
        
        if (result) {
          // 保存到本地状态
          setCategories((prev) => [...prev, categoryToAdd])
          
          // Reset form
          setNewCategory({
            name: "",
            color: categoryColors[0],
          })
          
          alert("分类创建成功")
        }
      } catch (error: any) {
        console.error("保存分类到数据库失败:", error)
        
        // 尝试获取更详细的错误信息
        let errorDetail = ''
        if (error.code) errorDetail += ` 错误代码: ${error.code}.`
        if (error.message) errorDetail += ` 消息: ${error.message}.`
        if (error.details) errorDetail += ` 详情: ${error.details}.`
        if (error.hint) errorDetail += ` 提示: ${error.hint}.`
        
        alert(`创建分类失败: ${errorDetail || '未知错误'}`)
      }
    } catch (error: any) {
      console.error("添加分类失败:", error)
      alert(`添加分类失败: ${error.message || '未知错误'}`)
    }
  }

  // Delete category
  const deleteCategory = async (categoryId: string) => {
    if (!confirm(`确定要删除"${getCategoryById(categoryId)?.name || categoryId}"分类吗？这将同时删除该分类下的所有菜品！`)) {
      return;
    }

    try {
      // 从数据库中删除
      await categoriesTable.delete(categoryId);
      
      // 获取该分类下的所有菜品ID
      const dishesToRemove = dishes.filter(dish => 
        dish.categoryIds.includes(categoryId)
      ).map(dish => dish.id);
      
      // 从本地状态中移除分类
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));

      // 从所有菜品中移除此分类
      setDishes((prev) => {
        // 首先移除类别ID
        const updatedDishes = prev.map((dish) => ({
          ...dish,
          categoryIds: dish.categoryIds.filter((id) => id !== categoryId),
        }));
        
        // 然后过滤掉没有任何类别的菜品
        return updatedDishes.filter(dish => dish.categoryIds.length > 0);
      });

      // If this was the active category, reset filter
      if (activeCategory === categoryId) {
        setActiveCategory(null);
      }
      
      alert("分类删除成功");
    } catch (error: any) {
      console.error("删除分类失败:", error);
      alert(`删除分类失败: ${error.message || '未知错误'}`);
    }
  }

  // Delete dish
  const deleteDish = async (dishId: number) => {
    if (!confirm("确定要删除这个菜品吗？")) {
      return;
    }

    try {
      // 删除菜品
      await dishesTable.delete(dishId);
      
      // 从本地状态中移除
      setDishes((prev) => prev.filter((dish) => dish.id !== dishId));
      
      alert("菜品删除成功");
    } catch (error: any) {
      console.error("删除菜品失败:", error);
      alert(`删除菜品失败: ${error.message || '未知错误'}`);
    }
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // 开始编辑菜品
  const startEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setEditDishForm({
      name: dish.name,
      description: dish.description,
      price: dish.price,
      image: dish.image,
      categoryIds: [...dish.categoryIds],
    });
    setImagePreview(dish.image); // 设置图片预览
    setShowEditDishModal(true);
  };

  // 处理编辑表单变化
  const handleEditDishChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditDishForm((prev) => ({
      ...prev,
      [name]: name === "price" ? Number.parseFloat(value) || 0 : value,
    }));
  };

  // 切换编辑菜品分类选择
  const toggleEditDishCategory = (categoryId: string) => {
    setEditDishForm((prev) => {
      const categoryIds = prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId];
      return { ...prev, categoryIds };
    });
  };

  // 保存编辑的菜品
  const saveEditedDish = async () => {
    if (!editingDish) return;

    // 验证表单
    if (!editDishForm.name || !editDishForm.description || editDishForm.price <= 0) {
      alert("请填写所有必填字段");
      return;
    }

    if (editDishForm.categoryIds.length === 0) {
      alert("请至少选择一个分类");
      return;
    }

    try {
      // 使用图片预览或保留原图
      const dishImage = imagePreview || editDishForm.image;
      
      // 确保图片不是base64编码，或者如果是base64，确保它不太大
      let finalImageUrl = "/placeholder.svg";
      if (dishImage.startsWith('data:image')) {
        // 如果是base64图片，检查大小 - 如果超过某个阈值，使用占位图
        if (dishImage.length > 200000) { // 约200KB
          console.warn("图片太大，使用占位图");
          finalImageUrl = "/placeholder.svg";
        } else {
          finalImageUrl = dishImage;
        }
      } else {
        finalImageUrl = dishImage;
      }

      // 先删除原有菜品
      await dishesTable.delete(editingDish.id);

      // 添加更新后的菜品
      const result = await dishesTable.create({
        name: editDishForm.name,
        description: editDishForm.description,
        price: editDishForm.price,
        image: finalImageUrl,
        category_ids: editDishForm.categoryIds
      });

      // 更新本地状态
      setDishes((prev) => {
        // 移除旧菜品
        const filtered = prev.filter(dish => dish.id !== editingDish.id);
        
        // 添加更新后的菜品
        if (result && result.length > 0) {
          const updatedDish: Dish = {
            id: result[0]?.id || editingDish.id,
            name: editDishForm.name,
            description: editDishForm.description,
            price: editDishForm.price,
            image: finalImageUrl,
            categoryIds: editDishForm.categoryIds,
          };
          return [...filtered, updatedDish];
        }
        return filtered;
      });

      // 重置状态
      setEditingDish(null);
      setEditDishForm({
        name: "",
        description: "",
        price: 0,
        image: "",
        categoryIds: [],
      });
      setImagePreview("");
      setShowEditDishModal(false);
      
      alert("菜品更新成功");
    } catch (error: any) {
      console.error("更新菜品失败:", error);
      
      // 尝试获取更详细的错误信息
      let errorDetail = '';
      if (error.code) errorDetail += ` 错误代码: ${error.code}.`;
      if (error.message) errorDetail += ` 消息: ${error.message}.`;
      if (error.details) errorDetail += ` 详情: ${error.details}.`;
      if (error.hint) errorDetail += ` 提示: ${error.hint}.`;
      
      alert(`更新菜品失败: ${errorDetail || '未知错误'}`);
    }
  };

  // If showing order history
  if (showOrderHistory) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col">
        <header className="bg-white border-b border-emerald-100 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <Button
              variant="ghost"
              onClick={() => setShowOrderHistory(false)}
              className="mr-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-emerald-700">历史订单</h1>
            <Button
              variant="ghost"
              onClick={() => fetchOrderHistory()}
              className="ml-auto text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              刷新
            </Button>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          {orderHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-emerald-700">暂无订单记录</h2>
              <p className="text-emerald-600 mb-6">您还没有下过任何订单</p>
              <Button onClick={() => setShowOrderHistory(false)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                开始点餐
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {orderHistory.map((order) => (
                <Card key={order.id} className="overflow-hidden border-emerald-200 rounded-xl shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-emerald-700">订单号: {order.id.substring(0, 8)}</h3>
                        <p className="text-sm text-emerald-600">顾客: {order.customerInfo.name}</p>
                        <p className="text-sm text-emerald-600">时间: {formatDate(order.orderDate)}</p>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <p className="font-bold text-lg text-orange-500">¥{order.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    {order.customerInfo.note && (
                      <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-sm italic text-emerald-700">备注: "{order.customerInfo.note}"</p>
                      </div>
                    )}

                    <div className="border border-emerald-200 rounded-lg overflow-hidden mb-4">
                      <div className="bg-emerald-100 p-3 border-b border-emerald-200">
                        <h4 className="font-medium text-emerald-700">订单项目</h4>
                      </div>
                      <div className="divide-y divide-emerald-100">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center p-3">
                            <div className="relative h-14 w-14 flex-shrink-0 rounded-full overflow-hidden mr-3 border-2 border-emerald-200">
                              <Image
                                src={item.dish.image || "/placeholder.svg"}
                                alt={item.dish.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-emerald-700">{item.dish.name}</p>
                              <p className="text-sm text-emerald-600">
                                ¥{item.dish.price.toFixed(2)} × {item.quantity}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.dish.categoryIds.map((catId) => {
                                  const category = getCategoryById(catId)
                                  return category ? (
                                    <Badge
                                      key={catId}
                                      className={`${category.color} text-white text-xs rounded-full px-2`}
                                      variant="secondary"
                                    >
                                      {category.name}
                                    </Badge>
                                  ) : null
                                })}
                              </div>
                            </div>
                            <p className="font-medium text-orange-500">
                              ¥{(item.dish.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-emerald-700">餐品照片</h4>
                      {order.images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {order.images.map((image, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-lg overflow-hidden border-2 border-emerald-200"
                            >
                              <Image
                                src={image || "/placeholder.svg"}
                                alt={`Meal photo ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-emerald-500">暂无照片</p>
                      )}
                    </div>

                    <div className="mt-4">
                      {selectedOrderId === order.id && mealImagePreview ? (
                        <div className="mb-4">
                          <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-emerald-200 mb-2">
                            <Image
                              src={mealImagePreview || "/placeholder.svg"}
                              alt="预览"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={addMealImageToOrder}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                              保存照片
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMealImage(null)
                                setMealImagePreview("")
                              }}
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            id={`meal-image-${order.id}`}
                            accept="image/*"
                            className="hidden"
                            onChange={handleMealImageChange}
                            onClick={() => setSelectedOrderId(order.id)}
                          />
                          <label htmlFor={`meal-image-${order.id}`} className="cursor-pointer">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                              <span>
                                <Camera className="h-4 w-4 mr-2" />
                                添加照片
                              </span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // If showing confirmation page
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col">
        <header className="bg-white border-b border-emerald-100 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <Button
              variant="ghost"
              onClick={() => setShowConfirmation(false)}
              className="mr-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-emerald-700">Order Confirmation</h1>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
          {orderComplete ? (
            <div className="bg-white p-6 rounded-xl shadow-md text-center border border-emerald-100">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-emerald-700">Order Confirmed!</h2>
              <p className="mb-6 text-emerald-600">Thank you for your order, {customerInfo.name}.</p>
              {customerInfo.note && <p className="mb-6 text-emerald-600 italic">"{customerInfo.note}"</p>}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={startNewOrder}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6"
                >
                  Place Another Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    startNewOrder()
                    setShowOrderHistory(true)
                  }}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full px-6"
                >
                  <History className="h-4 w-4 mr-2" />
                  View Order History
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-md border border-emerald-100">
              <h2 className="text-xl font-semibold mb-4 text-emerald-700">Review Your Order</h2>

              <div className="mb-6">
                <h3 className="font-medium mb-2 text-emerald-700">Order Summary</h3>
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                  {cart.map((item) => (
                    <div
                      key={item.dish.id}
                      className="flex items-center p-3 border-b border-emerald-100 last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-emerald-700">{item.dish.name}</p>
                        <p className="text-sm text-emerald-600">
                          ${item.dish.price.toFixed(2)} × {item.quantity}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.dish.categoryIds.map((catId) => {
                            const category = getCategoryById(catId)
                            return category ? (
                              <Badge
                                key={catId}
                                className={`${category.color} text-white text-xs rounded-full px-2`}
                                variant="secondary"
                              >
                                {category.name}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>
                      <p className="font-medium text-orange-500">${(item.dish.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="flex items-center p-3 bg-emerald-50">
                    <p className="flex-1 font-bold text-emerald-700">Total</p>
                    <p className="font-bold text-orange-500">${totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2 text-emerald-700">Your Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-emerald-700">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={customerInfo.name}
                      onChange={handleCustomerInfoChange}
                      required
                      className="border-emerald-200 focus:border-emerald-300 focus:ring-emerald-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="note" className="text-emerald-700">
                      Note (Optional)
                    </Label>
                    <Textarea
                      id="note"
                      name="note"
                      value={customerInfo.note}
                      onChange={handleCustomerInfoChange}
                      placeholder="Special instructions or requests"
                      className="border-emerald-200 focus:border-emerald-300 focus:ring-emerald-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={confirmOrder}
                  disabled={isSubmitting || !customerInfo.name}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6"
                >
                  {isSubmitting ? "Processing..." : "Confirm Order"}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // 在返回的JSX中，添加加载状态显示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex justify-center items-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">正在加载</h2>
          <p className="text-emerald-600">请稍候，正在获取菜单数据...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-emerald-50 flex justify-center items-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <div className="w-16 h-16 bg-red-100 text-red-500 flex items-center justify-center rounded-full mx-auto mb-4">
            <X className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <Button onClick={loadData} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 flex items-center justify-between">
        <span>家庭点餐系统</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
            onClick={() => setShowOrderHistory(true)}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史订单</span>
          </Button>
          <Link href="/admin">
            <Button
              variant="outline"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
            >
              管理后台
            </Button>
          </Link>
        </div>
      </h1>

      {/* 添加错误提示组件 */}
      {loadError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-md text-red-800">
          <h3 className="font-bold text-lg mb-2">加载错误</h3>
          <p>{loadError}</p>
          {loadError.includes('环境变量') && (
            <div className="mt-3 p-3 bg-white rounded border border-red-200">
              <p className="font-semibold">解决方法:</p>
              <ol className="list-decimal list-inside mt-2">
                <li>在Vercel项目设置中添加以下环境变量:</li>
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>NEXT_PUBLIC_SUPABASE_URL</li>
                  <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                </ul>
                <li className="mt-2">值应与本地开发环境中的值相同</li>
                <li className="mt-2">添加变量后重新部署应用</li>
              </ol>
            </div>
          )}
          <div className="mt-4">
            <Button 
              onClick={() => loadData()}
              className={`${jellycatColors.primary} ${jellycatColors.primaryHover} text-white`}
            >
              重试加载
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-t-emerald-500 border-b-emerald-700 border-l-emerald-600 border-r-emerald-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">加载数据中...</p>
        </div>
      ) : (
        <div className="relative min-h-screen">
          {/* 页面主内容 */}
          {dishes.length === 0 && !loadError ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-md">
              <p className="text-gray-500 mb-4">暂无菜品数据</p>
              <Button 
                onClick={() => setShowAddDishModal(true)}
                className={`${jellycatColors.primary} ${jellycatColors.primaryHover} text-white`}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加菜品
              </Button>
            </div>
          ) : (
            <>
              {/* 搜索栏 */}
              <div className="mb-6 flex gap-2 sticky top-0 z-10 bg-white p-2 shadow-sm rounded">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索菜品..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-1"
                >
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">分类管理</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDishModal(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">添加菜品</span>
                </Button>
              </div>

              {/* 分类选择区 */}
              <div className="mb-6 overflow-x-auto whitespace-nowrap pb-2 flex gap-2">
                <Badge
                  onClick={() => setActiveCategory(null)}
                  className={`cursor-pointer px-3 py-1 text-sm ${
                    activeCategory === null
                      ? jellycatColors.primary + " text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  全部
                </Badge>
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`cursor-pointer px-3 py-1 text-sm ${
                      activeCategory === category.id
                        ? category.color + " text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>

              {/* 菜品列表区 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-20">
                {dishes
                  .filter((dish) => {
                    // 如果选中了分类，只显示该分类的菜品
                    if (activeCategory && !dish.categoryIds.includes(activeCategory)) {
                      return false
                    }
                    // 搜索过滤
                    if (searchTerm && !dish.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                      return false
                    }
                    return true
                  })
                  .map((dish) => (
                    <Card key={dish.id} className="overflow-hidden group">
                      <div className="relative h-48">
                        <Image
                          src={dish.image || "/placeholder.svg"}
                          alt={dish.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          onError={(e) => {
                            console.error(`图片加载失败: ${dish.image}`);
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                          priority={false}
                          unoptimized={dish.image?.startsWith('data:image')}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full bg-white/70 backdrop-blur-sm w-8 h-8"
                            onClick={() => startEditDish(dish)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{dish.name}</h3>
                          <div className="font-bold text-emerald-600">¥{dish.price}</div>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-2">{dish.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {dish.categoryIds.map((categoryId) => {
                            const category = getCategoryById(categoryId)
                            return category ? (
                              <span
                                key={categoryId}
                                className={`text-xs px-2 py-0.5 rounded-full ${category.color} bg-opacity-20 text-emerald-800`}
                              >
                                {category.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => deleteDish(dish.id)}
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          删除
                        </Button>
                        <Button
                          size="sm"
                          className={`${jellycatColors.primary} ${jellycatColors.primaryHover} text-white`}
                          onClick={() => addToCart(dish)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          加入
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            </>
          )}
        
          {/* 加菜弹窗 */}
          <AddDishModal
            show={showAddDishModal}
            onClose={() => setShowAddDishModal(false)}
            newDish={newDish}
            handleNewDishChange={handleNewDishChange}
            toggleDishCategory={toggleDishCategory}
            categories={categories}
            imagePreview={imagePreview}
            handleImageChange={handleImageChange}
            addNewDish={addNewDish}
          />

          {/* 编辑菜品弹窗 */}
          <EditDishModal
            show={showEditDishModal}
            onClose={() => setShowEditDishModal(false)}
            dishForm={editDishForm}
            handleDishChange={handleEditDishChange}
            toggleDishCategory={toggleEditDishCategory}
            categories={categories}
            imagePreview={imagePreview}
            handleImageChange={handleImageChange}
            saveDish={saveEditedDish}
          />

          {/* 管理分类弹窗 */}
          <CategoryModal
            show={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            categories={categories}
            newCategory={newCategory}
            handleNewCategoryChange={handleNewCategoryChange}
            addNewCategory={addNewCategory}
            deleteCategory={deleteCategory}
            categoryColors={categoryColors}
          />

          <div className="flex flex-col min-h-screen bg-emerald-50">
            {/* 店铺信息 */}
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-emerald-700">
                  <span className="text-orange-400">Sunny</span> 点菜平台
                </h1>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setShowAddDishModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    加菜
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setShowCategoryModal(true)}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    管理分类
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full"
                    onClick={() => setShowOrderHistory(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    历史订单
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full"
                    asChild
                  >
                    <Link href="/admin">
                      管理后台
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-1">
              {/* Main content */}
              <main className="flex-1 container mx-auto px-4 py-4">
                {/* Search and filter */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-400" />
                    <Input
                      placeholder="Search dishes..."
                      className="pl-10 border-emerald-200 focus:border-emerald-300 focus:ring-emerald-300 rounded-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    <Button
                      variant={activeCategory === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(null)}
                      className={
                        activeCategory === null
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full"
                      }
                    >
                      All
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={activeCategory === category.id ? "default" : "outline"}
                        size="sm"
                        className={
                          activeCategory === category.id
                            ? `${category.color} text-white rounded-full`
                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full"
                        }
                        onClick={() => setActiveCategory(category.id)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <h2 className="text-2xl font-semibold mb-6 text-emerald-700">
                  {activeCategory
                    ? `${getCategoryById(activeCategory)?.name || "Category"} Menu`
                    : searchTerm
                      ? "Search Results"
                      : "Our Menu"}
                </h2>

                {filteredDishes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Filter className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-emerald-700">No dishes found</h3>
                    <p className="text-emerald-600 mb-6">Try changing your search or filter criteria</p>
                    <Button
                      onClick={() => {
                        setActiveCategory(null)
                        setSearchTerm("")
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDishes.map((dish) => (
                      <Card
                        key={dish.id}
                        className="overflow-hidden border-emerald-200 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
                      >
                        <div className="relative h-48">
                          <Image src={dish.image || "/placeholder.svg"} alt={dish.name} fill className="object-cover" />
                          {dish.categoryIds.length > 0 && (
                            <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end max-w-[70%]">
                              {dish.categoryIds.map((catId) => {
                                const category = getCategoryById(catId)
                                return category ? (
                                  <Badge
                                    key={catId}
                                    className={`${category.color} text-white rounded-full px-2`}
                                    variant="secondary"
                                  >
                                    {category.name}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDish(dish.id);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditDish(dish);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-emerald-700">{dish.name}</h3>
                            <span className="font-bold text-orange-500">${dish.price.toFixed(2)}</span>
                          </div>
                          <p className="text-emerald-600 text-sm mb-4">{dish.description}</p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <Button
                            onClick={() => addToCart(dish)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                          >
                            Add to Order
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </main>

              {/* Desktop sidebar cart */}
              <aside className="hidden lg:block w-80 border-l border-emerald-100 bg-white p-4 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
                <Cart
                  cart={cart}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  totalPrice={totalPrice}
                  submitOrder={submitOrder}
                  getCategoryById={getCategoryById}
                />
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Cart component
function Cart({
  cart,
  updateQuantity,
  removeFromCart,
  totalPrice,
  submitOrder,
  getCategoryById,
}: {
  cart: CartItem[]
  updateQuantity: (dishId: number, quantity: number) => void
  removeFromCart: (dishId: number) => void
  totalPrice: number
  submitOrder: () => void
  getCategoryById: (id: string) => Category | undefined
}) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-emerald-700">Your Order</h2>

      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-emerald-500">
          <p>Your cart is empty</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {cart.map((item) => (
            <div key={item.dish.id} className="flex items-start gap-3 py-3 border-b border-emerald-100">
              <div className="relative h-16 w-16 flex-shrink-0 rounded-full overflow-hidden border-2 border-emerald-200">
                <Image src={item.dish.image || "/placeholder.svg"} alt={item.dish.name} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h3 className="font-medium truncate text-emerald-700">{item.dish.name}</h3>
                  <button
                    onClick={() => removeFromCart(item.dish.id)}
                    className="text-emerald-400 hover:text-emerald-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-orange-500 text-sm">${item.dish.price.toFixed(2)}</p>
                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                  {item.dish.categoryIds.map((catId) => {
                    const category = getCategoryById(catId)
                    return category ? (
                      <Badge
                        key={catId}
                        className={`${category.color} text-white text-xs rounded-full px-2`}
                        variant="secondary"
                      >
                        {category.name}
                      </Badge>
                    ) : null
                  })}
                </div>
                <div className="flex items-center mt-1">
                  <button
                    onClick={() => updateQuantity(item.dish.id, item.quantity - 1)}
                    className="h-6 w-6 flex items-center justify-center border border-emerald-200 rounded-l-full text-emerald-700"
                  >
                    -
                  </button>
                  <span className="h-6 px-2 flex items-center justify-center border-t border-b border-emerald-200 text-emerald-700">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.dish.id, item.quantity + 1)}
                    className="h-6 w-6 flex items-center justify-center border border-emerald-200 rounded-r-full text-emerald-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="mt-4 pt-4 border-t border-emerald-100">
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-emerald-700">Total:</span>
            <span className="font-bold text-orange-500">${totalPrice.toFixed(2)}</span>
          </div>
          <Button onClick={submitOrder} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
            Submit Order
          </Button>
        </div>
      )}
    </div>
  )
}

// 加菜弹窗组件
function AddDishModal({
  show,
  onClose,
  newDish,
  handleNewDishChange,
  toggleDishCategory,
  categories,
  imagePreview,
  handleImageChange,
  addNewDish,
}: {
  show: boolean
  onClose: () => void
  newDish: Omit<Dish, "id">
  handleNewDishChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  toggleDishCategory: (categoryId: string) => void
  categories: Category[]
  imagePreview: string
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  addNewDish: () => void
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-emerald-700">添加新菜品</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="dish-name">菜品名称</Label>
            <Input
              id="dish-name"
              name="name"
              value={newDish.name}
              onChange={handleNewDishChange}
              placeholder="输入菜品名称"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="dish-description">描述</Label>
            <Textarea
              id="dish-description"
              name="description"
              value={newDish.description}
              onChange={handleNewDishChange}
              placeholder="输入菜品描述"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="dish-price">价格</Label>
            <Input
              id="dish-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={newDish.price === 0 ? "" : newDish.price}
              onChange={handleNewDishChange}
              placeholder="输入价格"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>分类</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={newDish.categoryIds.includes(category.id)}
                    onCheckedChange={() => toggleDishCategory(category.id)}
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label>图片</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                </div>
              ) : null}
              
              <div>
                <input
                  type="file"
                  id="dish-image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <label htmlFor="dish-image">
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      {imagePreview ? "更换图片" : "上传图片"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button onClick={addNewDish} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            保存菜品
          </Button>
        </div>
      </div>
    </div>
  )
}

// 编辑菜品弹窗组件
function EditDishModal({
  show,
  onClose,
  dishForm,
  handleDishChange,
  toggleDishCategory,
  categories,
  imagePreview,
  handleImageChange,
  saveDish,
}: {
  show: boolean
  onClose: () => void
  dishForm: Omit<Dish, "id">
  handleDishChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  toggleDishCategory: (categoryId: string) => void
  categories: Category[]
  imagePreview: string
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  saveDish: () => void
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-emerald-700">编辑菜品</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="edit-dish-name">菜品名称</Label>
            <Input
              id="edit-dish-name"
              name="name"
              value={dishForm.name}
              onChange={handleDishChange}
              placeholder="输入菜品名称"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-dish-description">描述</Label>
            <Textarea
              id="edit-dish-description"
              name="description"
              value={dishForm.description}
              onChange={handleDishChange}
              placeholder="输入菜品描述"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-dish-price">价格</Label>
            <Input
              id="edit-dish-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={dishForm.price === 0 ? "" : dishForm.price}
              onChange={handleDishChange}
              placeholder="输入价格"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>分类</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-category-${category.id}`}
                    checked={dishForm.categoryIds.includes(category.id)}
                    onCheckedChange={() => toggleDishCategory(category.id)}
                  />
                  <Label
                    htmlFor={`edit-category-${category.id}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label>图片</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                </div>
              ) : null}
              
              <div>
                <input
                  type="file"
                  id="edit-dish-image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <label htmlFor="edit-dish-image">
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      {imagePreview ? "更换图片" : "上传图片"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button onClick={saveDish} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            保存更改
          </Button>
        </div>
      </div>
    </div>
  )
}

// 管理分类弹窗组件
function CategoryModal({
  show,
  onClose,
  categories,
  newCategory,
  handleNewCategoryChange,
  addNewCategory,
  deleteCategory,
  categoryColors,
}: {
  show: boolean
  onClose: () => void
  categories: Category[]
  newCategory: Omit<Category, "id">
  handleNewCategoryChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  addNewCategory: () => void
  deleteCategory: (id: string) => void
  categoryColors: string[]
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-emerald-700">管理分类</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-medium mb-2 text-emerald-700">添加新分类</h3>
          <div className="space-y-3 mb-6">
            <div>
              <Label htmlFor="category-name">分类名称</Label>
              <Input
                id="category-name"
                name="name"
                value={newCategory.name}
                onChange={handleNewCategoryChange}
                placeholder="输入分类名称"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="category-color">颜色</Label>
              <div className="grid grid-cols-6 gap-2 mt-1">
                {categoryColors.map((color, index) => (
                  <div
                    key={index}
                    className={`h-8 w-8 rounded-full cursor-pointer ${color} ${
                      newCategory.color === color ? 'ring-2 ring-offset-2 ring-emerald-500' : ''
                    }`}
                    onClick={() => handleNewCategoryChange({
                      target: { name: 'color', value: color }
                    } as React.ChangeEvent<HTMLInputElement>)}
                  />
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <Button
                onClick={addNewCategory}
                disabled={!newCategory.name}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                添加分类
              </Button>
            </div>
          </div>
          
          <h3 className="font-medium mb-2 text-emerald-700">现有分类</h3>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">暂无分类</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className={`h-6 w-6 rounded-full mr-2 ${category.color}`} />
                    <span>{category.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategory(category.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
