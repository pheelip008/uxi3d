import { useEffect } from 'react';
import { useDesignStore } from '../store/designStore.ts';

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Ctrl/Cmd+Z, Ctrl+Shift+Z / Ctrl+Y, Delete, Ctrl+D, Escape and arrow keys (Shift = bigger steps). */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (typing) return;

      const store = useDesignStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }

      const id = store.selectedLayerId;
      if (!id) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        store.removeLayer(id);
      } else if (mod && key === 'd') {
        e.preventDefault();
        store.duplicateLayer(id);
      } else if (e.key === 'Escape') {
        store.selectLayer(null);
      } else if (ARROWS[e.key]) {
        e.preventDefault();
        const step = e.shiftKey ? 0.01 : 0.002;
        const [dx, dy] = ARROWS[e.key];
        store.nudgeLayer(id, dx * step, dy * step);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}