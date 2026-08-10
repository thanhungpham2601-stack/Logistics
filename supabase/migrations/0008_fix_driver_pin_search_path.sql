-- ICD An Gia - Fix ham dat/kiem tra PIN tai xe: khong tim thay gen_salt()/crypt()
-- Migration 0008: bo sung "extensions" vao search_path
--
-- Nguyen nhan: tren Supabase, extension pgcrypto (0001_init.sql da bat) mac dinh duoc cai vao
-- schema "extensions" chu khong phai "public" nhu Postgres thuong - trong khi 2 ham
-- set_driver_pin/verify_driver_pin (0007_driver_pin.sql) lai ep cung "set search_path = public",
-- nen khong thay ham gen_salt()/crypt(), bao loi "function gen_salt(unknown) does not exist".

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
