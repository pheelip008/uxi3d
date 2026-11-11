import { create } from 'zustand';
import { DEFAULT_SIZE_ID, getSection, getSize } from '../data/tent.ts';
import {
  boundingBox,
  clamp,
  longSide,
  mapBetweenSections,
  normalizeAngle,
  rotate,
  sectionAnchor,
  shortSide,
} from '../lib/geometry.ts';
import { createId } from '../lib/ids.ts';
import type {
  DesignConfig,
  ImageAsset,
  ImageLayer,
  Layer,
  SectionDefinition,
  TextLayer,
} from '../types.ts';

export type EditorView = 'layout' | 'section';
export type SaveStatus = 'idle' | 'saved' | 'failed';
export type ColourTarget = 'peaks' | 'valances' | 'all';
export type LayerPatch =
  | Partial<Omit<TextLayer, 'id' | 'type'>>
  | Partial<Omit<ImageLayer, 'id' | 'type'>>;

const HISTORY_LIMIT = 60;
/** Edits with the same key closer together than this become one undo step (dragging, typing). */
const MERGE_WINDOW_MS = 1000;

/** Black or white, whichever reads better on the given background. */
function contrastColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#ffffff';
}

function defaultFontSize(section: SectionDefinition): number {
  return section.kind === 'peak' ? longSide(section) * 0.07 : shortSide(section) * 0.45;
}

export function createDefaultDesign(sizeId = DEFAULT_SIZE_ID): DesignConfig {
  const size = getSize(sizeId);
  const peak = getSection(size, 'peak_front');
  const valance = getSection(size, 'valance_front');
  const [px, py] = sectionAnchor(peak);
  const [vx, vy] = sectionAnchor(valance);
  return {
    schemaVersion: 1,
    id: createId('cfg'),
    productId: 'custom-canopy-tent',
    sizeId: size.id,
    frame: 'frame',
    sections: Object.fromEntries(
      size.sections.map((s) => [s.id, { color: s.kind === 'peak' ? '#0b2545' : '#c8102e' }]),
    ),
    layers: [
      {
        id: createId('txt'),
        type: 'text',
        sectionId: peak.id,
        x: px,
        y: py,
        rotation: 0,
        opacity: 1,
        text: 'YOUR BRAND',
        fontFamily: 'Montserrat',
        fontSize: defaultFontSize(peak),
        bold: true,
        italic: false,
        color: '#ffffff',
      },
      {
        id: createId('txt'),
        type: 'text',
        sectionId: valance.id,
        x: vx,
        y: vy,
        rotation: 0,
        opacity: 1,
        text: 'yourbrand.com',
        fontFamily: 'Montserrat',
        fontSize: defaultFontSize(valance),
        bold: false,
        italic: false,
        color: '#ffffff',
      },
    ],
    assets: {},
    updatedAt: new Date().toISOString(),
  };
}

interface DesignState {
  config: DesignConfig;
  quantity: number;
  selectedSectionId: string;
  selectedLayerId: string | null;
  editorView: EditorView;
  saveStatus: SaveStatus;
  past: DesignConfig[];
  future: DesignConfig[];
  lastEdit: { key: string; at: number } | null;
}

interface DesignActions {
  hydrate: (config: DesignConfig) => void;
  setSize: (sizeId: string) => void;
  setFrame: (frame: string) => void;
  setQuantity: (quantity: number) => void;
  selectSection: (sectionId: string) => void;
  selectLayer: (layerId: string | null) => void;
  setEditorView: (view: EditorView) => void;
  setSectionColor: (sectionId: string, color: string) => void;
  applyColor: (color: string, target: ColourTarget) => void;
  addText: () => void;
  addImage: (asset: Omit<ImageAsset, 'id'>) => void;
  updateLayer: (layerId: string, patch: LayerPatch, mergeKey?: string) => void;
  nudgeLayer: (layerId: string, dx: number, dy: number) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  centerLayer: (layerId: string) => void;
  copyLayerToSiblings: (layerId: string) => void;
  undo: () => void;
  redo: () => void;
  resetDesign: () => void;
  loadDesign: (config: DesignConfig) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useDesignStore = create<DesignState & DesignActions>()((set, get) => {
  /** Every design change goes through here, so undo/redo always works. */
  function commit(recipe: (config: DesignConfig) => DesignConfig, mergeKey?: string) {
    const { config, past, lastEdit } = get();
    const next = recipe(config);
    if (next === config) return;
    const now = Date.now();
    const merge = !!mergeKey && lastEdit?.key === mergeKey && now - lastEdit.at < MERGE_WINDOW_MS;
    set({
      config: { ...next, updatedAt: new Date(now).toISOString() },
      past: merge ? past : [...past, config].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: mergeKey ? { key: mergeKey, at: now } : null,
    });
  }

  function findLayer(layerId: string): Layer | undefined {
    return get().config.layers.find((l) => l.id === layerId);
  }

  function sectionOf(layer: Layer): SectionDefinition {
    return getSection(getSize(get().config.sizeId), layer.sectionId);
  }

  /** Keep the selection valid after undo/redo/load. */
  function keepSelection(config: DesignConfig) {
    const { selectedLayerId } = get();
    return config.layers.some((l) => l.id === selectedLayerId) ? selectedLayerId : null;
  }

  return {
    config: createDefaultDesign(),
    quantity: 1,
    selectedSectionId: 'peak_front',
    selectedLayerId: null,
    editorView: 'layout',
    saveStatus: 'idle',
    past: [],
    future: [],
    lastEdit: null,

    hydrate: (config) =>
      set({ config, past: [], future: [], lastEdit: null, selectedLayerId: null }),

    setSize: (sizeId) =>
      commit((c) => {
        if (c.sizeId === sizeId) return c;
        const from = getSize(c.sizeId);
        const to = getSize(sizeId);
        // Each size has a slightly different UV layout, so move the artwork with its panel.
        const layers = c.layers.map((layer): Layer => {
          const m = mapBetweenSections(
            [layer.x, layer.y],
            getSection(from, layer.sectionId),
            getSection(to, layer.sectionId),
          );
          const moved = { ...layer, x: m.point[0], y: m.point[1] };
          return moved.type === 'text'
            ? { ...moved, fontSize: moved.fontSize * m.scale }
            : { ...moved, width: moved.width * m.scale, height: moved.height * m.scale };
        });
        return { ...c, sizeId: to.id, layers };
      }),

    setFrame: (frame) => commit((c) => (c.frame === frame ? c : { ...c, frame })),

    setQuantity: (quantity) =>
      set({ quantity: clamp(Math.round(quantity) || 1, 1, 999) }),

    selectSection: (sectionId) => {
      const layer = findLayer(get().selectedLayerId ?? '');
      set({
        selectedSectionId: sectionId,
        selectedLayerId: layer?.sectionId === sectionId ? layer.id : null,
      });
    },

    selectLayer: (layerId) => {
      const layer = layerId ? findLayer(layerId) : undefined;
      set(layer ? { selectedLayerId: layer.id, selectedSectionId: layer.sectionId } : { selectedLayerId: null });
    },

    setEditorView: (editorView) => set({ editorView }),

    setSectionColor: (sectionId, color) =>
      commit(
        (c) => ({ ...c, sections: { ...c.sections, [sectionId]: { color } } }),
        `colour:${sectionId}`,
      ),

    applyColor: (color, target) =>
      commit((c) => {
        const sections = { ...c.sections };
        for (const s of getSize(c.sizeId).sections) {
          if (target === 'all' || (target === 'peaks') === (s.kind === 'peak')) {
            sections[s.id] = { color };
          }
        }
        return { ...c, sections };
      }),

    addText: () => {
      const { config, selectedSectionId } = get();
      const section = getSection(getSize(config.sizeId), selectedSectionId);
      const [x, y] = sectionAnchor(section);
      const layer: TextLayer = {
        id: createId('txt'),
        type: 'text',
        sectionId: section.id,
        x,
        y,
        rotation: section.upright,
        opacity: 1,
        text: 'Your text',
        fontFamily: 'Montserrat',
        fontSize: defaultFontSize(section),
        bold: true,
        italic: false,
        color: contrastColor(config.sections[section.id]?.color ?? '#ffffff'),
      };
      commit((c) => ({ ...c, layers: [...c.layers, layer] }));
      set({ selectedLayerId: layer.id });
    },

    addImage: (input) => {
      const { config, selectedSectionId } = get();
      const section = getSection(getSize(config.sizeId), selectedSectionId);
      const asset: ImageAsset = { ...input, id: createId('img') };
      // Fit the image inside the panel, keeping its proportions.
      const aspect = asset.width / asset.height;
      const maxW = longSide(section) * (section.kind === 'peak' ? 0.4 : 0.5);
      const maxH = shortSide(section) * (section.kind === 'peak' ? 0.4 : 0.75);
      let width = maxW;
      let height = width / aspect;
      if (height > maxH) {
        height = maxH;
        width = height * aspect;
      }
      const [x, y] = sectionAnchor(section);
      const layer: ImageLayer = {
        id: createId('lyr'),
        type: 'image',
        sectionId: section.id,
        x,
        y,
        rotation: section.upright,
        opacity: 1,
        assetId: asset.id,
        width,
        height,
      };
      commit((c) => ({
        ...c,
        assets: { ...c.assets, [asset.id]: asset },
        layers: [...c.layers, layer],
      }));
      set({ selectedLayerId: layer.id });
    },

    updateLayer: (layerId, patch, mergeKey) =>
      commit(
        (c) => ({
          ...c,
          layers: c.layers.map((l) => (l.id === layerId ? ({ ...l, ...patch } as Layer) : l)),
        }),
        mergeKey,
      ),

    nudgeLayer: (layerId, dx, dy) => {
      const layer = findLayer(layerId);
      if (!layer) return;
      const section = sectionOf(layer);
      // In the section view the panel is shown upright, so turn the arrow direction with it.
      const [mx, my] = get().editorView === 'section' ? rotate([dx, dy], section.upright) : [dx, dy];
      const box = boundingBox(section.polygon);
      get().updateLayer(
        layerId,
        { x: clamp(layer.x + mx, box.minX, box.maxX), y: clamp(layer.y + my, box.minY, box.maxY) },
        `nudge:${layerId}`,
      );
    },

    removeLayer: (layerId) => {
      commit((c) => {
        const layer = c.layers.find((l) => l.id === layerId);
        if (!layer) return c;
        const layers = c.layers.filter((l) => l.id !== layerId);
        const assets = { ...c.assets };
        // Drop the image file too when nothing else uses it.
        if (layer.type === 'image' && !layers.some((l) => l.type === 'image' && l.assetId === layer.assetId)) {
          delete assets[layer.assetId];
        }
        return { ...c, layers, assets };
      });
      if (get().selectedLayerId === layerId) set({ selectedLayerId: null });
    },

    duplicateLayer: (layerId) => {
      const layer = findLayer(layerId);
      if (!layer) return;
      const [ox, oy] = rotate([0.012, 0.012], sectionOf(layer).upright);
      const copy: Layer = { ...layer, id: createId(layer.type === 'text' ? 'txt' : 'lyr'), x: layer.x + ox, y: layer.y + oy };
      commit((c) => {
        const layers = [...c.layers];
        layers.splice(layers.indexOf(layer) + 1, 0, copy);
        return { ...c, layers };
      });
      set({ selectedLayerId: copy.id });
    },

    moveLayer: (layerId, direction) =>
      commit((c) => {
        const i = c.layers.findIndex((l) => l.id === layerId);
        if (i < 0) return c;
        const sectionId = c.layers[i].sectionId;
        // Swap with the next layer on the same panel ("up" = drawn later = on top).
        const step = direction === 'up' ? 1 : -1;
        let j = i + step;
        while (j >= 0 && j < c.layers.length && c.layers[j].sectionId !== sectionId) j += step;
        if (j < 0 || j >= c.layers.length) return c;
        const layers = [...c.layers];
        [layers[i], layers[j]] = [layers[j], layers[i]];
        return { ...c, layers };
      }),

    centerLayer: (layerId) => {
      const layer = findLayer(layerId);
      if (!layer) return;
      const section = sectionOf(layer);
      const [x, y] = sectionAnchor(section);
      get().updateLayer(layerId, { x, y, rotation: section.upright });
    },

    copyLayerToSiblings: (layerId) => {
      const layer = findLayer(layerId);
      if (!layer) return;
      const from = sectionOf(layer);
      const targets = getSize(get().config.sizeId).sections.filter(
        (s) => s.kind === from.kind && s.id !== from.id,
      );
      const copies = targets.map((to): Layer => {
        const m = mapBetweenSections([layer.x, layer.y], from, to);
        const base = {
          ...layer,
          id: createId(layer.type === 'text' ? 'txt' : 'lyr'),
          sectionId: to.id,
          x: m.point[0],
          y: m.point[1],
          rotation: normalizeAngle(layer.rotation + m.rotationDelta),
        };
        return base.type === 'text'
          ? { ...base, fontSize: base.fontSize * m.scale }
          : { ...base, width: base.width * m.scale, height: base.height * m.scale };
      });
      commit((c) => ({ ...c, layers: [...c.layers, ...copies] }));
    },

    undo: () => {
      const { past, future, config } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({ config: previous, past: past.slice(0, -1), future: [config, ...future], lastEdit: null });
      set({ selectedLayerId: keepSelection(previous) });
    },

    redo: () => {
      const { past, future, config } = get();
      const next = future[0];
      if (!next) return;
      set({ config: next, past: [...past, config], future: future.slice(1), lastEdit: null });
      set({ selectedLayerId: keepSelection(next) });
    },

    resetDesign: () => {
      commit((c) => createDefaultDesign(c.sizeId));
      set({ selectedLayerId: null });
    },

    loadDesign: (config) => {
      commit(() => config);
      set({ selectedLayerId: null, selectedSectionId: 'peak_front' });
    },

    setSaveStatus: (saveStatus) => {
      if (get().saveStatus !== saveStatus) set({ saveStatus });
    },
  };
});