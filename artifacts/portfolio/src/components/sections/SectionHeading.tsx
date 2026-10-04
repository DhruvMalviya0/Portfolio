import type { ReactNode } from "react";

/** Section title with the planet's coloured glow. */
export function SectionHeading({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <h2 className="section-title" style={{ textShadow: `0 0 30px ${accent}80` }}>
      {children}
    </h2>
  );
}
