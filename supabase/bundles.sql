-- ============================================================
--  Code Official — 套装 / 组合购 (bundles)
--  Supabase → SQL Editor → 粘贴 → Run。需先跑过 admin-setup.sql。可重复运行。
-- ============================================================

create table if not exists public.bundles (
  id            text primary key,                  -- 例如 'set-workwear'
  name          text not null,                     -- 英文名
  name_zh       text,                              -- 中文名
  description     text,
  description_zh  text,
  image         text,                              -- 封面图（Unsplash ID 或网址）
  type          text not null default 'fixed',     -- 'fixed'=固定套装 | 'mix'=自选组合
  price_mode    text not null default 'fixed',     -- 'fixed'=固定套装价 | 'percent'=按总价打折
  price         numeric,                           -- price_mode='fixed' 时的套装价
  percent       numeric,                           -- price_mode='percent' 时的折扣%（如 15 = 减 15%）
  -- fixed:  [{"product_id":"overcoat-01"}, ...]
  -- mix:    {"pool":["tee-...","shirt-..."], "choose":3}
  components    jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  sort          int not null default 0,
  created_at    timestamptz default now()
);

alter table public.bundles enable row level security;

-- 顾客可读上架套装；管理员可增删改
drop policy if exists "bundles are viewable by everyone" on public.bundles;
create policy "bundles are viewable by everyone" on public.bundles
  for select using (active = true);
drop policy if exists "admin manage bundles" on public.bundles;
create policy "admin manage bundles" on public.bundles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
