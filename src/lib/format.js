// Ortak biçimlendirme yardımcıları

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return '—'
  return `${Number(amount).toLocaleString('tr-TR')} ${currency || ''}`.trim()
}

// Başvuru durumlarının Türkçe karşılıkları
export const STATUS_LABELS = {
  not_started: 'Başlamadı',
  preparing: 'Hazırlanıyor',
  submitted: 'Gönderildi',
  interview: 'Mülakat',
  accepted: 'Kabul',
  rejected: 'Ret',
  waitlisted: 'Yedek liste',
  withdrawn: 'Vazgeçildi',
}

// Motivasyon mektubu yazım aşamaları
export const STAGE_LABELS = {
  not_started: 'Başlamadı',
  drafting: 'Taslak',
  review: 'Gözden geçiriliyor',
  final: 'Bitti',
}

// Deadline uyarı seviyeleri
export const ALERT_LABELS = {
  critical: 'Son günler',
  warning: 'Yaklaşıyor',
  missed: 'Tarih geçti',
  ok: 'Zaman var',
  no_date: 'Tarih girilmedi',
  none: 'Tamamlandı',
}
