import { type Project, isTodo } from "@/data/projects";
import { ExternalIcon, GitHubIcon, PlayIcon } from "@/components/icons";
import { AwardBadge, HackathonPill, RichText, StatusPill, accentVars } from "./ProjectBits";

interface Props {
  project: Project;
  /** id for the title, so a dialog can point aria-labelledby at it. */
  titleId?: string;
  eyebrow?: string;
}

/** Shared detail layout used by the side panel and the featured planets. */
export function ProjectDetailBody({ project: p, titleId, eyebrow }: Props) {
  // Cards fall back to the hackathon result; here it already has its own row.
  const award = p.award;
  const meta = [p.period, p.role].filter(Boolean).join(" · ");
  const h = p.hackathon;
  const hackRows: [string, string | number | undefined][] = h
    ? [
        ["Event", isTodo(h.name) ? undefined : h.name],
        ["Problem", h.problemId],
        ["My role", p.role],
        ["Team", h.teamSize ? `${h.teamSize} people` : undefined],
        ["Result", h.result],
      ]
    : [];
  const visibleHackRows = hackRows.filter(([, v]) => v !== undefined && v !== "");

  return (
    <article className="pd-body" style={accentVars(p.accent)}>
      <header className="pd-header">
        <p className="pd-eyebrow">{eyebrow ?? p.category}</p>
        <h2 id={titleId} className="pd-title">{p.title}</h2>
        {!isTodo(p.tagline) && <p className="pd-tagline">{p.tagline}</p>}
        <div className="pd-meta">
          <StatusPill status={p.status} />
          {h && <HackathonPill hackathon={h} />}
          {meta && <span className="pd-meta-text">{meta}</span>}
        </div>
        {award && <AwardBadge>{award}</AwardBadge>}
        {visibleHackRows.length > 0 && (
          <dl className="pd-hackathon" aria-label="Hackathon">
            {visibleHackRows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {p.note && <p className="pd-note">{p.note}</p>}
      </header>

      <section className="pd-section">
        <h3 className="pd-label">Why</h3>
        <p className="pd-problem">{p.problem}</p>
      </section>

      <section className="pd-section">
        <h3 className="pd-label">What I built</h3>
        <ul className="pd-highlights">
          {p.highlights.map(item => (
            <li key={item}><RichText text={item} /></li>
          ))}
        </ul>
      </section>

      <section className="pd-section">
        <h3 className="pd-label">Stack</h3>
        {p.stack.map(g => (
          <div key={g.group} className="skill-group">
            <span className="skill-label">{g.group}</span>
            <div className="tags">
              {g.items.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
        ))}
      </section>

      <ProjectLinks project={p} />
    </article>
  );
}

function ProjectLinks({ project: p }: { project: Project }) {
  const { github, live, demo, moreGithub = [] } = p.links;
  if (!github && !live && !demo && moreGithub.length === 0) return null;
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <div className="pd-links">
      {github && (
        <a href={github} {...ext} className="contact-btn" aria-label={`${p.title} on GitHub (opens in a new tab)`}>
          <GitHubIcon />GitHub
        </a>
      )}
      {moreGithub.map(r => (
        <a key={r.url} href={r.url} {...ext} className="contact-btn" aria-label={`${r.label} on GitHub (opens in a new tab)`}>
          <GitHubIcon />{r.label}
        </a>
      ))}
      {live && (
        <a href={live} {...ext} className="contact-btn" aria-label={`${p.title} live site (opens in a new tab)`}>
          <ExternalIcon />Live
        </a>
      )}
      {demo && (
        <a href={demo} {...ext} className="contact-btn" aria-label={`${p.title} demo (opens in a new tab)`}>
          <PlayIcon />Demo
        </a>
      )}
    </div>
  );
}
