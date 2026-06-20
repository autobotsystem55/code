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
