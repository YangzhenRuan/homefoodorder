import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // 检查表是否存在，如果不存在则创建
    const tablesStatus = {
      categories: false,
      dishes: false,
      orders: false
    };
    
    // 检查categories表
    const { data: checkCategories, error: errorCheckCategories } = await supabase
      .from('categories')
      .select('count()', { count: 'exact', head: true });
    
    if (errorCheckCategories && errorCheckCategories.code === '42P01') {
      // 表不存在，创建表
      const { error: createError } = await supabase.rpc('create_categories_table');
      tablesStatus.categories = !createError;
      
      if (createError) {
        // 如果RPC调用失败，尝试直接执行SQL
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              color TEXT,
              description TEXT
            );
          `
        });
        tablesStatus.categories = !sqlError;
      }
    } else {
      tablesStatus.categories = true;
    }
    
    // 检查dishes表
    const { data: checkDishes, error: errorCheckDishes } = await supabase
      .from('dishes')
      .select('count()', { count: 'exact', head: true });
    
    if (errorCheckDishes && errorCheckDishes.code === '42P01') {
      // 表不存在，创建表
      const { error: createError } = await supabase.rpc('create_dishes_table');
      tablesStatus.dishes = !createError;
      
      if (createError) {
        // 如果RPC调用失败，尝试直接执行SQL
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS dishes (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              price DECIMAL(10, 2) NOT NULL,
              image TEXT,
              category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE
            );
          `
        });
        tablesStatus.dishes = !sqlError;
      }
    } else {
      tablesStatus.dishes = true;
    }
    
    // 检查orders表
    const { data: checkOrders, error: errorCheckOrders } = await supabase
      .from('orders')
      .select('count()', { count: 'exact', head: true });
    
    if (errorCheckOrders && errorCheckOrders.code === '42P01') {
      // 表不存在，创建表
      const { error: createError } = await supabase.rpc('create_orders_table');
      tablesStatus.orders = !createError;
      
      if (createError) {
        // 如果RPC调用失败，尝试直接执行SQL
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS orders (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              items JSONB NOT NULL,
              customer_name TEXT NOT NULL,
              customer_email TEXT,
              notes TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              images TEXT[] DEFAULT '{}'::TEXT[]
            );
          `
        });
        tablesStatus.orders = !sqlError;
      }
    } else {
      tablesStatus.orders = true;
    }
    
    // 检查表结构
    const columnsStatus = {
      categories: { color: false },
      dishes: { category_id: false },
      orders: { images: false }
    };
    
    // 检查categories表是否有color列
    if (tablesStatus.categories) {
      const { data: catColumns, error: catColumnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'categories' });
      
      if (!catColumnsError && catColumns) {
        columnsStatus.categories.color = catColumns.some((col: any) => col.column_name === 'color');
        
        if (!columnsStatus.categories.color) {
          // 添加color列
          const { error: addColorError } = await supabase.rpc('execute_sql', {
            sql: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;`
          });
          columnsStatus.categories.color = !addColorError;
        }
      }
    }
    
    // 检查orders表是否有images列
    if (tablesStatus.orders) {
      const { data: orderColumns, error: orderColumnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'orders' });
      
      if (!orderColumnsError && orderColumns) {
        columnsStatus.orders.images = orderColumns.some((col: any) => col.column_name === 'images');
        
        if (!columnsStatus.orders.images) {
          // 添加images列
          const { error: addImagesError } = await supabase.rpc('execute_sql', {
            sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[];`
          });
          columnsStatus.orders.images = !addImagesError;
        }
      }
    }
    
    // 创建RLS策略
    const { data: rlsResult, error: rlsError } = await supabase.rpc('execute_sql', {
      sql: `
        -- 启用RLS
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
        
        -- 为categories表创建策略
        DROP POLICY IF EXISTS "允许匿名读取分类" ON categories;
        CREATE POLICY "允许匿名读取分类" ON categories FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "允许匿名创建分类" ON categories;
        CREATE POLICY "允许匿名创建分类" ON categories FOR INSERT WITH CHECK (true);
        
        DROP POLICY IF EXISTS "允许匿名更新分类" ON categories;
        CREATE POLICY "允许匿名更新分类" ON categories FOR UPDATE USING (true) WITH CHECK (true);
        
        DROP POLICY IF EXISTS "允许匿名删除分类" ON categories;
        CREATE POLICY "允许匿名删除分类" ON categories FOR DELETE USING (true);
        
        -- 为dishes表创建策略
        DROP POLICY IF EXISTS "允许匿名读取菜品" ON dishes;
        CREATE POLICY "允许匿名读取菜品" ON dishes FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "允许匿名创建菜品" ON dishes;
        CREATE POLICY "允许匿名创建菜品" ON dishes FOR INSERT WITH CHECK (true);
        
        DROP POLICY IF EXISTS "允许匿名更新菜品" ON dishes;
        CREATE POLICY "允许匿名更新菜品" ON dishes FOR UPDATE USING (true) WITH CHECK (true);
        
        DROP POLICY IF EXISTS "允许匿名删除菜品" ON dishes;
        CREATE POLICY "允许匿名删除菜品" ON dishes FOR DELETE USING (true);
        
        -- 为orders表创建策略
        DROP POLICY IF EXISTS "允许匿名读取订单" ON orders;
        CREATE POLICY "允许匿名读取订单" ON orders FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "允许匿名创建订单" ON orders;
        CREATE POLICY "允许匿名创建订单" ON orders FOR INSERT WITH CHECK (true);
        
        DROP POLICY IF EXISTS "允许匿名更新订单" ON orders;
        CREATE POLICY "允许匿名更新订单" ON orders FOR UPDATE USING (true) WITH CHECK (true);
        
        DROP POLICY IF EXISTS "允许匿名删除订单" ON orders;
        CREATE POLICY "允许匿名删除订单" ON orders FOR DELETE USING (true);
        
        -- 设置anon角色权限
        GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON dishes TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon;
        GRANT USAGE, SELECT ON SEQUENCE dishes_id_seq TO anon;
      `
    });
    
    return NextResponse.json({
      message: '数据库结构检查和修复已执行',
      tablesStatus,
      columnsStatus,
      rlsStatus: !rlsError
    });
  } catch (error: any) {
    console.error('检查并修复数据库结构时出错:', error);
    
    return NextResponse.json({
      error: true,
      message: error.message || '执行数据库检查失败',
      details: error.details || null
    }, { status: 500 });
  }
} 