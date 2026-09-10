-- Run AFTER team-access.sql. Sign the connector in as the business owner: it edits the shared catalogue.
-- Catalog-only upserts: preserve existing ERP stock; new items receive initial source quantity.
begin;
create or replace function optical_private.drishti_import(team_owner uuid, target_shop text, source_id text, items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.optical_workspaces; products jsonb; item jsonb; existing jsonb; fresh jsonb;
  item_key text; code text; qr text; hash text; row_id text; added integer:=0; updated integer:=0; skipped integer:=0;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if source_id is null or length(trim(source_id)) not between 1 and 80 then raise exception 'Invalid source ID'; end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>500 then raise exception 'Send at most 500 items per batch'; end if;
  select * into w from public.optical_workspaces where owner_id=team_owner for update;
  if not found then raise exception 'Store not found' using errcode='42501'; end if;
  if team_owner<>auth.uid() then raise exception 'Business owner login required for shared catalogue sync' using errcode='42501'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) s where s->>'id'=target_shop) then raise exception 'Shop not found'; end if;
  if exists(select 1 from jsonb_array_elements(items) e group by e->>'externalId' having count(*)>1) then raise exception 'Duplicate source item ID in batch'; end if;
  products := coalesce(w.data->'JIYA_OPTICALS_ERP_V2_products','[]');
  for item in select value from jsonb_array_elements(items) loop
    item_key := item->>'externalId'; code := item->>'barcode'; qr := nullif(item->>'qrCode','');
    if jsonb_typeof(item->'externalId') is distinct from 'string' or coalesce(length(item_key),0) not between 1 and 200
      or jsonb_typeof(item->'barcode') is distinct from 'string' or coalesce(length(code),0) not between 1 and 2048
      or code<>trim(code) or coalesce(length(trim(item->>'name')),0) not between 1 and 300
      or (qr is not null and (jsonb_typeof(item->'qrCode')<>'string' or length(qr)>2048 or qr<>trim(qr))) then
      raise exception 'Source ID, original code and item name are required (codes must be text)';
    end if;
    if coalesce(item->>'category','') not in ('Spectacle Frame','Sunglasses','Ophthalmic Lens','Contact Lens','Lens Solution','Optical Accessory','Reading Glasses','Equipment / Battery') then raise exception 'Unknown product category'; end if;
    if exists(select 1 from unnest(array['purchasePrice','mrp','salePrice','gstRate','stockQty','minStockAlert']) field
      where jsonb_typeof(item->field) is distinct from 'number') then raise exception 'Prices, tax and stock must be numbers'; end if;
    if (item->>'purchasePrice')::numeric<0 or (item->>'mrp')::numeric<0 or (item->>'salePrice')::numeric<0
      or (item->>'gstRate')::numeric not between 0 and 100 or (item->>'stockQty')::numeric<0
      or (item->>'stockQty')::numeric<>trunc((item->>'stockQty')::numeric) or (item->>'minStockAlert')::numeric<0
      or (item->>'minStockAlert')::numeric<>trunc((item->>'minStockAlert')::numeric) then raise exception 'Invalid price, GST or stock quantity'; end if;
    if coalesce(item->>'frameType','N/A') not in ('Full Rim','Half Rim','Rimless','Supra','N/A') then raise exception 'Unknown frame type'; end if;
    if (select count(*) from jsonb_array_elements(products) p where p->>'shopId'=target_shop and p->>'drishtiSourceId'=source_id and p->>'drishtiItemId'=item_key)>1 then raise exception 'Duplicate existing Drishti mapping; resolve it before syncing'; end if;
    select p into existing from jsonb_array_elements(products) p where p->>'shopId'=target_shop and p->>'drishtiSourceId'=source_id and p->>'drishtiItemId'=item_key;
    row_id := coalesce(existing->>'id',gen_random_uuid()::text);
    if existing is not null and (existing->>'barcode' is distinct from code or nullif(existing->>'qrCode','') is distinct from qr) then
      raise exception 'Source code changed for item %. Existing stickers are protected; review the mapping manually.',item_key;
    end if;
    if exists(select 1 from jsonb_array_elements(products) p where p->>'shopId'=target_shop and p->>'id'<>row_id
      and (p->>'barcode'=code or p->>'qrCode'=code or (qr is not null and (p->>'barcode'=qr or p->>'qrCode'=qr)))) then
      raise exception 'Barcode/QR already belongs to another item in this shop';
    end if;
    hash := md5(item::text);
    if existing->>'drishtiHash'=hash then skipped:=skipped+1; continue; end if;
    fresh := coalesce(existing,'{}') || jsonb_build_object(
      'id',row_id,'catalogId',coalesce(existing->>'catalogId','catalog-'||row_id),'shopId',target_shop,'barcode',code,'qrCode',qr,'name',item->>'name','category',item->>'category',
      'brand',coalesce(item->>'brand',''),'modelNo',coalesce(item->>'modelNo',''),'color',coalesce(item->>'color',''),
      'frameType',coalesce(item->>'frameType','N/A'),'size',coalesce(item->>'size',''),'hsnCode',coalesce(item->>'hsnCode',''),
      'purchasePrice',item->'purchasePrice','mrp',item->'mrp','salePrice',item->'salePrice','gstRate',item->'gstRate',
      'stockQty',coalesce(existing->'stockQty',item->'stockQty'),'minStockAlert',item->'minStockAlert','location',coalesce(item->>'location',''),
      'drishtiSourceId',source_id,'drishtiItemId',item_key,'drishtiHash',hash,'drishtiStockQty',item->'stockQty','drishtiSyncedAt',clock_timestamp());
    if existing is null then products:=products || jsonb_build_array(fresh); added:=added+1;
    else select coalesce(jsonb_agg(case when p->>'id'=row_id then fresh else p end),'[]') into products from jsonb_array_elements(products) p; updated:=updated+1;
    end if;
    -- Refresh common details on linked branches while retaining their quantity and cost.
    select coalesce(jsonb_agg(case when p->>'catalogId'=fresh->>'catalogId' and p->>'id'<>row_id then p ||
      (fresh - array['id','shopId','stockQty','purchasePrice','minStockAlert','location','supplierId','drishtiSourceId','drishtiItemId','drishtiHash','drishtiStockQty','drishtiSyncedAt']) else p end),'[]') into products from jsonb_array_elements(products) p;
  end loop;
  if added+updated>0 then
    update public.optical_workspaces set data=optical_private.expand_catalog(jsonb_set(data,'{JIYA_OPTICALS_ERP_V2_products}',products)),version=version+1 where owner_id=team_owner;
  end if;
  return jsonb_build_object('added',added,'updated',updated,'unchanged',skipped,'version',w.version+case when added+updated>0 then 1 else 0 end);
end $$;
create or replace function public.optical_drishti_import(team_owner uuid, target_shop text, source_id text, items jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select optical_private.drishti_import(team_owner,target_shop,source_id,items) $$;
revoke all on function optical_private.drishti_import(uuid,text,text,jsonb), public.optical_drishti_import(uuid,text,text,jsonb) from public, anon;
grant execute on function optical_private.drishti_import(uuid,text,text,jsonb), public.optical_drishti_import(uuid,text,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
