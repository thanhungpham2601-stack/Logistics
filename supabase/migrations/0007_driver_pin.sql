-- ICD An Gia - Ma PIN cho tai xe de chuyen ca nhanh tren iPad dung chung
-- Migration 0007: bang rieng driver_pins (KHONG nam tren profiles) + 2 RPC security definer
--
-- Ly do khong them cot pin_hash thang vao "profiles": bang do dang co policy anon_full_access
-- cho toan bo cot, va fetchAccounts() o client dang select('*') tren profiles - neu them cot PIN
-- vao do se vo tinh phat tan hash PIN cua moi tai xe ra client. Tach rieng bang, khong cap policy
-- nao cho anon/authenticated (RLS mac dinh deny), chi cho truy cap qua 2 function security definer
-- ben duoi (chay vuot qua RLS, khong lo hash ra ngoai).
--
-- Luu y: tren Supabase, pgcrypto (bat tu 0001_init.sql) nam trong schema "extensions" chu khong
-- phai "public" - 2 ham duoi day phai co "extensions" trong search_path thi gen_salt()/crypt()
-- moi goi duoc (xem them 0008_fix_driver_pin_search_path.sql - migration vá cho DB da chay 0007
-- truoc khi phat hien loi nay).

create table if not exists driver_pins (
  account_id uuid primary key references profiles(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table driver_pins enable row level security;
-- Co tinh KHONG tao policy nao cho anon/authenticated: chan hoan toan select/insert/update/delete
-- truc tiep tu client, chi truy cap duoc qua 2 ham security definer o duoi.

comment on table driver_pins is 'Ma PIN 4 so cho tai xe dang nhap nhanh tren iPad dung chung - tach rieng khoi profiles de khong lo hash qua fetchAccounts() (select * + RLS anon_full_access).';

create or replace function set_driver_pin(p_account_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'Ma PIN phai la 4 chu so';
  end if;

  if not exists (select 1 from profiles where id = p_account_id and role = 'driver') then
    raise exception 'Tai khoan khong ton tai hoac khong phai tai xe';
  end if;

  insert into driver_pins (account_id, pin_hash, updated_at)
  values (p_account_id, crypt(p_pin, gen_salt('bf')), now())
  on conflict (account_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

create or replace function verify_driver_pin(p_account_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash from driver_pins where account_id = p_account_id;
  if v_hash is null then
    return false;
  end if;
  return v_hash = crypt(p_pin, v_hash);
end;
$$;

comment on function set_driver_pin(uuid, text) is 'Admin dat/doi ma PIN 4 so cho 1 tai xe (goi tu man Quan ly tai khoan).';
comment on function verify_driver_pin(uuid, text) is 'Kiem tra ma PIN khi tai xe chon ten + nhap PIN de chuyen ca tren iPad dung chung.';

grant execute on function set_driver_pin(uuid, text) to anon, authenticated;
grant execute on function verify_driver_pin(uuid, text) to anon, authenticated;

revoke all on driver_pins from anon, authenticated;
