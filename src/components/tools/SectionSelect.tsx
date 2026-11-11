import { getSize } from '../../data/tent.ts';
import { useDesignStore } from '../../store/designStore.ts';
import type { SectionKind } from '../../types.ts';

const GROUPS: { kind: SectionKind; label: string }[] = [
  { kind: 'peak', label: 'Peaks' },
  { kind: 'valance', label: 'Valances' },
];

/** Picks the panel that new artwork goes on (the same selection as clicking the canvas or the model). */
export function SectionSelect({ id, label }: { id: string; label: string }) {
  const sizeId = useDesignStore((s) => s.config.sizeId);
  const layers = useDesignStore((s) => s.config.layers);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const selectSection = useDesignStore((s) => s.selectSection);
  const size = getSize(sizeId);

  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <select id={id} value={selectedSectionId} onChange={(e) => selectSection(e.target.value)}>
        {GROUPS.map((group) => (
          <optgroup key={group.kind} label={group.label}>
            {size.sections
              .filter((s) => s.kind === group.kind)
              .map((s) => {
                const count = layers.filter((l) => l.sectionId === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {count > 0 ? ` (${count})` : ''}
                  </option>
                );
              })}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
