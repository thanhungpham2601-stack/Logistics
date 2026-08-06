-- ICD An Gia - Master data "Thiet bi su dung" (loai xe tai xe dieu khien khi cham cong)
-- Migration 0005

create table if not exists equipment_types (
  code text primary key,          -- 'R39', 'RC54', ...
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

insert into equipment_types (code, label, sort_order) values
  ('R39', 'R39', 1),
  ('RC54', 'RC54', 2)
on conflict (code) do nothing;

alter table job_entries add column if not exists equipment_code text references equipment_types(code) on delete set null;

-- ===================================================================
-- ROW LEVEL SECURITY (giu nguyen quy uoc anon full-access nhu cac bang khac)
-- ===================================================================
alter table equipment_types enable row level security;

drop policy if exists anon_full_access on equipment_types;
create policy anon_full_access on equipment_types for all using (true) with check (true);
