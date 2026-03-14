# 🪐 Dhruv Malviya — Solar System Portfolio

> A fully interactive 3D portfolio built as a particle-based solar system. Every object — sun, planets, orbits, stars — is rendered as a dense point cloud using Three.js. Scroll through the solar system to explore sections of my work, with particles morphing between orbital spheres and UI layouts.

---

## ✨ Live Demo

> Deploy on Replit / GitHub Pages / Vercel — add your link here.

---

## 🚀 Features

- **Full particle system** — sun, planets, orbits and stars are all `THREE.Points` — no meshes
- **Scroll morphing** — planets explode into frosted-glass UI cards as you scroll into each section, then collapse back into spheres on exit
- **GSAP ScrollTrigger** — camera travels a bezier spline path around the solar system driven by scroll progress
- **Custom GLSL shaders** — per-particle color, circular point rendering with soft edge falloff, distance-scaled point size
- **Interactive raycasting** — hover planets to glow and reveal labels, click to snap to that section
- **Right-side nav** — 8 dots + up/down animated chevron arrows for direct section jumping
- **Scroll arrow** — animated bounce chevron at hero bottom fades out as you start scrolling
- **Custom cursor** — 12px glowing dot with lerp smoothing and particle trail
- **Star parallax** — background stars drift subtly on mouse move
- **Bug-free nav** — raycasting is fully blocked when interacting with nav UI so planets behind dots never accidentally trigger

---

## 🪐 Solar System Map

| Planet | Section | Color | Orbit Radius |
|--------|---------|-------|-------------|
| ☀️ Sun | Hero — Dhruv Malviya | `#EF9F27` | 0 |
| Mercury | About | `#888780` | 64 |
| Venus | Skills | `#EF9F27` | 104 |
| Earth | Experience | `#1D9E75` | 148 |
| Mars | Arcane Project | `#D85A30` | 192 |
| Saturn | Ray Tracer | `#7F77DD` | 238 |
| Jupiter | Achievements | `#BA7517` | 280 |
| Neptune | Contact | `#378ADD` | 318 |

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
Animated pill tags:
- **Languages:** JavaScript, C++, Python, SQL, GLSL
- **Frontend:** React.js, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Databases:** MongoDB, MySQL
- **Tools:** Git, GitHub, Docker, Postman, Linux (Arch, Fedora)

### 🌍 Experience — Earth
**Kalvium Work Integration** · Full-Stack Developer · Jan 2026–Present
Built core features for the Ledger app using MERN stack. Merged code into the Kalvium community repo as part of the S72 Catalyst program.

### 🔴 Arcane — Mars
**Property Search Portal** · Aug–Oct 2025
Led a 4-person team. React + Node.js + MongoDB. Mock government database integration (DORIS/CERSAI). Color-coded verification algorithm.
🏆 **3rd place out of 50+ teams at a national 24-hour hackathon.**

### 🪐 Ray Tracer — Saturn
**Solar System Ray Tracer** · Jun 2025–Present
Custom C++ rendering engine with OpenGL, GLM, and GLSL shaders. Decoupled threading model, BVH collision optimization, dynamic Phong shading.

### 🟠 Achievements — Jupiter
- 🥉 3rd Place · National 24-Hour Hackathon (50+ teams)
- 🤖 Core Dev · SIH 2025 — AI rockfall prediction model in Python
- 🚀 IIT Bombay E-Summit · Startup MVP showcase
- ⚡ Competitive programming · Linux power user · Hardware optimization

### 🔵 Contact — Neptune
GitHub · LinkedIn · Discord DM
> *Open to internships — Let's build something.*

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
- **Arrow boundary states** — up arrow hidden on section 0, down arrow hidden on section 7
- **Scroll arrow** — fades out over first 5% of scroll progress via GSAP scrub

---

## 📬 Contact

| Platform | Link |
|----------|------|
| GitHub | github.com/yourusername |
| LinkedIn | linkedin.com/in/yourusername |
| Discord | discord.com/users/YOURID |

---

## 📄 License

MIT — feel free to fork and adapt for your own portfolio.

---

<p align="center">Built with Three.js · GSAP · Custom GLSL · and a lot of particles ✨</p>
