-- =============================================================================
-- Görünen adları düzelt
-- =============================================================================
-- Hesaplar açıldığında görünen ad, kodun kendisi olur (örn. "ayguluni").
-- Bu dosya onları gerçek isimlere çevirir; öneriler "Aygül: ..." diye görünür.
--
-- İleride yeni biri eklenirse aşağıdaki listeye bir satır eklemen yeterli.
-- Tekrar tekrar çalıştırılabilir.
-- =============================================================================

update public.profiles p
   set full_name = v.ad
  from (values
    ('edauni@eda.uniplan.app',        'Eda'),
    ('eceuni@family.uniplan.app',     'Ece'),
    ('ayguluni@family.uniplan.app',   'Aygül'),
    ('oktayuni@family.uniplan.app',   'Oktay')
  ) as v(mail, ad)
 where p.id = (select id from auth.users where lower(email) = v.mail);


-- Kontrol: hepsi doğru mu?
select p.full_name as ad, p.role as rol, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.role, p.full_name;
