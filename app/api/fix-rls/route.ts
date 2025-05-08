import { NextResponse } from 'next/server'

export async function GET() {
  const sqlScripts = {
    enableRLS: `
-- 启用RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    `,
    
    createPolicies: `
-- 为categories表创建策略
CREATE POLICY "允许匿名读取分类" ON categories
  FOR SELECT USING (true);
  
CREATE POLICY "允许匿名创建分类" ON categories
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "允许匿名更新分类" ON categories
  FOR UPDATE USING (true) WITH CHECK (true);
  
CREATE POLICY "允许匿名删除分类" ON categories
  FOR DELETE USING (true);

-- 为dishes表创建策略
CREATE POLICY "允许匿名读取菜品" ON dishes
  FOR SELECT USING (true);
  
CREATE POLICY "允许匿名创建菜品" ON dishes
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "允许匿名更新菜品" ON dishes
  FOR UPDATE USING (true) WITH CHECK (true);
  
CREATE POLICY "允许匿名删除菜品" ON dishes
  FOR DELETE USING (true);

-- 为orders表创建策略
CREATE POLICY "允许匿名读取订单" ON orders
  FOR SELECT USING (true);
  
CREATE POLICY "允许匿名创建订单" ON orders
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "允许匿名更新订单" ON orders
  FOR UPDATE USING (true) WITH CHECK (true);
  
CREATE POLICY "允许匿名删除订单" ON orders
  FOR DELETE USING (true);
    `,
    
    viewPolicies: `
-- 查看现有策略
SELECT table_name, policy_name, action, definition 
FROM information_schema.policies 
ORDER BY table_name, policy_name;
    `,
    
    checkRLS: `
-- 检查哪些表启用了RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
    `,
    
    authorizedRequest: `
-- 设置anon角色权限
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON dishes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon;
GRANT USAGE, SELECT ON SEQUENCE dishes_id_seq TO anon;
    `
  }

  return NextResponse.json({
    message: '以下是修复Supabase数据库权限的SQL脚本',
    sqlScripts
  })
} 