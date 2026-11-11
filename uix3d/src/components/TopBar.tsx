export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <path d="M16 4 3 16h26L16 4Z" fill="#2563eb" />
          <path d="M3 16h26v4H3z" fill="#c8102e" />
          <path d="M5 20v8M27 20v8" stroke="#334155" strokeWidth="2" />
        </svg>
        <div>
          <strong>Canopy Tent Configurator</strong>
          <span>Design it in 2D, check it in 3D</span>
        </div>
      </div>
    </header>
  );
}