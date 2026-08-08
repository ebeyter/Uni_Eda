-- =============================================================================
-- 0003 — Sadece izin verilen hesaplar girebilsin
-- =============================================================================
-- SORUN: Supabase projesinde önceden başka kullanıcılar varsa, profiles
-- tablosuna eklendiklerinde varsayılan 'family' rolünü alıyorlardı. Yani
-- Eda'nın tanımadığı hesaplar aile görünümünü açabiliyordu.
--
-- ÇÖZÜM: Artık rol tek başına yetmiyor. Hesabın ayrıca "izinli" işaretli
-- olması gerekiyor ve bu işaret SADECE şu adreslere otomatik veriliyor:
--
--   <kod>@eda.uniplan.app
--   <kod>@family.uniplan.app
--
-- Başka her hesap — bugün var olanlar dahil — erişimsiz kalır. Varsayılan
-- "kapalı" olduğu için ileride yanlışlıkla oluşan bir hesap da açılmaz.
--
-- 0002'den SONRA çalıştır. Tekrar tekrar çalıştırılabilir.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. İzin işareti
-- -----------------------------------------------------------------------------
-- Varsayılan false: aksi ispatlanana kadar kimse giremez.

alter table public.profiles
  add column if not exists is_active boolean not null default false;


-- -----------------------------------------------------------------------------
-- 2. Mevcut hesapları düzelt
-- -----------------------------------------------------------------------------
-- Önce herkesi kapat, sonra sadece doğru adresli olanları aç.

update public.profiles set is_active = false where is_active;

update public.profiles p
   set is_active = true
  from auth.users u
 where u.id = p.id
   and (lower(u.email) like '%@eda.uniplan.app'
        or lower(u.email) like '%@family.uniplan.app');

-- Tanınmayan hesaplar aile rolünde kalmasın; rolleri de sıfırlansın.
-- (is_active zaten false olduğu için erişimleri yok, bu sadece temizlik.)
update public.profiles p
   set role = 'family'
  from auth.users u
 where u.id = p.id
   and p.is_active = false
   and p.role <> 'family';


-- -----------------------------------------------------------------------------
-- 3. Yeni hesaplar da aynı kuraldan geçsin
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  yeni_rol   public.user_role;
  izinli     boolean;
  gorunen_ad text;
begin
  izinli := lower(new.email) like '%@eda.uniplan.app'
         or lower(new.email) like '%@family.uniplan.app';

  yeni_rol := case
    when lower(new.email) like '%@eda.uniplan.app' then 'eda'::public.user_role
    else 'family'::public.user_role
  end;

  gorunen_ad := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, role, is_active)
  values (new.id, gorunen_ad, yeni_rol, izinli)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 4. Kimse kendi izin işaretini değiştiremesin
-- -----------------------------------------------------------------------------
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Rol degistirilemez';
  end if;
  if new.is_active is distinct from old.is_active then
    raise exception 'Erisim izni degistirilemez';
  end if;
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Yetki kontrolleri artık izin işaretine de bakıyor
-- -----------------------------------------------------------------------------

create or replace function public.is_eda()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'eda' and is_active
  );
$$;

-- Giriş yapmış VE izinli mi? Aile görünümlerinin kapısı bu.
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;


-- -----------------------------------------------------------------------------
-- 6. Aile görünümlerine kapı koy
-- -----------------------------------------------------------------------------
-- ÖNEMLİ: Bu görünümler RLS'i bilerek atlıyor. Şimdiye kadar tek koruma
-- "giriş yapmış olmak"tı — yani tanımadığın bir hesap da okuyabilirdi.
-- Artık her görünüm izinli olmayı da şart koşuyor.

drop view if exists public.family_universities;
create view public.family_universities
with (security_invoker = off) as
  select id, name, country, city,
         application_start, application_deadline,
         tuition_fee, currency
  from public.universities
  where public.is_allowed();

drop view if exists public.family_programs;
create view public.family_programs
with (security_invoker = off) as
  select id, university_id, name, content, details,
         degree_level, language, duration_years
  from public.programs
  where public.is_allowed();

drop view if exists public.family_notes;
create view public.family_notes
with (security_invoker = off) as
  select id, university_id, program_id, person_name, person_role, note, talked_at
  from public.contacts
  where note is not null
    and public.is_allowed();

revoke all on public.family_universities from anon, public;
revoke all on public.family_programs     from anon, public;
revoke all on public.family_notes        from anon, public;

grant select on public.family_universities to authenticated;
grant select on public.family_programs     to authenticated;
grant select on public.family_notes        to authenticated;


-- -----------------------------------------------------------------------------
-- 7. Öneri kuralları da izin istesin
-- -----------------------------------------------------------------------------
-- İzinsiz bir hesap öneri yazamasın, okuyamasın.

drop policy if exists "kendi onerilerini gor" on public.suggestions;
create policy "kendi onerilerini gor"
  on public.suggestions for select
  using (public.is_eda() or (author_id = auth.uid() and public.is_allowed()));

drop policy if exists "oneri yaz" on public.suggestions;
create policy "oneri yaz"
  on public.suggestions for insert
  with check (author_id = auth.uid() and public.is_allowed());

drop policy if exists "kendi onerini duzenle" on public.suggestions;
create policy "kendi onerini duzenle"
  on public.suggestions for update
  using (author_id = auth.uid() and public.is_allowed() and not is_read)
  with check (author_id = auth.uid() and public.is_allowed());

drop policy if exists "kendi onerini sil" on public.suggestions;
create policy "kendi onerini sil"
  on public.suggestions for delete
  using (public.is_eda() or (author_id = auth.uid() and public.is_allowed()));


-- -----------------------------------------------------------------------------
-- Kontrol
-- -----------------------------------------------------------------------------
-- Aşağıdaki sorgu kimin girebildiğini gösterir.
-- 'izinli' sütununda sadece senin açtığın 4 hesap true olmalı.

select p.full_name as ad,
       p.role      as rol,
       p.is_active as izinli,
       u.email
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.is_active desc, p.role, p.full_name;
