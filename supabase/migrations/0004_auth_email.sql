-- ICD An Gia - Bo sung dang nhap that qua Google (Supabase Auth)
-- Migration 0004: them email vao profiles de doi chieu voi tai khoan Google dang nhap

-- ===================================================================
-- 1. EMAIL - dung de khop voi auth.users.email khi dang nhap Google
--    (auth_user_id da co san tu 0001 nhung chua dung - se duoc gan tu dong
--    khi tai khoan dang nhap Google lan dau va khop duoc voi email nay)
-- ===================================================================
alter table profiles add column if not exists email text;

do $$ begin
  create unique index profiles_email_unique_idx on profiles (email) where email is not null;
exception
  when duplicate_table then null;
end $$;

comment on column profiles.email is 'Email Gmail dung de dang nhap that qua Google OAuth (che do "real"). Admin phai gan email nay truoc thi tai khoan moi dang nhap duoc.';
