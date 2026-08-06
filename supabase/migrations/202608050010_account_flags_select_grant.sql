-- Ensure authenticated clients can read their own account_flags row (RLS still applies).
grant select on public.account_flags to authenticated;
