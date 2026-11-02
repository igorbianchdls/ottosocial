-- The browser makes the thumbnail at upload time; the server only gets a thumbnail job when it couldn't.
create or replace function private.enqueue_file_jobs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('video', 'image') and new.thumb_path is null then
    insert into public.file_jobs (workspace_id, file_id, kind) values (new.workspace_id, new.id, 'miniatura') on conflict do nothing;
  end if;
  if new.kind = 'video' then
    insert into public.file_jobs (workspace_id, file_id, kind) values (new.workspace_id, new.id, 'proxy') on conflict do nothing;
  end if;
  return new;
end $$;
