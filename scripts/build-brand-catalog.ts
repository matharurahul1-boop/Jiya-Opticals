import {writeFileSync} from 'node:fs';
import {SUGGESTED_EYEWEAR_BRANDS,SUGGESTED_CONTACT_LENS_BRANDS} from '../src/lib/gst';
const materials=[...['Frames','Sunglasses'].flatMap(category=>SUGGESTED_EYEWEAR_BRANDS.map(brand=>({category,brand}))),...SUGGESTED_CONTACT_LENS_BRANDS.map(brand=>({category:'Contact Lens',brand}))].map(({category,brand})=>{
 const slug=(category+'-'+brand).toLowerCase().replace(/[^a-z0-9]+/g,'-');
 return {catalogId:'jiya-brand-'+slug,barcode:'JIYA-'+slug.toUpperCase(),name:brand+' '+category,category,brand,modelNo:'',color:'',size:'',hsnCode:'',purchasePrice:0,mrp:0,salePrice:0,gstRate:0,stockQty:0,minStockAlert:0,location:''};
});
writeFileSync('supabase/ADD_BRAND_INVENTORY.sql',`-- Adds 43 brand-level starter materials, shared across shops.
-- No actual models, prices, quantities or tax rates were supplied: these are blank/zero.
-- Edit each starter with real product details before billing. Existing records are preserved.
begin;
do $catalog$
declare target uuid; w public.optical_workspaces; p jsonb; shop jsonb; products jsonb; templates jsonb:=$items$${JSON.stringify(materials)}$items$::jsonb;
begin
 select id into target from auth.users where lower(email)='tusharbali855@gmail.com';
 if target is null then raise exception 'Tushar login not found. Nothing changed.'; end if;
 select * into w from public.optical_workspaces where owner_id=target for update;
 if not found then raise exception 'Tushar-owned workspace not found. Complete the confirmed setup first.'; end if;
 if jsonb_array_length(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]'))=0 then raise exception 'Create shops first'; end if;
 products:=coalesce(w.data->'JIYA_OPTICALS_ERP_V2_products','[]');
 for p in select value from jsonb_array_elements(templates) loop
  if not exists(select 1 from jsonb_array_elements(products) e where e->>'catalogId'=p->>'catalogId' or e->>'barcode'=p->>'barcode' or (e->>'category'=p->>'category' and lower(e->>'name')=lower(p->>'name'))) then
   for shop in select value from jsonb_array_elements(w.data->'JIYA_OPTICALS_ERP_V2_shops') loop
    products:=products||jsonb_build_array(p||jsonb_build_object('id','stock:'||(p->>'catalogId')||':'||(shop->>'id'),'shopId',shop->>'id'));
   end loop;
  end if;
 end loop;
 if products is distinct from w.data->'JIYA_OPTICALS_ERP_V2_products' then
 update public.optical_workspaces set data=jsonb_set(data,'{JIYA_OPTICALS_ERP_V2_products}',products),version=version+1 where owner_id=target;
 end if;
end $catalog$;
commit;
`);
console.log(`Prepared ${materials.length} starter materials: 19 Frames, 19 Sunglasses, 5 Contact Lens.`);
