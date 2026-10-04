import { projectBySlug } from "@/data/projects";
import { ProjectDetailBody } from "@/components/projects/ProjectDetailBody";

/** A signature planet: the same detail layout as the panel, inline. */
export function FeaturedProject({ slug }: { slug: string }) {
  const project = projectBySlug(slug);
  if (!project) return null;
  return (
    <div className="section-inner featured-project">
      <ProjectDetailBody project={project} eyebrow={`Featured · ${project.category}`} />
    </div>
  );
}
