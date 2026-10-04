import { SectionHeading } from "./SectionHeading";

const ACHIEVEMENTS = [
  "3rd place — National 24-hour hackathon (50+ teams)",
  "SIH 2025 core developer — AI rockfall prediction (Python)",
  "IIT Bombay E-Summit — Startup MVP presentation",
  "Competitive programming enthusiast",
  "Linux power user (Arch, Fedora)",
];

export function Achievements({ accent }: { accent: string }) {
  return (
    <div className="section-inner">
      <SectionHeading accent={accent}>Achievements</SectionHeading>
      <ul className="plain-list">
        {ACHIEVEMENTS.map(text => <li key={text}>{text}</li>)}
      </ul>
    </div>
  );
}
