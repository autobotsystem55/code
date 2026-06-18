-- ============================================================
--  Code Official — 管理员权限（基于 profiles.is_admin 标记）
--  后台 admin.html 会根据这个标记决定谁能管理商品。
--
--  顺序很重要：
--   1) 先在网站 /account.html 用「管理员邮箱」注册一个账号；
--   2) 把下面 YOUR_ADMIN_EMAIL@example.com 改成那个邮箱；
--   3) 整段粘进 Supabase → SQL Editor → Run。
--   （把邮箱发我也行，我帮你填好；邮箱不会进公开仓库。）
-- ============================================================

-- 1) 给会员资料表加一个"管理员"标记（可重复运行，安全）
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2) 把这个邮箱设为管理员（必须先注册过该账号，否则这步改不到任何行）
update public.profiles set is_admin = true
where id in (select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com');

-- 3) 只有管理员（is_admin = true）能 增/删/改 商品；顾客只能浏览
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products
  for all to authenticated
  using      ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) )
  with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) );
