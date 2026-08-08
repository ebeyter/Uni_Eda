-- =============================================================================
-- 0002 — Kod ile giriş
-- =============================================================================
-- Artık kimse e-posta girmiyor; herkes kendine ait bir KOD yazıyor.
-- Kod, arka planda gizli bir hesabın şifresidir. Hesabın e-postası da koddan
-- türetilir ve sonundaki alan adı kişinin rolünü belirler:
--
--   <kod>@eda.uniplan.app     -> rol: eda    (her şeyi görür)
--   <kod>@family.uniplan.app  -> rol: family (kısıtlı görünüm)
--
-- Bu adreslere hiç e-posta gönderilmez, sadece kimliği ayırt etmeye yarar.
--
-- 0001_init.sql çalıştıktan SONRA çalıştır. Tekrar tekrar çalıştırılabilir.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Rol artık e-postanın alan adından belirleniyor
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  yeni_rol public.user_role;
  gorunen_ad text;
begin
  yeni_rol := case
    -- Kod ile açılan Eda hesabı
    when lower(new.email) like '%@eda.uniplan.app' then 'eda'::public.user_role
    -- Eski yöntemle açılmış e-posta hesabı da çalışmaya devam etsin
    when lower(new.email) = 'edabeyter5@gmail.com' then 'eda'::public.user_role
    else 'family'::public.user_role
  end;

  -- Görünen ad: panelde bir ad girildiyse onu kullan, yoksa kodun kendisini.
  -- Eda daha sonra aile üyelerinin adını uygulamadan düzeltebilir.
  gorunen_ad := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, role)
  values (new.id, gorunen_ad, yeni_rol)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 2. Zaten açılmış hesapların rolünü düzelt
-- -----------------------------------------------------------------------------
-- Bu dosya çalışmadan önce açılmış hesaplar için tetikleyici çalışmamış olur.

update public.profiles p
   set role = 'eda'
  from auth.users u
 where u.id = p.id
   and (lower(u.email) like '%@eda.uniplan.app'
        or lower(u.email) = 'edabeyter5@gmail.com')
   and p.role is distinct from 'eda';

update public.profiles p
   set role = 'family'
  from auth.users u
 where u.id = p.id
   and lower(u.email) like '%@family.uniplan.app'
   and p.role is distinct from 'family';


-- -----------------------------------------------------------------------------
-- 3. Eda aile üyelerinin görünen adını düzeltebilsin
-- -----------------------------------------------------------------------------
-- Kod "anne-2027" gibi bir şeyse listede öyle görünür; Eda bunu "Anne" yapabilsin.
-- Rol değiştirme yine engelli (prevent_role_change tetikleyicisi devrede).

drop policy if exists "eda profilleri duzenler" on public.profiles;
create policy "eda profilleri duzenler"
  on public.profiles for update
  using (public.is_eda())
  with check (public.is_eda());
