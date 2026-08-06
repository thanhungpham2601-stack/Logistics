-- ICD An Gia - Master data "Loai Container" (Lanh / Kho / Ho mai)
-- Migration 0006

create table if not exists container_types (
  code text primary key,          -- 'lanh', 'kho', 'ho_mai', ...
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

insert into container_types (code, label, sort_order) values
  ('lanh', 'Lạnh', 1),
  ('kho', 'Khô', 2),
  ('ho_mai', 'Hở mái', 3)
on conflict (code) do nothing;

alter table job_entries add column if not exists container_type_code text references container_types(code) on delete set null;

-- ===================================================================
-- ROW LEVEL SECURITY (giu nguyen quy uoc anon full-access nhu cac bang khac)
-- ===================================================================
alter table container_types enable row level security;

drop policy if exists anon_full_access on container_types;
create policy anon_full_access on container_types for all using (true) with check (true);
