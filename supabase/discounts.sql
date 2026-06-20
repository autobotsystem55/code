-- ============================================================
--  Code Official — 折扣码 / 优惠券
--  Supabase → SQL Editor → 粘贴 → Run。需先跑过 admin-setup.sql
--  （依赖里面的 public.is_admin() 函数）。可重复运行。
-- ============================================================

create table if not exists public.discount_codes (
  code          text primary key,                 -- 例如 WELCOME10（不区分大小写校验）
  type          text not null default 'percent',  -- 'percent'(百分比) | 'fixed'(固定金额)
  value         numeric not null,                 -- percent: 10 = 9折; fixed: 10 = 减 RM10
  active        boolean not null default true,
  min_subtotal  numeric not null default 0,       -- 满多少才可用
  usage_limit   int,                              -- 总可用次数（null = 不限）
  used_count    int not null default 0,
  expires_at    timestamptz,                      -- 过期时间（null = 不过期）
  created_at    timestamptz default now()
);

alter table public.discount_codes enable row level security;
-- 只有管理员能直接读写折扣码表（不公开全部码）
drop policy if exists "admin manage discounts" on public.discount_codes;
create policy "admin manage discounts" on public.discount_codes
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- 顾客结账时校验一个码（不暴露整张表）：返回可用的折扣金额
drop function if exists public.validate_discount(text, numeric);
create or replace function public.validate_discount(p_code text, p_subtotal numeric)
returns table(code text, type text, value numeric, discount numeric)
language plpgsql security definer set search_path = public as $$
declare r public.discount_codes; d numeric;
begin
  select * into r from public.discount_codes
    where upper(code) = upper(p_code) and active = true
      and (expires_at is null or expires_at > now())
      and (usage_limit is null or used_count < usage_limit)
      and p_subtotal >= min_subtotal
    limit 1;
  if not found then return; end if;
  if r.type = 'percent' then d := round(p_subtotal * r.value / 100.0, 2);
  else d := least(r.value, p_subtotal); end if;
  return query select r.code, r.type, r.value, d;
end; $$;
grant execute on function public.validate_discount(text, numeric) to anon, authenticated;

-- 下单成功后把使用次数 +1
create or replace function public.redeem_discount(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.discount_codes set used_count = used_count + 1 where upper(code) = upper(p_code);
$$;
grant execute on function public.redeem_discount(text) to anon, authenticated;

-- 订单加上折扣字段
alter table public.orders add column if not exists discount_code   text;
alter table public.orders add column if not exists discount_amount numeric not null default 0;

-- ============================================================
--  v2（批次 1：优惠名称 + 开始时间排期 + 免运费类型）
--  可重复运行。跑过上面的内容后，再跑这一段即可升级。
-- ============================================================

-- 优惠名称（显示用，例如「新季 9 折」）+ 开始时间（排期：到点才生效）
alter table public.discount_codes add column if not exists name      text;
alter table public.discount_codes add column if not exists starts_at timestamptz;

-- 升级校验函数：支持 'free_shipping'(免运费) 类型 + 开始时间检查
create or replace function public.validate_discount(p_code text, p_subtotal numeric)
returns table(code text, type text, value numeric, discount numeric)
language plpgsql security definer set search_path = public as $$
declare r public.discount_codes; d numeric;
begin
  select * into r from public.discount_codes
    where upper(code) = upper(p_code) and active = true
      and (starts_at  is null or starts_at  <= now())
      and (expires_at is null or expires_at >  now())
      and (usage_limit is null or used_count < usage_limit)
      and p_subtotal >= min_subtotal
    limit 1;
  if not found then return; end if;
  if r.type = 'percent' then        d := round(p_subtotal * r.value / 100.0, 2);
  elsif r.type = 'free_shipping' then d := 0;          -- 运费在前端置零
  else                               d := least(r.value, p_subtotal);
  end if;
  return query select r.code, r.type, r.value, d;
end; $$;
grant execute on function public.validate_discount(text, numeric) to anon, authenticated;

-- ============================================================
--  v3（批次 2：买一送一 / 第N件半价 —— 需要看购物车明细的「购物车级」优惠）
--  可重复运行。这两类活动金额由结账页按购物车实时计算，
--  数据库只负责存「活动设置」并把它发给前端。
-- ============================================================

-- 活动设置（jsonb）+ 适用范围 + 是否自动套用（无需输码）
alter table public.discount_codes add column if not exists config     jsonb   not null default '{}'::jsonb;
alter table public.discount_codes add column if not exists scope_type  text    not null default 'all';   -- all | category | product
alter table public.discount_codes add column if not exists scope_ids   text[]  not null default '{}';
alter table public.discount_codes add column if not exists auto_apply  boolean not null default false;   -- true = 结账自动套用（买一送一/第N件）

-- validate_discount 需要返回更多列（config/scope）→ 先删再建
drop function if exists public.validate_discount(text, numeric);
create or replace function public.validate_discount(p_code text, p_subtotal numeric)
returns table(code text, type text, value numeric, discount numeric, config jsonb, scope_type text, scope_ids text[])
language plpgsql security definer set search_path = public as $$
declare r public.discount_codes; d numeric;
begin
  select * into r from public.discount_codes
    where upper(code) = upper(p_code) and active = true
      and (starts_at  is null or starts_at  <= now())
      and (expires_at is null or expires_at >  now())
      and (usage_limit is null or used_count < usage_limit)
      and p_subtotal >= min_subtotal
    limit 1;
  if not found then return; end if;
  if    r.type = 'free_shipping'  then d := 0;
  elsif r.type in ('bxgy','nth','percent','gift') then d := 0;   -- 由结账页按购物车明细/条件计算
  else                                 d := least(r.value, p_subtotal);
  end if;
  return query select r.code, r.type, r.value, d, r.config, r.scope_type, r.scope_ids;
end; $$;
grant execute on function public.validate_discount(text, numeric) to anon, authenticated;

-- 结账页自动获取所有「自动套用」的优惠（满额打折 / 立减 / 免运费 / 买一送一 / 第N件半价）
drop function if exists public.auto_discounts(numeric);
create or replace function public.auto_discounts(p_subtotal numeric default 0)
returns table(code text, name text, type text, value numeric, config jsonb, scope_type text, scope_ids text[], min_subtotal numeric)
language sql security definer set search_path = public as $$
  select code, name, type, value, config, scope_type, scope_ids, min_subtotal
  from public.discount_codes
  where active = true and auto_apply = true
    and (starts_at  is null or starts_at  <= now())
    and (expires_at is null or expires_at >  now())
    and (usage_limit is null or used_count < usage_limit)
    and p_subtotal >= min_subtotal
  order by created_at desc;
$$;
grant execute on function public.auto_discounts(numeric) to anon, authenticated;
