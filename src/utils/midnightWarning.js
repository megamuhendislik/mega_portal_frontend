/**
 * OT talebinin end_time'ı 23:59 ise true döner.
 * Gece yarısı otomatik split sonucu oluşan kayıtları tespit eder.
 */
export const isMidnightBoundary = (endTime) => {
  if (!endTime) return false;
  const t = endTime.toString().substring(0, 5);
  return t === '23:59';
};
