-- =============================================================================
-- Uni Plan Eda — Supabase şeması (ilk kurulum)
-- =============================================================================
-- Bu dosyayı Supabase panelinde SQL Editor'e yapıştırıp çalıştır.
--
-- ÖNEMLİ: Bu dosya defalarca çalıştırılabilir. Zaten var olan şeyleri atlar,
-- sadece eksikleri tamamlar. Yarıda kalmış bir kurulumun üstüne çalıştırmak
-- güvenlidir, hiçbir veriyi silmez.
--
-- Temel kural: Eda her şeyi görür. Aile sadece kendisine açılan görünümleri
-- (view) görür — tabloların kendisine hiç erişemez. Yani "aile şu kolonu
-- görmesin" kuralı arayüzde değil, veritabanı seviyesinde uygulanır.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ENUM tipleri — serbest metin yerine sabit seçenekler
-- -----------------------------------------------------------------------------
-- ENUM'lar için "varsa atla" seçeneği yok, o yüzden hata yakalayarak geçiyoruz.

do $$ begin
  -- Kim olduğun: sadece bu iki rol var, herkese ayrı hesap açılır
  create type public.user_role as enum ('eda', 'family');
exception when duplicate_object then null;
end $$;

do $$ begin
  -- Bir üniversiteye başvurunun genel durumu
  create type public.application_status as enum (
    'not_started',   -- henüz başlamadı
    'preparing',     -- hazırlanıyor
    'submitted',     -- başvuru gönderildi
    'interview',     -- mülakat aşaması
    'accepted',      -- kabul
    'rejected',      -- ret
    'waitlisted',    -- yedek liste
    'withdrawn'      -- vazgeçildi
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  -- Motivasyon mektubunun yazım aşaması (sıra önemli: final en ileri aşama)
  create type public.letter_stage as enum (
    'not_started',
    'drafting',      -- ilk taslak yazılıyor
    'review',        -- gözden geçiriliyor
    'final'          -- bitti
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  -- Takvimdeki kaydın türü
  create type public.event_type as enum (
    'deadline',      -- başvuru son tarihi
    'task',          -- yapılacak iş
    'exam',          -- sınav
    'interview',     -- mülakat
    'personal'       -- kişisel
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  -- Yüklenen dosyanın türü
  create type public.document_type as enum (
    'motivation_letter',
    'cv',
    'transcript',
    'language_certificate',
    'recommendation_letter',
    'passport',
    'other'
  );
exception when duplicate_object then null;
end $$;


-- -----------------------------------------------------------------------------
-- 2. Ortak yardımcılar
-- -----------------------------------------------------------------------------

-- Her tabloda updated_at'i otomatik güncelleyen tetikleyici
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. profiles — kullanıcılar ve rolleri
-- -----------------------------------------------------------------------------
-- Supabase'in kendi auth.users tablosuna bağlanır. Şifre/e-posta orada tutulur,
-- burada sadece "bu kişi kim ve hangi rolde" bilgisi durur.

-- DİKKAT: Supabase projelerinde bazen hazır şablondan gelen bir 'profiles'
-- tablosu bulunur ve sütunları farklıdır. O yüzden önce tabloyu oluşturuyor,
-- sonra eksik sütunları tek tek tamamlıyoruz. Var olan sütunlara dokunulmaz,
-- şablondan gelen fazladan sütunlar (username, avatar_url vb.) de silinmez.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'family',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name  text;
alter table public.profiles add column if not exists role       public.user_role not null default 'family';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Şablondan gelen updated_at varsayılansız olabilir; boş satır kalmasın
update public.profiles set updated_at = now() where updated_at is null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Kimse kendi rolünü değiştiremesin. Bir aile üyesi kendini 'eda' yapıp
-- her şeyi görebilir hale gelmesin diye rol değişikliği burada bloklanır.
-- Rol değişimi sadece Supabase panelinden yapılabilir.
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
  return new;
end;
$$;

-- Sadece siteden giriş yapmış kullanıcıların rol değiştirmesi engellenir.
-- auth.uid() boşsa istek panelden/sunucudan geliyordur, ona izin verilir.
drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.prevent_role_change();

-- Yeni bir kullanıcı kaydolduğunda profil satırı otomatik oluşsun.
-- Rol e-postaya bakılarak otomatik atanır: Eda'nın adresi 'eda', diğer
-- herkes 'family'. Böylece rolü sonradan elle düzeltmek gerekmez.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when lower(new.email) = 'edabeyter5@gmail.com' then 'eda'::public.user_role
      else 'family'::public.user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hesap bu dosya çalıştırılmadan önce açılmışsa tetikleyici çalışmamış olur.
-- Bu satır o durumu da düzeltir, yani hesabı ne zaman açtığın fark etmez.
update public.profiles p
   set role = 'eda'
  from auth.users u
 where u.id = p.id
   and lower(u.email) = 'edabeyter5@gmail.com'
   and p.role is distinct from 'eda';

-- "Giriş yapan kişi Eda mı?" — politikaların tamamı buna dayanır.
-- security definer: profiles'ın kendi RLS'ini atlar, yoksa sonsuz döngü olur.
create or replace function public.is_eda()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'eda'
  );
$$;


-- -----------------------------------------------------------------------------
-- 4. universities — başvurulacak üniversiteler
-- -----------------------------------------------------------------------------
-- Ülke serbest metin: Fransa ve Belçika dışında istediğin ülkeyi elle ekleyebilirsin.

create table if not exists public.universities (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  country              text not null,
  city                 text,
  website              text,

  -- Başvuru takvimi — zaman çizelgesi ve takvim bu iki alandan üretilir
  application_start    date,
  application_deadline date,

  requirements         text,          -- başvuru şartları (aile görmez)
  tuition_fee          numeric(10,2), -- ücret
  currency             text default 'EUR',
  status               public.application_status not null default 'not_started',
  notes                text,          -- Eda'nın kendi özel notları (aile görmez)

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists universities_country_idx  on public.universities (country);
create index if not exists universities_deadline_idx on public.universities (application_deadline);

drop trigger if exists universities_set_updated_at on public.universities;
create trigger universities_set_updated_at
  before update on public.universities
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. programs — bölümler (bir üniversitede birden fazla olabilir)
-- -----------------------------------------------------------------------------

create table if not exists public.programs (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid not null references public.universities(id) on delete cascade,
  name           text not null,
  content        text,   -- bölümün içeriği (aile tıklayınca görebilir)
  details        text,   -- ek detaylar (aile tıklayınca görebilir)
  degree_level   text,   -- Lisans / Yüksek Lisans vb.
  language       text,   -- eğitim dili
  duration_years numeric(3,1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists programs_university_idx on public.programs (university_id);

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 6. contacts — görüşülen kişiler ve o bölümde okuyanlar
-- -----------------------------------------------------------------------------
-- Ailenin göreceği "notlar" kısmı burası. Kişinin iletişim bilgisi aileye
-- kapalı, sadece not metni açık.

create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid references public.universities(id) on delete cascade,
  program_id     uuid references public.programs(id) on delete set null,
  person_name    text not null,
  person_role    text,   -- "3. sınıf öğrencisi", "bölüm sekreteri" vb.
  contact_info   text,   -- e-posta/Instagram — aile GÖRMEZ
  note           text,   -- görüşme notu — aile GÖRÜR
  talked_at      date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists contacts_university_idx on public.contacts (university_id);

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 7. documents — yüklenen dosyalar
-- -----------------------------------------------------------------------------
-- Dosyanın kendisi Supabase Storage'da durur, burada sadece kaydı tutulur.
-- Tamamen Eda'ya özel, aile hiçbir şekilde göremez.

create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid references public.universities(id) on delete cascade,
  program_id     uuid references public.programs(id) on delete set null,
  doc_type       public.document_type not null default 'other',
  title          text not null,
  storage_path   text not null unique,  -- Storage içindeki yol
  file_size      bigint,
  mime_type      text,
  version        int not null default 1,       -- aynı mektubun kaçıncı hali
  stage          public.letter_stage not null default 'not_started',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists documents_university_idx on public.documents (university_id);
create index if not exists documents_program_idx    on public.documents (program_id);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 8. calendar_events — takvim (Ağustos 2026 – Eylül 2027)
-- -----------------------------------------------------------------------------
-- Başvuru son tarihleri buraya elle girilmez, universities tablosundan gelir.
-- Burada sadece Eda'nın kendi eklediği planlar durur.

create table if not exists public.calendar_events (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid references public.universities(id) on delete cascade,
  title          text not null,
  description    text,
  event_type     public.event_type not null default 'task',
  start_date     date not null,
  end_date       date,
  is_done        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint calendar_dates_valid check (end_date is null or end_date >= start_date)
);

create index if not exists calendar_events_start_idx on public.calendar_events (start_date);

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 9. suggestions — ailenin bıraktığı öneriler
-- -----------------------------------------------------------------------------
-- Aile yazar, Eda kendi sayfasında görür. Kimin yazdığı otomatik kaydedilir.

create table if not exists public.suggestions (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  university_id  uuid references public.universities(id) on delete set null,
  body           text not null,
  is_read        boolean not null default false,  -- Eda okudu mu
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists suggestions_author_idx  on public.suggestions (author_id);
create index if not exists suggestions_created_idx on public.suggestions (created_at desc);

drop trigger if exists suggestions_set_updated_at on public.suggestions;
create trigger suggestions_set_updated_at
  before update on public.suggestions
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 10. RLS — satır bazlı güvenlik
-- =============================================================================
-- Önce her tabloyu kilitle, sonra sadece gerekli izinleri aç.

alter table public.profiles        enable row level security;
alter table public.universities    enable row level security;
alter table public.programs        enable row level security;
alter table public.contacts        enable row level security;
alter table public.documents       enable row level security;
alter table public.calendar_events enable row level security;
alter table public.suggestions     enable row level security;

-- Şablondan kalan eski politikaları temizle. Supabase'in hazır kullanıcı
-- şablonu "herkes profilleri görebilir" gibi kurallar bırakmış olabilir;
-- bunlar kalırsa ailenin görmemesi gereken şeyler açıkta kalır.
-- Aşağıda kendi kurallarımızı sıfırdan tanımlıyoruz.
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in ('profiles','universities','programs','contacts',
                         'documents','calendar_events','suggestions')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- --- profiles ---
-- Herkes kendi profilini görür ve adını değiştirebilir; Eda hepsini görür.
drop policy if exists "kendi profilini gor" on public.profiles;
create policy "kendi profilini gor"
  on public.profiles for select
  using (id = auth.uid() or public.is_eda());

drop policy if exists "kendi profilini duzenle" on public.profiles;
create policy "kendi profilini duzenle"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- Sadece Eda'ya ait tablolar ---
-- Aile bu tabloların hiçbirine doğrudan erişemez (view üzerinden erişir).
drop policy if exists "eda tam yetki" on public.universities;
create policy "eda tam yetki" on public.universities
  for all using (public.is_eda()) with check (public.is_eda());

drop policy if exists "eda tam yetki" on public.programs;
create policy "eda tam yetki" on public.programs
  for all using (public.is_eda()) with check (public.is_eda());

drop policy if exists "eda tam yetki" on public.contacts;
create policy "eda tam yetki" on public.contacts
  for all using (public.is_eda()) with check (public.is_eda());

drop policy if exists "eda tam yetki" on public.documents;
create policy "eda tam yetki" on public.documents
  for all using (public.is_eda()) with check (public.is_eda());

drop policy if exists "eda tam yetki" on public.calendar_events;
create policy "eda tam yetki" on public.calendar_events
  for all using (public.is_eda()) with check (public.is_eda());

-- --- suggestions ---
-- Aile öneri yazar ve kendi yazdığını görür; Eda hepsini görür ve okundu işaretler.
drop policy if exists "kendi onerilerini gor" on public.suggestions;
create policy "kendi onerilerini gor"
  on public.suggestions for select
  using (author_id = auth.uid() or public.is_eda());

drop policy if exists "oneri yaz" on public.suggestions;
create policy "oneri yaz"
  on public.suggestions for insert
  with check (author_id = auth.uid());

drop policy if exists "kendi onerini duzenle" on public.suggestions;
create policy "kendi onerini duzenle"
  on public.suggestions for update
  using (author_id = auth.uid() and not is_read)
  with check (author_id = auth.uid());

drop policy if exists "eda okundu isaretler" on public.suggestions;
create policy "eda okundu isaretler"
  on public.suggestions for update
  using (public.is_eda()) with check (public.is_eda());

drop policy if exists "kendi onerini sil" on public.suggestions;
create policy "kendi onerini sil"
  on public.suggestions for delete
  using (author_id = auth.uid() or public.is_eda());


-- =============================================================================
-- 11. Ailenin göreceği görünümler (view)
-- =============================================================================
-- security_invoker kapalı: view sahibi yetkisiyle çalışır, yani tablonun
-- RLS'ini atlar. Güvenlik, view'ın SADECE izin verilen kolonları içermesinden
-- gelir. Gizli kolonlar (requirements, notes, contact_info, status) burada yok,
-- dolayısıyla aileye hiçbir yoldan ulaşmaz.

drop view if exists public.family_universities;
create view public.family_universities
with (security_invoker = off) as
  select id, name, country, city,
         application_start, application_deadline,
         tuition_fee, currency
  from public.universities;

drop view if exists public.family_programs;
create view public.family_programs
with (security_invoker = off) as
  select id, university_id, name, content, details,
         degree_level, language, duration_years
  from public.programs;

-- Ailenin göreceği notlar: sadece görüşme notu, kişinin iletişim bilgisi yok.
drop view if exists public.family_notes;
create view public.family_notes
with (security_invoker = off) as
  select id, university_id, program_id, person_name, person_role, note, talked_at
  from public.contacts
  where note is not null;

-- ÖNEMLİ: Supabase yeni oluşturulan her nesneye 'anon' (giriş yapmamış
-- ziyaretçi) rolü için otomatik yetki verir. Bu görünümler RLS'i bilerek
-- atladığı için tek koruma bu yetkilerdir — anon'dan çekilmezse siteyi
-- bilen herkes üniversite listesini ve notları okuyabilir.
revoke all on public.family_universities from anon, public;
revoke all on public.family_programs     from anon, public;
revoke all on public.family_notes        from anon, public;

grant select on public.family_universities to authenticated;
grant select on public.family_programs     to authenticated;
grant select on public.family_notes        to authenticated;


-- =============================================================================
-- 12. Eda'nın zaman çizelgesi
-- =============================================================================
-- "Kalan gün", "durum" ve "uyarı" kolonları TABLODA TUTULMAZ — her sorguda
-- anlık hesaplanır. Böylece hiçbir zaman eskimiş veri göstermez.
-- security_invoker = on: RLS geçerli, yani bu görünümü sadece Eda okuyabilir.

drop view if exists public.application_timeline;
create view public.application_timeline
with (security_invoker = on) as
  select
    u.id,
    u.name,
    u.country,
    u.city,
    u.application_start,
    u.application_deadline,
    u.status,

    -- Deadline'a kalan gün (geçmişse negatif)
    (u.application_deadline - current_date) as days_left,

    -- Motivasyon mektubunun en ileri aşaması.
    -- Enum sıralaması tanım sırasına göredir: final > review > drafting > not_started
    (select d.stage
       from public.documents d
      where d.university_id = u.id
        and d.doc_type = 'motivation_letter'
      order by d.stage desc
      limit 1) as letter_stage,

    -- Uyarı seviyesi
    case
      when u.status in ('submitted','accepted','rejected','waitlisted','withdrawn')
        then 'none'
      when u.application_deadline is null              then 'no_date'
      when u.application_deadline <  current_date      then 'missed'
      when u.application_deadline <= current_date + 7  then 'critical'
      when u.application_deadline <= current_date + 30 then 'warning'
      else 'ok'
    end as alert_level
  from public.universities u;

revoke all  on public.application_timeline from anon, public;
grant select on public.application_timeline to authenticated;


-- =============================================================================
-- 13. Storage — yüklenen dosyalar
-- =============================================================================
-- Kapalı (private) kova: dosyalara sadece Eda erişir, link paylaşılsa bile
-- başkası açamaz.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "eda dosya okur" on storage.objects;
create policy "eda dosya okur"
  on storage.objects for select
  using (bucket_id = 'documents' and public.is_eda());

drop policy if exists "eda dosya yukler" on storage.objects;
create policy "eda dosya yukler"
  on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_eda());

drop policy if exists "eda dosya gunceller" on storage.objects;
create policy "eda dosya gunceller"
  on storage.objects for update
  using (bucket_id = 'documents' and public.is_eda());

drop policy if exists "eda dosya siler" on storage.objects;
create policy "eda dosya siler"
  on storage.objects for delete
  using (bucket_id = 'documents' and public.is_eda());
