import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        <Sidebar />
        <section className="stage">
          <div className="pane pane-2d">
            <div className="pane-loading">2D editor</div>
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