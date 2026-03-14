import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

const PLANETS = [
  { name: "About",        color: 0x888780, radius: 64,  size: 10, speed: 0.00045, section: "about"        },
  { name: "Skills",       color: 0xEF9F27, radius: 104, size: 12, speed: 0.00032, section: "skills"       },
  { name: "Experience",   color: 0x1D9E75, radius: 148, size: 13, speed: 0.00024, section: "experience"   },
  { name: "Arcane",       color: 0xD85A30, radius: 192, size: 14, speed: 0.00018, section: "arcane"       },
  { name: "Ray Tracer",   color: 0x7F77DD, radius: 238, size: 15, speed: 0.00013, section: "raytracer"    },
  { name: "Achievements", color: 0xBA7517, radius: 280, size: 18, speed: 0.00009, section: "achievements" },
  { name: "Contact",      color: 0x378ADD, radius: 318, size: 13, speed: 0.00006, section: "contact"      }
];

// Custom vertex shader: round + size-attenuated points
const VERT = `
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

// Custom fragment shader: circular soft-edged glowing points
const FRAG = `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float alpha = (core * 0.9 + glow * 0.55) * uOpacity;
    vec3 col = uColor + vec3(core * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Stars shader - tiny round twinkling stars
const STAR_FRAG = `
  uniform float uTime;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(vec3(1.0), glow * 0.75);
  }
`;

const STAR_VERT = `
  uniform float uTime;
  attribute float aTwinkle;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float t = 1.0 + sin(uTime * 1.8 + aTwinkle * 6.28) * 0.35;
    gl_PointSize = 2.0 * t * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

function createGlowMaterial(color: THREE.Color, size: number, opacity = 0.95): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: size },
      uColor: { value: color },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function createParticleSphere(count: number, radius: number, color: number, glowSize = 1.4): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const aScale = new Float32Array(count);
  const aPulse = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const rr = radius * (0.82 + Math.random() * 0.36);
    positions[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = rr * Math.cos(phi);
    aScale[i] = 0.4 + Math.random() * 0.9;
    aPulse[i] = Math.random() < 0.15 ? Math.random() : 0;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
  geometry.setAttribute("aPulse", new THREE.BufferAttribute(aPulse, 1));

  const col = new THREE.Color(color);
  const mat = createGlowMaterial(col, glowSize);
  return new THREE.Points(geometry, mat);
}

function createStars(): THREE.Points {
  const count = 8000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const aTwinkle = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    // Mix of near/far stars for depth
    const r = 400 + Math.random() * 700;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    aTwinkle[i] = Math.random();
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(aTwinkle, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, mat);
}

function createOrbitRing(radius: number): THREE.Points {
  const count = 600;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const aScale = new Float32Array(count);
  const aPulse = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    positions[i * 3] = radius * Math.cos(angle);
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 2] = radius * Math.sin(angle);
    aScale[i] = 0.3 + Math.random() * 0.4;
    aPulse[i] = 0;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
  geometry.setAttribute("aPulse", new THREE.BufferAttribute(aPulse, 1));

  const mat = createGlowMaterial(new THREE.Color(0xffffff), 0.5, 0.09);
  return new THREE.Points(geometry, mat);
}

/* ─── Static fallback (no WebGL) ─── */
function StaticPortfolio() {
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: "#fff", padding: "0" }}>
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "2rem",
        background: "radial-gradient(ellipse at center, rgba(239,159,39,0.08) 0%, #02020a 70%)"
      }}>
        <h1 style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", fontWeight: 800, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
          Dhruv Malviya
        </h1>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "clamp(0.8rem,1.8vw,1.1rem)", color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", marginBottom: "2rem" }}>
          Full-Stack Developer · Graphics Engineer · CS Undergraduate
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="hero-link">GitHub</a>
          <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" className="hero-link">LinkedIn</a>
        </div>
      </section>
      <section style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem", color: "#EF9F27" }}>About</h2>
        <p style={{ fontSize: "1.15rem", lineHeight: "1.9", color: "rgba(255,255,255,0.8)" }}>
          CS undergrad at <strong>Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE.
          Specializes in full-stack development and scalable architectures. Strong in C++ and JavaScript.
          Actively seeking internship opportunities.
        </p>
      </section>
      <section style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem", color: "#EF9F27" }}>Skills</h2>
        {[
          { label: "Languages", tags: ["JavaScript", "C++", "Python", "SQL", "GLSL"] },
          { label: "Frontend", tags: ["React.js", "Tailwind CSS"] },
          { label: "Backend", tags: ["Node.js", "Express.js"] },
          { label: "Databases", tags: ["MongoDB", "MySQL"] },
          { label: "Tools", tags: ["Git", "GitHub", "Docker", "Postman", "Linux"] },
        ].map(g => (
          <div key={g.label} className="skill-group">
            <span className="skill-label">{g.label}</span>
            <div className="tags">{g.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
          </div>
        ))}
      </section>
      <section style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem", color: "#EF9F27" }}>Experience</h2>
        <div style={{ borderLeft: "2px solid rgba(29,158,117,0.5)", paddingLeft: "1.5rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#1D9E75" }}>Kalvium Work Integration</h3>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "0.75rem", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>Full-Stack Developer · Jan 2026–Present</p>
          <ul style={{ color: "rgba(255,255,255,0.8)", lineHeight: "2", paddingLeft: "1.25rem" }}>
            <li>Built a Ledger application using the MERN stack</li>
            <li>Merged code into Kalvium community repository</li>
            <li>Contributor to the S72 Catalyst program</li>
          </ul>
        </div>
      </section>
      <section style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem", color: "#EF9F27" }}>Projects</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ background: "rgba(216,90,48,0.08)", border: "1px solid rgba(216,90,48,0.2)", borderRadius: "12px", padding: "1.5rem" }}>
            <h3 style={{ color: "#D85A30", fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>Arcane — Property Search Portal</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "0.75rem", fontSize: "0.85rem" }}>Aug–Oct 2025</p>
            <ul style={{ color: "rgba(255,255,255,0.8)", lineHeight: "2", paddingLeft: "1.25rem" }}>
              <li>Led a 4-person team · React + Node.js + MongoDB</li>
              <li>Mock govt DB integration (DORIS/CERSAI)</li>
              <li>Color-coded property verification algorithm</li>
            </ul>
            <div style={{ marginTop: "1rem", background: "rgba(239,159,39,0.1)", border: "1px solid rgba(239,159,39,0.3)", borderRadius: "8px", padding: "0.6rem 1rem", color: "#EF9F27", fontWeight: 600 }}>
              🏆 3rd place — 50+ teams, national 24-hour hackathon
            </div>
          </div>
          <div style={{ background: "rgba(127,119,221,0.08)", border: "1px solid rgba(127,119,221,0.2)", borderRadius: "12px", padding: "1.5rem" }}>
            <h3 style={{ color: "#7F77DD", fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>Solar System Ray Tracer</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "0.75rem", fontSize: "0.85rem" }}>Jun 2025–Present</p>
            <ul style={{ color: "rgba(255,255,255,0.8)", lineHeight: "2", paddingLeft: "1.25rem" }}>
              <li>C++ · OpenGL · GLM · custom GLSL shaders</li>
              <li>Decoupled threading for physics &amp; render pipelines</li>
              <li>BVH collision detection · Dynamic Phong shading</li>
            </ul>
          </div>
        </div>
      </section>
      <section style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem", color: "#EF9F27" }}>Achievements</h2>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {[
            { icon: "🏆", text: "3rd place — National 24-hour hackathon (50+ teams)" },
            { icon: "🤖", text: "SIH 2025 core developer — AI rockfall prediction (Python)" },
            { icon: "🚀", text: "IIT Bombay E-Summit — Startup MVP presentation" },
            { icon: "💻", text: "Competitive programming enthusiast" },
            { icon: "🐧", text: "Linux power user (Arch, Fedora)" },
          ].map(({ icon, text }) => (
            <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", color: "rgba(255,255,255,0.85)" }}>
              <span style={{ fontSize: "1.25rem" }}>{icon}</span><span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ padding: "5rem 2rem 8rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.75rem" }}>Let's Connect</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem", fontFamily: "'DM Mono',monospace" }}>Open to internships — Let's build something.</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="contact-btn">GitHub</a>
          <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" className="contact-btn">LinkedIn</a>
        </div>
      </section>
    </div>
  );
}

/* ─── Main 3D Component ─── */
export default function SolarSystem() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navDotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- Renderer ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, failIfMajorPerformanceCaveat: false });
    } catch {
      setWebglError(true);
      return;
    }
    if (!renderer.getContext()) {
      setWebglError(true);
      renderer.dispose();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x02020a);
    canvasRef.current.appendChild(renderer.domElement);

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    // Fog adds depth to the star field
    scene.fog = new THREE.FogExp2(0x02020a, 0.00045);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 120, 420);

    // Camera target (what we look at — lerped each frame)
    const camTarget = new THREE.Vector3(0, 0, 0);
    const camTargetDesired = new THREE.Vector3(0, 0, 0);

    // Desired camera position (lerped each frame instead of GSAP)
    const camPosDesired = new THREE.Vector3(0, 120, 420);

    // --- Sun ---
    const sun = createParticleSphere(8000, 22, 0xEF9F27, 2.2);
    scene.add(sun);

    // Sun halo (extra glow layer)
    const sunHalo = createParticleSphere(3000, 26, 0xFFC44D, 1.0);
    (sunHalo.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.18;
    scene.add(sunHalo);

    // --- Stars ---
    const stars = createStars();
    scene.add(stars);

    // --- Planets & Orbits ---
    const planetMeshes: THREE.Points[] = [];
    const planetAngles = PLANETS.map(() => Math.random() * Math.PI * 2);
    let focusedPlanetIdx = -1; // -1 = no planet focused

    PLANETS.forEach((p) => {
      const orbit = createOrbitRing(p.radius);
      scene.add(orbit);

      const mesh = createParticleSphere(2800, p.size, p.color, 1.8);
      mesh.position.set(
        p.radius * Math.cos(planetAngles[PLANETS.indexOf(p)]),
        0,
        p.radius * Math.sin(planetAngles[PLANETS.indexOf(p)])
      );
      scene.add(mesh);
      planetMeshes.push(mesh);
    });

    // --- Interaction state ---
    const mouse = new THREE.Vector2(-10, -10);
    const mouseWorld = new THREE.Vector3();
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let cursorTargetX = cursorX;
    let cursorTargetY = cursorY;
    let hoveredPlanet = -1;
    let isOverPlanet = false;

    const onMouseMove = (e: MouseEvent) => {
      cursorTargetX = e.clientX;
      cursorTargetY = e.clientY;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Gentle star parallax on mouse move
      stars.position.x += (mouse.x * 18 - stars.position.x) * 0.04;
      stars.position.y += (mouse.y * 12 - stars.position.y) * 0.04;
    };
    window.addEventListener("mousemove", onMouseMove);

    // Click to scroll to planet section
    const onClick = () => {
      if (hoveredPlanet >= 0) {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: (hoveredPlanet + 1) * window.innerHeight },
          ease: "power2.inOut"
        });
      }
    };
    window.addEventListener("click", onClick);

    // --- Scroll → section ---
    let currentSection = -1;
    const scrollSections = ["hero", ...PLANETS.map(p => p.section)];

    const updateNavDots = (idx: number) => {
      navDotsRef.current.forEach((dot, i) => {
        if (!dot) return;
        dot.style.backgroundColor = i === idx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)";
        dot.style.transform = i === idx ? "scale(1.5)" : "scale(1)";
      });
    };

    const updateActiveSection = (idx: number) => {
      if (idx === currentSection) return;
      currentSection = idx;
      updateNavDots(idx);
      focusedPlanetIdx = idx - 1; // -1 when hero

      if (idx === 0) {
        // Overview
        camPosDesired.set(0, 120, 420);
        camTargetDesired.set(0, 0, 0);
        if (overlayRef.current) {
          gsap.to(overlayRef.current, { opacity: 0, duration: 0.4, onComplete: () => {
            if (overlayRef.current) overlayRef.current.style.pointerEvents = "none";
          }});
        }
      } else {
        // Focus on planet — camera will track it in the loop
        const pd = PLANETS[idx - 1];
        const planet = planetMeshes[idx - 1];
        // Set initial desired position (will be updated live)
        camPosDesired.set(
          planet.position.x * 0.55,
          planet.position.y + 20,
          planet.position.z + pd.size * 5.5
        );
        camTargetDesired.copy(planet.position);

        if (overlayRef.current) {
          const overlayContent = document.getElementById("overlay-content");
          if (overlayContent) overlayContent.innerHTML = getSectionHTML(idx - 1);
          overlayRef.current.style.pointerEvents = "auto";
          gsap.to(overlayRef.current, { opacity: 1, duration: 0.9, delay: 0.6 });
        }
      }
    };

    const onScroll = () => {
      const idx = Math.round(window.scrollY / window.innerHeight);
      updateActiveSection(Math.max(0, Math.min(scrollSections.length - 1, idx)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // --- Interactive particle scatter on mouse proximity ---
    // We'll store original positions per planet for the push effect
    const planetOrigPos: Float32Array[] = planetMeshes.map(mesh => {
      const attr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      return new Float32Array(attr.array);
    });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Update shader time uniforms
      const mats = [
        sun.material, sunHalo.material, stars.material,
        ...planetMeshes.map(m => m.material),
      ] as THREE.ShaderMaterial[];
      mats.forEach(m => { if (m.uniforms?.uTime) m.uniforms.uTime.value = t; });

      // Sun pulse & rotation
      const s = 1 + Math.sin(t * 1.4) * 0.035;
      sun.scale.setScalar(s);
      sunHalo.scale.setScalar(s * 1.05);
      sun.rotation.y += 0.0015;
      sunHalo.rotation.y -= 0.001;

      // Orbit planets — slow/pause when focused on that planet
      PLANETS.forEach((p, i) => {
        const isFocused = focusedPlanetIdx === i;
        const speedMult = isFocused ? 0.0 : 1.0;
        planetAngles[i] += p.speed * speedMult;
        planetMeshes[i].position.x = p.radius * Math.cos(planetAngles[i]);
        planetMeshes[i].position.z = p.radius * Math.sin(planetAngles[i]);
        planetMeshes[i].rotation.y += isFocused ? 0.001 : 0.002;
      });

      // Live camera tracking: update desired pos each frame to follow focused planet
      if (focusedPlanetIdx >= 0) {
        const planet = planetMeshes[focusedPlanetIdx];
        const pd = PLANETS[focusedPlanetIdx];
        camPosDesired.set(
          planet.position.x * 0.55,
          planet.position.y + 20,
          planet.position.z + pd.size * 5.5
        );
        camTargetDesired.copy(planet.position);
      }

      // Lerp camera to desired position
      camera.position.lerp(camPosDesired, 0.035);
      camTarget.lerp(camTargetDesired, 0.05);
      camera.lookAt(camTarget);

      // --- Mouse-proximity particle scatter on hovered planet ---
      if (hoveredPlanet >= 0) {
        const mesh = planetMeshes[hoveredPlanet];
        const origPos = planetOrigPos[hoveredPlanet];
        const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        // Unproject mouse to a ray at the planet's depth
        const raycaster2 = new THREE.Raycaster();
        raycaster2.setFromCamera(mouse, camera);
        const planeNorm = new THREE.Vector3(0, 1, 0);
        const planet = mesh.position.clone();
        const d = planeNorm.dot(camera.position.clone().sub(planet));
        const nDotRay = planeNorm.dot(raycaster2.ray.direction);
        if (Math.abs(nDotRay) > 0.0001) {
          const tRay = -d / nDotRay;
          mouseWorld.copy(raycaster2.ray.at(Math.max(0, tRay), new THREE.Vector3()));
        }

        // Push particles near mouse
        for (let i = 0; i < arr.length; i += 3) {
          const wx = mesh.position.x + arr[i];
          const wy = mesh.position.y + arr[i + 1];
          const wz = mesh.position.z + arr[i + 2];
          const dx = wx - mouseWorld.x;
          const dy = wy - mouseWorld.y;
          const dz = wz - mouseWorld.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const pushRadius = PLANETS[hoveredPlanet].size * 3.5;

          if (dist < pushRadius && dist > 0.01) {
            const force = (1 - dist / pushRadius) * 5.0;
            arr[i] += (dx / dist) * force * 0.08;
            arr[i + 1] += (dy / dist) * force * 0.08;
            arr[i + 2] += (dz / dist) * force * 0.08;
          } else {
            // Spring back to original
            arr[i] += (origPos[i] - arr[i]) * 0.06;
            arr[i + 1] += (origPos[i + 1] - arr[i + 1]) * 0.06;
            arr[i + 2] += (origPos[i + 2] - arr[i + 2]) * 0.06;
          }
        }
        posAttr.needsUpdate = true;
      } else {
        // Restore any planets that were disturbed
        planetMeshes.forEach((mesh, mi) => {
          const origPos = planetOrigPos[mi];
          const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          let anyChanged = false;
          for (let i = 0; i < arr.length; i += 3) {
            const diff = Math.abs(arr[i] - origPos[i]) + Math.abs(arr[i+1] - origPos[i+1]) + Math.abs(arr[i+2] - origPos[i+2]);
            if (diff > 0.001) {
              arr[i] += (origPos[i] - arr[i]) * 0.04;
              arr[i + 1] += (origPos[i + 1] - arr[i + 1]) * 0.04;
              arr[i + 2] += (origPos[i + 2] - arr[i + 2]) * 0.04;
              anyChanged = true;
            }
          }
          if (anyChanged) posAttr.needsUpdate = true;
        });
      }

      // Cursor lerp
      cursorX += (cursorTargetX - cursorX) * 0.14;
      cursorY += (cursorTargetY - cursorY) * 0.14;
      if (cursorRef.current) {
        cursorRef.current.style.left = cursorX + "px";
        cursorRef.current.style.top = cursorY + "px";
      }
      if (cursorRingRef.current) {
        const ringX = cursorX + (cursorTargetX - cursorX) * 0.5;
        const ringY = cursorY + (cursorTargetY - cursorY) * 0.5;
        cursorRingRef.current.style.left = ringX + "px";
        cursorRingRef.current.style.top = ringY + "px";
        cursorRingRef.current.style.transform = isOverPlanet
          ? "translate(-50%,-50%) scale(2.5)"
          : "translate(-50%,-50%) scale(1)";
      }

      // Raycasting hover (distance-based, cheaper)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      let found = -1;
      let minDist = Infinity;

      planetMeshes.forEach((mesh, i) => {
        const dist = raycaster.ray.distanceToPoint(mesh.position);
        if (dist < PLANETS[i].size * 1.8 && dist < minDist) {
          minDist = dist;
          found = i;
        }
      });

      if (found !== hoveredPlanet) {
        if (hoveredPlanet >= 0) {
          const mat = planetMeshes[hoveredPlanet].material as THREE.ShaderMaterial;
          gsap.to(mat.uniforms.uSize, { value: 1.8, duration: 0.3 });
          gsap.to(mat.uniforms.uOpacity, { value: 0.95, duration: 0.3 });
        }
        hoveredPlanet = found;
        isOverPlanet = found >= 0;
        if (found >= 0) {
          const mat = planetMeshes[found].material as THREE.ShaderMaterial;
          gsap.to(mat.uniforms.uSize, { value: 3.2, duration: 0.3 });
          gsap.to(mat.uniforms.uOpacity, { value: 1.0, duration: 0.3 });
          if (tooltipRef.current) {
            tooltipRef.current.textContent = PLANETS[found].name;
            tooltipRef.current.style.opacity = "1";
          }
        } else {
          if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
        }
      }

      if (tooltipRef.current && found >= 0) {
        tooltipRef.current.style.left = (cursorTargetX + 20) + "px";
        tooltipRef.current.style.top = (cursorTargetY - 12) + "px";
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Resize ---
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const getSectionHTML = (idx: number): string => {
    const sections = [
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;color:#fff;">About Me</h2>
        <p style="font-size:1.05rem;line-height:1.85;color:rgba(255,255,255,0.82);">
          CS undergrad at <strong style="color:#EF9F27;">Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE.
          Specializes in full-stack development and scalable architectures.
          Strong in C++ and JavaScript. Actively seeking internship opportunities.
        </p>
        <div style="margin-top:1.5rem;display:flex;gap:0.6rem;flex-wrap:wrap;">
          <span class="tag">Full-Stack Developer</span>
          <span class="tag">Graphics Engineer</span>
          <span class="tag">CS Undergraduate</span>
        </div>
      </div>`,
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:1.25rem;color:#fff;">Skills</h2>
        <div class="skill-group"><span class="skill-label">Languages</span>
          <div class="tags"><span class="tag">JavaScript</span><span class="tag">C++</span><span class="tag">Python</span><span class="tag">SQL</span><span class="tag">GLSL</span></div>
        </div>
        <div class="skill-group"><span class="skill-label">Frontend</span>
          <div class="tags"><span class="tag">React.js</span><span class="tag">Tailwind CSS</span></div>
        </div>
        <div class="skill-group"><span class="skill-label">Backend</span>
          <div class="tags"><span class="tag">Node.js</span><span class="tag">Express.js</span></div>
        </div>
        <div class="skill-group"><span class="skill-label">Databases</span>
          <div class="tags"><span class="tag">MongoDB</span><span class="tag">MySQL</span></div>
        </div>
        <div class="skill-group"><span class="skill-label">Tools</span>
          <div class="tags"><span class="tag">Git</span><span class="tag">GitHub</span><span class="tag">Docker</span><span class="tag">Postman</span><span class="tag">Linux</span></div>
        </div>
      </div>`,
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;">Experience</h2>
        <div style="margin-bottom:0.5rem;">
          <span style="color:#1D9E75;font-weight:600;font-size:1.1rem;">Kalvium Work Integration</span>
          <span style="color:rgba(255,255,255,0.45);margin-left:1rem;font-family:'DM Mono',monospace;font-size:0.8rem;">Full-Stack Developer · Jan 2026–Present</span>
        </div>
        <ul style="color:rgba(255,255,255,0.82);line-height:2.1;padding-left:1.25rem;">
          <li>Built a Ledger application using the MERN stack</li>
          <li>Merged code into Kalvium community repository</li>
          <li>Contributor to the S72 Catalyst program</li>
        </ul>
      </div>`,
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;">Arcane</h2>
        <p style="color:rgba(255,255,255,0.5);margin-bottom:1rem;font-family:'DM Mono',monospace;font-size:0.8rem;">Property Search Portal · Aug–Oct 2025</p>
        <ul style="color:rgba(255,255,255,0.82);line-height:2.1;padding-left:1.25rem;">
          <li>Led a team of 4 developers</li>
          <li>React + Node.js + MongoDB stack</li>
          <li>Mock govt DB integration (DORIS/CERSAI)</li>
          <li>Color-coded property verification algorithm</li>
        </ul>
        <div style="margin-top:1rem;padding:0.7rem 1rem;background:rgba(239,159,39,0.12);border:1px solid rgba(239,159,39,0.35);border-radius:8px;color:#EF9F27;font-weight:600;font-size:0.9rem;">
          🏆 3rd place — 50+ teams, national 24-hour hackathon
        </div>
      </div>`,
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;">Solar System Ray Tracer</h2>
        <p style="color:rgba(255,255,255,0.5);margin-bottom:1rem;font-family:'DM Mono',monospace;font-size:0.8rem;">Jun 2025–Present</p>
        <ul style="color:rgba(255,255,255,0.82);line-height:2.1;padding-left:1.25rem;">
          <li>Built in C++ with OpenGL, GLM, and custom GLSL shaders</li>
          <li>Decoupled threading for physics &amp; render pipelines</li>
          <li>BVH collision detection optimization</li>
          <li>Dynamic Phong shading model</li>
        </ul>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <span class="tag">C++</span><span class="tag">OpenGL</span><span class="tag">GLSL</span><span class="tag">GLM</span>
        </div>
      </div>`,
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:1.25rem;color:#fff;">Achievements</h2>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:0.8rem;">
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="font-size:1.2rem;">🏆</span><span style="color:rgba(255,255,255,0.82);">3rd place — National 24-hour hackathon (50+ teams)</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="font-size:1.2rem;">🤖</span><span style="color:rgba(255,255,255,0.82);">SIH 2025 core developer — AI rockfall prediction (Python)</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="font-size:1.2rem;">🚀</span><span style="color:rgba(255,255,255,0.82);">IIT Bombay E-Summit — Startup MVP presentation</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="font-size:1.2rem;">💻</span><span style="color:rgba(255,255,255,0.82);">Competitive programming enthusiast</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="font-size:1.2rem;">🐧</span><span style="color:rgba(255,255,255,0.82);">Linux power user (Arch, Fedora)</span></li>
        </ul>
      </div>`,
      `<div class="section-inner" style="text-align:center;">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.75rem;color:#fff;">Let's Connect</h2>
        <p style="color:rgba(255,255,255,0.6);font-size:1rem;margin-bottom:2rem;font-family:'DM Mono',monospace;">Open to internships — Let's build something.</p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
          <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" class="contact-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" class="contact-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.063 2.063 0 1.139-.925 2.065-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </a>
        </div>
      </div>`,
    ];
    return sections[idx] || "";
  };

  if (webglError) {
    return (
      <div style={{ background: "#02020a", minHeight: "100vh", flexDirection: "column", overflowX: "hidden" }}>
        <StaticPortfolio />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", background: "#02020a" }}>
      {/* Canvas */}
      <div ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />

      {/* Scroll sections */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <div id="hero" style={{
          height: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column",
          textAlign: "center", pointerEvents: "none",
        }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 800, color: "#fff",
            letterSpacing: "-0.02em", marginBottom: "0.75rem",
            textShadow: "0 0 80px rgba(239,159,39,0.25)",
          }}>Dhruv Malviya</h1>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "clamp(0.75rem, 1.6vw, 1rem)",
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.08em", marginBottom: "2rem",
          }}>Full-Stack Developer · Graphics Engineer · CS Undergraduate</p>
          <div style={{ display: "flex", gap: "1rem", pointerEvents: "auto" }}>
            <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" className="hero-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" className="hero-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
          </div>
          {/* Scroll hint */}
          <div style={{ position: "absolute", bottom: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", letterSpacing: "0.15em" }}>SCROLL</span>
            <div style={{ width: "1px", height: "36px", background: "linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)" }} />
          </div>
        </div>
        {/* Planet sections (invisible spacers) */}
        {PLANETS.map(p => (
          <div key={p.section} id={p.section} style={{ height: "100vh" }} />
        ))}
      </div>

      {/* Section content overlay */}
      <div ref={overlayRef} style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10, opacity: 0, pointerEvents: "none",
        width: "min(580px, 88vw)",
        backdropFilter: "blur(14px)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "18px", padding: "2.5rem",
      }}>
        <div id="overlay-content" />
      </div>

      {/* Side nav dots */}
      <nav style={{
        position: "fixed", right: "22px", top: "50%",
        transform: "translateY(-50%)", zIndex: 20,
        display: "flex", flexDirection: "column", gap: "10px",
      }}>
        {["hero", ...PLANETS.map(p => p.section)].map((s, i) => (
          <button key={s} ref={el => { navDotsRef.current[i] = el; }}
            title={i === 0 ? "Home" : PLANETS[i - 1].name}
            onClick={() => gsap.to(window, { duration: 1.2, scrollTo: { y: i * window.innerHeight }, ease: "power2.inOut" })}
            style={{
              width: "7px", height: "7px", borderRadius: "50%",
              border: "none", cursor: "pointer", padding: 0,
              backgroundColor: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
              transform: i === 0 ? "scale(1.5)" : "scale(1)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </nav>

      {/* Tooltip */}
      <div ref={tooltipRef} style={{
        position: "fixed", zIndex: 30, opacity: 0, pointerEvents: "none",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: "7px",
        padding: "4px 12px", color: "rgba(255,255,255,0.9)",
        fontFamily: "'DM Mono', monospace", fontSize: "0.78rem",
        letterSpacing: "0.05em", transition: "opacity 0.2s", whiteSpace: "nowrap",
      }} />

      {/* Custom cursor */}
      <div ref={cursorRef} style={{
        position: "fixed", width: "6px", height: "6px", borderRadius: "50%",
        background: "#fff", pointerEvents: "none", zIndex: 9999,
        transform: "translate(-50%,-50%)",
      }} />
      {/* Cursor ring */}
      <div ref={cursorRingRef} style={{
        position: "fixed", width: "28px", height: "28px", borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.45)",
        pointerEvents: "none", zIndex: 9998,
        transform: "translate(-50%,-50%)",
        transition: "transform 0.25s ease, border-color 0.25s ease",
      }} />
    </div>
  );
}
