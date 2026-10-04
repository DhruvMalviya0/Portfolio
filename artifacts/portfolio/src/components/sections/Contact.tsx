import { DiscordIcon, GitHubIcon, LinkedInIcon } from "@/components/icons";
import { SectionHeading } from "./SectionHeading";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function Contact({ accent }: { accent: string }) {
  return (
    <div className="section-inner contact-section">
      <SectionHeading accent={accent}>Let's Connect</SectionHeading>
      <p className="contact-lead">Open to internships — Let's build something.</p>
      <div className="contact-links">
        <a href="https://github.com/DhruvMalviya0" {...ext} className="contact-btn"><GitHubIcon />GitHub</a>
        <a href="https://www.linkedin.com/in/dhruv-malviya-02a7b7322/" {...ext} className="contact-btn"><LinkedInIcon />LinkedIn</a>
        <a href="https://discord.com/users/884316563686166548" {...ext} className="contact-btn"><DiscordIcon />Discord</a>
      </div>
    </div>
  );
}
