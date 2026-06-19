-- ============================================================
--  Code Official — 后台所需的数据库设置（管理员函数、权限、设置表）
--  顺序：先用管理员邮箱在 /account.html 注册过账号，再跑这整段。
--  把 YOUR_ADMIN_EMAIL@example.com 改成你的管理员邮箱（或让我帮你填）。
--  Supabase → SQL Editor → 粘贴 → Run。可重复运行。
-- ============================================================

-- 1) profiles 加 is_admin / email 两列 ------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists email text;

-- 让新用户注册时也把 email 存进 profiles（方便后台看顾客）
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

-- 回填已有用户的 email
update public.profiles p set email = u.email
from auth.users u where u.id = p.id and (p.email is null or p.email = '');

-- 2) 把管理员邮箱设为 is_admin ------------------------------
update public.profiles set is_admin = true
where id in (select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com');

-- 3) is_admin() 函数（security definer，避免 RLS 递归）-------
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 4) 权限策略（统一用 is_admin()）---------------------------
-- 商品：管理员可增删改；顾客只读（公开读策略之前已建）
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- 订单：管理员可读全部 + 改状态
drop policy if exists "admin read all orders" on public.orders;
create policy "admin read all orders" on public.orders
  for select to authenticated using ( public.is_admin() );
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders
  for update to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- 顾客：管理员可读全部会员资料
drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles" on public.profiles
  for select to authenticated using ( public.is_admin() );

-- 5) 店铺设置表（单行）-------------------------------------
create table if not exists public.settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  constraint settings_singleton check (id = 1)
);
insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

alter table public.settings enable row level security;
-- 任何人可读设置（店面要用）；只有管理员可改
drop policy if exists "settings readable by all" on public.settings;
create policy "settings readable by all" on public.settings for select using ( true );
drop policy if exists "admin writes settings" on public.settings;
create policy "admin writes settings" on public.settings
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
