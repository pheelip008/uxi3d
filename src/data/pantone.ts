import type { SectionColour } from '../types.ts';

// Common Pantone (PMS) solid coated colours with approximate sRGB values for the
// on-screen preview. The Pantone code itself travels with the order, so the
// print shop matches the real ink rather than this hex value.
const PANTONE: Record<string, string> = {
  WHITE: '#ffffff',
  'BLACK C': '#2d2926',
  'BLACK 6 C': '#101820',
  'COOL GRAY 1 C': '#d9d9d6',
  'COOL GRAY 5 C': '#b1b3b3',
  'COOL GRAY 7 C': '#97999b',
  'COOL GRAY 9 C': '#75787b',
  'COOL GRAY 11 C': '#53565a',
  '877 C': '#8a8d8f',
  '432 C': '#333f48',
  'YELLOW C': '#fedd00',
  '109 C': '#ffd100',
  '116 C': '#ffcd00',
  '123 C': '#ffc72c',
  '130 C': '#f2a900',
  '1235 C': '#ffb81c',
  '137 C': '#ffa300',
  '1375 C': '#ff9e1b',
  '151 C': '#ff8200',
  '165 C': '#ff671f',
  'ORANGE 021 C': '#fe5000',
  'WARM RED C': '#f9423a',
  'RED 032 C': '#ef3340',
  '485 C': '#da291c',
  '185 C': '#e4002b',
  '186 C': '#c8102e',
  '199 C': '#d50032',
  '1795 C': '#d22630',
  '201 C': '#9d2235',
  '202 C': '#862633',
  'RUBINE RED C': '#ce0058',
  'RHODAMINE RED C': '#e10098',
  '219 C': '#da1884',
  'PURPLE C': '#bb29bb',
  '266 C': '#753bbd',
  '2685 C': '#330072',
  'VIOLET C': '#440099',
  'BLUE 072 C': '#10069f',
  'REFLEX BLUE C': '#001489',
  '286 C': '#0033a0',
  '287 C': '#003087',
  '293 C': '#003da5',
  '300 C': '#005eb8',
  '2945 C': '#004c97',
  '281 C': '#00205b',
  '289 C': '#0c2340',
  'PROCESS BLUE C': '#0085ca',
  '299 C': '#00a3e0',
  '2925 C': '#009cde',
  '320 C': '#009ca6',
  '3278 C': '#009b77',
  'GREEN C': '#00ab84',
  '347 C': '#009a44',
  '348 C': '#00843d',
  '355 C': '#009639',
  '356 C': '#007a33',
  '3425 C': '#006341',
  '361 C': '#43b02a',
  '375 C': '#97d700',
  '469 C': '#693f23',
  '4625 C': '#4f2c1d',
};

/** "pms 185c", "Pantone 185 C" and "185" all become "185 C". */
function pantoneKey(text: string): string {
  return text
    .toUpperCase()
    .replace(/^(PANTONE|PMS)\s*/, '')
    .replace(/GREY/g, 'GRAY')
    .replace(/\s+/g, ' ')
    .replace(/(\d)C$/, '$1 C')
    .trim();
}

/** The colour of a Pantone code, or null if it is not in our table. */
export function findPantone(text: string): SectionColour | null {
  const key = pantoneKey(text);
  for (const candidate of [key, `${key} C`]) {
    const hex = PANTONE[candidate];
    if (hex) return { color: hex, pantone: `Pantone ${candidate}` };
  }
  return null;
}

/**
 * Read what the customer typed in the "Pantone / Hex" box: a hex colour
 * (#e4002b, e4002b or #f00) or a Pantone code (185 C, Pantone White).
 */
export function parseColourInput(text: string): SectionColour | null {
  const value = text.trim();
  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    return { color: `#${digits.toLowerCase()}` };
  }
  return value ? findPantone(value) : null;
}

/** How a section colour is shown to people: the Pantone code if there is one, else the hex. */
export function describeColour(colour: SectionColour | undefined): string {
  if (!colour) return '#FFFFFF';
  return colour.pantone ? `${colour.pantone} (${colour.color.toUpperCase()})` : colour.color.toUpperCase();
}
