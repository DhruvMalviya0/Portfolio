import { SectionHeading } from "./SectionHeading";

export function About({ accent }: { accent: string }) {
  return (
    <div className="section-inner">
      <SectionHeading accent={accent}>About Me</SectionHeading>
      <p>
        CS undergrad at <strong style={{ color: "#EF9F27" }}>Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE.
        Specializes in full-stack development and scalable architectures.
        Strong in C++ and JavaScript. Actively seeking internship opportunities.
      </p>
      <div className="tags section-tags">
        <span className="tag">Full-Stack Developer</span>
        <span className="tag">Graphics Engineer</span>
        <span className="tag">CS Undergraduate</span>
      </div>
    </div>
  );
}
