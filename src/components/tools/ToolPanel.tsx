import type { ComponentType, SVGProps } from 'react';
import { useDesignStore } from '../../store/designStore.ts';
import { useUiStore, type ToolId } from '../../store/uiStore.ts';
import { CloseIcon, ImageIcon, PaletteIcon, TentIcon, TextIcon } from '../icons.tsx';
import { ColoursPanel } from './ColoursPanel.tsx';
import { TentPanel } from './TentPanel.tsx';
import { TextPanel } from './TextPanel.tsx';
import { UploadsPanel } from './UploadsPanel.tsx';

const TOOLS: { id: ToolId; label: string; title: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'tent', label: 'Tent', title: 'Tent options', Icon: TentIcon },
  { id: 'colours', label: 'Colours', title: 'Fabric colours', Icon: PaletteIcon },
  { id: 'uploads', label: 'Uploads', title: 'Uploads', Icon: ImageIcon },
  { id: 'text', label: 'Text', title: 'Text', Icon: TextIcon },
];

const PANELS: Record<ToolId, ComponentType> = {
  tent: TentPanel,
  colours: ColoursPanel,
  uploads: UploadsPanel,
  text: TextPanel,
};

export function ToolRail() {
  const tool = useUiStore((s) => s.tool);
  const toggleTool = useUiStore((s) => s.toggleTool);
  const uploads = useDesignStore((s) => Object.keys(s.config.assets).length);

  return (
    <nav className="tool-rail" aria-label="Design tools">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="tool-button"
          aria-pressed={tool === id}
          aria-controls="tool-panel"
          onClick={() => toggleTool(id)}
        >
          <Icon width={22} height={22} />
          <span>{label}</span>
          {id === 'uploads' && uploads > 0 && <span className="tool-count">{uploads}</span>}
        </button>
      ))}
    </nav>
  );
}

export function ToolPanel() {
  const tool = useUiStore((s) => s.tool);
  const closeTool = useUiStore((s) => s.closeTool);
  if (!tool) return null;
  const { title } = TOOLS.find((t) => t.id === tool)!;
  const Panel = PANELS[tool];

  return (
    <section id="tool-panel" className="tool-panel" aria-label={title}>
      <header className="tool-panel-head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn ghost" aria-label="Close panel" onClick={closeTool}>
          <CloseIcon width={18} height={18} />
        </button>
      </header>
      <div className="tool-panel-body">
        <Panel />
      </div>
    </section>
  );
}
