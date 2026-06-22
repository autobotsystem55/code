-- ============================================================
--  积分 + 现金券 Store Credit & Vouchers — 一次性数据库设置
-- ------------------------------------------------------------
--  在 Supabase 控制台执行一次即可：
--   1) https://supabase.com/dashboard → 选你的项目
--   2) 左侧 SQL Editor → New query
--   3) 把这整个文件粘贴进去 → 点 Run
--
--  ✅ 安全：全部「新增/替换」，不动现有的商品 / 订单 / 会员数据。
--  ✅ 可重复运行（幂等）：之前跑过旧版也没关系，重跑一次就到最新。
--
--  奖励分两种：
--   • 现金券（voucher）：注册、生日时送一张 RM 礼券（有面额/有效期/可设满额）。
--   • 积分（points）：每次购物返积分，结账当现金抵。
--  规则（送多少、返几积分…）在后台「积分/现金券」页里设。
-- ============================================================

-- ---------- 字段补充 ----------
alter table public.orders    add column if not exists credit_used numeric(10,2) not null default 0; -- 这单用了多少积分(RM)
alter table public.orders    add column if not exists voucher_id  bigint;                            -- 这单用了哪张现金券
alter table public.profiles  add column if not exists birthday    date;                              -- 生日（发生日券用）

-- ---------- 积分钱包 ----------
create table if not exists public.store_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.store_credit_accounts enable row level security;

create table if not exists public.store_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta numeric(10,2) not null,
  reason text not null,
  note text,
  order_number text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sc_ledger_user on public.store_credit_ledger(user_id, created_at desc);
alter table public.store_credit_ledger enable row level security;

-- ---------- 现金券 ----------
create table if not exists public.vouchers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null,          -- 面额（RM）
  min_spend numeric(10,2) not null default 0, -- 满额可用（0=无门槛）
  reason text not null,                    -- signup / birthday / admin
  note text,
  expires_at timestamptz,
  used_at timestamptz,                     -- null=未使用
  used_order text,
  created_at timestamptz not null default now()
);
create index if not exists idx_vouchers_user on public.vouchers(user_id, created_at desc);
alter table public.vouchers enable row level security;

-- ---------- RLS：会员只能看自己的；管理员看全部；改动只能走函数 ----------
drop policy if exists sc_acct_select_own on public.store_credit_accounts;
create policy sc_acct_select_own on public.store_credit_accounts for select using (auth.uid() = user_id);
drop policy if exists sc_ledger_select_own on public.store_credit_ledger;
create policy sc_ledger_select_own on public.store_credit_ledger for select using (auth.uid() = user_id);
drop policy if exists vouchers_select_own on public.vouchers;
create policy vouchers_select_own on public.vouchers for select using (auth.uid() = user_id);

drop policy if exists sc_acct_select_admin on public.store_credit_accounts;
create policy sc_acct_select_admin on public.store_credit_accounts for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));
drop policy if exists sc_ledger_select_admin on public.store_credit_ledger;
create policy sc_ledger_select_admin on public.store_credit_ledger for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));
drop policy if exists vouchers_select_admin on public.vouchers;
create policy vouchers_select_admin on public.vouchers for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));

-- ---------- 内部助手 ----------
create or replace function public._sc_apply(p_user uuid, p_delta numeric, p_reason text, p_note text, p_order text, p_expires timestamptz)
returns numeric language plpgsql security definer set search_path = public as $$
declare new_bal numeric;
begin
  insert into public.store_credit_accounts(user_id, balance, updated_at)
    values (p_user, greatest(0, p_delta), now())
  on conflict (user_id) do update set balance = public.store_credit_accounts.balance + p_delta, updated_at = now()
  returning balance into new_bal;
  insert into public.store_credit_ledger(user_id, delta, reason, note, order_number, expires_at)
    values (p_user, p_delta, p_reason, p_note, p_order, p_expires);
  return new_bal;
end $$;

create or replace function public._voucher_issue(p_user uuid, p_amount numeric, p_min numeric, p_reason text, p_note text, p_expires timestamptz)
returns bigint language plpgsql security definer set search_path = public as $$
declare vid bigint;
begin
  insert into public.vouchers(user_id, amount, min_spend, reason, note, expires_at)
    values (p_user, p_amount, coalesce(p_min,0), p_reason, p_note, p_expires)
  returning id into vid;
  return vid;
end $$;

-- ---------- 积分：结账折抵 ----------
create or replace function public.redeem_store_credit(p_amount numeric, p_order text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bal numeric;
begin
  if uid is null then raise exception '请先登录'; end if;
  if p_amount is null or p_amount <= 0 then raise exception '金额无效'; end if;
  select balance into bal from public.store_credit_accounts where user_id = uid for update;
  if bal is null or bal < p_amount then raise exception '积分余额不足'; end if;
  return public._sc_apply(uid, -p_amount, 'redeem', null, p_order, null);
end $$;
grant execute on function public.redeem_store_credit(numeric, text) to authenticated;

-- ---------- 现金券：结账核销 ----------
create or replace function public.redeem_voucher(p_id bigint, p_order text, p_subtotal numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v public.vouchers;
begin
  if uid is null then raise exception '请先登录'; end if;
  select * into v from public.vouchers where id = p_id and user_id = uid for update;
  if v.id is null then raise exception '现金券不存在'; end if;
  if v.used_at is not null then raise exception '现金券已使用'; end if;
  if v.expires_at is not null and v.expires_at < now() then raise exception '现金券已过期'; end if;
  if coalesce(v.min_spend,0) > coalesce(p_subtotal,0) then raise exception '未达最低消费'; end if;
  update public.vouchers set used_at = now(), used_order = p_order where id = p_id;
  return least(v.amount, coalesce(p_subtotal,0));   -- 实际抵扣（不超过订单金额）
end $$;
grant execute on function public.redeem_voucher(bigint, text, numeric) to authenticated;

-- ---------- 生日券：会员生日当月一访问就领（每年一次，幂等） ----------
create or replace function public.claim_birthday_voucher()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sc jsonb; v jsonb; bday date; amt numeric; mn numeric; days int;
begin
  if uid is null then return null; end if;
  select data->'storeCredit' into sc from public.settings where id = 1;
  if sc is null or coalesce((sc->>'enabled')::boolean, true) = false then return null; end if;
  v := sc#>'{voucher,birthday}';
  if v is null or coalesce((v->>'on')::boolean, false) = false then return null; end if;
  select birthday into bday from public.profiles where id = uid;
  if bday is null then return null; end if;
  if extract(month from bday) <> extract(month from now()) then return null; end if;
  if exists(select 1 from public.vouchers where user_id = uid and reason = 'birthday'
            and extract(year from created_at) = extract(year from now())) then return null; end if;
  amt := coalesce((v->>'amt')::numeric, 0); if amt <= 0 then return null; end if;
  mn   := coalesce((v->>'minSpend')::numeric, 0);
  days := coalesce((v->>'expiryDays')::int, 0);
  perform public._voucher_issue(uid, amt, mn, 'birthday', '生日礼券 🎂',
    case when days > 0 then now() + (days || ' days')::interval else null end);
  return jsonb_build_object('amount', amt);
end $$;
grant execute on function public.claim_birthday_voucher() to authenticated;

-- ---------- 管理员 ----------
create or replace function public.admin_adjust_credit(p_user uuid, p_delta numeric, p_note text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception '仅限管理员'; end if;
  if p_delta = 0 then raise exception '金额不能为 0'; end if;
  if p_delta < 0 then
    select balance into bal from public.store_credit_accounts where user_id=p_user for update;
    if coalesce(bal,0) + p_delta < 0 then raise exception '扣减后余额会变成负数'; end if;
  end if;
  return public._sc_apply(p_user, p_delta, case when p_delta>=0 then 'admin_grant' else 'admin_deduct' end, p_note, null, null);
end $$;
grant execute on function public.admin_adjust_credit(uuid, numeric, text) to authenticated;

create or replace function public.admin_issue_voucher(p_user uuid, p_amount numeric, p_min numeric, p_note text, p_expiry_days int)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception '仅限管理员'; end if;
  if p_amount is null or p_amount <= 0 then raise exception '面额无效'; end if;
  return public._voucher_issue(p_user, p_amount, coalesce(p_min,0), 'admin', coalesce(p_note,'店家赠送'),
    case when coalesce(p_expiry_days,0) > 0 then now() + (p_expiry_days || ' days')::interval else null end);
end $$;
grant execute on function public.admin_issue_voucher(uuid, numeric, numeric, text, int) to authenticated;

-- 后台会员总览：积分余额 + 有效现金券张数/总额
drop function if exists public.admin_credit_overview();
create or replace function public.admin_credit_overview()
returns table(user_id uuid, full_name text, email text, phone text, birthday date,
              balance numeric, voucher_count bigint, voucher_total numeric, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception '仅限管理员'; end if;
  return query
    select p.id, p.full_name, p.email, p.phone, p.birthday,
           coalesce(a.balance,0),
           coalesce(vc.cnt,0), coalesce(vc.tot,0),
           p.created_at
    from public.profiles p
    left join public.store_credit_accounts a on a.user_id = p.id
    left join (
      select user_id, count(*) cnt, sum(amount) tot from public.vouchers
      where used_at is null and (expires_at is null or expires_at > now())
      group by user_id
    ) vc on vc.user_id = p.id
    where coalesce(p.is_admin,false) = false
    order by coalesce(a.balance,0) desc, p.created_at desc;
end $$;
grant execute on function public.admin_credit_overview() to authenticated;

-- ---------- 触发器 ----------
-- 注册即送「现金券」（读取设置 voucher.signup）
create or replace function public._sc_signup_bonus()
returns trigger language plpgsql security definer set search_path = public as $$
declare sc jsonb; v jsonb; amt numeric; mn numeric; days int;
begin
  select data->'storeCredit' into sc from public.settings where id = 1;
  if sc is null or coalesce((sc->>'enabled')::boolean, true) = false then return new; end if;
  v := sc#>'{voucher,signup}';
  if v is null or coalesce((v->>'on')::boolean, false) = false then return new; end if;
  amt := coalesce((v->>'amt')::numeric, 0); if amt <= 0 then return new; end if;
  if exists(select 1 from public.vouchers where user_id = new.id and reason = 'signup') then return new; end if;
  mn   := coalesce((v->>'minSpend')::numeric, 0);
  days := coalesce((v->>'expiryDays')::int, 0);
  perform public._voucher_issue(new.id, amt, mn, 'signup', '新会员现金券',
    case when days > 0 then now() + (days || ' days')::interval else null end);
  return new;
end $$;
drop trigger if exists trg_sc_signup on public.profiles;
create trigger trg_sc_signup after insert on public.profiles
  for each row execute function public._sc_signup_bonus();

-- 订单「已付款/已发货」时返「积分」（消费返现）
create or replace function public._sc_order_earn()
returns trigger language plpgsql security definer set search_path = public as $$
declare sc jsonb; rate numeric; cap numeric; base numeric; back numeric; mon int;
begin
  if new.user_id is null then return new; end if;
  if new.status not in ('paid','shipped') then return new; end if;
  select data->'storeCredit' into sc from public.settings where id = 1;
  if sc is null or coalesce((sc->>'enabled')::boolean, true) = false then return new; end if;
  if coalesce((sc#>>'{cashback,on}')::boolean, false) = false then return new; end if;
  rate := coalesce((sc#>>'{cashback,rate}')::numeric, 0);
  cap  := coalesce((sc#>>'{cashback,cap}')::numeric, 0);
  mon  := coalesce((sc->>'expiryMonths')::int, 0);
  if rate > 0 and not exists(select 1 from public.store_credit_ledger
                             where user_id = new.user_id and reason = 'cashback' and order_number = new.order_number) then
    base := greatest(0, coalesce(new.subtotal,0) - coalesce(new.credit_used,0));
    back := round(base * rate / 100.0, 2);
    if cap > 0 and back > cap then back := cap; end if;
    if back > 0 then
      perform public._sc_apply(new.user_id, back, 'cashback', '消费返现 ' || rate || '%',
        new.order_number, case when mon > 0 then now() + (mon || ' months')::interval else null end);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_sc_order_earn on public.orders;
create trigger trg_sc_order_earn after insert or update of status on public.orders
  for each row execute function public._sc_order_earn();

-- ============================================================
--  完成！注册/生日 → 现金券；购物 → 积分。
-- ============================================================
