import type { CSSProperties, ReactNode } from "react";
import { type Project, type ProjectStatus, hackathonLabel } from "@/data/projects";

export const accentVars = (accent: string) => ({ "--accent": accent }) as CSSProperties;

export function StatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span className={`status-pill status-pill--${status.toLowerCase()}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export function HackathonPill({ hackathon }: { hackathon: NonNullable<Project["hackathon"]> }) {
  return <span className="hack-pill">{hackathonLabel(hackathon)}</span>;
}

export function AwardBadge({ children }: { children: ReactNode }) {
  return <span className="award-badge">{children}</span>;
}

/** Renders `inline code` spans from highlight strings. */
export function RichText({ text }: { text: string }) {
  const parts = text.split("`");
  return <>{parts.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}</>;
}
