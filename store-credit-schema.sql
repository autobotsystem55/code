-- ============================================================
--  购物金 Store Credit — 一次性数据库设置
-- ------------------------------------------------------------
--  在 Supabase 控制台执行一次即可：
--   1) 打开 https://supabase.com/dashboard → 选你的项目
--   2) 左侧 SQL Editor → New query
--   3) 把这整个文件粘贴进去 → 点 Run
--
--  ✅ 安全：全部是「新增」，不会动到现有的商品 / 订单 / 会员数据。
--  ✅ 可重复运行（幂等）：再跑一次也不会出错或重复。
-- ============================================================

-- 1) 订单表加一列：这一单用了多少购物金（默认 0）
alter table public.orders
  add column if not exists credit_used numeric(10,2) not null default 0;

-- 2) 购物金「钱包」——每个会员一行，存当前余额
create table if not exists public.store_credit_accounts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    numeric(10,2) not null default 0,
  updated_at timestamptz   not null default now()
);
alter table public.store_credit_accounts enable row level security;

-- 3) 购物金「流水」——每一笔进出的明细
create table if not exists public.store_credit_ledger (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  delta        numeric(10,2) not null,        -- 正数=获得，负数=使用
  reason       text not null,                 -- signup / cashback / redeem / admin_grant / admin_deduct
  note         text,                          -- 显示文字 / 管理员备注
  order_number text,                          -- 关联的订单号（如有）
  expires_at   timestamptz,                   -- 到期日（获得时记录，用于展示提醒）
  created_at   timestamptz not null default now()
);
create index if not exists idx_sc_ledger_user
  on public.store_credit_ledger(user_id, created_at desc);
alter table public.store_credit_ledger enable row level security;

-- 4) 安全规则（RLS）：会员只能「看」自己的余额和流水，不能直接改
drop policy if exists sc_acct_select_own on public.store_credit_accounts;
create policy sc_acct_select_own on public.store_credit_accounts
  for select using (auth.uid() = user_id);

drop policy if exists sc_ledger_select_own on public.store_credit_ledger;
create policy sc_ledger_select_own on public.store_credit_ledger
  for select using (auth.uid() = user_id);

-- 管理员可以看全部会员的余额和流水
drop policy if exists sc_acct_select_admin on public.store_credit_accounts;
create policy sc_acct_select_admin on public.store_credit_accounts
  for select using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists sc_ledger_select_admin on public.store_credit_ledger;
create policy sc_ledger_select_admin on public.store_credit_ledger
  for select using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 5) 内部助手函数：加/减余额并记一笔流水（原子操作，外部不直接调用）
create or replace function public._sc_apply(
  p_user uuid, p_delta numeric, p_reason text,
  p_note text, p_order text, p_expires timestamptz)
returns numeric
language plpgsql security definer set search_path = public as $$
declare new_bal numeric;
begin
  insert into public.store_credit_accounts(user_id, balance, updated_at)
    values (p_user, greatest(0, p_delta), now())
  on conflict (user_id) do update
    set balance = public.store_credit_accounts.balance + p_delta,
        updated_at = now()
  returning balance into new_bal;

  insert into public.store_credit_ledger(user_id, delta, reason, note, order_number, expires_at)
    values (p_user, p_delta, p_reason, p_note, p_order, p_expires);

  return new_bal;
end $$;

-- 6) 顾客结账时使用购物金（只能用自己的、且不能超过余额）
create or replace function public.redeem_store_credit(p_amount numeric, p_order text default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bal numeric;
begin
  if uid is null then raise exception '请先登录'; end if;
  if p_amount is null or p_amount <= 0 then raise exception '金额无效'; end if;
  select balance into bal from public.store_credit_accounts where user_id = uid for update;
  if bal is null or bal < p_amount then raise exception '购物金余额不足'; end if;
  return public._sc_apply(uid, -p_amount, 'redeem', null, p_order, null);
end $$;
grant execute on function public.redeem_store_credit(numeric, text) to authenticated;

-- 7) 管理员手动充值 / 扣减某会员的购物金
create or replace function public.admin_adjust_credit(p_user uuid, p_delta numeric, p_note text default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin)
    then raise exception '仅限管理员'; end if;
  if p_delta = 0 then raise exception '金额不能为 0'; end if;
  if p_delta < 0 then
    select balance into bal from public.store_credit_accounts where user_id = p_user for update;
    if coalesce(bal,0) + p_delta < 0 then raise exception '扣减后余额会变成负数'; end if;
  end if;
  return public._sc_apply(p_user, p_delta,
    case when p_delta >= 0 then 'admin_grant' else 'admin_deduct' end,
    p_note, null, null);
end $$;
grant execute on function public.admin_adjust_credit(uuid, numeric, text) to authenticated;

-- 8) 管理员后台：列出所有会员 + 余额
create or replace function public.admin_credit_overview()
returns table(user_id uuid, full_name text, email text, phone text, balance numeric, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin)
    then raise exception '仅限管理员'; end if;
  return query
    select p.id, p.full_name, p.email, p.phone, coalesce(a.balance, 0), p.created_at
    from public.profiles p
    left join public.store_credit_accounts a on a.user_id = p.id
    where coalesce(p.is_admin, false) = false
    order by coalesce(a.balance, 0) desc, p.created_at desc;
end $$;
grant execute on function public.admin_credit_overview() to authenticated;

-- 9) 新会员注册自动送购物金（读取「设置」里的规则；当 when=register 时触发）
create or replace function public._sc_signup_bonus()
returns trigger
language plpgsql security definer set search_path = public as $$
declare sc jsonb; amt numeric; whn text; mon int;
begin
  select data->'storeCredit' into sc from public.settings where id = 1;
  if sc is null or coalesce((sc->>'enabled')::boolean, true) = false then return new; end if;
  if coalesce((sc#>>'{signup,on}')::boolean, false) = false then return new; end if;
  whn := coalesce(sc#>>'{signup,when}', 'register');
  if whn <> 'register' then return new; end if;
  amt := coalesce((sc#>>'{signup,amt}')::numeric, 0);
  if amt <= 0 then return new; end if;
  -- 幂等：已经发过注册礼金就不再发
  if exists (select 1 from public.store_credit_ledger where user_id = new.id and reason = 'signup')
    then return new; end if;
  mon := coalesce((sc->>'expiryMonths')::int, 0);
  perform public._sc_apply(new.id, amt, 'signup', '新会员注册礼金', null,
    case when mon > 0 then now() + (mon || ' months')::interval else null end);
  return new;
end $$;

drop trigger if exists trg_sc_signup on public.profiles;
create trigger trg_sc_signup after insert on public.profiles
  for each row execute function public._sc_signup_bonus();

-- 10) 订单「已付款 / 已发货」时自动返现（也处理「完成首单才送」的注册礼金）
create or replace function public._sc_order_earn()
returns trigger
language plpgsql security definer set search_path = public as $$
declare sc jsonb; rate numeric; cap numeric; base numeric; back numeric; mon int; whn text; amt numeric;
begin
  if new.user_id is null then return new; end if;
  if new.status not in ('paid', 'shipped') then return new; end if;
  select data->'storeCredit' into sc from public.settings where id = 1;
  if sc is null or coalesce((sc->>'enabled')::boolean, true) = false then return new; end if;
  mon := coalesce((sc->>'expiryMonths')::int, 0);

  -- 完成首单才送的注册礼金
  whn := coalesce(sc#>>'{signup,when}', 'register');
  if coalesce((sc#>>'{signup,on}')::boolean, false) and whn = 'firstorder' then
    amt := coalesce((sc#>>'{signup,amt}')::numeric, 0);
    if amt > 0 and not exists (select 1 from public.store_credit_ledger
                               where user_id = new.user_id and reason = 'signup') then
      perform public._sc_apply(new.user_id, amt, 'signup', '首单礼金', new.order_number,
        case when mon > 0 then now() + (mon || ' months')::interval else null end);
    end if;
  end if;

  -- 消费返现
  if coalesce((sc#>>'{cashback,on}')::boolean, false) then
    rate := coalesce((sc#>>'{cashback,rate}')::numeric, 0);
    cap  := coalesce((sc#>>'{cashback,cap}')::numeric, 0);
    if rate > 0 and not exists (select 1 from public.store_credit_ledger
                                where user_id = new.user_id and reason = 'cashback'
                                  and order_number = new.order_number) then
      base := greatest(0, coalesce(new.subtotal, 0) - coalesce(new.credit_used, 0));
      back := round(base * rate / 100.0, 2);
      if cap > 0 and back > cap then back := cap; end if;
      if back > 0 then
        perform public._sc_apply(new.user_id, back, 'cashback', '消费返现 ' || rate || '%',
          new.order_number, case when mon > 0 then now() + (mon || ' months')::interval else null end);
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_sc_order_earn on public.orders;
create trigger trg_sc_order_earn after insert or update of status on public.orders
  for each row execute function public._sc_order_earn();

-- ============================================================
--  完成！购物金功能的数据库地基已就绪。
--  规则（送多少、返几 %、折抵上限…）在后台「购物金」页里设。
-- ============================================================
