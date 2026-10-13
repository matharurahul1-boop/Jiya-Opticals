-- Removes ONE shop called "Center 3" (also matches "Centre 3") that has no records.
-- Run PART 1 first to see what exists. Then run PART 2 to delete.
-- A shop that already has stock, clients, bills, expenses, purchases, payments or follow-ups is never deleted,
-- and neither is one that a team member is assigned to.

-- ============ PART 1: preview (changes nothing) ============
select w.owner_id,
       w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name' as organization,
       s->>'id' as shop_id, s->>'name' as shop_name,
       (select count(*) from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_products','[]')) e where e->>'shopId' = s->>'id' and coalesce((e->>'stockQty')::numeric,0) > 0) as stock_rows,
       (select count(*) from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_customers','[]')) e where e->>'shopId' = s->>'id') as clients,
       (select count(*) from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_invoices','[]')) e where e->>'shopId' = s->>'id') as invoices
from public.optical_workspaces w, jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) s
where s->>'name' ~* '^\s*cent(er|re)\s*-?\s*3\s*$';

-- ============ PART 2: delete one empty "Center 3" ============
do $$
declare w record; victim text; n int := 0;
begin
  for w in select * from public.optical_workspaces loop
    -- the last matching shop in the list that has no records at all
    select s->>'id' into victim
    from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) with ordinality as t(s, pos)
    where s->>'name' ~* '^\s*cent(er|re)\s*-?\s*3\s*$'
      and not exists (select 1 from public.optical_team_members m where m.owner_id = w.owner_id and (s->>'id') = any(m.shop_ids))
      and not exists (
        select 1 from unnest(array['products','customers','invoices','expenses','purchases','followups','payments']) as k(name),
          jsonb_array_elements(coalesce(w.data->('JIYA_OPTICALS_ERP_V2_'||k.name),'[]')) e
        where e->>'shopId' = s->>'id'
          and not (k.name = 'products' and coalesce((e->>'stockQty')::numeric,0) = 0))
    order by pos desc limit 1;
    if victim is not null then
      update public.optical_workspaces set
        data = jsonb_set(
                 -- also drop the empty zero-stock rows that were auto-created for this shop
                 jsonb_set(data, '{JIYA_OPTICALS_ERP_V2_shops}',
                   (select coalesce(jsonb_agg(s), '[]') from jsonb_array_elements(data->'JIYA_OPTICALS_ERP_V2_shops') s where s->>'id' <> victim)),
                 '{JIYA_OPTICALS_ERP_V2_products}',
                 (select coalesce(jsonb_agg(p), '[]') from jsonb_array_elements(coalesce(data->'JIYA_OPTICALS_ERP_V2_products','[]')) p where p->>'shopId' is distinct from victim)),
        version = version + 1
      where owner_id = w.owner_id;
      n := n + 1;
      raise notice 'Deleted shop % from organization %', victim, w.owner_id;
      exit;
    end if;
  end loop;
  if n = 0 then raise notice 'Nothing deleted: no empty "Center 3" shop found (it may already have records - delete it in the app if empty, or tell me).'; end if;
end $$;
