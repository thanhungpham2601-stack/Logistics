-- ICD An Gia - "Ghi chu Dao chuyen": tai xe chon 1 trong danh sach ghi chu cu the (vd "Ha do
-- cao don bai"), moi ghi chu gan san voi 1 "Phan loai dao chuyen" (dao_chuyen_subtypes) de ke
-- toan/admin lam bao cao ma khong can tai xe tu chon phan loai truc tiep.
-- Migration 0010

create table if not exists dao_chuyen_notes (
  code text primary key,
  label text not null,
  subtype_code text not null references dao_chuyen_subtypes(code),
  sort_order int not null default 0,
  is_active boolean not null default true
);

insert into dao_chuyen_notes (code, label, subtype_code, sort_order) values
  ('dc_khach_hang',               'Đảo chuyển khách hàng',                    'khach_hang', 1),
  ('dc_xuat_tau',                 'Đảo chuyển xuất tàu',                      'xuat_tau',   2),
  ('dc_sua_chua',                 'Đảo chuyển sửa chữa',                      'sua_chua',   3),
  ('hoan_thanh_sua_chua',         'Hoàn thành sửa chữa',                      'sua_chua',   4),
  ('ha_sua_chua',                 'Hạ sửa chữa',                              'sua_chua',   5),
  ('dc_giam_dinh_chup_anh',       'Đảo chuyển giám định lại/chụp ảnh',        'giam_dinh',  6),
  ('ha_do_cao_don_bai',           'Hạ độ cao dọn bãi',                        'don_bai',    7),
  ('dc_don_bai',                  'Đảo chuyển dọn bãi',                       'don_bai',    8),
  ('don_bai_theo_yc_dieu_do',     'Dọn bãi theo yêu cầu điều độ',             'don_bai',    9),
  ('nang_khach_sua_chua',         'Nâng khách sửa chữa',                      'sua_chua',   10),
  ('len_ghe_sua_chua',            'Lên ghế sửa chữa',                         'sua_chua',   11),
  ('ha_sua_chua_khach_hang',      'Hạ sửa chữa khách hàng',                   'sua_chua',   12),
  ('nang_ha_giam_dinh_gam',       'Nâng/hạ giám định gầm',                    'sua_chua',   13),
  ('dao_giam_dinh_ve_block',      'Đảo giám định về block',                   'sua_chua',   14),
  ('ha_xuong_giam_dinh_lai',      'Hạ xuống giám định lại',                   'sua_chua',   15),
  ('nang_len_giam_dinh_lai',      'Nâng lên giám định lại',                   'sua_chua',   16),
  ('chuyen_ct_giam_dinh_block',   'Chuyển container giám định lại vào block', 'sua_chua',   17),
  ('nang_ha_khach_hang',          'Nâng/Hạ khách hàng',                       'khach_hang', 18),
  ('nang_khach_tra_lai',          'Nâng khách trả lại',                       'khach_hang', 19),
  ('ha_khach_tra_lai',            'Hạ khách trả lại',                         'khach_hang', 20),
  ('ha_vao_mooc_khach_hang',      'Hạ vào mooc khách hàng',                   'khach_hang', 21)
on conflict (code) do nothing;

alter table dao_chuyen_notes enable row level security;

drop policy if exists anon_full_access on dao_chuyen_notes;
create policy anon_full_access on dao_chuyen_notes for all using (true) with check (true);
