import { TopBar } from './components/TopBar.tsx';

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        <aside className="sidebar" aria-label="Design options">
          <section className="panel">
            <h2>
              <span className="step">1</span>
              Choose your tent
            </h2>
            <p className="hint">Size and frame options go here.</p>
          </section>
          <section className="panel">
            <h2>
              <span className="step">2</span>
              Panels and colours
            </h2>
            <p className="hint">Pick a panel and its fabric colour.</p>
          </section>
          <section className="panel">
            <h2>
              <span className="step">3</span>
              Artwork
            </h2>
            <p className="hint">Add text and logos.</p>
          </section>
        </aside>
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