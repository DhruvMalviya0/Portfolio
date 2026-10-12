import { SectionHeading } from "./SectionHeading";

const SKILL_GROUPS = [
  { label: "Languages", tags: ["JavaScript", "TypeScript", "C++", "Python", "SQL", "GLSL"] },
  { label: "Frontend",  tags: ["React.js", "Next.js", "Tailwind CSS", "Three.js / R3F", "GSAP"] },
  { label: "Backend",   tags: ["Node.js", "Express.js", "FastAPI"] },
  { label: "Databases", tags: ["MongoDB", "MySQL", "Firebase"] },
  { label: "AI & Vision", tags: ["LLM APIs / RAG", "OpenCV / MediaPipe"] },
  { label: "Desktop & Mobile", tags: ["Tauri", "Flutter"] },
  { label: "Tools",     tags: ["Git", "GitHub", "Docker", "Postman", "Playwright", "Linux"] },
];

export function Skills({ accent }: { accent: string }) {
  return (
    <div className="section-inner">
      <SectionHeading accent={accent}>Skills</SectionHeading>
      {SKILL_GROUPS.map(g => (
        <div key={g.label} className="skill-group">
          <span className="skill-label">{g.label}</span>
          <div className="tags">
            {g.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
