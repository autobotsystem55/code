-- ============================================================
--  Code Official — 库存管理
--  Supabase → SQL Editor → 粘贴 → Run。需先跑过 admin-setup.sql。可重复运行。
-- ============================================================

-- 1) 商品加库存相关字段 ----------------------------------------
alter table public.products add column if not exists stock              jsonb   not null default '{}'::jsonb;  -- 按尺码：{"S":10,"M":0,...}
alter table public.products add column if not exists track_inventory    boolean not null default false;       -- 关 = 永远有货
alter table public.products add column if not exists continue_selling   boolean not null default false;       -- 售罄后仍可购买
alter table public.products add column if not exists low_stock_threshold int     not null default 5;

-- 2) 下单后按尺码扣减库存（仅对开启追踪的商品）------------------
--    p_items = [{"id":"silk-dress-05","size":"M","qty":1}, ...]
--    p_items 现在可带 color：[{"id":"silk-dress-05","size":"M","color":"驼色","qty":1}, ...]
--    扣库存时：若该商品存在 "颜色|尺码" 的库存键就扣它，否则退回只扣 "尺码" 键（兼容旧数据）。
create or replace function public.decrement_stock(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if (it->>'size') is not null then
      update public.products p
         set stock = jsonb_set(
               coalesce(p.stock, '{}'::jsonb),
               array[ case when (it->>'color') is not null and (p.stock ? ((it->>'color')||'|'||(it->>'size')))
                           then (it->>'color')||'|'||(it->>'size') else (it->>'size') end ],
               to_jsonb( greatest(0, coalesce( (p.stock->>( case when (it->>'color') is not null and (p.stock ? ((it->>'color')||'|'||(it->>'size')))
                           then (it->>'color')||'|'||(it->>'size') else (it->>'size') end ))::int, 0) - coalesce((it->>'qty')::int, 0)) ),
               true )
       where p.id = (it->>'id') and p.track_inventory = true;
    end if;
  end loop;
end; $$;
grant execute on function public.decrement_stock(jsonb) to anon, authenticated;
