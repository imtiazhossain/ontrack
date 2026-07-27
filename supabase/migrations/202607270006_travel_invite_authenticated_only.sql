-- Earlier travel migrations granted these RPCs directly to anon. Revoking from
-- PUBLIC does not remove a role-specific grant, so remove each legacy grant.
revoke execute on function public.create_travel_invite(jsonb, text, text, text)
  from anon;
revoke execute on function public.resolve_travel_invite(text)
  from anon;
revoke execute on function public.accept_travel_invite(text)
  from anon;
revoke execute on function public.travel_invite_statuses(text[])
  from anon;
revoke execute on function public.revoke_travel_invite(text)
  from anon;
revoke execute on function public.travel_chat_messages(text)
  from anon;
revoke execute on function public.send_travel_chat_message(text, uuid, text, text)
  from anon;
revoke execute on function public.register_travel_chat_device(text, uuid, text)
  from anon;
