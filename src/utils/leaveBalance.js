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

/**
 * Doğum günü izni şu an kullanılabilir/talep edilebilir mi (tek-doğru-kaynak).
 * Kural: yalnızca doğum ayında + kullanılmamışken geçerli. Doğum ayı geçince
 * veya kullanılınca "yanar" → false.
 * Backend `available` alanını kullanır; henüz gelmemişse (deploy öncesi)
 * mevcut alanlardan (is_birthday_month && !is_used) fallback hesaplar.
 * @param {{available?: boolean, is_birthday_month?: boolean, is_used?: boolean}|null|undefined} balance
 * @returns {boolean}
 */
export function isBirthdayLeaveAvailable(balance) {
  return (
    balance?.available ??
    (balance?.is_birthday_month === true && balance?.is_used === false)
  );
}
