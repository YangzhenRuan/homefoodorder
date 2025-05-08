"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ShoppingCart, X, Plus, ArrowLeft, History, Camera, Tag, Search, Filter } from "lucide-react"
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

// Sample categories with Jellycat-inspired colors
const initialCategories: Category[] = [
  { id: "appetizer", name: "Appetizers", color: jellycatColors.accent1 },
  { id: "main", name: "Main Courses", color: jellycatColors.primary },
  { id: "dessert", name: "Desserts", color: jellycatColors.accent2 },
  { id: "drink", name: "Drinks", color: jellycatColors.accent4 },
  { id: "vegetarian", name: "Vegetarian", color: jellycatColors.accent5 },
]

// Sample data with categories
const initialDishes: Dish[] = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Classic pizza with tomato sauce, mozzarella, and fresh basil",
    price: 12.99,
    image: "/delicious-pizza.png",
    categoryIds: ["main"],
  },
  {
    id: 2,
    name: "Grilled Salmon",
    description: "Fresh salmon fillet grilled to perfection with lemon and herbs",
    price: 18.99,
    image: "/fresh-salmon-fillet.png",
    categoryIds: ["main"],
  },
  {
    id: 3,
    name: "Caesar Salad",
    description: "Crisp romaine lettuce with Caesar dressing, croutons, and parmesan",
    price: 9.99,
    image: "/vibrant-mixed-salad.png",
    categoryIds: ["appetizer", "vegetarian"],
  },
  {
    id: 4,
    name: "Beef Burger",
    description: "Juicy beef patty with lettuce, tomato, cheese, and special sauce",
    price: 14.99,
    image: "/classic-beef-burger.png",
    categoryIds: ["main"],
  },
  {
    id: 5,
    name: "Pasta Carbonara",
    description: "Spaghetti with creamy sauce, pancetta, and parmesan cheese",
    price: 13.99,
    image: "/colorful-pasta-arrangement.png",
    categoryIds: ["main"],
  },
  {
    id: 6,
    name: "Chicken Curry",
    description: "Tender chicken in a rich curry sauce with basmati rice",
    price: 15.99,
    image: "/flavorful-curry.png",
    categoryIds: ["main"],
  },
  {
    id: 7,
    name: "Vegetable Stir Fry",
    description: "Fresh seasonal vegetables stir-fried with soy sauce and ginger",
    price: 11.99,
    image: "/colorful-vegetable-stirfry.png",
    categoryIds: ["main", "vegetarian"],
  },
  {
    id: 8,
    name: "Chocolate Cake",
    description: "Rich chocolate cake with a molten center and vanilla ice cream",
    price: 7.99,
    image: "/decadent-chocolate-cake.png",
    categoryIds: ["dessert"],
  },
]

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

// 新增导入Supabase客户端
import { supabase } from "@/lib/supabase"

export default function FoodOrderingPage() {
  const [dishes, setDishes] = useState<Dish[]>(initialDishes)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    note: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)

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

  // Load data from localStorage on initial render
  useEffect(() => {
    // Load categories
    const savedCategories = localStorage.getItem("categories")
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories))
      } catch (error) {
        console.error("Error loading categories:", error)
      }
    }

    // Load dishes
    const savedDishes = localStorage.getItem("dishes")
    if (savedDishes) {
      try {
        setDishes(JSON.parse(savedDishes))
      } catch (error) {
        console.error("Error loading dishes:", error)
      }
    }

    // 从Supabase加载订单历史
    fetchOrderHistory()
  }, [])

  // Save data to localStorage whenever it changes
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
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle image upload for meal in order history
  const handleMealImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMealImage(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setMealImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 修改添加图片到订单的功能
  const addMealImageToOrder = async () => {
    if (!selectedOrderId || !mealImagePreview || !mealImage) return

    try {
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
  const addNewDish = () => {
    // Validate form
    if (!newDish.name || !newDish.description || newDish.price <= 0) {
      alert("Please fill in all required fields")
      return
    }

    // Create new dish with generated ID
    const newId = Math.max(0, ...dishes.map((d) => d.id)) + 1

    // Use image preview if available, otherwise use placeholder
    const dishImage = imagePreview || "/placeholder.svg"

    const dishToAdd: Dish = {
      id: newId,
      name: newDish.name,
      description: newDish.description,
      price: newDish.price,
      image: dishImage,
      categoryIds: newDish.categoryIds,
    }

    // Add to dishes array
    setDishes((prev) => [...prev, dishToAdd])

    // Reset form
    setNewDish({
      name: "",
      description: "",
      price: 0,
      image: "",
      categoryIds: [],
    })
    setImageFile(null)
    setImagePreview("")
    setShowAddDishModal(false)
  }

  // Handle new category form change
  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewCategory((prev) => ({ ...prev, [name]: value }))
  }

  // Add new category
  const addNewCategory = () => {
    // Validate form
    if (!newCategory.name) {
      alert("Please enter a category name")
      return
    }

    // Create new category with generated ID
    const categoryId = newCategory.name.toLowerCase().replace(/\s+/g, "-")

    // Check if category with this ID already exists
    if (categories.some((cat) => cat.id === categoryId)) {
      alert("A category with this name already exists")
      return
    }

    const categoryToAdd: Category = {
      id: categoryId,
      name: newCategory.name,
      color: newCategory.color,
    }

    // Add to categories array
    setCategories((prev) => [...prev, categoryToAdd])

    // Reset form
    setNewCategory({
      name: "",
      color: categoryColors[0],
    })
  }

  // Delete category
  const deleteCategory = (categoryId: string) => {
    // Remove category from categories array
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))

    // Remove category from all dishes
    setDishes((prev) =>
      prev.map((dish) => ({
        ...dish,
        categoryIds: dish.categoryIds.filter((id) => id !== categoryId),
      })),
    )

    // If this was the active category, reset filter
    if (activeCategory === categoryId) {
      setActiveCategory(null)
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

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-emerald-600">美食点餐系统</h1>
        <div className="flex items-center gap-2">
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
      
      <div className="flex flex-col min-h-screen bg-emerald-50 pt-14">
        {/* 店铺信息 */}
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-emerald-700">
            <span className="text-orange-400">Tasty</span> Bites
          </h1>
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
