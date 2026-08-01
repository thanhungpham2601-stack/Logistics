-- ICD Tan Cang Hai Phong - Bo sung ca lam viec, phan loai dao chuyen,
-- ghi chu master data va doi soat bao cao (Nang/Ha, Dao chuyen)
-- Migration 0003

-- ===================================================================
-- 1. CA LAM VIEC (shift) tren job_entries - tai xe tu chon khi cham cong
-- ===================================================================
alter table job_entries add column if not exists shift text;

-- Backfill du lieu cu theo gio VN: 07:00-18:59 = ca ngay, con lai = ca dem
update job_entries
set shift = case
  when extract(hour from performed_at at time zone 'Asia/Ho_Chi_Minh') >= 7
   and extract(hour from performed_at at time zone 'Asia/Ho_Chi_Minh') < 19
  then 'day' else 'night' end
where shift is null;

alter table job_entries alter column shift set default 'day';
alter table job_entries alter column shift set not null;

do $$ begin
  alter table job_entries add constraint job_entries_shift_check check (shift in ('day', 'night'));
exception
  when duplicate_object then null;
end $$;

-- ===================================================================
-- 2. CONTAINER RONG / CO HANG - can cho bao cao tong hop dao chuyen
-- ===================================================================
alter table job_entries add column if not exists cargo_status text not null default 'hang';

do $$ begin
  alter table job_entries add constraint job_entries_cargo_status_check check (cargo_status in ('rong', 'hang'));
exception
  when duplicate_object then null;
end $$;

-- ===================================================================
-- 3. PHAN LOAI "DAO CHUYEN" (khach hang / xuat tau / sua chua / don bai / giam dinh)
--    dung de nhom bao cao "Bang Tong Hop San Luong Dao Chuyen"
-- ===================================================================
create table if not exists dao_chuyen_subtypes (
  code text primary key,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

insert into dao_chuyen_subtypes (code, label, sort_order) values
  ('khach_hang', 'Đảo chuyển khách hàng', 1),
  ('xuat_tau',   'Đảo chuyển xuất tàu', 2),
  ('sua_chua',   'Đảo chuyển sửa chữa', 3),
  ('don_bai',    'Đảo chuyển dọn bãi', 4),
  ('giam_dinh',  'Đảo chuyển giám định lại/chụp ảnh', 5)
on conflict (code) do nothing;

alter table job_entries add column if not exists sub_type text references dao_chuyen_subtypes(code) on delete set null;

-- ===================================================================
-- 4. GHI CHU GOI Y (master data thay cho danh sach hardcode tren client)
-- ===================================================================
create table if not exists note_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

insert into note_presets (label, sort_order)
select label, sort_order from (values
  ('Đảo chuyển khách hàng', 1),
  ('Nâng khách trả lại', 2),
  ('Đảo chuyển hầm tàu', 3),
  ('Chờ lệnh phụ', 4),
  ('Công rỗng', 5),
  ('Công có nước', 6)
) as seed(label, sort_order)
where not exists (select 1 from note_presets);

-- ===================================================================
-- 5. DOI SOAT BAO CAO (SL hang xac nhan) - Bao cao Nang/Ha va Dao chuyen
--    Ke toan nhap tay so lieu hang tau xac nhan cho tung hang tau
--    trong 1 ky bao cao, he thong tu tinh Chenh lech.
-- ===================================================================
create table if not exists report_reconciliations (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('nang_ha', 'dao_chuyen')),
  line_code text not null references shipping_lines(code),
  period_from date not null,
  period_to date not null,
  confirmed_qty integer,
  updated_at timestamptz not null default now(),
  unique (report_type, line_code, period_from, period_to)
);

drop trigger if exists trg_report_reconciliations_updated_at on report_reconciliations;
create trigger trg_report_reconciliations_updated_at
  before update on report_reconciliations
  for each row execute function set_updated_at();

-- ===================================================================
-- 6. ROW LEVEL SECURITY (giu nguyen quy uoc anon full-access nhu 0001)
-- ===================================================================
alter table dao_chuyen_subtypes enable row level security;
alter table note_presets enable row level security;
alter table report_reconciliations enable row level security;

drop policy if exists anon_full_access on dao_chuyen_subtypes;
create policy anon_full_access on dao_chuyen_subtypes for all using (true) with check (true);

drop policy if exists anon_full_access on note_presets;
create policy anon_full_access on note_presets for all using (true) with check (true);

drop policy if exists anon_full_access on report_reconciliations;
create policy anon_full_access on report_reconciliations for all using (true) with check (true);
