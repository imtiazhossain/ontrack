-- Health records remain device-only. This migration permits only the add-on entitlement ID.
alter table public.addon_entitlements
drop constraint if exists addon_entitlements_addon_id_check;

alter table public.addon_entitlements
add constraint addon_entitlements_addon_id_check
check (
  addon_id in (
    'food',
    'fitness',
    'plants',
    'travel',
    'vision-board',
    'games',
    'vehicles',
    'health'
  )
);
