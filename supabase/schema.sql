-- ============================================================
--  PÉTALE — Supabase 数据库结构
--  用法：Supabase 后台 → 左侧 SQL Editor → New query →
--        把这整个文件粘进去 → 点 Run。跑一次即可。
--  （安全：这里没有任何密钥，纯建表，可放心运行）
-- ============================================================

-- 1) 商品表 PRODUCTS ----------------------------------------
create table if not exists public.products (
  id              text primary key,         -- 例如 'silk-dress-05'
  slug            text,
  name            text not null,            -- 英文名
  name_zh         text,                     -- 中文名
  category        text not null,            -- Outerwear / Knitwear / Dresses ...
  price           numeric not null,
  compare_at      numeric,                  -- 划线原价（打折时用，可空）
  badge           text,                     -- 'New' / 'Sale'（可空）
  description     text,
  description_zh  text,
  sizes           jsonb default '[]'::jsonb,  -- ["XS","S","M","L","XL"]
  colors          jsonb default '[]'::jsonb,  -- [{"name":"Champagne","hex":"#E4D2B8"}]
  images          jsonb default '[]'::jsonb,  -- ["unsplash-id 或 图片网址"]
  active          boolean default true,       -- false = 下架
  sort            int default 0,              -- 排序（越小越靠前）
  created_at      timestamptz default now()
);

-- 2) 会员资料表 PROFILES（每个注册用户一行）-----------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz default now()
);

-- 新用户注册时，自动给他建一行 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) 订单表 ORDERS ------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text unique not null,       -- 例如 'ME1234567'
  user_id       uuid references auth.users(id) on delete set null, -- 游客下单则为空
  email         text,
  customer      jsonb,                       -- 姓名 / 电话 / 地址等
  items         jsonb not null,              -- 购物车明细
  subtotal      numeric not null,
  shipping      numeric not null default 0,
  total         numeric not null,
  currency      text default 'MYR',
  status        text default 'pending',      -- pending / paid / shipped ...
  created_at    timestamptz default now()
);

create index if not exists orders_user_idx  on public.orders (user_id);
create index if not exists orders_email_idx on public.orders (email);

-- ============================================================
--  行级安全 Row Level Security（决定谁能读/写哪些数据）
-- ============================================================
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders   enable row level security;

-- 商品：所有人都能「读」上架商品；写入只在后台/用密钥做
drop policy if exists "products are viewable by everyone" on public.products;
create policy "products are viewable by everyone" on public.products
  for select using (active = true);

-- 会员资料：用户只能看/改自己的
drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 订单：任何人（含游客）都能「下单」；登录用户能读自己的订单
drop policy if exists "anyone can create an order" on public.orders;
create policy "anyone can create an order" on public.orders
  for insert with check (true);
drop policy if exists "users can read own orders" on public.orders;
create policy "users can read own orders" on public.orders
  for select using (auth.uid() = user_id);

-- ============================================================
--  完成。商品数据我会另外给你一份 seed.sql（把现有 12 件商品导入）。
-- ============================================================
