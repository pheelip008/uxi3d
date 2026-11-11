import type { ReactNode } from 'react';

export function Panel({ title, step, children }: { title: string; step: number; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>
        <span className="step">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}