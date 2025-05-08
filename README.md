# 食物点餐系统

这是一个基于Next.js和Supabase开发的食物点餐系统，包含以下功能：

- 前端点餐页面：展示菜品、分类筛选、购物车管理
- 下单功能：提交订单到后端API
- 订单管理后台：查看和管理订单
- 邮件通知：订单提交后自动发送邮件通知

## 项目结构

```
/app                  # Next.js 应用目录
  /api                # API 路由
    /order           # 订单提交API
    /admin           # 管理API
      /orders        # 订单管理API
  /admin             # 管理后台页面
  page.tsx           # 主页（点餐页面）
/components           # UI组件
/lib                  # 工具库
  supabase.ts        # Supabase 客户端和数据库操作
  utils.ts           # 通用工具函数
/public               # 静态资源
```

## 数据库结构

项目使用Supabase作为后端数据库，包含以下表：

1. `categories`：菜品分类
   - id: string (主键)
   - name: string (分类名称)
   - description: string (分类描述)

2. `dishes`：菜品信息
   - id: int (主键)
   - name: string (菜品名称)
   - description: string (菜品描述)
   - price: decimal (菜品价格)
   - image: string (菜品图片URL)
   - category_id: string (外键，关联categories表)

3. `orders`：订单信息
   - id: uuid (主键，自动生成)
   - items: jsonb (订单项，JSON格式)
   - customer_name: string (顾客姓名)
   - customer_email: string (顾客邮箱，可选)
   - notes: string (订单备注，可选)
   - created_at: timestamp (创建时间)

## 环境变量设置

在Vercel部署时，需要设置以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase项目API密钥（anon key）
EMAIL_USER=发送邮件的Gmail账号
EMAIL_PASS=Gmail应用密码（不是登录密码）
RESTAURANT_EMAIL=接收订单通知的邮箱（可选，不设置则发送到EMAIL_USER）
```

在本地开发中，可以创建`.env.local`文件并添加以上环境变量。

## 本地开发

1. 克隆项目

```bash
git clone [项目地址]
cd food-ordering
```

2. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

3. 创建`.env.local`文件，设置环境变量

4. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

5. 访问`http://localhost:3000`查看应用

## 部署

项目可以部署到Vercel平台：

1. 将代码推送到GitHub仓库
2. 在Vercel中创建新项目，连接GitHub仓库
3. 设置环境变量（见上文）
4. 部署项目

## 后续开发计划

- 增加登录功能：区分普通用户和管理员
- 完善订单管理：添加订单状态管理（已接单、制作中、已完成）
- 添加支付集成：接入支付宝、微信支付等
- 优化移动端体验：针对不同设备做自适应设计 