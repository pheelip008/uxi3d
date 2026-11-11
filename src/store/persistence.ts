import { findVariantById } from '../data/catalog.ts';
import { TENT } from '../data/tent.ts';
import { downloadBlob } from '../lib/format.ts';
import type { DesignConfig } from '../types.ts';
import { useDesignStore } from './designStore.ts';

const STORAGE_KEY = 'tent-configurator:design';

/** Light check that some JSON really is one of our designs. */
export function parseDesign(data: unknown): DesignConfig | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<DesignConfig>;
  const valid =
    d.schemaVersion === 1 &&
    typeof d.id === 'string' &&
    TENT.sizes.some((s) => s.id === d.sizeId) &&
    TENT.frames.some((f) => f.id === d.frame) &&
    Array.isArray(d.layers) &&
    !!d.sections &&
    typeof d.sections === 'object' &&
    !!d.assets &&
    typeof d.assets === 'object';
  return valid ? (d as DesignConfig) : null;
}

function readSaved(): DesignConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseDesign(JSON.parse(raw)) : null;
  } catch {
    // Storage can be blocked, for example in a third-party iframe.
    return null;
  }
}

/** Reopen the design saved in this browser, then apply ?size=, ?frame= or ?variant_id= from the URL. */
export function restoreDesign(): void {
  const store = useDesignStore.getState();
  const saved = readSaved();
  if (saved) store.hydrate(saved);

  const params = new URLSearchParams(window.location.search);
  const variant = findVariantById(Number(params.get('variant_id')));
  const sizeId = variant?.sizeId ?? params.get('size');
  const frame = variant?.frame ?? params.get('frame');
  if (sizeId && TENT.sizes.some((s) => s.id === sizeId)) store.setSize(sizeId);
  if (frame && TENT.frames.some((f) => f.id === frame)) store.setFrame(frame);
  // Starting options are not something the user should be able to "undo".
  useDesignStore.setState({ past: [], future: [], lastEdit: null });
}

function save() {
  const { config, setSaveStatus } = useDesignStore.getState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaveStatus('saved');
  } catch {
    // Quota exceeded (big images) or storage blocked: keep working, just say so.
    setSaveStatus('failed');
  }
}

/** Save the design shortly after the user stops changing it. Returns a stop function. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useDesignStore.subscribe((state, prev) => {
    if (state.config === prev.config) return;
    clearTimeout(timer);
    timer = setTimeout(save, 700);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

export function exportDesign(config: DesignConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `design-${config.id}.json`);
}

export async function readDesignFile(file: File): Promise<DesignConfig> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const design = parseDesign(data);
  if (!design) throw new Error('This file is not a tent design.');
  return design;
}