-- ICD Tan Cang Hai Phong - Cham cong & Bao cao ca
-- Migration 0001: schema goc

create extension if not exists pgcrypto;

-- ===================================================================
-- 1. NGUOI DUNG & PHAN QUYEN
-- ===================================================================
do $$ begin
  create type user_role as enum ('admin', 'accountant', 'driver');
exception
  when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  username text unique not null,
  full_name text not null,
  role user_role not null,
  phone text,
  license_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column profiles.auth_user_id is 'Lien ket voi Supabase Auth khi bat dang nhap that; null trong giai doan mock';
comment on column profiles.username is 'Dung de dang nhap mockup, khong qua auth.users';

-- ===================================================================
-- 2. DANH MUC CAU HINH (admin quan ly)
-- ===================================================================
create table if not exists container_sizes (
  code text primary key,          -- '20','20RF','40','40RF','45','45RF'
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists operation_types (
  code text primary key,          -- 'nang_khach_hang', 'ha_khach_hang', ...
  label text not null,
  color text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists shipping_lines (
  code text primary key,          -- 'MAE/MSK','MSC','SITC'...
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ===================================================================
-- 3. DU LIEU CHAM CONG
-- ===================================================================
create table if not exists job_entries (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references profiles(id),
  performed_at timestamptz not null,
  container_no text not null,
  line_code text not null references shipping_lines(code),
  size_code text not null references container_sizes(code),
  operation_code text not null references operation_types(code),
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_entries_driver_time on job_entries(driver_id, performed_at);
create index if not exists idx_job_entries_time on job_entries(performed_at);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_job_entries_updated_at on job_entries;
create trigger trg_job_entries_updated_at
  before update on job_entries
  for each row execute function set_updated_at();

-- ===================================================================
-- 4. DON GIA (phuc vu bao cao ke toan)
-- ===================================================================
create table if not exists operation_rates (
  id uuid primary key default gen_random_uuid(),
  operation_code text not null references operation_types(code),
  size_code text not null references container_sizes(code),
  rate numeric(12,2) not null,
  effective_from date not null,
  effective_to date,
  unique (operation_code, size_code, effective_from)
);

-- ===================================================================
-- 5. VIEW BAO CAO
-- ===================================================================
create or replace view v_payroll_report as
select
  p.id as driver_id,
  p.full_name as driver_name,
  je.operation_code,
  ot.label as operation_label,
  je.size_code,
  cs.label as size_label,
  count(*) as so_luot,
  r.rate,
  count(*) * coalesce(r.rate, 0) as thanh_tien,
  date_trunc('day', je.performed_at) as ngay
from job_entries je
join profiles p on p.id = je.driver_id
join operation_types ot on ot.code = je.operation_code
join container_sizes cs on cs.code = je.size_code
left join operation_rates r
  on r.operation_code = je.operation_code
  and r.size_code = je.size_code
  and je.performed_at::date >= r.effective_from
  and je.performed_at::date <= coalesce(r.effective_to, 'infinity'::date)
group by p.id, p.full_name, je.operation_code, ot.label, je.size_code, cs.label, r.rate, date_trunc('day', je.performed_at);

create or replace view v_line_report as
select
  sl.code as line_code,
  sl.name as line_name,
  je.operation_code,
  ot.label as operation_label,
  je.size_code,
  cs.label as size_label,
  count(*) as so_luot,
  date_trunc('day', je.performed_at) as ngay
from job_entries je
join shipping_lines sl on sl.code = je.line_code
join operation_types ot on ot.code = je.operation_code
join container_sizes cs on cs.code = je.size_code
group by sl.code, sl.name, je.operation_code, ot.label, je.size_code, cs.label, date_trunc('day', je.performed_at);

-- ===================================================================
-- 6. ROW LEVEL SECURITY
-- (Bat san cho tuong lai khi dung Supabase Auth that; trong giai doan
--  mock login, client dung anon key va tu loc theo profile dang chon,
--  nen tam thoi cho phep anon full-access de app hoat dong ngay.)
-- ===================================================================
alter table profiles enable row level security;
alter table container_sizes enable row level security;
alter table operation_types enable row level security;
alter table shipping_lines enable row level security;
alter table job_entries enable row level security;
alter table operation_rates enable row level security;

drop policy if exists anon_full_access on profiles;
create policy anon_full_access on profiles for all using (true) with check (true);

drop policy if exists anon_full_access on container_sizes;
create policy anon_full_access on container_sizes for all using (true) with check (true);

drop policy if exists anon_full_access on operation_types;
create policy anon_full_access on operation_types for all using (true) with check (true);

drop policy if exists anon_full_access on shipping_lines;
create policy anon_full_access on shipping_lines for all using (true) with check (true);

drop policy if exists anon_full_access on job_entries;
create policy anon_full_access on job_entries for all using (true) with check (true);

drop policy if exists anon_full_access on operation_rates;
create policy anon_full_access on operation_rates for all using (true) with check (true);
