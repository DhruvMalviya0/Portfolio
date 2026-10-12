export type ProjectStatus = "Completed" | "Active" | "Prototype";

export type ProjectCategory =
  | "AI / ML"
  | "Full-Stack"
  | "Graphics"
  | "Tools"
  | "Computer Vision"
  | "Games"
  | "Mobile";

export interface Project {
  slug: string;
  title: string;
  tagline: string;            // one line, max ~90 chars
  category: ProjectCategory;
  status: ProjectStatus;
  period?: string;            // from the repo's first and last commit dates
  role?: string;
  problem: string;            // 1–2 sentences: why it exists
  highlights: string[];       // 3–5 concrete things I built
  stack: { group: string; items: string[] }[];
  links: {
    github?: string;
    live?: string;
    demo?: string;
    /** Extra repos for projects that span more than one repository. */
    moreGithub?: { label: string; url: string }[];
  };
  award?: string;
  hackathon?: { name: string; result?: string; teamSize?: number; problemId?: string };
  /** Short status note shown in the detail panel, e.g. "In progress". */
  note?: string;
  /** Sorts directly after the featured projects. */
  pinned?: boolean;
  featured?: boolean;
  accent: string;             // hex, used for glow and the card border
}

const GH = "https://github.com/DhruvMalviya0";

export const PROJECTS: Project[] = [
  /* ── Featured ── */
  {
    slug: "morphos-media",
    title: "MorphOS Media Studio",
    tagline: "Local-first AI media suite: photo, audio and manga engines behind a Tauri desktop shell",
    category: "AI / ML",
    status: "Active",
    period: "Jun 2026 – Present",
    role: "Solo",
    problem:
      "Running generative media models locally is fragile: every model has different hardware needs and tooling. MorphOS puts photo, audio and manga pipelines behind one desktop app that checks the machine before it loads anything.",
    highlights: [
      "Built a hardware gatekeeper that profiles RAM/VRAM and CUDA vs DirectML runtimes (PyTorch + ONNX Runtime) and blocks models the machine can't run.",
      "Built the photo engine on SDXL-Turbo via diffusers, with mask-based inpainting, base-image strength control and VRAM optimisations.",
      "Built the audio engine: librosa DSP analysis, tempo modification, MusicGen generation and a sequencer that arranges user-uploaded samples from a prompt.",
      "Built the manga engine: YOLOv8 + OpenCV panel extraction with right-to-left reading order, rendered into motion comics with ModernGL GLSL shaders.",
      "Connected a Tauri + React + TypeScript shell to a FastAPI backend, with a layer-based image editor (history, masks, save/load) as the latest feature.",
    ],
    stack: [
      { group: "Desktop", items: ["Tauri", "React", "TypeScript", "Vite", "Tailwind CSS"] },
      { group: "Backend", items: ["Python", "FastAPI", "Uvicorn"] },
      { group: "AI", items: ["PyTorch", "diffusers (SDXL-Turbo)", "MusicGen", "YOLOv8", "ONNX Runtime"] },
      { group: "Media", items: ["OpenCV", "librosa", "ModernGL / GLSL"] },
    ],
    links: { github: `${GH}/MorphOS-Media` },
    featured: true,
    accent: "#B46CF0",
  },
  {
    slug: "neel-watch",
    // TODO(dhruv): confirm final name ("Neel Watch" vs "Triton Watch")
    title: "Neel Watch",
    tagline: "Oil-spill detection from SAR imagery, traced to the likely vessel through AIS tracking data",
    category: "AI / ML",
    status: "Active", // TODO(dhruv): confirm status once SIH 2026 wraps up
    // TODO(dhruv): add period (month range)
    role: "Frontend lead",
    problem:
      "NTRO's problem statement: detect marine oil spills in SAR/EO satellite imagery and identify the responsible vessel by correlating the spill with AIS vessel-tracking data.",
    highlights: [
      "Built a scroll-driven landing page where a Three.js Earth zooms into a live tracking dashboard: Mapbox GL map, SAR analysis panel, ranked suspect vessels and PDF report export (jsPDF).",
      "Built an /architecture route with a 3D wireframe HUD that walks through each pipeline stage: SAR ingestion → AIS → spill detection → correlation → output.",
      "Built a tech-stack and team showcase page.",
      "Integrated the dashboard with the backend a teammate built (/detect, /vessels/near, /correlate).",
    ],
    stack: [
      { group: "Frontend", items: ["React", "Vite", "Tailwind CSS v4", "Three.js", "Mapbox GL JS", "anime.js", "jsPDF"] },
      // TODO(dhruv): the team README describes a U-Net segmentation model; confirm YOLOv8 vs U-Net
      { group: "Model", items: ["YOLOv8"] },
    ],
    // TODO(dhruv): repo link (not on my GitHub account yet)
    links: {},
    hackathon: {
      name: "Smart India Hackathon",
      problemId: "SIH26143",
      teamSize: 6, // TODO(dhruv): confirm (taken from the team README's role table)
    },
    featured: true,
    accent: "#2EC4D6",
  },
  {
    slug: "butterfly",
    title: "Project Butterfly",
    tagline: "Autonomous internship pipeline: scrape, filter scams, tailor resumes, sync a CRM",
    category: "Full-Stack",
    status: "Completed",
    period: "May – Jul 2026",
    role: "Solo",
    problem:
      "Applying to internships means sending the same static resume and wading through scam listings. Butterfly automates discovery, filtering and per-company tailoring.",
    highlights: [
      "Built Playwright ingestion that cycles through job boards and extracts company, title and description for each listing.",
      "Built a two-tier scam filter (exact-match company blacklist + regex mining for deposits, Telegram interviews and training fees) that runs before anything is stored.",
      "Used Gemini with strict JSON output to pick the best-matching projects per job description, rendered via Jinja2 into an ATS-friendly PDF with WeasyPrint.",
      "Built a dev-journal → post generator with a fallback that writes about unfinished projects, plus a manual approval queue.",
      "Mirrored application status changes to a Google Sheets CRM through a service account; SQLite/SQLAlchemy is the local store.",
    ],
    stack: [
      { group: "Frontend", items: ["Next.js", "Tailwind CSS"] },
      { group: "Backend", items: ["FastAPI", "SQLite", "SQLAlchemy", "Jinja2", "WeasyPrint"] },
      { group: "AI", items: ["Gemini API"] },
      { group: "Automation", items: ["Playwright", "Google Sheets API"] },
    ],
    links: { github: `${GH}/Butterfly` },
    featured: true,
    accent: "#F28DB2",
  },
  {
    slug: "desktop-ai-assistant",
    title: "Interactive AI Desktop Assistant",
    tagline: "A 3D VRM avatar on the desktop, driven over WebSockets by an LLM brain with emotions and voice",
    category: "AI / ML",
    status: "Active",
    period: "Apr 2026 – Present",
    role: "Solo",
    problem:
      "Chat assistants live in a text box. I wanted one that lives on the desktop as an animated character that speaks, emotes and lip-syncs in real time.",
    highlights: [
      "Built a Python 'brain' that calls a Groq-hosted Llama 3.1 model, tags each reply with an emotion and voices it with Edge TTS.",
      "Streamed JSON payloads (text, audio path, animation trigger) over WebSockets to a Unity client.",
      "Drove VRM mouth blendshapes from live audio amplitude for lip-sync.",
      "Designed a hub-and-spoke Animator state machine that switches between procedural idles and LLM-triggered emotes without blend deadlocks.",
      "Made the Unity window transparent and always-on-top via Win32/DWM interop. Next: rebuilding the client with Tauri + React Three Fiber.",
    ],
    stack: [
      { group: "Client", items: ["Unity", "C#", "VRM SDK", "Mixamo"] },
      { group: "Brain", items: ["Python", "Groq API", "Edge TTS", "WebSockets"] },
      { group: "Next", items: ["Tauri", "React Three Fiber"] },
    ],
    links: { github: `${GH}/Desktop-AI-Assistant` },
    featured: true,
    accent: "#FF7A93",
  },
  {
    slug: "pivot",
    title: "Pivot",
    tagline: "Chrome extension that catches wrong LeetCode submissions and gives a targeted AI hint",
    category: "Tools",
    status: "Prototype",
    period: "Mar – Jul 2026",
    role: "Solo",
    problem:
      "When a LeetCode submission fails you either stare at red test cases or jump to the editorial. Pivot points at the broken logic in your own code without handing over the answer.",
    highlights: [
      "Built a Manifest V3 extension: a content script detects submission results and captures the problem, failing test and editor code; a service worker builds the prompt.",
      "Called OpenRouter with a BYOK key kept in chrome.storage.local: no backend and no server-side data.",
      "Prompted the coach to return hints, not rewritten solutions, rendered inline next to the editor.",
      "Added submission history and a day-streak counter.",
      "Real catch: it diagnosed that `diff` was never computed as `target - n`, the bug that failed every test case.",
    ],
    stack: [
      { group: "Extension", items: ["Chrome MV3", "JavaScript", "Service Worker", "chrome.storage"] },
      { group: "AI", items: ["OpenRouter API"] },
    ],
    links: { github: `${GH}/Pivot` },
    featured: true,
    accent: "#F5B83D",
  },
  {
    slug: "solar-system-ray-tracer",
    title: "Solar System Ray Tracer",
    tagline: "Real-time solar system in C++17 and OpenGL with Keplerian orbits and custom GLSL lighting",
    category: "Graphics",
    status: "Completed",
    period: "Oct 2025 – Apr 2026",
    role: "Solo",
    problem:
      "I wanted to understand a rendering pipeline end to end, so I built a data-driven solar-system simulation from scratch instead of using an engine.",
    highlights: [
      "Built a data-driven, ECS-style body list in which planets and moons share one render path and nothing is hard-coded per body.",
      "Computed orbital velocity from distance to the sun (v ∝ 1/√r), with GLM hierarchical transforms so moons orbit planets that orbit the sun.",
      "Wrote GLSL shaders with the sun as a point light (ambient + diffuse + specular), plus a procedural starfield and an asteroid belt with random eccentricities.",
      "Built a ray/lighting module and a thread manager that splits physics and rendering onto separate threads, alongside the rasterised pipeline.",
      "Refactored the build to modern target-based CMake with vcpkg (GLFW, GLAD, GLM, ImGui) and shipped a v1.0 Windows release.",
    ],
    // TODO(dhruv): the old site mentioned BVH collisions. No BVH code is in the repo, so I left it out. Re-add if it lives elsewhere.
    stack: [
      { group: "Core", items: ["C++17", "OpenGL 3.3", "GLSL", "GLM"] },
      { group: "Platform", items: ["GLFW", "GLAD", "ImGui"] },
      { group: "Build", items: ["CMake", "vcpkg"] },
    ],
    links: { github: `${GH}/Solar-System` },
    featured: true,
    accent: "#7F77DD",
  },
  {
    slug: "arcane",
    title: "Arcane",
    tagline: "Property search portal with ownership, encumbrance checks and colour-coded title status",
    category: "Full-Stack",
    status: "Completed",
    // TODO(dhruv): the repo's "Hackathon done" commit is dated Apr 2025; confirm Aug–Oct 2025
    period: "Aug – Oct 2025",
    role: "Team lead (4)",
    problem:
      "Checking a property's ownership and whether it carries a loan means visiting several government portals. Arcane puts the search, ownership and encumbrance check in one place.",
    highlights: [
      "Led a team of 4 developers through the build.",
      "Integrated mock government databases (DORIS/CERSAI) for ownership and encumbrance records.",
      "Wrote a colour-coded verification algorithm: red for mortgaged properties, green for clear titles.",
      "Built search by property ID or address, a Leaflet map view, PDF summary export and multi-language UI.",
      "Built an Express + Mongoose API with Multer uploads for property-record submissions.",
    ],
    stack: [
      { group: "Frontend", items: ["React", "Vite", "Tailwind CSS", "Leaflet", "jsPDF"] },
      { group: "Backend", items: ["Node.js", "Express", "MongoDB", "Mongoose"] },
      { group: "Auth", items: ["Firebase"] },
    ],
    links: { github: `${GH}/Arcane`, live: "https://arcane1.netlify.app/" },
    hackathon: { name: "National 24-hour hackathon", result: "🏆 3rd of 50+ teams", teamSize: 4 },
    featured: true,
    accent: "#D85A30",
  },

  /* ── Pinned right after featured ── */
  {
    slug: "dg-production",
    title: "D&G Production",
    tagline: "TODO(dhruv): one-line description of D&G Production",
    category: "Full-Stack",
    status: "Active",
    period: "Jun 2026 – Present",
    role: "Solo",
    problem:
      "A storefront for a music and visual production brand, selling audio tracks and VJ loops under different licence tiers.",
    highlights: [
      "Built a React 19 + Vite storefront with a canvas particle-orbit hero.",
      "Built a VJ canvas preview that renders animated loops on an HTML5 canvas.",
      "Built a Web Audio synth player (oscillator → low-pass filter → gain) with an analyser-driven visualiser.",
      "Built a product catalog with category filters, product detail pages, a cart drawer with per-item licence tiers (personal/commercial/studio), a validated checkout and a downloads dashboard.",
      "Wrote a StoreContext state engine for cart, catalog and routing, persisted to localStorage.",
    ],
    stack: [
      { group: "Frontend", items: ["React 19", "Vite", "Canvas 2D", "Web Audio API"] },
      { group: "State", items: ["React Context", "localStorage"] },
    ],
    links: { github: `${GH}/DG-Production` },
    note: "In progress: actively being built.",
    pinned: true,
    accent: "#E04FD6",
  },

  /* ── Hackathons ── */
  {
    slug: "aarogyaaid",
    title: "AarogyaAid",
    tagline: "RAG health-insurance advisor that grounds every recommendation in uploaded policy documents",
    category: "AI / ML",
    status: "Prototype",
    period: "Apr 2026",
    // TODO(dhruv): add your role and team size for the hackathon
    problem:
      "Health-insurance choices in India hinge on jargon like waiting periods and co-pays. AarogyaAid explains which policy fits a person's health and budget, citing the policy text instead of the model's guesses.",
    highlights: [
      "Built a 6-field health-profile advisor form validated with Zod (age, lifestyle, conditions, income band, city).",
      "Wrote a scoring layer that ranks retrieved policy chunks by waiting period, co-pay and city tier, covered by Vitest tests.",
      "Routed chat through a single `retrieve_policy_chunks` tool so answers always carry a document citation.",
      "Built an admin panel with login and endpoints to upload policy PDFs and delete chunks by ID.",
      "Prototyped the retrieval layer in Python with LangChain + ChromaDB, including metadata filtering and deletion by document ID.",
    ],
    // TODO(dhruv): the README names Supabase (pgvector) but the TS code calls a generic VECTOR_STORE_URL and the PDF upload route is still a stub; confirm what to claim
    stack: [
      { group: "App", items: ["Next.js App Router", "React 19", "TypeScript", "Tailwind CSS"] },
      { group: "AI", items: ["Vercel AI SDK", "RAG", "Zod structured output"] },
      { group: "Data", items: ["Supabase (pgvector + Postgres)", "LangChain", "ChromaDB"] },
      { group: "Testing", items: ["Vitest"] },
    ],
    links: { github: `${GH}/AarogyaAid` },
    hackathon: { name: "TODO(dhruv): hackathon name" },
    accent: "#3DDC97",
  },
  {
    slug: "rockfall-prediction",
    title: "AI Rockfall Prediction (SIH 2025)",
    tagline: "Early-warning concept for open-pit mines: landing page with a 3D terrain hero",
    category: "AI / ML",
    status: "Completed",
    period: "Sep 2025",
    role: "Core developer", // TODO(dhruv): confirm role
    problem:
      "Rockfalls in open-pit mines strike with little warning. The SIH25071 problem asks for a system that predicts them from sensor data and alerts workers in time.",
    highlights: [
      "Built the React + Vite landing page with an interactive Three.js rock-terrain hero and a WebGL fallback for low-power devices.",
      "Added GSAP scroll-triggered reveals across the objectives, system overview, features and tech-stack sections.",
      // TODO(dhruv): the Python prediction work isn't in this repo (the team's RockGuard-Team_Recursion fork has it); add what you built
      "Worked on the Python prediction model for the team's submission.",
    ],
    stack: [
      { group: "Frontend", items: ["React", "Vite", "Tailwind CSS", "Three.js", "GSAP"] },
      { group: "ML", items: ["Python"] },
    ],
    links: { github: `${GH}/AI-Based-Rockfall-Prediction-and-Alert-System` },
    hackathon: {
      name: "Smart India Hackathon 2025",
      problemId: "SIH25071",
      // TODO(dhruv): the team's RockGuard README says "Top 25 of 800 teams"; confirm and set `result`
    },
    accent: "#C9A26B",
  },

  /* ── Other projects ── */
  {
    slug: "omerta-mafia",
    title: "Omertà: Multiplayer Mafia",
    tagline: "Real-time Mafia party game: each phone gets a secret role, with live day/night rounds",
    category: "Full-Stack",
    status: "Completed",
    period: "Mar 2026",
    role: "Solo",
    problem:
      "Mafia needs a moderator and paper cards. Omertà runs the whole game from players' phones, with private roles and live voting.",
    highlights: [
      "Built room creation and joining with 6-character codes on Next.js 14 App Router.",
      "Used Pusher presence channels for live membership and phase updates, with an auth route for presence.",
      "Wrote role assignment (Mafia, Detective, Doctor) and win detection as pure game logic shared by the REST actions.",
      "Abstracted state behind Vercel KV (Redis), with an in-memory fallback for local development.",
    ],
    stack: [
      { group: "App", items: ["Next.js 14", "TypeScript", "Tailwind CSS"] },
      { group: "Realtime", items: ["Pusher Channels"] },
      { group: "State", items: ["Vercel KV (Redis)"] },
    ],
    links: { github: `${GH}/Mafia-game`, live: "https://mafia-game-chi.vercel.app" },
    accent: "#E5484D",
  },
  {
    slug: "openenv-customer-support",
    title: "Customer Support Triage (OpenEnv)",
    tagline: "Agent-evaluation environment where an LLM resolves support tickets through typed tools",
    category: "AI / ML",
    status: "Completed",
    period: "Mar – Apr 2026",
    role: "Solo",
    problem:
      "LLM agents are easy to demo and hard to measure. This environment scores multi-step tool use on realistic support tickets with deterministic grading.",
    highlights: [
      "Built a mocked customer database and four tools: query_db, issue_refund, send_email and escalate.",
      "Defined typed Pydantic schemas for Observation, Action and Reward, plus a reset/step/state environment loop.",
      "Wrote three deterministic tasks (escalation, warranty lookup, refund flow) with exact parameter matching in the grader.",
      "Served it over FastAPI, packaged with Docker for Hugging Face Spaces, with a gpt-4o-mini baseline agent.",
    ],
    stack: [
      { group: "Environment", items: ["Python", "Pydantic", "FastAPI", "OpenEnv"] },
      { group: "Infra", items: ["Docker", "Hugging Face Spaces", "uv"] },
      { group: "Baseline", items: ["OpenAI SDK"] },
    ],
    links: { github: `${GH}/openenv-customer-support` },
    accent: "#5B8DEF",
  },
  {
    slug: "stickr",
    title: "Stickr",
    tagline: "Digital loyalty cards for Tier-2/3 shops: phone check-ins, QR codes and rewards",
    category: "Mobile",
    status: "Completed",
    period: "Apr 2026",
    role: "Solo",
    problem:
      "Small shops in Tier-2/3 towns have no cheap way to track repeat customers or run a reward programme.",
    highlights: [
      "Built a Flutter app with phone-number check-ins and QR codes for one-scan visits.",
      "Made the visits-per-reward threshold configurable per merchant, with tracked redemptions.",
      "Modelled merchants → customers → visits in Firestore, with security rules scoped to the merchant.",
      "Built a merchant dashboard with customer history and analytics.",
    ],
    stack: [
      { group: "App", items: ["Flutter", "Dart"] },
      { group: "Backend", items: ["Firebase Auth", "Cloud Firestore"] },
    ],
    links: { github: `${GH}/Stickr` },
    accent: "#FFB224",
  },
  {
    slug: "gesture-control-suite",
    title: "Gesture Control Suite",
    tagline: "Hands-free input: a virtual mouse and a hand-gesture game controller using MediaPipe",
    category: "Computer Vision",
    status: "Completed",
    period: "Nov 2025",
    role: "Solo",
    problem:
      "Exploring webcam hand tracking as a hardware-free input device for everyday cursor control and for games.",
    highlights: [
      "Tracked 21 MediaPipe hand landmarks per frame from an OpenCV webcam stream.",
      "Virtual mouse: the index fingertip drives the cursor, with frame-reduction margins and smoothing to remove jitter.",
      "Mapped pinch gestures (index–thumb, middle–thumb) to left and right clicks via PyAutoGUI.",
      "Hill Climb controller: open hand vs fist (folded-finger count) on each hand maps to arrow keys, with state tracking so keys only toggle on change.",
    ],
    stack: [
      { group: "Vision", items: ["Python", "OpenCV", "MediaPipe"] },
      { group: "Input", items: ["PyAutoGUI", "pynput"] },
    ],
    links: {
      github: `${GH}/Virtual-Mouse`,
      moreGithub: [{ label: "Hill Climb controller", url: `${GH}/Hill-Climb-racing-using-hand-gestures` }],
    },
    accent: "#4CC38A",
  },
  {
    slug: "time-series-demand-forecast",
    title: "Time Series Demand Forecasting",
    tagline: "Weekly retail sales forecasting: EDA, decomposition, stationarity tests, SARIMA vs Prophet",
    category: "AI / ML",
    status: "Prototype",
    period: "Mar 2026",
    role: "Solo",
    problem:
      "Bad demand forecasts cause stockouts and overstock. This project builds a forecasting pipeline on Kaggle's store-sales data, with every step justified.",
    highlights: [
      "Merged transactions, stores, oil prices and holidays, then aggregated them to weekly store-family series.",
      "Decomposed the series with STL (period 52) and computed a seasonal-strength score.",
      "Confirmed non-stationarity with ADF and KPSS tests and ACF/PACF plots.",
      "Planned next: SARIMA vs Prophet comparison and an 8-week forecast with confidence intervals.",
    ],
    // TODO(dhruv): only the EDA notebook is committed; update highlights/status once SARIMA + Prophet results land
    stack: [
      { group: "Data", items: ["pandas", "NumPy", "matplotlib", "seaborn"] },
      { group: "Modelling", items: ["statsmodels", "pmdarima", "Prophet", "scikit-learn"] },
    ],
    links: { github: `${GH}/time-series-demand-forecast` },
    accent: "#8E8CF2",
  },
];

/* ── Helpers ── */

export const FILTERS = [
  "All",
  "Hackathons",
  "AI / ML",
  "Full-Stack",
  "Graphics",
  "Tools",
  "Computer Vision",
  "Mobile",
] as const;
export type ProjectFilter = (typeof FILTERS)[number];

export function matchesFilter(p: Project, f: ProjectFilter): boolean {
  if (f === "All") return true;
  if (f === "Hackathons") return !!p.hackathon;
  return p.category === f;
}

/** Award text shown on cards: an explicit award wins, else the hackathon result. */
export function awardOf(p: Project): string | undefined {
  return p.award ?? p.hackathon?.result;
}

/** Short pill label for a hackathon, e.g. "SIH 2026". */
export function hackathonLabel(h: NonNullable<Project["hackathon"]>): string {
  const sih = h.problemId?.match(/^SIH(\d{2})/);
  if (sih) return `SIH 20${sih[1]}`;
  const year = h.name.match(/\b(20\d{2})\b/);
  if (/smart india/i.test(h.name)) return year ? `SIH ${year[1]}` : "SIH";
  return "Hackathon";
}

export function isTodo(text: string | undefined): boolean {
  return !!text && text.startsWith("TODO(");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Sortable key for the end of a period string ("Present" sorts newest). */
function periodEnd(period?: string): number {
  if (!period) return 0;
  if (/present/i.test(period)) return Number.MAX_SAFE_INTEGER;
  const years = [...period.matchAll(/(20\d{2})/g)].map(m => Number(m[1]));
  const months = [...period.toLowerCase().matchAll(/\b([a-z]{3})[a-z]*\b/g)]
    .map(m => MONTHS.indexOf(m[1]))
    .filter(i => i >= 0);
  const year = years[years.length - 1] ?? 0;
  const month = months[months.length - 1] ?? 0;
  return year * 12 + month;
}

function rank(p: Project): number {
  if (p.featured) return 0;
  if (p.pinned) return 1;
  if (p.hackathon?.result) return 2;
  return 3;
}

/** Featured first, then pinned, then hackathons with a result, then the rest; newest first within each. */
export const SORTED_PROJECTS: Project[] = [...PROJECTS].sort(
  (a, b) => rank(a) - rank(b) || periodEnd(b.period) - periodEnd(a.period),
);

export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find(p => p.slug === slug);
}
