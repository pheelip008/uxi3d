import { useState, type KeyboardEvent } from 'react';
import { parseColourInput } from '../../data/pantone.ts';
import { getSize, isStandardColour, STANDARD_COLOURS } from '../../data/tent.ts';
import { sectionsInTarget, useDesignStore, type ColourTarget } from '../../store/designStore.ts';
import type { SectionColour } from '../../types.ts';
import { CheckIcon } from '../icons.tsx';

type Part = 'all' | 'peaks' | 'valances' | 'section';

const GROUP_OPTIONS: { value: Part; label: string }[] = [
  { value: 'all', label: 'Whole tent (all panels)' },
  { value: 'peaks', label: 'All peaks (4 sides)' },
  { value: 'valances', label: 'All valances (4 sides)' },
];

const sameColour = (a: SectionColour, b: SectionColour) => a.color === b.color && a.pantone === b.pantone;

export function ColoursPanel() {
  const config = useDesignStore((s) => s.config);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const { applyColor, selectSection } = useDesignStore.getState();
  const [part, setPart] = useState<Part>('all');
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const size = getSize(config.sizeId);
  // "One panel" follows the selection, so clicking the canvas or the model changes it too.
  const target: ColourTarget = part === 'section' ? selectedSectionId : part;
  const colours = sectionsInTarget(size, target).map((s) => config.sections[s.id] ?? { color: '#ffffff' });
  const current = colours.every((c) => sameColour(c, colours[0])) ? colours[0] : null;

  function choosePart(value: string) {
    if (value === 'all' || value === 'peaks' || value === 'valances') setPart(value);
    else {
      setPart('section');
      selectSection(value);
    }
    setTyped(null);
    setError(null);
  }

  function apply(colour: SectionColour) {
    applyColor(target, colour);
    setTyped(null);
    setError(null);
  }

  function applyTyped() {
    if (typed === null) return;
    const colour = parseColourInput(typed);
    if (colour) apply(colour);
    else setError(`"${typed.trim()}" is not a hex colour or a Pantone code we know.`);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') applyTyped();
    if (e.key === 'Escape') {
      setTyped(null);
      setError(null);
    }
  }

  return (
    <>
      <label className="field" htmlFor="colour-part">
        <span className="field-label">Tent part to colour</span>
        <select id="colour-part" value={part === 'section' ? selectedSectionId : part} onChange={(e) => choosePart(e.target.value)}>
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <optgroup label="One panel">
            {size.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="part-map" role="group" aria-label="Panels">
        {size.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            className="part-chip"
            title={s.label}
            aria-pressed={sectionsInTarget(size, target).some((t) => t.id === s.id)}
            onClick={() => choosePart(s.id)}
          >
            <span className="part-swatch" style={{ background: config.sections[s.id]?.color }} />
            <span className="part-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="field">
        <span className="field-label">Fabric colours</span>
        <div className="swatch-grid">
          {STANDARD_COLOURS.map((c) => {
            const active = !!current && !current.pantone && current.color === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                className="swatch-card"
                aria-pressed={active}
                onClick={() => apply({ color: c.hex })}
              >
                <span className="swatch-dot" style={{ background: c.hex }} />
                <span className="swatch-name">{c.name}</span>
                {active && (
                  <span className="swatch-check">
                    <CheckIcon width={12} height={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="colour-code">
          Pantone or hex
        </label>
        <div className="colour-code">
          <label
            className="colour-chip"
            title="Pick any colour"
            style={{ background: current?.color ?? 'conic-gradient(#c8102e, #facc15, #15803d, #1d4ed8, #c8102e)' }}
          >
            <input
              type="color"
              aria-label="Pick any colour"
              value={current?.color ?? '#ffffff'}
              onChange={(e) => apply({ color: e.target.value })}
            />
          </label>
          <input
            id="colour-code"
            type="text"
            className="mono"
            spellCheck={false}
            autoComplete="off"
            placeholder={current ? '' : 'Mixed colours'}
            value={typed ?? (current ? (current.pantone ?? current.color.toUpperCase()) : '')}
            aria-describedby="colour-code-hint"
            aria-invalid={!!error}
            onChange={(e) => {
              setTyped(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKey}
          />
          <button type="button" className="btn small" disabled={typed === null} onClick={applyTyped}>
            Apply
          </button>
        </div>
        <p id="colour-code-hint" className={error ? 'hint error' : 'hint'} role={error ? 'alert' : undefined}>
          {error ?? 'Type a Pantone code (e.g. 185 C) or a hex colour (#e4002b) and press Enter.'}
        </p>
      </div>

      {current && !isStandardColour(current.color) && (
        <p className="hint warn">
          {current.pantone ?? current.color.toUpperCase()} is not a stock fabric, so a one-time colour match fee
          applies.
        </p>
      )}
    </>
  );
}
