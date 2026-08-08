# Supabase kurulumu

## 1. SQL'i çalıştır

`migrations/0001_init.sql` dosyasının tamamını Supabase panelinde **SQL Editor**'e yapıştır ve çalıştır.

Dosya defalarca çalıştırılabilir — var olanı atlar, eksiği tamamlar, hiçbir veriyi silmez.

## 2. Kayıt olmayı kapat

**Authentication → Providers → Email → "Enable email signup"** seçeneğini **kapat**.

Bu adım SQL ile yapılamıyor, sadece panelden yapılabiliyor. Açık kalırsa siteyi bulan herkes kendine hesap açıp aile görünümüne girebilir.

## 3. Hesapları aç

**Authentication → Users → Add user** ile hesapları oluştur:

- `edabeyter5@gmail.com` → otomatik olarak **eda** rolü alır, her şeyi görür
- Aile üyeleri (her birine ayrı hesap) → otomatik olarak **family** rolü alır, kısıtlı görünümü görür

Rol ataması e-postaya bakılarak kendiliğinden yapılır, elle bir şey ayarlamana gerek yok.

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
