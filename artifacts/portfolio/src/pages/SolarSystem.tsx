import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PLANETS, sectionIndexOf, type SectionKey } from "@/data/planets";
import { SectionContent } from "@/components/sections/SectionContent";
import { ProjectDetailProvider } from "@/components/projects/ProjectDetailContext";
import { DiscordIcon, GitHubIcon, LinkedInIcon } from "@/components/icons";
import { useScrollContainment } from "@/hooks/use-scroll-containment";

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

/** Pointer events over these elements must not hover/click the planets behind them. */
const UI_LAYER_SELECTOR = ".section-overlay, .project-detail-root";
const isOverUILayer = (target: EventTarget | null) =>
  target instanceof Element && target.closest(UI_LAYER_SELECTOR) !== null;

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
  const onDeepLink = useCallback(() => {
    // The 3D view may have started a scroll tween before WebGL failed; stop it.
    gsap.killTweensOf(window);
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  }, []);
  return (
    <ProjectDetailProvider onDeepLink={onDeepLink}>
    <div className="static-portfolio" style={{ fontFamily: "'Doto', sans-serif", color: "#fff", fontWeight: 600 }}>
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", background: "radial-gradient(ellipse at center, rgba(239,159,39,0.08) 0%, #02020a 70%)" }}>
        <h1 className="hero-name" style={{ fontSize: "88px", fontWeight: 800, marginBottom: "1rem", letterSpacing: "-0.02em", color: "rgba(255,255,255,0.93)" }}>Dhruv Malviya</h1>
        <p className="hero-subtitle" style={{ fontFamily: "'Doto', sans-serif", fontSize: "22px", color: "rgba(255,255,255,0.80)", letterSpacing: "0.08em", marginBottom: "2rem", fontWeight: 700 }}>Full-Stack Developer · Graphics Engineer · CS Undergraduate</p>
        <div className="hero-links" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="hero-link">GitHub</a>
          <a href="https://www.linkedin.com/in/dhruv-malviya-02a7b7322/" target="_blank" rel="noopener noreferrer" className="hero-link">LinkedIn</a>
          <a href="https://discord.com/users/884316563686166548" target="_blank" rel="noopener noreferrer" className="hero-link">Discord</a>
        </div>
      </section>
      {PLANETS.map(p => (
        <section key={p.section} id={p.section} className={`static-section static-section--${p.section}`}>
          <SectionContent section={p.section} />
        </section>
      ))}
    </div>
    </ProjectDetailProvider>
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
  const overlayScrollRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  // Planet section shown in the overlay; only updated when it changes, never per frame.
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const isTouch = isTouchDevice();
  const totalSections = PLANETS.length + 1;

  useScrollContainment(overlayScrollRef);

  useEffect(() => {
    overlayScrollRef.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  const scrollToProjects = useCallback(() => {
    const idx = sectionIndexOf("projects");
    gsap.to(window, { scrollTo: idx * window.innerHeight, duration: 1.2, ease: "power2.inOut" });
    setActiveNavIndex(idx);
  }, []);

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

    const isMobile = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
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
    // Add rings to the planets that define one, for visual variety
    scenePlanets.forEach((p, pi) => {
      if (!p.ring) return;
      const ring = createPlanetRing(p.size * p.ring.inner, p.size * p.ring.outer, p.color, ringParticleCount);
      ring.rotation.x = Math.PI * p.ring.tilt;
      planetGroups[pi].add(ring);
    });

    const EXPANDED_SCALE = 3.7;
    const NORMAL_SCALE = 1;
    let expandedPlanetIndex = -1;

    const setActivePlanet = (sectionIndex: number) => {
      if (!isMobile) return;

      const planetIndex = sectionIndex - 1;

      if (expandedPlanetIndex >= 0 && expandedPlanetIndex !== planetIndex) {
        gsap.to(planetGroups[expandedPlanetIndex].scale, {
          x: NORMAL_SCALE,
          y: NORMAL_SCALE,
          z: NORMAL_SCALE,
          duration: 0.9,
          ease: "power2.inOut",
        });
      }

      if (planetIndex >= 0) {
        gsap.to(planetGroups[planetIndex].scale, {
          x: EXPANDED_SCALE,
          y: EXPANDED_SCALE,
          z: EXPANDED_SCALE,
          duration: 1.2,
          ease: "power2.inOut",
        });
        expandedPlanetIndex = planetIndex;
      } else {
        if (expandedPlanetIndex >= 0) {
          gsap.to(planetGroups[expandedPlanetIndex].scale, {
            x: NORMAL_SCALE,
            y: NORMAL_SCALE,
            z: NORMAL_SCALE,
            duration: 0.9,
            ease: "power2.inOut",
          });
        }
        expandedPlanetIndex = -1;
      }
    };

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
      if (isOverUILayer(e.target)) {
        // Section cards and the detail panel sit above the planets: keep the cursor, drop the hover.
        mouse.x = -10;
        mouse.y = -10;
        return;
      }
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      stars.position.x += (mouse.x * 18 - stars.position.x) * 0.04;
      stars.position.y += (mouse.y * 12 - stars.position.y) * 0.04;
    };
    if (!touchDevice) {
      window.addEventListener("mousemove", onMouseMove);
    }

    const onClick = (e: MouseEvent) => {
      if (isOverNavUIRef.current || isClickOnNavUI(e) || isOverUILayer(e.target)) return;
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
      setActivePlanet(nextSection);
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
    let overlayVisible = false;
    if (overlayRef.current) overlayRef.current.inert = true;
    const setOverlayVisible = (visible: boolean) => {
      const el = overlayRef.current;
      if (!el || visible === overlayVisible) return;
      overlayVisible = visible;
      el.style.opacity = visible ? "1" : "0";
      el.style.pointerEvents = visible ? "auto" : "none";
      // Hidden content must not be reachable by Tab or screen readers.
      el.inert = !visible;
    };
    const updateOverlay = (sectionIdx: number, show: boolean) => {
      if (show && sectionIdx !== lastShownSection && sectionIdx > 0) {
        lastShownSection = sectionIdx;
        setActiveSection(PLANETS[sectionIdx - 1].section);
      }
      setOverlayVisible(show && sectionIdx > 0);
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
        setActivePlanet(displaySection);
      }
      // Show overlay when settled at a planet section
      if (frac < 0.15 && sectionIdx > 0) {
        updateOverlay(sectionIdx, true);
      } else if (frac > 0.85) {
        updateOverlay(toIdx, true);
      } else {
        // In transition — hide overlay
        setOverlayVisible(false);
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

    if (isMobile) {
      setActivePlanet(0);
    }

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
    <ProjectDetailProvider onDeepLink={scrollToProjects}>
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
              <GitHubIcon />
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/dhruv-malviya-02a7b7322/" target="_blank" rel="noopener noreferrer" className="hero-link">
              <LinkedInIcon />
              LinkedIn
            </a>
            <a href="https://discord.com/users/884316563686166548" target="_blank" rel="noopener noreferrer" className="hero-link">
              <DiscordIcon />
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

      {/* Transparent overlay — no background or blur; content is rendered by React */}
      <div
        ref={overlayRef}
        className={`section-overlay section-overlay--${activeSection ?? "none"}`}
      >
        <div id="overlay-content" ref={overlayScrollRef} className="overlay-scroll scroll-contain">
          {activeSection && <SectionContent section={activeSection} contained />}
        </div>
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
    </ProjectDetailProvider>
  );
}
