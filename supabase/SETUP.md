# Supabase kurulumu

## 1. SQL'i çalıştır

`migrations/0001_init.sql` dosyasının tamamını Supabase panelinde **SQL Editor**'e yapıştır ve çalıştır.

Dosya defalarca çalıştırılabilir — var olanı atlar, eksiği tamamlar, hiçbir veriyi silmez.

## 2. Kayıt olmayı kapat

**Authentication → Providers → Email → "Enable email signup"** seçeneğini **kapat**.

Bu adım SQL ile yapılamıyor, sadece panelden yapılabiliyor. Açık kalırsa siteyi bulan herkes kendine hesap açıp aile görünümüne girebilir.

## 3. Hesapları aç (kod ile giriş)

Kimse e-posta girmiyor — herkes kendine ait bir **kod** yazarak giriyor. Kod, arka planda hesabın hem adresini hem şifresini oluşturuyor.

**Authentication → Users → Add user → Create new user** ile her kişi için:

| Alan | Ne yazacaksın |
|---|---|
| Email | `<kod>@eda.uniplan.app` (sen) veya `<kod>@family.uniplan.app` (aile) |
| Password | **kodun kendisi** — adresin başındaki kelimenin aynısı |
| Auto Confirm User | ✅ **mutlaka işaretle** |

### Örnek

Kendine `edaplan2027` kodunu seçtin:
- Email: `edaplan2027@eda.uniplan.app`
- Password: `edaplan2027`

Annen için `anne-kitap41`:
- Email: `anne-kitap41@family.uniplan.app`
- Password: `anne-kitap41`

Giriş ekranında sadece `edaplan2027` yazılıyor, gerisini uygulama hallediyor.

### Kurallar

- Kod **en az 6 karakter** olmalı (Supabase'in alt sınırı)
- Sadece küçük harf, rakam, `-`, `.` ve `_` kullan
- Adresin başındaki kelime ile şifre **birebir aynı** olmalı, yoksa giriş çalışmaz
- `@eda.uniplan.app` ile biten hesaplar **eda** rolü, `@family.uniplan.app` ile bitenler **family** rolü alır — bu otomatik
- Bu adreslere hiç e-posta gönderilmez, sadece kimlik ayırt etmeye yarar

### Görünen ad

Aile üyesinin adı ilk başta kodu olarak görünür (`anne-kitap41`). Bunu düzeltmek için:

```sql
update public.profiles set full_name = 'Anne'
where id = (select id from auth.users where email = 'anne-kitap41@family.uniplan.app');
```

### Kod değiştirmek

Bir kod sızarsa **Authentication → Users** listesinden o kullanıcıyı sil ve yeni kodla yeniden oluştur.

---

## Rolleri kontrol etmek istersen

```sql
select p.full_name, p.role, u.email
from public.profiles p
join auth.users u on u.id = p.id
order by p.role;
```

## Kim neyi görüyor

| Veri | Eda | Aile |
|---|---|---|
| Üniversite adı, ülke, şehir, ücret, tarihler | ✅ | ✅ |
| Bölüm adı, içeriği, detayı | ✅ | ✅ |
| Görüşme notları | ✅ | ✅ |
| Başvuru şartları | ✅ | ❌ |
| Eda'nın özel notları | ✅ | ❌ |
| Başvuru durumu | ✅ | ❌ |
| Görüşülen kişinin iletişim bilgisi | ✅ | ❌ |
| Yüklenen dökümanlar | ✅ | ❌ |
| Takvim | ✅ | ❌ |
| Öneriler | Hepsini görür | Sadece kendi yazdığını |

Aile, tabloların kendisine hiç erişemiyor — sadece `family_universities`, `family_programs` ve `family_notes` görünümlerini okuyabiliyor. Gizli sütunlar bu görünümlerin içinde hiç yer almadığı için, arayüz kurcalanarak da ulaşılamaz.
