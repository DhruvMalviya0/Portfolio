import { useMemo, useRef, useState } from "react";
import { FILTERS, PROJECTS, SORTED_PROJECTS, type Project, type ProjectFilter, awardOf, isTodo, matchesFilter } from "@/data/projects";
import { useProjectDetail } from "@/components/projects/ProjectDetailContext";
import { AwardBadge, HackathonPill, StatusPill, accentVars } from "@/components/projects/ProjectBits";
import { useScrollContainment } from "@/hooks/use-scroll-containment";
import { SectionHeading } from "./SectionHeading";

const MAX_TAGS = 4;

interface Props {
  accent: string;
  /** Inside the 3D overlay the grid scrolls on its own instead of growing. */
  contained?: boolean;
}

export function ProjectsHub({ accent, contained = false }: Props) {
  const [filter, setFilter] = useState<ProjectFilter>("All");
  const gridRef = useRef<HTMLDivElement>(null);
  useScrollContainment(gridRef);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(f => [f, PROJECTS.filter(p => matchesFilter(p, f)).length])) as Record<ProjectFilter, number>,
    [],
  );
  const visible = SORTED_PROJECTS.filter(p => matchesFilter(p, filter));

  const selectFilter = (f: ProjectFilter) => {
    setFilter(f);
    gridRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="section-inner projects-hub">
      <SectionHeading accent={accent}>Projects</SectionHeading>
      <p className="hub-sub">{PROJECTS.length} builds. Pick one for the full story.</p>

      <div className="hub-filters" role="group" aria-label="Filter projects by category">
        {FILTERS.filter(f => counts[f] > 0).map(f => (
          <button
            key={f}
            type="button"
            className="filter-chip"
            aria-pressed={filter === f}
            onClick={() => selectFilter(f)}
          >
            {f}
            <span className="filter-count" aria-hidden="true">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        className={`hub-grid ${contained ? "hub-grid--contained scroll-contain" : ""}`}
      >
        {visible.map(p => <ProjectCard key={p.slug} project={p} />)}
      </div>
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const { open } = useProjectDetail();
  const tags = p.stack.flatMap(g => g.items);
  const extra = tags.length - MAX_TAGS;
  const award = awardOf(p);

  return (
    <button
      type="button"
      className="project-card"
      style={accentVars(p.accent)}
      onClick={e => open(p.slug, e.currentTarget)}
      aria-label={`${p.title}, ${p.status}. Open details`}
    >
      <span className="pc-top">
        <StatusPill status={p.status} />
        {p.hackathon && <HackathonPill hackathon={p.hackathon} />}
        {p.featured && <span className="pc-featured">★ Featured</span>}
      </span>
      <span className="pc-title">{p.title}</span>
      {!isTodo(p.tagline) && <span className="pc-tagline">{p.tagline}</span>}
      {award && <AwardBadge>{award}</AwardBadge>}
      <span className="pc-tags">
        {tags.slice(0, MAX_TAGS).map(t => <span key={t} className="tag tag--sm">{t}</span>)}
        {extra > 0 && <span className="tag tag--sm tag--more">+{extra}</span>}
      </span>
    </button>
  );
}
