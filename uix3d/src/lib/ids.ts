/** Short random id such as "txt_3f9a1c2b". Works on plain http too (no crypto.randomUUID). */
export function createId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}