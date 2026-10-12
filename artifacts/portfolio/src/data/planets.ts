export type SectionKey =
  | "about"
  | "skills"
  | "experience"
  | "projects"
  | "featured-morphos"
  | "featured-raytracer"
  | "achievements"
  | "contact";

export interface PlanetDef {
  name: string;
  color: number;
  radius: number;
  size: number;
  speed: number;
  section: SectionKey;
  /** Flat particle ring around the planet (inner/outer as multiples of size). */
  ring?: { inner: number; outer: number; tilt: number };
  /** Project rendered inline by a featured planet. */
  projectSlug?: string;
}

// Each planet = one scroll section; the hero is section 0.
export const PLANETS: PlanetDef[] = [
  { name: "About",                 color: 0x888780, radius: 60,  size: 10, speed: 0.00045, section: "about"              },
  { name: "Skills",                color: 0xEF9F27, radius: 96,  size: 12, speed: 0.00034, section: "skills"             },
  { name: "Experience",            color: 0x1D9E75, radius: 134, size: 13, speed: 0.00026, section: "experience"         },
  { name: "Projects",              color: 0xD85A30, radius: 176, size: 15, speed: 0.00020, section: "projects"           },
  { name: "Featured · MorphOS",    color: 0xB46CF0, radius: 218, size: 14, speed: 0.00015, section: "featured-morphos",   projectSlug: "morphos-media" },
  { name: "Featured · Ray Tracer", color: 0x7F77DD, radius: 258, size: 14, speed: 0.00011, section: "featured-raytracer", projectSlug: "solar-system-ray-tracer", ring: { inner: 1.5, outer: 2.8, tilt: 0.25 } },
  { name: "Achievements",          color: 0xBA7517, radius: 298, size: 17, speed: 0.00008, section: "achievements",       ring: { inner: 1.4, outer: 2.5, tilt: 0.18 } },
  { name: "Contact",               color: 0x378ADD, radius: 336, size: 13, speed: 0.00006, section: "contact"            },
];

export const toHex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** Scroll-section index (hero = 0) of a planet section. */
export const sectionIndexOf = (key: SectionKey) => PLANETS.findIndex(p => p.section === key) + 1;
