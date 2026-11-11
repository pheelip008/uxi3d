// Fonts offered in the text tool. The web fonts are loaded from Google Fonts in index.html.
export const FONTS = [
  'Montserrat',
  'Anton',
  'Bebas Neue',
  'Oswald',
  'Playfair Display',
  'Roboto Slab',
  'Pacifico',
  'Permanent Marker',
  'Arial',
  'Georgia',
  'Impact',
];

type FontStyle = { fontFamily: string; bold: boolean; italic: boolean };

export function fontString(font: FontStyle, sizePx: number): string {
  return `${font.italic ? 'italic ' : ''}${font.bold ? 700 : 400} ${sizePx}px "${font.fontFamily}", sans-serif`;
}

// A canvas only draws with a web font after it has downloaded, and the browser
// only downloads a font when something asks for it. So we ask, and redraw when it arrives.
const requested = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function onFontLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function ensureFontLoaded(font: FontStyle): void {
  if (typeof document === 'undefined' || !document.fonts) return;
  const spec = fontString(font, 40);
  if (requested.has(spec) || document.fonts.check(spec)) return;
  requested.add(spec);
  document.fonts.load(spec).then(notify, () => undefined);
}

// Safety net: redraw whenever the browser finishes loading any font
// (for example when the Google Fonts stylesheet arrives after the first draw).
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener('loadingdone', notify);
}