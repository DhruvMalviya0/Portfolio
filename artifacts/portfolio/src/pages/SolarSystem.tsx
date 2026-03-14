import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

const PLANETS = [
  { name: "About",        color: 0x888780, radius: 64,  size: 10, speed: 0.00045, section: "about"        },
  { name: "Skills",       color: 0xEF9F27, radius: 104, size: 12, speed: 0.00032, section: "skills"       },
  { name: "Experience",   color: 0x1D9E75, radius: 148, size: 13, speed: 0.00024, section: "experience"   },
  { name: "Arcane",       color: 0xD85A30, radius: 192, size: 14, speed: 0.00018, section: "arcane"       },
  { name: "Ray Tracer",   color: 0x7F77DD, radius: 238, size: 15, speed: 0.00013, section: "raytracer"    },
  { name: "Achievements", color: 0xBA7517, radius: 280, size: 18, speed: 0.00009, section: "achievements" },
  { name: "Contact",      color: 0x378ADD, radius: 318, size: 13, speed: 0.00006, section: "contact"      }
];

/* ── Shaders ── */
const PLANET_VERT = `
  uniform float uSize;
  uniform float uTime;
  attribute float aScale;
  attribute float aPulse;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float pulse = 1.0 + sin(uTime * 2.0 + aPulse * 6.28) * 0.12 * aPulse;
    gl_PointSize = uSize * aScale * pulse * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const PLANET_FRAG = `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float alpha = (core * 0.9 + glow * 0.55) * uOpacity;
    gl_FragColor = vec4(uColor + vec3(core * 0.4), alpha);
  }
`;
const STAR_VERT = `
  uniform float uTime;
  uniform float uWarpIntensity;
  attribute float aTwinkle;
  attribute float aFlare;
  attribute float aSize;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 1.0 + sin(uTime * 1.8 + aTwinkle * 6.28) * 0.38;
    // Each star flares by its own random amount — some stay dim, some burst bright
    float flare = 1.0 + aFlare * uWarpIntensity * 4.2;
    gl_PointSize = aSize * twinkle * flare * (320.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const STAR_FRAG = `
  uniform float uWarpIntensity;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.18, d);
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    // Base brightness stays subtle; scroll flare adds a soft bloom, never overpowers
    float alpha = core * 0.95 + glow * (0.35 + uWarpIntensity * 0.25);
    alpha = min(alpha, 0.96);
    // Slight warm tint on flared stars
    vec3 col = mix(vec3(1.0), vec3(1.0, 0.97, 0.88), uWarpIntensity * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;
// Warp trail lines (speed streaks during camera travel)
const WARP_VERT = `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WARP_FRAG = `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * 0.55);
  }
`;

function makeGlowMat(color: THREE.Color, size: number, opacity = 0.95) {
  return new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size }, uColor: { value: color }, uOpacity: { value: opacity }, uTime: { value: 0 } },
    vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

/**
 * Creates a planet-like particle sphere:
 * - Oblate spheroid (wider at equator, flatter at poles)
 * - Dense surface crust + sparse inner volume + thin atmosphere halo
 * - Equatorial band has more/brighter particles
 */
function createParticleSphere(count: number, radius: number, color: number, size = 1.8): THREE.Group {
  const group = new THREE.Group();
  const col = new THREE.Color(color);

  // ── Layer 1: Surface crust (80% of particles) — tight shell at surface ──
  const surfCount = Math.floor(count * 0.80);
  const surfGeo = new THREE.BufferGeometry();
  const surfPos  = new Float32Array(surfCount * 3);
  const surfSc   = new Float32Array(surfCount);
  const surfPu   = new Float32Array(surfCount);

  for (let i = 0; i < surfCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    // Bias phi toward equator: use power distribution
    const rawPhi = Math.acos(2 * Math.random() - 1);
    // Pull particles toward equator (phi = PI/2) by mixing with equatorial value
    const equatBias = Math.random() < 0.45 ? 0.3 : 1.0; // 45% closer to equator
    const phi = rawPhi * equatBias + (Math.PI / 2) * (1 - equatBias);

    // Oblate spheroid: compress polar axis (Y in local space → use cos(phi))
    const flattenY = 0.72; // squash poles
    const r = radius * (0.93 + Math.random() * 0.10); // thin crust
    surfPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    surfPos[i * 3 + 1] = r * Math.cos(phi) * flattenY;
    surfPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    // Equatorial band particles slightly larger
    const eqFactor = 1.0 - Math.abs(Math.cos(phi)) * 0.5;
    surfSc[i] = (0.5 + Math.random() * 0.8) * eqFactor;
    surfPu[i] = Math.random() < 0.12 ? Math.random() : 0;
  }
  surfGeo.setAttribute("position", new THREE.BufferAttribute(surfPos, 3));
  surfGeo.setAttribute("aScale",   new THREE.BufferAttribute(surfSc, 1));
  surfGeo.setAttribute("aPulse",   new THREE.BufferAttribute(surfPu, 1));
  group.add(new THREE.Points(surfGeo, makeGlowMat(col, size)));

  // ── Layer 2: Atmosphere halo (20% of particles) — larger radius, dimmer ──
  const atmCount = count - surfCount;
  const atmGeo = new THREE.BufferGeometry();
  const atmPos = new Float32Array(atmCount * 3);
  const atmSc  = new Float32Array(atmCount);
  const atmPu  = new Float32Array(atmCount);

  for (let i = 0; i < atmCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r = radius * (1.05 + Math.random() * 0.22);
    atmPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    atmPos[i * 3 + 1] = r * Math.cos(phi) * 0.75;
    atmPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    atmSc[i] = 0.25 + Math.random() * 0.45;
    atmPu[i] = 0;
  }
  atmGeo.setAttribute("position", new THREE.BufferAttribute(atmPos, 3));
  atmGeo.setAttribute("aScale",   new THREE.BufferAttribute(atmSc, 1));
  atmGeo.setAttribute("aPulse",   new THREE.BufferAttribute(atmPu, 1));
  const atmMat = makeGlowMat(col, size * 0.7, 0.28);
  group.add(new THREE.Points(atmGeo, atmMat));

  return group;
}

/** Flat particle ring around a planet (for visual variety) */
function createPlanetRing(innerR: number, outerR: number, color: number, count = 800): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const pos    = new Float32Array(count * 3);
  const aScale = new Float32Array(count);
  const aPulse = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = innerR + Math.random() * (outerR - innerR);
    pos[i * 3]     = r * Math.cos(angle);
    pos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
    pos[i * 3 + 2] = r * Math.sin(angle);
    aScale[i] = 0.2 + Math.random() * 0.5;
    aPulse[i] = 0;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aScale",   new THREE.BufferAttribute(aScale, 1));
  geo.setAttribute("aPulse",   new THREE.BufferAttribute(aPulse, 1));
  return new THREE.Points(geo, makeGlowMat(new THREE.Color(color), 0.7, 0.45));
}

function createOrbitRing(radius: number, count = 600): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const aScale = new Float32Array(count);
  const aPulse = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pos[i * 3] = radius * Math.cos(a);
    pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    pos[i * 3 + 2] = radius * Math.sin(a);
    aScale[i] = 0.3 + Math.random() * 0.35;
    aPulse[i] = 0;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
  geo.setAttribute("aPulse", new THREE.BufferAttribute(aPulse, 1));
  const mat = makeGlowMat(new THREE.Color(0xffffff), 0.45, 0.09);
  return new THREE.Points(geo, mat);
}

function createStars(count = 6000): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const pos      = new Float32Array(count * 3);
  const aTwinkle = new Float32Array(count);
  const aFlare   = new Float32Array(count); // 0 = doesn't flare, 1 = flares brightly on scroll
  const aSize    = new Float32Array(count); // per-star base size for variety

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    // Layered distances: near (crisp) + far (soft)
    const r = i < count * 0.3
      ? 250 + Math.random() * 250   // near layer — bigger apparent size
      : 500 + Math.random() * 700;  // far layer — tiny
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    aTwinkle[i] = Math.random();
    // ~35% of stars will flare noticeably on scroll; rest stay subtle
    aFlare[i]   = Math.random() < 0.35 ? Math.random() : Math.random() * 0.08;
    // Size variety: most tiny, a few larger "feature" stars
    aSize[i] = Math.random() < 0.04 ? 3.5 + Math.random() * 1.5 : 1.2 + Math.random() * 1.2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aTwinkle", new THREE.BufferAttribute(aTwinkle, 1));
  geo.setAttribute("aFlare",   new THREE.BufferAttribute(aFlare, 1));
  geo.setAttribute("aSize",    new THREE.BufferAttribute(aSize, 1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWarpIntensity: { value: 0 } },
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}

/** Warp-speed LineSegments — trails that appear when camera moves fast */
function createWarpLines(count: number): THREE.LineSegments {
  // Each line = 2 vertices (start + end). Total = count * 2 verts
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 6); // 2 verts * 3 floats
  const aAlpha = new Float32Array(count * 2);

  // Place lines randomly in a forward-facing dome
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 60 + Math.random() * 200;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    pos[i * 6]     = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x; pos[i * 6 + 4] = y; pos[i * 6 + 5] = z;
    aAlpha[i * 2] = 1.0;
    aAlpha[i * 2 + 1] = 0.0;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(aAlpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: WARP_VERT, fragmentShader: WARP_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(geo, mat);
}

/** A single shooting star — a LineSegments with 1 segment that sweeps across sky */
function createShootingStar(): THREE.Line {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(6); // start + end
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Line(geo, mat);
}

/* ── Easing ── */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/* ── Static fallback ── */
function StaticPortfolio() {
  return (
    <div className="static-portfolio" style={{ fontFamily: "'Doto', sans-serif", color: "#fff", fontWeight: 600 }}>
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", background: "radial-gradient(ellipse at center, rgba(239,159,39,0.08) 0%, #02020a 70%)" }}>
        <h1 className="hero-name" style={{ fontSize: "88px", fontWeight: 800, marginBottom: "1rem", letterSpacing: "-0.02em", color: "rgba(255,255,255,0.93)" }}>Dhruv Malviya</h1>
        <p className="hero-subtitle" style={{ fontFamily: "'Doto', sans-serif", fontSize: "22px", color: "rgba(255,255,255,0.80)", letterSpacing: "0.08em", marginBottom: "2rem", fontWeight: 700 }}>Full-Stack Developer · Graphics Engineer · CS Undergraduate</p>
        <div className="hero-links" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="hero-link">GitHub</a>
          <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" className="hero-link">LinkedIn</a>
          <a href="https://discord.com/users/884316563686166548" target="_blank" rel="noopener noreferrer" className="hero-link">Discord</a>
        </div>
      </section>
      {[
        { title: "About", color: "#EF9F27", content: <p style={{ fontSize: "1.15rem", lineHeight: "1.9", color: "rgba(255,255,255,0.8)" }}>CS undergrad at <strong>Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE. Specializes in full-stack development and scalable architectures. Strong in C++ and JavaScript. Actively seeking internship opportunities.</p> },
        { title: "Skills", color: "#EF9F27", content: <div>{[{ label: "Languages", tags: ["JavaScript","C++","Python","SQL","GLSL"] }, { label: "Frontend", tags: ["React.js","Tailwind CSS"] }, { label: "Backend", tags: ["Node.js","Express.js"] }, { label: "Databases", tags: ["MongoDB","MySQL"] }, { label: "Tools", tags: ["Git","GitHub","Docker","Postman","Linux"] }].map(g => <div key={g.label} className="skill-group"><span className="skill-label">{g.label}</span><div className="tags">{g.tags.map(t => <span key={t} className="tag">{t}</span>)}</div></div>)}</div> },
        { title: "Experience", color: "#1D9E75", content: <><h3 style={{ color: "#1D9E75" }}>Kalvium · Full-Stack Developer · Jan 2026–Present</h3><ul style={{ color: "rgba(255,255,255,0.8)", lineHeight: 2, paddingLeft: "1.25rem" }}><li>MERN stack Ledger application</li><li>Merged into Kalvium community repo (S72 Catalyst)</li></ul></> },
        { title: "Arcane", color: "#D85A30", content: <><p style={{ color: "rgba(255,255,255,0.6)" }}>Property Search Portal · Aug–Oct 2025</p><ul style={{ color: "rgba(255,255,255,0.8)", lineHeight: 2, paddingLeft: "1.25rem" }}><li>Led 4-person team · React + Node.js + MongoDB</li><li>DORIS/CERSAI mock integration · Verification algo</li></ul><div style={{ marginTop: "1rem", background: "rgba(239,159,39,0.1)", border: "1px solid rgba(239,159,39,0.3)", borderRadius: "8px", padding: "0.6rem 1rem", color: "#EF9F27", fontWeight: 600 }}>🏆 3rd place — 50+ teams, 24-hour hackathon</div></> },
        { title: "Ray Tracer", color: "#7F77DD", content: <ul style={{ color: "rgba(255,255,255,0.8)", lineHeight: 2, paddingLeft: "1.25rem" }}><li>C++ · OpenGL · GLM · GLSL shaders</li><li>Decoupled threading · BVH collision · Phong shading</li></ul> },
        { title: "Achievements", color: "#BA7517", content: <ul style={{ listStyle: "none", padding: 0 }}>{["3rd place — National hackathon","SIH 2025 — AI rockfall prediction","IIT Bombay E-Summit MVP","Competitive programming","Linux power user"].map((text) => <li key={text} style={{ color: "rgba(255,255,255,0.8)", marginBottom: "0.75rem" }}>{text}</li>)}</ul> },
        { title: "Contact", color: "#378ADD", content: <div style={{ textAlign: "center" }}><p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem" }}>Open to internships — Let's build something.</p><div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}><a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="contact-btn">GitHub</a><a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" className="contact-btn">LinkedIn</a><a href="https://discord.com/users/884316563686166548" target="_blank" rel="noopener noreferrer" className="contact-btn">Discord</a></div></div> },
      ].map(s => (
        <section key={s.title} style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem", color: s.color }}>{s.title}</h2>
          {s.content}
        </section>
      ))}
    </div>
  );
}

const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
};

/* ── Main component ── */
export default function SolarSystem() {
  const canvasRef    = useRef<HTMLDivElement>(null);
  const navWrapperRef = useRef<HTMLDivElement>(null);
  const isOverNavUIRef = useRef(false);
  const hasSwipedRef = useRef(false);
  const cursorRef    = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const isTouch = isTouchDevice();
  const totalSections = PLANETS.length + 1;

  const navigateSection = (direction: number) => {
    const nextSection = Math.max(0, Math.min(totalSections - 1, activeNavIndex + direction));
    gsap.to(window, {
      scrollTo: nextSection * window.innerHeight,
      duration: 1.2,
      ease: "power2.inOut",
    });
    setActiveNavIndex(nextSection);
  };

  const isClickOnNavUI = (event: MouseEvent) => {
    const navWrapper = navWrapperRef.current;
    if (!navWrapper) return false;
    const rect = navWrapper.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const isMobile = window.innerWidth < 768;
    const touchDevice = isTouchDevice();
    document.body.style.cursor = touchDevice ? "auto" : "none";
    const orbitScale = isMobile ? 0.6 : 1.0;
    const sizeScale = isMobile ? 0.7 : 1.0;
    const particleScale = isMobile ? 0.6 : 1.0;
    const starCount = isMobile ? 3000 : 6000;
    const orbitParticleCount = Math.max(240, Math.floor(600 * particleScale));
    const ringParticleCount = Math.max(320, Math.floor(800 * particleScale));

    const scenePlanets = PLANETS.map((planet) => ({
      ...planet,
      radius: planet.radius * orbitScale,
      size: planet.size * sizeScale,
    }));

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, failIfMajorPerformanceCaveat: false }); }
    catch { setWebglError(true); return; }
    if (!renderer.getContext()) { setWebglError(true); renderer.dispose(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x02020a);
    canvasRef.current.appendChild(renderer.domElement);
    const canvasEl = renderer.domElement;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02020a, 0.0004);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 120, isMobile ? 520 : 380);

    // Camera lerp state
    const camPos = new THREE.Vector3(0, 120, isMobile ? 520 : 380);
    const camTarget = new THREE.Vector3(0, 0, 0);
    const prevCamPos = new THREE.Vector3(0, 120, isMobile ? 520 : 380);

    // Sun (Group of two particle layers)
    const sun = createParticleSphere(Math.floor(9000 * particleScale), 22, 0xEF9F27, 2.4);
    const sunHalo = createParticleSphere(Math.floor(3500 * particleScale), 26, 0xFFC44D, 1.1);
    // Dim the halo atmosphere layer
    sunHalo.children.forEach(c => {
      const pts = c as THREE.Points;
      (pts.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.13;
    });
    scene.add(sun); scene.add(sunHalo);

    // Stars
    const stars = createStars(starCount);
    scene.add(stars);

    // Planets & orbits
    const planetGroups: THREE.Group[] = [];
    const planetAngles = scenePlanets.map(() => Math.random() * Math.PI * 2);
    scenePlanets.forEach((p, pi) => {
      scene.add(createOrbitRing(p.radius, orbitParticleCount));
      const grp = createParticleSphere(Math.floor(3200 * particleScale), p.size, p.color, 2.0);
      grp.position.set(p.radius * Math.cos(planetAngles[pi]), 0, p.radius * Math.sin(planetAngles[pi]));
      scene.add(grp);
      planetGroups.push(grp);
    });
    // Add rings to two planets for visual variety
    const ring1 = createPlanetRing(scenePlanets[4].size * 1.5, scenePlanets[4].size * 2.8, scenePlanets[4].color, ringParticleCount);
    ring1.rotation.x = Math.PI * 0.25;
    planetGroups[4].add(ring1);
    const ring2 = createPlanetRing(scenePlanets[5].size * 1.4, scenePlanets[5].size * 2.5, scenePlanets[5].color, ringParticleCount);
    ring2.rotation.x = Math.PI * 0.18;
    planetGroups[5].add(ring2);

    // Warp trail lines
    const WARP_COUNT = 500;
    const warpLines = createWarpLines(WARP_COUNT);
    scene.add(warpLines);
    const warpPosOrig = new Float32Array(WARP_COUNT * 6);
    {
      const arr = (warpLines.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
      warpPosOrig.set(arr);
    }

    // Shooting stars (pool of 20 — many visible at once)
    type ShootData = { active: boolean; t: number; duration: number; from: THREE.Vector3; dir: THREE.Vector3; length: number; speed: number };
    const shootingStars: THREE.Line[] = [];
    const shootingStarData: ShootData[] = [];
    for (let i = 0; i < 20; i++) {
      const s = createShootingStar();
      scene.add(s);
      shootingStars.push(s);
      shootingStarData.push({ active: false, t: 0, duration: 0, from: new THREE.Vector3(), dir: new THREE.Vector3(), length: 0, speed: 0 });
    }

    // Stagger initial spawns so we start with several active
    let nextShootTime = 0.1;
    let timeSinceLastShoot = 0;

    function spawnShootingStar() {
      const slot = shootingStarData.findIndex(d => !d.active);
      if (slot === -1) return;
      const d = shootingStarData[slot];
      d.active = true; d.t = 0;
      d.duration = 0.4 + Math.random() * 0.8;
      d.length   = 20 + Math.random() * 100;
      d.speed    = 280 + Math.random() * 280;
      // Full spherical sky coverage — all directions
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r = 280 + Math.random() * 220;
      d.from.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      // Direction tangent to sphere — feels like shooting across the sky
      const up = new THREE.Vector3(0, 1, 0);
      const radial = d.from.clone().normalize();
      d.dir.crossVectors(radial, up).normalize();
      if (Math.random() < 0.5) d.dir.negate();
      d.dir.add(new THREE.Vector3((Math.random()-0.5)*0.4, (Math.random()-0.5)*0.4, (Math.random()-0.5)*0.4)).normalize();
    }

    // Original planet surface positions for mouse scatter (surface layer = child 0)
    const planetOrigPos: Float32Array[] = planetGroups.map(grp => {
      const pts = grp.children[0] as THREE.Points;
      const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
      return new Float32Array(attr.array);
    });

    // Interaction
    const mouse = new THREE.Vector2(-10, -10);
    let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
    let cursorTargetX = cursorX, cursorTargetY = cursorY;
    let hoveredPlanet = -1;
    let isOverPlanet = false;

    const onMouseMove = (e: MouseEvent) => {
      if (isOverNavUIRef.current || isClickOnNavUI(e)) {
        mouse.x = -10;
        mouse.y = -10;
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
        return;
      }
      cursorTargetX = e.clientX; cursorTargetY = e.clientY;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      stars.position.x += (mouse.x * 18 - stars.position.x) * 0.04;
      stars.position.y += (mouse.y * 12 - stars.position.y) * 0.04;
    };
    if (!touchDevice) {
      window.addEventListener("mousemove", onMouseMove);
    }

    const onClick = (e: MouseEvent) => {
      if (isOverNavUIRef.current || isClickOnNavUI(e)) return;
      if (hoveredPlanet >= 0) {
        gsap.to(window, { duration: 1.0, scrollTo: { y: (hoveredPlanet + 1) * window.innerHeight }, ease: "power2.inOut" });
      }
    };
    window.addEventListener("click", onClick);

    const handlePlanetClick = () => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      let targetIndex = -1;
      let minDist = Infinity;
      planetGroups.forEach((grp, index) => {
        const distance = raycaster.ray.distanceToPoint(grp.position);
        if (distance < scenePlanets[index].size * 1.85 && distance < minDist) {
          minDist = distance;
          targetIndex = index;
        }
      });
      if (targetIndex >= 0) {
        gsap.to(window, {
          duration: 1.0,
          scrollTo: { y: (targetIndex + 1) * window.innerHeight },
          ease: "power2.inOut",
        });
      }
    };

    const hideSwipeHint = () => {
      if (!isMobile || hasSwipedRef.current) return;
      hasSwipedRef.current = true;
      const hint = document.querySelector(".swipe-hint") as HTMLDivElement | null;
      if (!hint) return;
      hint.style.opacity = "0";
      window.setTimeout(() => {
        hint.style.display = "none";
      }, 500);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isOverNavUIRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      handlePlanetClick();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isOverNavUIRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      hideSwipeHint();
    };

    canvasEl.addEventListener("touchstart", onTouchStart, { passive: false });
    canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });

    let touchStartY = 0;
    let touchStartX = 0;
    const onDocTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };
    const onDocTouchMove = (e: TouchEvent) => {
      if (!isMobile || hasSwipedRef.current) return;
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      if (deltaX > 8 || deltaY > 8) hideSwipeHint();
    };
    const onDocTouchEnd = (e: TouchEvent) => {
      if (!isMobile) return;
      const delta = touchStartY - e.changedTouches[0].clientY;
      const absDelta = Math.abs(delta);

      if (absDelta > 20) hideSwipeHint();

      if (absDelta <= 50) return;

      const currentSection = Math.round(scrollY / window.innerHeight);
      const nextSection = Math.max(0, Math.min(totalSections - 1, currentSection + (delta > 0 ? 1 : -1)));
      gsap.to(window, {
        scrollTo: nextSection * window.innerHeight,
        duration: 1.2,
        ease: "power2.inOut",
      });
      setActiveNavIndex(nextSection);
    };
    document.addEventListener("touchstart", onDocTouchStart, { passive: true });
    document.addEventListener("touchmove", onDocTouchMove, { passive: true });
    document.addEventListener("touchend", onDocTouchEnd, { passive: true });

    // Overlay content
    let lastShownSection = -1;
    const updateOverlay = (sectionIdx: number, show: boolean) => {
      if (!overlayRef.current) return;
      if (show && sectionIdx !== lastShownSection && sectionIdx > 0) {
        lastShownSection = sectionIdx;
        const el = document.getElementById("overlay-content");
        if (el) el.innerHTML = getSectionHTML(sectionIdx - 1);
      }
      const targetOp = (show && sectionIdx > 0) ? 1 : 0;
      overlayRef.current.style.opacity = String(targetOp);
      overlayRef.current.style.pointerEvents = (show && sectionIdx > 0) ? "auto" : "none";
    };

    // ── Scroll-driven camera ──
    // Each section = 1 full viewport height.
    // scrollFrac = 0→1 within the current section.
    // Camera continuously interpolates between section camera positions.
    // Warp effect kicks in during mid-scroll (0.2 → 0.8 of scroll fraction).
    // Info panel shows when scrollFrac > 0.5.

    let scrollY = window.scrollY;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    const arrowsFadeTween = gsap.to(".arrows-wrapper", {
      opacity: 0,
      pointerEvents: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "10% top",
        scrub: true,
      },
    });

    const N = scenePlanets.length + 1; // total sections

    // Animation loop
    const clock = new THREE.Clock();
    let animId: number;
    let currentDisplaySection = 0;

    let cursorAnimFrame: number | undefined;
    const animateCursor = () => {
      cursorX += (cursorTargetX - cursorX) * 0.14;
      cursorY += (cursorTargetY - cursorY) * 0.14;

      if (cursorRef.current) {
        cursorRef.current.style.left = cursorX + "px";
        cursorRef.current.style.top = cursorY + "px";
      }

      if (cursorRingRef.current) {
        const rx = cursorX + (cursorTargetX - cursorX) * 0.5;
        const ry = cursorY + (cursorTargetY - cursorY) * 0.5;
        cursorRingRef.current.style.left = rx + "px";
        cursorRingRef.current.style.top = ry + "px";
        cursorRingRef.current.style.transform = isOverPlanet
          ? "translate(-50%,-50%) scale(2.5)"
          : "translate(-50%,-50%) scale(1)";
      }

      cursorAnimFrame = requestAnimationFrame(animateCursor);
    };

    if (!touchDevice) {
      animateCursor();
    }

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      // Update star shader time (warpIntensity set below after computing it)
      const starMat = stars.material as THREE.ShaderMaterial;
      starMat.uniforms.uTime.value = t;

      // Sun pulse — update all children's time uniform
      const s = 1 + Math.sin(t * 1.4) * 0.035;
      sun.scale.setScalar(s); sunHalo.scale.setScalar(s * 1.05);
      sun.rotation.y += 0.0015; sunHalo.rotation.y -= 0.001;
      sun.children.forEach(c => { (( c as THREE.Points).material as THREE.ShaderMaterial).uniforms.uTime.value = t; });
      sunHalo.children.forEach(c => { ((c as THREE.Points).material as THREE.ShaderMaterial).uniforms.uTime.value = t; });

      // Planets orbit — groups have position & rotation directly
      scenePlanets.forEach((p, i) => {
        planetAngles[i] += p.speed;
        planetGroups[i].position.x = p.radius * Math.cos(planetAngles[i]);
        planetGroups[i].position.z = p.radius * Math.sin(planetAngles[i]);
        planetGroups[i].rotation.y += 0.0018;
        // Update time uniform on all child Points
        planetGroups[i].children.forEach(c => {
          const mat = (c as THREE.Points).material as THREE.ShaderMaterial;
          if (mat.uniforms?.uTime) mat.uniforms.uTime.value = t;
        });
      });

      // ── Scroll-driven camera interpolation ──
      const rawProgress = scrollY / window.innerHeight; // e.g. 0.0 → 7.0
      const sectionIdx = Math.min(Math.floor(rawProgress), N - 1);
      const frac = Math.min(rawProgress - Math.floor(rawProgress), 1); // 0→1 within section
      const easedFrac = easeInOut(frac);

      // Determine which two camera positions to interpolate between
      // Current section → next section
      const fromIdx = sectionIdx;
      const toIdx   = Math.min(sectionIdx + 1, N - 1);

      // Build camera position for current and next
      const getSection = (idx: number) => {
        if (idx === 0) return { pos: new THREE.Vector3(0, 120, isMobile ? 520 : 380), target: new THREE.Vector3(0, 0, 0) };
        const pd = scenePlanets[idx - 1];
        const mesh = planetGroups[idx - 1];
        return {
          pos: new THREE.Vector3(mesh.position.x * 0.55, mesh.position.y + 20, mesh.position.z + pd.size * 5.5),
          target: mesh.position.clone(),
        };
      };

      const from = getSection(fromIdx);
      const to   = getSection(toIdx);

      const desiredPos = from.pos.clone().lerp(to.pos, easedFrac);
      const desiredTarget = from.target.clone().lerp(to.target, easedFrac);

      // Lerp camera to desired (smooth follow)
      camPos.lerp(desiredPos, 0.07);
      camTarget.lerp(desiredTarget, 0.08);
      camera.position.copy(camPos);
      camera.lookAt(camTarget);

      // ── Warp trail effect ──
      const warpIntensity = fromIdx !== toIdx
        ? Math.sin(Math.PI * frac) * 1.0
        : 0;

      // Feed warp intensity to star shader so stars flare during travel
      starMat.uniforms.uWarpIntensity.value += (warpIntensity - starMat.uniforms.uWarpIntensity.value) * 0.06;

      // Camera velocity vector (world space, per-frame delta)
      const camVelocity = camPos.clone().sub(prevCamPos);
      prevCamPos.copy(camPos);
      const camSpeed = camVelocity.length();
      const warpStrength = Math.min(camSpeed * 28, 1.0) * warpIntensity;

      // Update warp line geometry: stretch each line along camera velocity direction
      const warpPosAttr = warpLines.geometry.getAttribute("position") as THREE.BufferAttribute;
      const warpArr = warpPosAttr.array as Float32Array;
      const warpAlphaAttr = warpLines.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
      const warpAlphaArr = warpAlphaAttr.array as Float32Array;
      const velNorm = camVelocity.clone().normalize();
      const stretchLen = Math.min(camSpeed * 300, 120) * warpIntensity;

      for (let i = 0; i < WARP_COUNT; i++) {
        // Start vertex (from camera-relative original position)
        const ox = warpPosOrig[i * 6];
        const oy = warpPosOrig[i * 6 + 1];
        const oz = warpPosOrig[i * 6 + 2];
        // Transform orig position to follow camera
        warpArr[i * 6]     = camPos.x + ox;
        warpArr[i * 6 + 1] = camPos.y + oy;
        warpArr[i * 6 + 2] = camPos.z + oz;
        // End vertex stretched backward in velocity dir
        warpArr[i * 6 + 3] = camPos.x + ox - velNorm.x * stretchLen * (0.5 + Math.abs(ox) / 100);
        warpArr[i * 6 + 4] = camPos.y + oy - velNorm.y * stretchLen * (0.5 + Math.abs(oy) / 100);
        warpArr[i * 6 + 5] = camPos.z + oz - velNorm.z * stretchLen * (0.5 + Math.abs(oz) / 100);
        // Alpha: visible only at high warp strength, fade ends to zero
        const a = warpStrength * (0.4 + 0.6 * Math.random());
        warpAlphaArr[i * 2]     = a;
        warpAlphaArr[i * 2 + 1] = 0;
      }
      warpPosAttr.needsUpdate = true;
      warpAlphaAttr.needsUpdate = true;

      // ── Shooting stars ──
      timeSinceLastShoot += dt;
      if (timeSinceLastShoot >= nextShootTime) {
        spawnShootingStar();
        timeSinceLastShoot = 0;
        // Frequent spawns — ~1–3 active at any moment
        nextShootTime = 0.4 + Math.random() * 1.2;
      }

      shootingStarData.forEach((d, i) => {
        if (!d.active) return;
        d.t += dt;
        const prog = Math.min(d.t / d.duration, 1);
        const fade = Math.sin(Math.PI * prog);
        const mat = shootingStars[i].material as THREE.LineBasicMaterial;
        mat.opacity = fade * 0.9;
        const head = d.from.clone().addScaledVector(d.dir, prog * d.speed);
        const tail = head.clone().addScaledVector(d.dir, -d.length * fade);
        const posArr = (shootingStars[i].geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
        tail.toArray(posArr, 0);
        head.toArray(posArr, 3);
        (shootingStars[i].geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        if (prog >= 1) { d.active = false; mat.opacity = 0; }
      });

      // ── Nav dots & overlay ──
      const displaySection = frac > 0.5 ? toIdx : fromIdx;
      if (displaySection !== currentDisplaySection) {
        currentDisplaySection = displaySection;
        setActiveNavIndex(displaySection);
      }
      updateOverlay(displaySection, frac > 0.55 || (frac <= 0.55 && displaySection > 0 && frac === 0));
      // Simpler: show overlay when settled at a planet section
      if (frac < 0.15 && sectionIdx > 0) {
        updateOverlay(sectionIdx, true);
      } else if (frac > 0.85) {
        updateOverlay(toIdx, true);
      } else {
        // In transition — hide overlay
        if (overlayRef.current) {
          overlayRef.current.style.opacity = "0";
          overlayRef.current.style.pointerEvents = "none";
        }
      }

      // ── Planet hover raycasting (using group world positions) ──
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      let found = -1, minDist = Infinity;
      planetGroups.forEach((grp, i) => {
        const dist = raycaster.ray.distanceToPoint(grp.position);
        if (dist < scenePlanets[i].size * 1.85 && dist < minDist) { minDist = dist; found = i; }
      });
      if (found !== hoveredPlanet) {
        if (hoveredPlanet >= 0) {
          // Reset surface layer material
          const surfMat = (planetGroups[hoveredPlanet].children[0] as THREE.Points).material as THREE.ShaderMaterial;
          gsap.to(surfMat.uniforms.uSize, { value: 2.0, duration: 0.3 });
          gsap.to(surfMat.uniforms.uOpacity, { value: 0.95, duration: 0.3 });
        }
        hoveredPlanet = found; isOverPlanet = found >= 0;
        if (found >= 0) {
          const surfMat = (planetGroups[found].children[0] as THREE.Points).material as THREE.ShaderMaterial;
          gsap.to(surfMat.uniforms.uSize, { value: 3.4, duration: 0.3 });
          gsap.to(surfMat.uniforms.uOpacity, { value: 1.0, duration: 0.3 });
          if (tooltipRef.current) { tooltipRef.current.textContent = scenePlanets[found].name; tooltipRef.current.style.opacity = "1"; }
        } else {
          if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
        }
      }
      if (tooltipRef.current && found >= 0) {
        tooltipRef.current.style.left = (cursorTargetX + 20) + "px";
        tooltipRef.current.style.top  = (cursorTargetY - 12) + "px";
      }

      // ── Mouse-proximity particle scatter on surface layer ──
      if (hoveredPlanet >= 0) {
        const grp = planetGroups[hoveredPlanet];
        const surfPts = grp.children[0] as THREE.Points;
        const origPos = planetOrigPos[hoveredPlanet];
        const posAttr = surfPts.geometry.getAttribute("position") as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, camera);
        const planeNorm = new THREE.Vector3(0, 1, 0);
        const p2c = camera.position.clone().sub(grp.position);
        const nd = planeNorm.dot(p2c);
        const nDotRay = planeNorm.dot(ray.ray.direction);
        const mw = new THREE.Vector3();
        if (Math.abs(nDotRay) > 0.0001) { const tRay = -nd / nDotRay; ray.ray.at(Math.max(0, tRay), mw); }
        const pr = scenePlanets[hoveredPlanet].size * 3.5;
        for (let i = 0; i < arr.length; i += 3) {
          const wx = grp.position.x + arr[i], wy = grp.position.y + arr[i+1], wz = grp.position.z + arr[i+2];
          const dx = wx - mw.x, dy = wy - mw.y, dz = wz - mw.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist < pr && dist > 0.01) {
            const force = (1 - dist/pr) * 5.0;
            arr[i]   += (dx/dist) * force * 0.08;
            arr[i+1] += (dy/dist) * force * 0.08;
            arr[i+2] += (dz/dist) * force * 0.08;
          } else {
            arr[i]   += (origPos[i]   - arr[i])   * 0.06;
            arr[i+1] += (origPos[i+1] - arr[i+1]) * 0.06;
            arr[i+2] += (origPos[i+2] - arr[i+2]) * 0.06;
          }
        }
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      if (cursorAnimFrame !== undefined) cancelAnimationFrame(cursorAnimFrame);
      document.body.style.cursor = "auto";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchstart", onDocTouchStart);
      document.removeEventListener("touchmove", onDocTouchMove);
      document.removeEventListener("touchend", onDocTouchEnd);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      arrowsFadeTween.scrollTrigger?.kill();
      arrowsFadeTween.kill();
      renderer.dispose();
      if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) return <div style={{ background: "#02020a", minHeight: "100vh" }}><StaticPortfolio /></div>;

  return (
    <div style={{ position: "relative", width: "100vw", background: "#02020a", fontFamily: "'Doto', sans-serif", fontWeight: 600 }}>
      <div ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />

      {/* Scroll sections */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div id="hero" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", pointerEvents: "none" }}>
          <h1 className="hero-name" style={{ fontFamily: "'Doto', sans-serif", fontSize: "88px", fontWeight: 800, color: "rgba(255,255,255,0.93)", letterSpacing: "-0.02em", marginBottom: "0.75rem", textShadow: "0 0 80px rgba(239,159,39,0.25)" }}>
            Dhruv Malviya
          </h1>
          <p className="hero-subtitle" style={{ fontFamily: "'Doto', sans-serif", fontSize: "22px", color: "rgba(255,255,255,0.80)", letterSpacing: "0.08em", marginBottom: "2rem", fontWeight: 700 }}>
            Full-Stack Developer · Graphics Engineer · CS Undergraduate
          </p>
          <div className="hero-links" style={{ display: "flex", gap: "1rem", pointerEvents: "auto" }}>
            <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="hero-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" className="hero-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a href="https://discord.com/users/884316563686166548" target="_blank" rel="noopener noreferrer" className="hero-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369A19.791 19.791 0 0016.394 3.1a13.153 13.153 0 00-.599 1.233 18.27 18.27 0 00-5.59 0A12.859 12.859 0 009.606 3.1a19.736 19.736 0 00-3.925 1.27C3.214 8.1 2.548 11.733 2.88 15.314a19.936 19.936 0 005.993 3.055 14.47 14.47 0 001.284-2.074 12.918 12.918 0 01-2.02-.984c.17-.123.337-.251.5-.384 3.89 1.83 8.106 1.83 11.95 0 .164.133.331.261.5.384-.643.377-1.32.706-2.02.984.37.73.8 1.423 1.284 2.074a19.917 19.917 0 005.996-3.055c.389-4.152-.665-7.753-2.877-10.945zM9.68 13.122c-1.17 0-2.13-1.08-2.13-2.405 0-1.326.942-2.406 2.13-2.406 1.197 0 2.147 1.09 2.13 2.406 0 1.326-.942 2.405-2.13 2.405zm4.64 0c-1.17 0-2.13-1.08-2.13-2.405 0-1.326.942-2.406 2.13-2.406 1.197 0 2.147 1.09 2.13 2.406 0 1.326-.933 2.405-2.13 2.405z"/></svg>
              Discord
            </a>
          </div>
        </div>
        {PLANETS.map(p => <div key={p.section} id={p.section} style={{ height: "100vh" }} />)}
      </div>

      <div className="arrows-wrapper">
        <div className="hero-scroll-arrows"></div>
      </div>

      <div className="swipe-hint">Swipe to explore</div>

      {/* Transparent overlay — no background or blur */}
      <div ref={overlayRef} className="section-overlay" style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10, opacity: 0, pointerEvents: "none",
        width: "min(580px, 88vw)",
        padding: "2rem",
        transition: "opacity 0.5s ease",
      }}>
        <div id="overlay-content" />
      </div>

      {/* Nav dots */}
      <div
        ref={navWrapperRef}
        className="nav-wrapper"
        onMouseEnter={() => { isOverNavUIRef.current = true; }}
        onMouseLeave={() => { isOverNavUIRef.current = false; }}
      >
        <div
          className={`nav-arrow-up ${activeNavIndex === 0 ? "hidden" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            navigateSection(-1);
          }}
          role="button"
          aria-label="Previous section"
          tabIndex={activeNavIndex === 0 ? -1 : 0}
        >
          <div className="arrow-container arrow-up">
            <div className="arrow-head"></div>
            <div className="arrow-shaft"></div>
          </div>
        </div>

        <nav className="nav-dots-container">
          {["hero", ...PLANETS.map(p => p.section)].map((s, i) => (
            <button
              key={s}
              title={i === 0 ? "Home" : PLANETS[i - 1].name}
              className={`nav-dot ${activeNavIndex === i ? "is-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                gsap.to(window, {
                  scrollTo: i * window.innerHeight,
                  duration: 1.2,
                  ease: "power2.inOut",
                });
                setActiveNavIndex(i);
              }}
              aria-label={i === 0 ? "Home" : PLANETS[i - 1].name}
            />
          ))}
        </nav>

        <div
          className={`nav-arrow-down ${activeNavIndex === totalSections - 1 ? "hidden" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            navigateSection(1);
          }}
          role="button"
          aria-label="Next section"
          tabIndex={activeNavIndex === totalSections - 1 ? -1 : 0}
        >
          <div className="arrow-container arrow-down">
            <div className="arrow-shaft"></div>
            <div className="arrow-head"></div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <div ref={tooltipRef} style={{ position: "fixed", zIndex: 30, opacity: 0, pointerEvents: "none", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "7px", padding: "4px 12px", color: "rgba(255,255,255,0.90)", fontFamily: "'Doto', sans-serif", fontSize: "14px", letterSpacing: "0.05em", fontWeight: 700, transition: "opacity 0.2s", whiteSpace: "nowrap" }} />

      {/* Cursor */}
      {!isTouch && (
        <>
          <div ref={cursorRef} className="custom-cursor cursor-dot" style={{ position: "fixed", width: "6px", height: "6px", borderRadius: "50%", background: "#fff", pointerEvents: "none", zIndex: 9999, transform: "translate(-50%,-50%)" }} />
          <div ref={cursorRingRef} className="custom-cursor cursor-glow" style={{ position: "fixed", width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.4)", pointerEvents: "none", zIndex: 9998, transform: "translate(-50%,-50%)", transition: "transform 0.25s ease" }} />
        </>
      )}
    </div>
  );
}

/* ── Section HTML ── */
function getSectionHTML(idx: number): string {
  const sections = [
    `<div class="section-inner">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:1rem;color:#fff;text-shadow:0 0 30px rgba(136,135,128,0.6);">About Me</h2>
      <p style="font-size:1.05rem;line-height:1.85;color:rgba(255,255,255,0.88);">
        CS undergrad at <strong style="color:#EF9F27;">Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE.
        Specializes in full-stack development and scalable architectures.
        Strong in C++ and JavaScript. Actively seeking internship opportunities.
      </p>
      <div style="margin-top:1.5rem;display:flex;gap:0.6rem;flex-wrap:wrap;">
        <span class="tag">Full-Stack Developer</span><span class="tag">Graphics Engineer</span><span class="tag">CS Undergraduate</span>
      </div>
    </div>`,
    `<div class="section-inner">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:1.25rem;color:#fff;text-shadow:0 0 30px rgba(239,159,39,0.5);">Skills</h2>
      <div class="skill-group"><span class="skill-label">Languages</span><div class="tags"><span class="tag">JavaScript</span><span class="tag">C++</span><span class="tag">Python</span><span class="tag">SQL</span><span class="tag">GLSL</span></div></div>
      <div class="skill-group"><span class="skill-label">Frontend</span><div class="tags"><span class="tag">React.js</span><span class="tag">Tailwind CSS</span></div></div>
      <div class="skill-group"><span class="skill-label">Backend</span><div class="tags"><span class="tag">Node.js</span><span class="tag">Express.js</span></div></div>
      <div class="skill-group"><span class="skill-label">Databases</span><div class="tags"><span class="tag">MongoDB</span><span class="tag">MySQL</span></div></div>
      <div class="skill-group"><span class="skill-label">Tools</span><div class="tags"><span class="tag">Git</span><span class="tag">GitHub</span><span class="tag">Docker</span><span class="tag">Postman</span><span class="tag">Linux</span></div></div>
    </div>`,
    `<div class="section-inner">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:0.5rem;color:#fff;text-shadow:0 0 30px rgba(29,158,117,0.5);">Experience</h2>
      <div style="margin-bottom:0.5rem;"><span style="color:#1D9E75;font-weight:700;font-size:1.05rem;">Kalvium Work Integration</span><span style="color:rgba(255,255,255,0.62);margin-left:1rem;font-family:'Doto',sans-serif;font-size:0.78rem;font-weight:700;">Full-Stack Developer · Jan 2026–Present</span></div>
      <ul style="color:rgba(255,255,255,0.85);line-height:2.1;padding-left:1.25rem;"><li>Built a Ledger application using the MERN stack</li><li>Merged code into Kalvium community repository</li><li>Contributor to the S72 Catalyst program</li></ul>
    </div>`,
    `<div class="section-inner">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:0.5rem;color:#fff;text-shadow:0 0 30px rgba(216,90,48,0.5);">Arcane</h2>
      <p style="color:rgba(255,255,255,0.62);margin-bottom:1rem;font-family:'Doto',sans-serif;font-size:0.78rem;font-weight:700;">Property Search Portal · Aug–Oct 2025</p>
      <ul style="color:rgba(255,255,255,0.85);line-height:2.1;padding-left:1.25rem;"><li>Led a team of 4 developers</li><li>React + Node.js + MongoDB stack</li><li>Mock govt DB integration (DORIS/CERSAI)</li><li>Color-coded property verification algorithm</li></ul>
      <div style="margin-top:1rem;padding:0.7rem 1rem;background:rgba(239,159,39,0.08);border:1px solid rgba(239,159,39,0.3);border-radius:8px;color:#EF9F27;font-weight:600;font-size:0.88rem;">🏆 3rd place — 50+ teams, national 24-hour hackathon</div>
    </div>`,
    `<div class="section-inner">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:0.5rem;color:#fff;text-shadow:0 0 30px rgba(127,119,221,0.5);">Solar System Ray Tracer</h2>
      <p style="color:rgba(255,255,255,0.62);margin-bottom:1rem;font-family:'Doto',sans-serif;font-size:0.78rem;font-weight:700;">Jun 2025–Present</p>
      <ul style="color:rgba(255,255,255,0.85);line-height:2.1;padding-left:1.25rem;"><li>Built in C++ with OpenGL, GLM, and custom GLSL shaders</li><li>Decoupled threading for physics &amp; render pipelines</li><li>BVH collision detection optimization</li><li>Dynamic Phong shading model</li></ul>
      <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;"><span class="tag">C++</span><span class="tag">OpenGL</span><span class="tag">GLSL</span><span class="tag">GLM</span></div>
    </div>`,
    `<div class="section-inner">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:1.25rem;color:#fff;text-shadow:0 0 30px rgba(186,117,23,0.5);">Achievements</h2>
      <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:0.8rem;">
        <li style="color:rgba(255,255,255,0.85);">3rd place — National 24-hour hackathon (50+ teams)</li>
        <li style="color:rgba(255,255,255,0.85);">SIH 2025 core developer — AI rockfall prediction (Python)</li>
        <li style="color:rgba(255,255,255,0.85);">IIT Bombay E-Summit — Startup MVP presentation</li>
        <li style="color:rgba(255,255,255,0.85);">Competitive programming enthusiast</li>
        <li style="color:rgba(255,255,255,0.85);">Linux power user (Arch, Fedora)</li>
      </ul>
    </div>`,
    `<div class="section-inner" style="text-align:center;">
      <h2 style="font-size:1.9rem;font-weight:700;margin-bottom:0.75rem;color:#fff;text-shadow:0 0 30px rgba(55,138,221,0.5);">Let's Connect</h2>
      <p style="color:rgba(255,255,255,0.72);font-size:0.95rem;margin-bottom:2rem;font-family:'Doto',sans-serif;font-weight:700;">Open to internships — Let's build something.</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" class="contact-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>GitHub</a>
        <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" class="contact-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</a>
        <a href="https://discord.com/users/884316563686166548" target="_blank" rel="noopener noreferrer" class="contact-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369A19.791 19.791 0 0016.394 3.1a13.153 13.153 0 00-.599 1.233 18.27 18.27 0 00-5.59 0A12.859 12.859 0 009.606 3.1a19.736 19.736 0 00-3.925 1.27C3.214 8.1 2.548 11.733 2.88 15.314a19.936 19.936 0 005.993 3.055 14.47 14.47 0 001.284-2.074 12.918 12.918 0 01-2.02-.984c.17-.123.337-.251.5-.384 3.89 1.83 8.106 1.83 11.95 0 .164.133.331.261.5.384-.643.377-1.32.706-2.02.984.37.73.8 1.423 1.284 2.074a19.917 19.917 0 005.996-3.055c.389-4.152-.665-7.753-2.877-10.945zM9.68 13.122c-1.17 0-2.13-1.08-2.13-2.405 0-1.326.942-2.406 2.13-2.406 1.197 0 2.147 1.09 2.13 2.406 0 1.326-.942 2.405-2.13 2.405zm4.64 0c-1.17 0-2.13-1.08-2.13-2.405 0-1.326.942-2.406 2.13-2.406 1.197 0 2.147 1.09 2.13 2.406 0 1.326-.933 2.405-2.13 2.405z"/></svg>Discord</a>
      </div>
    </div>`,
  ];
  return sections[idx] || "";
}
