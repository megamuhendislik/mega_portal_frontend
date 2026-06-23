// Avans-bilinçli yıllık izin bakiyesi gösterim yardımcıları.
// Tasarım: docs/plans/2026-06-23-avans-izin-design.md
//
// Seçilen biçim:
//   - Hiç kullanılmamış:  "Kalan: 0 gün (+14 avans)"
//   - Kısmen kullanılmış: "Kalan: -3 gün (3/14 avans)"
//   - Avans limiti 0:     parantez yok ("0 default" kuralı)

/**
 * Avans parantez eki üretir. Limit 0 ise boş string döner.
 * @param {{limit?: number, used?: number, remaining?: number|null}} adv
 * @returns {string} örn. " (+14 avans)" veya " (3/14 avans)" veya ""
 */
export function advanceSuffix(adv = {}) {
  const limit = Number(adv.limit || 0);
  if (!limit) return '';
  const used = Number(adv.used || 0);
  if (used > 0) return ` (${used}/${limit} avans)`;
  const remaining = adv.remaining == null ? limit : Number(adv.remaining);
  return ` (+${remaining} avans)`;
}

/**
 * "{net} {unit}{suffix}" tam metni üretir.
 * @param {{net?: number, limit?: number, used?: number, remaining?: number|null}} s
 * @param {{unit?: string}} [opts]
 */
export function formatLeaveBalance(s = {}, { unit = 'gün' } = {}) {
  const net = Number(s.net ?? 0);
  return `${net} ${unit}${advanceSuffix(s)}`;
}
