// Lets ordinary React UI (view buttons, the PDF) talk to the 3D scene, which
// lives inside the <Canvas> and registers itself here when it mounts.

export type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'home';

interface PreviewApi {
  goTo: (view: ViewName) => void;
  /** Render the given views and return them as JPEG data URLs. */
  capture: (views: ViewName[]) => Partial<Record<ViewName, string>>;
}

let api: PreviewApi | null = null;

export const previewBridge = {
  register(next: PreviewApi): () => void {
    api = next;
    return () => {
      if (api === next) api = null;
    };
  },
  goTo(view: ViewName): void {
    api?.goTo(view);
  },
  capture(views: ViewName[]): Partial<Record<ViewName, string>> {
    return api ? api.capture(views) : {};
  },
};