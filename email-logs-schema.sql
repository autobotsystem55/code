-- ============================================================
--  邮件发送记录 Email Logs — 一次性数据库设置
-- ------------------------------------------------------------
--  在 Supabase 控制台执行一次即可：
--   1) https://supabase.com/dashboard → 选你的项目
--   2) 左侧 SQL Editor → New query
--   3) 把这整个文件粘贴进去 → 点 Run
--
--  ✅ 安全：全新表，不动任何现有数据。
--  ✅ 可重复运行（幂等），跑第二次也不会报错。
--
--  作用：后台「邮件通知 → 已发记录」标签会从这里读取每一封
--       通过 send-email Edge Function 发出去的邮件（含失败的）。
-- ============================================================

create table if not exists public.email_logs (
  id              bigint generated always as identity primary key,
  sent_at         timestamptz not null default now(),
  to_email        text        not null,
  subject         text        not null,
  body_preview    text,                              -- 正文前 200 字（省存储 / 方便预览）
  resend_id       text,                              -- Resend 返回的 message id（成功时）
  status          text        not null default 'sent'
                  check (status in ('sent','failed','blocked')),
  error_message   text,                              -- 失败原因（status != 'sent' 时填）
  sent_by_user_id uuid        references auth.users(id) on delete set null,
  order_number    text,                              -- 关联订单（自动邮件填，手动可空）
  brand           text,
  cta_text        text,
  cta_url         text
);

-- 按时间倒序查询（后台列表最常用）
create index if not exists idx_email_logs_sent_at on public.email_logs(sent_at desc);
-- 按订单号过滤（订单详情页未来可显示该订单的所有邮件）
create index if not exists idx_email_logs_order   on public.email_logs(order_number) where order_number is not null;
-- 按状态过滤（只看失败的 / 只看成功的）
create index if not exists idx_email_logs_status  on public.email_logs(status);

alter table public.email_logs enable row level security;

-- 只允许管理员 SELECT
drop policy if exists email_logs_select_admin on public.email_logs;
create policy email_logs_select_admin on public.email_logs
  for select using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- 写入只走 service_role（Edge Function 内部用 SERVICE_ROLE_KEY 自动绕过 RLS）；
-- 不创建客户端 INSERT/UPDATE/DELETE 策略 → 普通登录用户写不了，更安全。

-- ============================================================
--  完成！下次后台发邮件，记录会自动出现在「已发记录」标签。
-- ============================================================
