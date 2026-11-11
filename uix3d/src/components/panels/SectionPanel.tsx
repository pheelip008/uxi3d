import { getSection, getSize, isStandardColour, STANDARD_COLOURS } from '../../data/tent.ts';
import { useDesignStore } from '../../store/designStore.ts';
import type { SectionKind } from '../../types.ts';
import { Panel } from './Panel.tsx';

const GROUPS: { kind: SectionKind; label: string }[] = [
  { kind: 'peak', label: 'Peaks' },
  { kind: 'valance', label: 'Valances' },
];

export function SectionPanel() {
  const config = useDesignStore((s) => s.config);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const { selectSection, setSectionColor, applyColor } = useDesignStore.getState();
  const size = getSize(config.sizeId);
  const section = getSection(size, selectedSectionId);
  const current = config.sections[section.id]?.color ?? '#ffffff';

  return (
    <Panel step={2} title="Panels & colours">
      {GROUPS.map((group) => (
        <div key={group.kind} className="field">
          <span className="field-label">{group.label}</span>
          <div className="section-row">
            {size.sections
              .filter((s) => s.kind === group.kind)
              .map((s) => {
                const count = config.layers.filter((l) => l.sectionId === s.id).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="section-chip"
                    aria-pressed={s.id === selectedSectionId}
                    title={s.label}
                    onClick={() => selectSection(s.id)}
                  >
                    <span className="swatch" style={{ background: config.sections[s.id]?.color }} />
                    <span className="section-chip-label">{s.side}</span>
                    {count > 0 && <span className="badge">{count}</span>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <div className="field">
        <span className="field-label">Colour of the {section.label.toLowerCase()}</span>
        <div className="palette">
          {STANDARD_COLOURS.map((c) => (
            <button
              key={c.hex}
              type="button"
              className="palette-swatch"
              style={{ background: c.hex }}
              title={c.name}
              aria-label={c.name}
              aria-pressed={current === c.hex}
              onClick={() => setSectionColor(section.id, c.hex)}
            />
          ))}
          <label className="palette-swatch custom" title="Custom colour">
            <span aria-hidden="true">+</span>
            <input
              type="color"
              aria-label="Custom colour"
              value={current}
              onChange={(e) => setSectionColor(section.id, e.target.value)}
            />
          </label>
        </div>
        {!isStandardColour(current) && (
          <p className="hint warn">Custom colour {current.toUpperCase()}: a one-time colour match fee applies.</p>
        )}
      </div>

      <div className="button-row">
        <span className="field-label">Use this colour on</span>
        <button type="button" className="btn small" onClick={() => applyColor(current, 'peaks')}>
          All peaks
        </button>
        <button type="button" className="btn small" onClick={() => applyColor(current, 'valances')}>
          All valances
        </button>
        <button type="button" className="btn small" onClick={() => applyColor(current, 'all')}>
          Whole tent
        </button>
      </div>
    </Panel>
  );
}