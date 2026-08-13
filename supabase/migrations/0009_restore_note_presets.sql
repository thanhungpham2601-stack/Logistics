-- ICD An Gia - Khoi phuc bang note_presets (Ghi Chu Goi Y) neu lo xoa
-- Migration 0009: idempotent - an toan chay lai nhieu lan, khong dung neu da co du lieu
--
-- Neu ban chi lo xoa BOT/HET DONG (rows) nhung bang van con: script van chay dung, seed lai
-- 6 dong mac dinh (chi khi bang dang rong - khong ghi de neu ban da co dong khac).
-- Neu ban lo xoa CA BANG (drop table): script tao lai bang + RLS + policy y het migration goc,
-- roi seed lai 6 dong mac dinh.
--
-- Luu y: neu truoc do ban da tu them cac ghi chu gop y KHAC ngoai 6 dong mac dinh nay (qua man
-- Thiet Lap He Thong), va da lo xoa mat, script nay KHONG khoi phuc lai duoc cac dong tu them do -
-- chi co Supabase Backups (Database > Backups, can goi tra phi) moi phuc hoi duoc nguyen trang.

create table if not exists note_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table note_presets enable row level security;

drop policy if exists anon_full_access on note_presets;
create policy anon_full_access on note_presets for all using (true) with check (true);

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
