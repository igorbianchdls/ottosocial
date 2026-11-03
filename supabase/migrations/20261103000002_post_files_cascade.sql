-- Deleting a file for good (Spaces → Lixeira) takes it out of the posts that used it, instead of failing.
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.post_files'::regclass and contype = 'f' and confrelid = 'public.files'::regclass loop
    execute format('alter table public.post_files drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.post_files add constraint post_files_file_id_fkey foreign key (file_id) references public.files (id) on delete cascade;
