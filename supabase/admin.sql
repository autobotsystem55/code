-- ============================================================
--  PÉTALE / Code Official — 管理员权限
--  让「某一个邮箱」可以从后台增删改商品；顾客只能浏览。
--
--  用法：把下面的 YOUR_ADMIN_EMAIL@example.com 改成你要当管理员的邮箱
--        （就是你之后在网站 account.html 注册/登录用的那个邮箱），
--        然后整段粘进 Supabase → SQL Editor → Run。
--  （或者把邮箱发我，我帮你填好。）
-- ============================================================

drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products
  for all
  to authenticated
  using      ( (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL@example.com' )
  with check ( (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL@example.com' );

-- 说明：商品的「公开可读」策略之前已建（顾客能看上架商品）。
-- 这条新策略额外允许该管理员邮箱 增/删/改/看（含已下架）商品。
