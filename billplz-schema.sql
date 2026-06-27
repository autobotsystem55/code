-- ============================================================
--  Billplz 支付集成 — 数据库结构
--  用法：Supabase 后台 → 左侧 SQL Editor → New query →
--        把这整个文件粘进去 → 点 Run。跑一次即可。
--  作用：给 orders 表加 3 个字段，用来追踪 Billplz 付款状态。
--        Webhook 用 service-role 自动写入，前台/客人写不进去。
-- ============================================================

-- 给 orders 表加 3 列
alter table public.orders
  add column if not exists billplz_bill_id text,
  add column if not exists payment_status  text default 'pending',
  add column if not exists paid_at         timestamptz;

-- 加索引：webhook 用 billplz_bill_id 查订单
create index if not exists orders_billplz_bill_idx
  on public.orders (billplz_bill_id);

-- 让登录用户也能读自己订单的这几列（已有 select 政策覆盖，无需新政策）
-- webhook 用 service_role key 绕过 RLS 写入，也无需新政策

-- ============================================================
--  完成。回到 Supabase 后台 → Table Editor → orders，
--  能看到右边多了 billplz_bill_id / payment_status / paid_at 3 列。
-- ============================================================
