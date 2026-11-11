import { useEffect } from 'react';
import { create } from 'zustand';
import { getSize } from '../data/tent.ts';
import { useDesignStore } from '../store/designStore.ts';
import { useUiStore } from '../store/uiStore.ts';
import { onFontLoaded } from './fonts.ts';
import { onImageLoaded } from './images.ts';
import { renderDesign, TEXTURE_SIZE, type RenderOptions } from './renderDesign.ts';

// The one rendered picture of the design. The 2D editor shows it and the 3D
// canopy uses it as its texture, so the two views can never disagree.
export const designCanvas = document.createElement('canvas');
designCanvas.width = TEXTURE_SIZE;
designCanvas.height = TEXTURE_SIZE;

/** Bumped after every redraw so the views know to refresh. */
export const useSurfaceVersion = create<{ version: number }>(() => ({ version: 0 }));

/** Redraw now. Guides follow the editor setting unless the caller says otherwise (the PDF turns them off). */
export function renderSurfaceNow(options: RenderOptions = {}): void {
  const { config } = useDesignStore.getState();
  const guides = options.guides ?? useUiStore.getState().guides;
  renderDesign(designCanvas, config, getSize(config.sizeId), { guides });
  useSurfaceVersion.setState((s) => ({ version: s.version + 1 }));
}

/** Redraw at most once per animation frame whenever the design, the guides, a font or an image changes. */
export function useDesignSurface(): void {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderSurfaceNow();
      });
    };
    renderSurfaceNow();
    const unsubscribers = [
      useDesignStore.subscribe((state, prev) => {
        if (state.config !== prev.config) schedule();
      }),
      useUiStore.subscribe((state, prev) => {
        if (state.guides !== prev.guides) schedule();
      }),
      onFontLoaded(schedule),
      onImageLoaded(schedule),
    ];
    return () => {
      cancelAnimationFrame(frame);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);
}