import { ArtworkPanel } from './panels/ArtworkPanel.tsx';
import { LayerProperties } from './panels/LayerProperties.tsx';
import { ProductPanel } from './panels/ProductPanel.tsx';
import { SectionPanel } from './panels/SectionPanel.tsx';

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Design options">
      <ProductPanel />
      <SectionPanel />
      <ArtworkPanel />
      <LayerProperties />
    </aside>
  );
}