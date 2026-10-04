import { SectionHeading } from "./SectionHeading";

export function Experience({ accent }: { accent: string }) {
  return (
    <div className="section-inner">
      <SectionHeading accent={accent}>Experience</SectionHeading>
      <div className="exp-head">
        <span className="exp-org" style={{ color: accent }}>Kalvium Work Integration</span>
        <span className="meta-text">Full-Stack Developer · Jan 2026–Present</span>
      </div>
      <ul>
        <li>Built a Ledger application using the MERN stack</li>
        <li>Merged code into Kalvium community repository</li>
        <li>Contributor to the S72 Catalyst program</li>
      </ul>
    </div>
  );
}
