# 🪐 Dhruv Malviya — Solar System Portfolio

> A fully interactive 3D portfolio built as a particle-based solar system. Every object — sun, planets, orbits, stars — is rendered as a dense point cloud using Three.js. Scroll through the solar system to explore sections of my work, with particles morphing between orbital spheres and UI layouts.

---

## ✨ Live 

https://dhruvmalviya.vercel.app/

---

## 🚀 Features

- **Full particle system** — sun, planets, orbits and stars are all `THREE.Points` — no meshes
- **Scroll morphing** — planets explode into frosted-glass UI cards as you scroll into each section, then collapse back into spheres on exit
- **GSAP ScrollTrigger** — camera travels a bezier spline path around the solar system driven by scroll progress
- **Custom GLSL shaders** — per-particle color, circular point rendering with soft edge falloff, distance-scaled point size
- **Interactive raycasting** — hover planets to glow and reveal labels, click to snap to that section
- **Right-side nav** — 9 dots (hero + 8 planets) + up/down animated chevron arrows for direct section jumping
- **Scroll arrow** — animated bounce chevron at hero bottom fades out as you start scrolling
- **Custom cursor** — 12px glowing dot with lerp smoothing and particle trail
- **Star parallax** — background stars drift subtly on mouse move
- **Bug-free nav** — raycasting is fully blocked when interacting with nav UI, section cards or the project panel, so planets behind them never accidentally trigger
- **Project hub** — the Projects planet opens a filterable card grid (All · Hackathons · AI / ML · Full-Stack · Graphics · Tools · Computer Vision · Mobile); scrolling inside the grid never skips a section
- **Project detail panel** — frosted side panel on desktop / bottom sheet on mobile, focus-trapped, closes with ✕, Esc or the backdrop, and lazy-loaded
- **Deep links** — `#project/<slug>` scrolls to Projects and opens that project (e.g. `#project/morphos-media`)
- **Featured planets** — MorphOS Media Studio and the Solar System Ray Tracer get their own planets with the full detail layout inline
- **One source of truth** — every project lives in `src/data/projects.ts`; the 3D overlay and the no-WebGL fallback render the same React section components

---

## 🪐 Solar System Map

| Planet | Section | Color | Orbit Radius |
|--------|---------|-------|-------------|
| ☀️ Sun | Hero — Dhruv Malviya | `#EF9F27` | 0 |
| Mercury | About | `#888780` | 60 |
| Venus | Skills | `#EF9F27` | 96 |
| Earth | Experience | `#1D9E75` | 134 |
| Mars | Projects (hub) | `#D85A30` | 176 |
| Jupiter | Featured · MorphOS Media Studio | `#B46CF0` | 218 |
| Saturn 💍 | Featured · Solar System Ray Tracer | `#7F77DD` | 258 |
| Uranus 💍 | Achievements | `#BA7517` | 298 |
| Neptune | Contact | `#378ADD` | 336 |

Orbits and planet sizes are scaled by 0.6 / 0.7 on mobile. The planet list lives in `src/data/planets.ts`.

---

## 🛠 Tech Stack

```
Renderer      Three.js r128 — THREE.Points, BufferGeometry
Animation     GSAP 3 + ScrollTrigger
Shaders       Custom GLSL vertex + fragment
Fonts         Outfit (headings) · DM Mono (labels)
Particles     ≤ 150,000 total budget
Build         Vanilla JS · Single index.html · No build tools
```

---

## 📁 Project Structure

```
portfolio/
└── index.html        # entire project — canvas, styles, JS, shaders
```

---

## ⚙️ Getting Started

**Run locally:**
```bash
# Clone the repo
git clone https://github.com/yourusername/solar-portfolio.git

# Open in browser (use a local server — Three.js needs one)
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

**Run on Replit:**
1. Create a new Replit → HTML/CSS/JS template
2. Paste `index.html` contents
3. Hit Run

---

## 🗺 Sections

### ☀️ Hero
Name, subtitle, GitHub · LinkedIn · Discord links. Animated particle sun corona.

### 🪨 About — Mercury
CS undergrad at Kalvium / MIT ADT University (2024–2028), B.Tech CSE. Specializing in full-stack development and scalable architectures.

### 🟡 Skills — Venus
Pill tags:
- **Languages:** JavaScript, TypeScript, C++, Python, SQL, GLSL
- **Frontend:** React.js, Next.js, Tailwind CSS, Three.js / R3F, GSAP
- **Backend:** Node.js, Express.js, FastAPI
- **Databases:** MongoDB, MySQL, Firebase
- **AI & Vision:** LLM APIs / RAG, OpenCV / MediaPipe
- **Desktop & Mobile:** Tauri, Flutter
- **Tools:** Git, GitHub, Docker, Postman, Playwright, Linux

### 🌍 Experience — Earth
**Kalvium Work Integration** · Full-Stack Developer · Jan 2026–Present
Built core features for the Ledger app using MERN stack. Merged code into the Kalvium community repo as part of the S72 Catalyst program.

### 🔴 Projects — Mars
The project hub: filter chips, a card grid (status, hackathon pill, award, top stack tags) and a detail panel per project. See [Projects](#-projects) below.

### 🟣 Featured · MorphOS — Jupiter
Local-first AI media suite (Tauri + React shell, FastAPI backend, photo / audio / manga engines, hardware gatekeeper).

### 🪐 Featured · Ray Tracer — Saturn
Real-time solar system in C++17 / OpenGL with Keplerian orbits, GLM hierarchical transforms and custom GLSL lighting.

### 🟠 Achievements — Uranus
- 🥉 3rd Place · National 24-Hour Hackathon (50+ teams)
- 🤖 Core Dev · SIH 2025 — AI rockfall prediction model in Python
- 🚀 IIT Bombay E-Summit · Startup MVP showcase
- ⚡ Competitive programming · Linux power user · Hardware optimization

### 🔵 Contact — Neptune
GitHub · LinkedIn · Discord DM
> *Open to internships — Let's build something.*

---

## 📂 Projects

All project content lives in [`artifacts/portfolio/src/data/projects.ts`](artifacts/portfolio/src/data/projects.ts).

| Project | Category | Repo |
|---------|----------|------|
| MorphOS Media Studio ★ | AI / ML | [MorphOS-Media](https://github.com/DhruvMalviya0/MorphOS-Media) |
| Neel Watch ★ (SIH26143) | AI / ML | — |
| Project Butterfly ★ | Full-Stack | [Butterfly](https://github.com/DhruvMalviya0/Butterfly) |
| Interactive AI Desktop Assistant ★ | AI / ML | [Desktop-AI-Assistant](https://github.com/DhruvMalviya0/Desktop-AI-Assistant) |
| Pivot ★ | Tools | [Pivot](https://github.com/DhruvMalviya0/Pivot) |
| Solar System Ray Tracer ★ | Graphics | [Solar-System](https://github.com/DhruvMalviya0/Solar-System) |
| Arcane ★ (🏆 3rd of 50+) | Full-Stack | [Arcane](https://github.com/DhruvMalviya0/Arcane) · [live](https://arcane1.netlify.app/) |
| D&G Production | Full-Stack | [DG-Production](https://github.com/DhruvMalviya0/DG-Production) |
| AarogyaAid | AI / ML | [AarogyaAid](https://github.com/DhruvMalviya0/AarogyaAid) |
| AI Rockfall Prediction (SIH25071) | AI / ML | [AI-Based-Rockfall-Prediction-and-Alert-System](https://github.com/DhruvMalviya0/AI-Based-Rockfall-Prediction-and-Alert-System) |
| Omertà: Multiplayer Mafia | Full-Stack | [Mafia-game](https://github.com/DhruvMalviya0/Mafia-game) · [live](https://mafia-game-chi.vercel.app) |
| Customer Support Triage (OpenEnv) | AI / ML | [openenv-customer-support](https://github.com/DhruvMalviya0/openenv-customer-support) |
| Stickr | Mobile | [Stickr](https://github.com/DhruvMalviya0/Stickr) |
| Gesture Control Suite | Computer Vision | [Virtual-Mouse](https://github.com/DhruvMalviya0/Virtual-Mouse) · [Hill-Climb-racing-using-hand-gestures](https://github.com/DhruvMalviya0/Hill-Climb-racing-using-hand-gestures) |
| Time Series Demand Forecasting | AI / ML | [time-series-demand-forecast](https://github.com/DhruvMalviya0/time-series-demand-forecast) |

★ = featured (shown first in the hub).

---

## 🎨 Design

| Property | Value |
|----------|-------|
| Background | `#02020a` deep space |
| Primary accent | `#EF9F27` gold (sun) |
| Font — headings | Outfit 800 |
| Font — labels | DM Mono 400 |
| UI panels | Frosted glass · `backdrop-filter: blur(12px)` |
| Particle budget | ≤ 150,000 points |
| Target FPS | 60fps · `pixelRatio` capped at 2 |

---

## 🐛 Known Fixes Applied

- **Nav click-through bug** — raycasting blocked via `isOverNavUI` flag + bounding box guard when pointer is over nav dots or arrows
- **Arrow boundary states** — up arrow hidden on section 0, down arrow hidden on section 8
- **Scroll arrow** — fades out over first 5% of scroll progress via GSAP scrub

---


## 📄 License

MIT — feel free to fork and adapt for your own portfolio.

---

<p align="center">Built with Three.js · GSAP · Custom GLSL · and a lot of particles ✨</p>
