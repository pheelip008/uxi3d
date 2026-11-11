import { create } from 'zustand';
import { clamp } from '../lib/geometry.ts';
import { useDesignStore } from './designStore.ts';

// Editor state that is not part of the design: it is never saved and never undone.

export type ViewMode = '2d' | '3d';
export type ToolId = 'tent' | 'colours' | 'uploads' | 'text';

/** Steps for the 2D zoom buttons. 1 = the whole layout fits. */
export const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
export const MAX_ZOOM = 4;

/** Wide screens show panels beside the canvas; narrow ones show them as a sheet over it. */
const isWide = () => typeof window === 'undefined' || window.matchMedia('(min-width: 900px)').matches;

interface UiState {
  mode: ViewMode;
  /** Which tool panel is open, if any. */
  tool: ToolId | null;
  /** 2D zoom (1 = fit) and how far the view is moved from its centre, in layout (UV) units. */
  zoom: number;
  pan: [number, number];
  /** Draw the UV grid and panel names on the design, in 2D and on the 3D model. */
  guides: boolean;
  setMode: (mode: ViewMode) => void;
  toggleTool: (tool: ToolId) => void;
  openTool: (tool: ToolId) => void;
  closeTool: () => void;
  setView: (zoom: number, pan?: [number, number]) => void;
  toggleGuides: () => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  mode: '2d',
  tool: isWide() ? 'tent' : null,
  zoom: 1,
  pan: [0, 0],
  guides: false,
  setMode: (mode) => set({ mode }),
  toggleTool: (tool) => set({ tool: get().tool === tool ? null : tool }),
  openTool: (tool) => set({ tool }),
  closeTool: () => set({ tool: null }),
  setView: (zoom, pan = get().pan) => {
    const z = clamp(zoom, 1, MAX_ZOOM);
    // Back at "fit" there is nothing to move, so the view snaps back to the centre.
    set(z <= 1.001 ? { zoom: 1, pan: [0, 0] } : { zoom: z, pan: [clamp(pan[0], -0.5, 0.5), clamp(pan[1], -0.5, 0.5)] });
  },
  toggleGuides: () => set({ guides: !get().guides }),
}));

useDesignStore.subscribe((state, prev) => {
  const ui = useUiStore.getState();

  // A new 2D view starts at "fit"; in panel view a new panel starts centred.
  if (state.editorView !== prev.editorView) ui.setView(1);
  else if (state.editorView === 'section' && state.selectedSectionId !== prev.selectedSectionId) {
    ui.setView(ui.zoom, [0, 0]);
  }

  // Picking a layer on the canvas opens the panel that edits it.
  if (state.selectedLayerId && state.selectedLayerId !== prev.selectedLayerId && (ui.tool || isWide())) {
    const layer = state.config.layers.find((l) => l.id === state.selectedLayerId);
    if (layer) ui.openTool(layer.type === 'text' ? 'text' : 'uploads');
  }
});
