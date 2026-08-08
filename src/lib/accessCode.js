// Kod ile giriş
// -----------------------------------------------------------------------------
// Kullanıcı sadece bir kod yazar. Kod hem hesabın şifresi, hem de adresinin
// baş kısmıdır. Sonundaki alan adı rolü belirler — bu adreslere e-posta
// gönderilmez, yalnızca kimliği ayırt etmeye yarar.

export const EDA_DOMAIN = 'eda.uniplan.app'
export const FAMILY_DOMAIN = 'family.uniplan.app'

// Supabase'in şifre alt sınırı
export const MIN_CODE_LENGTH = 6

/**
 * Kodu adres olarak kullanılabilir hâle getirir.
 * "Anne 2027" -> "anne-2027"
 */
export function normalizeCode(code) {
  return code
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
}

export function codeToEmail(code, domain) {
  return `${normalizeCode(code)}@${domain}`
}
