import { PLANETS, toHex, type SectionKey } from "@/data/planets";
import { About } from "./About";
import { Skills } from "./Skills";
import { Experience } from "./Experience";
import { ProjectsHub } from "./ProjectsHub";
import { FeaturedProject } from "./FeaturedProject";
import { Achievements } from "./Achievements";
import { Contact } from "./Contact";

/** Content for one planet section; shared by the 3D overlay and the static fallback. */
export function SectionContent({ section, contained = false }: { section: SectionKey; contained?: boolean }) {
  const planet = PLANETS.find(p => p.section === section);
  if (!planet) return null;
  const accent = toHex(planet.color);

  switch (section) {
    case "about":        return <About accent={accent} />;
    case "skills":       return <Skills accent={accent} />;
    case "experience":   return <Experience accent={accent} />;
    case "projects":     return <ProjectsHub accent={accent} contained={contained} />;
    case "featured-morphos":
    case "featured-raytracer":
      return planet.projectSlug ? <FeaturedProject slug={planet.projectSlug} /> : null;
    case "achievements": return <Achievements accent={accent} />;
    case "contact":      return <Contact accent={accent} />;
  }
}
