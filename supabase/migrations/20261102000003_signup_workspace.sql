-- Sign-up creates the profile and, when the form sent one, the first workspace (creator becomes owner).
-- Done in the trigger so it works with or without e-mail confirmation (no session yet at sign-up).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  ws text := left(btrim(coalesce(meta ->> 'workspace', '')), 80);
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(nullif(btrim(meta ->> 'name'), ''), split_part(new.email, '@', 1)), coalesce(meta ->> 'role', ''));
  if ws <> '' then
    insert into public.workspaces (name, business, team_size, created_by)
    values (ws, nullif(meta ->> 'business', ''), nullif(meta ->> 'team_size', ''), new.id);
  end if;
  return new;
end $$;

-- Deleting a person keeps what they created for the rest of the team ("created by" just becomes empty).
alter table public.workspaces alter column created_by drop not null;
do $$
declare t text;
begin
  foreach t in array array['workspaces', 'files', 'posts', 'editor_projects', 'editor_versions'] loop
    execute format('alter table public.%1$I drop constraint %1$s_created_by_fkey', t);
    execute format('alter table public.%1$I add constraint %1$s_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null', t);
  end loop;
end $$;
