import { Editor2D } from './components/Editor2D.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { useDesignSurface } from './lib/designSurface.ts';

export default function App() {
  // Redraw the shared design canvas whenever the design changes.
  useDesignSurface();

  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        <Sidebar />
        <section className="stage">
          <div className="pane pane-2d">
            <Editor2D />
          </div>
          <div className="pane pane-3d">
            <div className="pane-loading">3D preview</div>
          </div>
        </section>
      </main>
      <footer className="pricebar">
        <span className="hint">The price will show here.</span>
      </footer>
    </div>
  );
}