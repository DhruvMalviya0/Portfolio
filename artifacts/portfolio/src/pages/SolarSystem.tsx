import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const PLANETS = [
  { name: "About",        color: 0x888780, radius: 64,  size: 10, speed: 0.0008, section: "about"        },
  { name: "Skills",       color: 0xEF9F27, radius: 104, size: 12, speed: 0.0006, section: "skills"       },
  { name: "Experience",   color: 0x1D9E75, radius: 148, size: 13, speed: 0.0005, section: "experience"   },
  { name: "Arcane",       color: 0xD85A30, radius: 192, size: 14, speed: 0.0004, section: "arcane"       },
  { name: "Ray Tracer",   color: 0x7F77DD, radius: 238, size: 15, speed: 0.0003, section: "raytracer"    },
  { name: "Achievements", color: 0xBA7517, radius: 280, size: 18, speed: 0.0002, section: "achievements" },
  { name: "Contact",      color: 0x378ADD, radius: 318, size: 13, speed: 0.0001, section: "contact"      }
];

function createParticleSphere(count: number, radius: number, color: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const r = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const rr = radius * (0.85 + Math.random() * 0.3);
    positions[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = rr * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = rr * Math.cos(phi);
    colors[i * 3] = r.r;
    colors[i * 3 + 1] = r.g;
    colors[i * 3 + 2] = r.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

function createOrbitRing(radius: number): THREE.Points {
  const count = 500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    positions[i * 3] = radius * Math.cos(angle);
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = radius * Math.sin(angle);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    opacity: 0.08,
  });

  return new THREE.Points(geometry, material);
}

function createStars(): THREE.Points {
  const count = 6000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 800 + Math.random() * 400;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    transparent: true,
    opacity: 0.4,
  });

  return new THREE.Points(geometry, material);
}

function StaticPortfolio() {
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: "#fff", padding: "0" }}>
      {/* Hero */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "2rem", position: "relative",
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

      {/* About */}
      <section style={{ padding: "5rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem", color: "#EF9F27" }}>About</h2>
        <p style={{ fontSize: "1.15rem", lineHeight: "1.9", color: "rgba(255,255,255,0.8)" }}>
          CS undergrad at <strong>Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE.
          Specializes in full-stack development and scalable architectures. Strong in C++ and JavaScript.
          Actively seeking internship opportunities.
        </p>
      </section>

      {/* Skills */}
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

      {/* Experience */}
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

      {/* Projects */}
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

      {/* Achievements */}
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

      {/* Contact */}
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

export default function SolarSystem() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const activeSectionRef = useRef<number>(-1);
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
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 120, 420);
    camera.lookAt(0, 0, 0);

    // --- Sun ---
    const sun = createParticleSphere(8000, 22, 0xEF9F27);
    scene.add(sun);

    // --- Stars ---
    const stars = createStars();
    scene.add(stars);

    // --- Planets & Orbits ---
    const planetMeshes: THREE.Points[] = [];
    const planetAngles = PLANETS.map(() => Math.random() * Math.PI * 2);

    PLANETS.forEach((p) => {
      const orbit = createOrbitRing(p.radius);
      scene.add(orbit);

      const mesh = createParticleSphere(2500, p.size, p.color);
      mesh.position.set(
        p.radius * Math.cos(planetAngles[PLANETS.indexOf(p)]),
        0,
        p.radius * Math.sin(planetAngles[PLANETS.indexOf(p)])
      );
      scene.add(mesh);
      planetMeshes.push(mesh);
    });

    // --- Raycaster & Interaction ---
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 6;
    const mouse = new THREE.Vector2(-10, -10);
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let cursorTargetX = cursorX;
    let cursorTargetY = cursorY;
    let hoveredPlanet = -1;

    const onMouseMove = (e: MouseEvent) => {
      cursorTargetX = e.clientX;
      cursorTargetY = e.clientY;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Star parallax
      stars.position.x = mouse.x * 12;
      stars.position.y = mouse.y * 8;
    };

    window.addEventListener("mousemove", onMouseMove);

    // --- Click handler ---
    const onClick = () => {
      if (hoveredPlanet >= 0) {
        const idx = hoveredPlanet + 1;
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: idx * window.innerHeight },
          ease: "power2.inOut"
        });
      }
    };
    window.addEventListener("click", onClick);

    // --- Scroll & Camera ---
    let currentSection = -1;

    const scrollSections = ["hero", ...PLANETS.map(p => p.section)];

    const updateActiveSection = (idx: number) => {
      if (idx === currentSection) return;
      currentSection = idx;
      activeSectionRef.current = idx;

      navDotsRef.current.forEach((dot, i) => {
        if (dot) {
          dot.style.backgroundColor = i === idx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)";
          dot.style.transform = i === idx ? "scale(1.4)" : "scale(1)";
        }
      });

      if (idx === 0) {
        // Return to overview
        gsap.to(camera.position, {
          x: 0, y: 120, z: 420,
          duration: 1.4,
          ease: "power2.inOut"
        });
        gsap.to(camera.rotation, { x: 0, duration: 1.4, ease: "power2.inOut" });
        if (overlayRef.current) {
          overlayRef.current.style.opacity = "0";
          overlayRef.current.style.pointerEvents = "none";
        }
      } else {
        const planetIdx = idx - 1;
        const planet = planetMeshes[planetIdx];
        const pd = PLANETS[planetIdx];

        gsap.to(camera.position, {
          x: planet.position.x * 0.6,
          y: planet.position.y + 25,
          z: planet.position.z + pd.size * 6,
          duration: 1.4,
          ease: "power2.inOut"
        });

        if (overlayRef.current) {
          const overlayContent = document.getElementById("overlay-content");
          if (overlayContent) {
            overlayContent.innerHTML = getSectionHTML(planetIdx);
          }
          overlayRef.current.style.opacity = "0";
          overlayRef.current.style.pointerEvents = "auto";
          gsap.to(overlayRef.current, { opacity: 1, duration: 0.8, delay: 0.5 });
        }
      }
    };

    const onScroll = () => {
      const scrollY = window.scrollY;
      const sectionHeight = window.innerHeight;
      const idx = Math.round(scrollY / sectionHeight);
      const clamped = Math.max(0, Math.min(scrollSections.length - 1, idx));
      updateActiveSection(clamped);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Sun pulse
      const s = 1 + Math.sin(t * 1.5) * 0.04;
      sun.scale.setScalar(s);

      // Orbit planets
      PLANETS.forEach((p, i) => {
        planetAngles[i] += p.speed;
        planetMeshes[i].position.x = p.radius * Math.cos(planetAngles[i]);
        planetMeshes[i].position.z = p.radius * Math.sin(planetAngles[i]);
        planetMeshes[i].rotation.y += 0.003;
      });

      // Cursor lerp
      cursorX += (cursorTargetX - cursorX) * 0.12;
      cursorY += (cursorTargetY - cursorY) * 0.12;
      if (cursorRef.current) {
        cursorRef.current.style.left = cursorX + "px";
        cursorRef.current.style.top = cursorY + "px";
      }

      // Raycasting hover
      raycaster.setFromCamera(mouse, camera);
      let found = -1;
      let minDist = Infinity;

      planetMeshes.forEach((mesh, i) => {
        const dist = raycaster.ray.distanceToPoint(mesh.position);
        if (dist < PLANETS[i].size * 1.5 && dist < minDist) {
          minDist = dist;
          found = i;
        }
      });

      if (found !== hoveredPlanet) {
        if (hoveredPlanet >= 0) {
          const mat = planetMeshes[hoveredPlanet].material as THREE.PointsMaterial;
          mat.size = 0.6;
          mat.opacity = 0.9;
        }
        hoveredPlanet = found;
        if (found >= 0) {
          const mat = planetMeshes[found].material as THREE.PointsMaterial;
          mat.size = 1.2;
          mat.opacity = 1.0;
          if (tooltipRef.current) {
            tooltipRef.current.textContent = PLANETS[found].name;
            tooltipRef.current.style.opacity = "1";
          }
          document.body.style.cursor = "none";
        } else {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = "0";
          }
        }
      }

      if (tooltipRef.current && found >= 0) {
        tooltipRef.current.style.left = (cursorTargetX + 18) + "px";
        tooltipRef.current.style.top = (cursorTargetY - 10) + "px";
      }

      // Look at origin subtly
      camera.lookAt(0, 0, 0);

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
      // About
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem;color:#fff;">About Me</h2>
        <p style="font-size:1.1rem;line-height:1.8;color:rgba(255,255,255,0.85);">
          CS undergrad at <strong style="color:#EF9F27;">Kalvium / MIT ADT University</strong> (2024–2028), B.Tech CSE.
          Specializes in full-stack development and scalable architectures.
          Strong in C++ and JavaScript. Actively seeking internship opportunities.
        </p>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;flex-wrap:wrap;">
          <span class="tag">Full-Stack Developer</span>
          <span class="tag">Graphics Engineer</span>
          <span class="tag">CS Undergraduate</span>
        </div>
      </div>`,
      // Skills
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
      // Experience
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;">Experience</h2>
        <div style="margin-bottom:0.5rem;">
          <span style="color:#1D9E75;font-weight:600;font-size:1.1rem;">Kalvium Work Integration</span>
          <span style="color:rgba(255,255,255,0.5);margin-left:1rem;">Full-Stack Developer · Jan 2026–Present</span>
        </div>
        <ul style="color:rgba(255,255,255,0.85);line-height:2;padding-left:1.25rem;">
          <li>Built a Ledger application using the MERN stack</li>
          <li>Merged code into Kalvium community repository</li>
          <li>Contributor to the S72 Catalyst program</li>
        </ul>
      </div>`,
      // Arcane
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;">Arcane</h2>
        <p style="color:rgba(255,255,255,0.6);margin-bottom:1rem;">Property Search Portal · Aug–Oct 2025</p>
        <ul style="color:rgba(255,255,255,0.85);line-height:2;padding-left:1.25rem;">
          <li>Led a team of 4 developers</li>
          <li>React + Node.js + MongoDB stack</li>
          <li>Mock govt DB integration (DORIS/CERSAI)</li>
          <li>Color-coded property verification algorithm</li>
        </ul>
        <div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(239,159,39,0.15);border:1px solid rgba(239,159,39,0.4);border-radius:8px;color:#EF9F27;font-weight:600;">
          🏆 3rd place — 50+ teams, national 24-hour hackathon
        </div>
      </div>`,
      // Ray Tracer
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;">Solar System Ray Tracer</h2>
        <p style="color:rgba(255,255,255,0.6);margin-bottom:1rem;">Jun 2025–Present</p>
        <ul style="color:rgba(255,255,255,0.85);line-height:2;padding-left:1.25rem;">
          <li>Built in C++ with OpenGL, GLM, and custom GLSL shaders</li>
          <li>Decoupled threading for physics & render pipelines</li>
          <li>BVH collision detection optimization</li>
          <li>Dynamic Phong shading model</li>
        </ul>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <span class="tag">C++</span><span class="tag">OpenGL</span><span class="tag">GLSL</span><span class="tag">GLM</span>
        </div>
      </div>`,
      // Achievements
      `<div class="section-inner">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:1.25rem;color:#fff;">Achievements</h2>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:0.75rem;">
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="color:#EF9F27;font-size:1.25rem;">🏆</span><span style="color:rgba(255,255,255,0.85);">3rd place — National 24-hour hackathon (50+ teams)</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="color:#EF9F27;font-size:1.25rem;">🤖</span><span style="color:rgba(255,255,255,0.85);">SIH 2025 core developer — AI rockfall prediction (Python)</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="color:#EF9F27;font-size:1.25rem;">🚀</span><span style="color:rgba(255,255,255,0.85);">IIT Bombay E-Summit — Startup MVP presentation</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="color:#EF9F27;font-size:1.25rem;">💻</span><span style="color:rgba(255,255,255,0.85);">Competitive programming enthusiast</span></li>
          <li style="display:flex;align-items:flex-start;gap:0.75rem;"><span style="color:#EF9F27;font-size:1.25rem;">🐧</span><span style="color:rgba(255,255,255,0.85);">Linux power user (Arch, Fedora)</span></li>
        </ul>
      </div>`,
      // Contact
      `<div class="section-inner" style="text-align:center;">
        <h2 style="font-size:2rem;font-weight:700;margin-bottom:0.75rem;color:#fff;">Let's Connect</h2>
        <p style="color:rgba(255,255,255,0.7);font-size:1.1rem;margin-bottom:2rem;">Open to internships — Let's build something.</p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
          <a href="https://github.com/DhruvMalviya0" target="_blank" rel="noopener noreferrer" class="contact-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="https://linkedin.com/in/dhruv-malviya-8a2765294" target="_blank" rel="noopener noreferrer" class="contact-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </a>
        </div>
      </div>`,
    ];
    return sections[idx] || "";
  };

  if (webglError) {
    return (
      <div style={{
        background: "#02020a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}>
        <StaticPortfolio />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", background: "#02020a" }}>
      {/* Canvas container */}
      <div
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
        }}
      />

      {/* Scroll sections */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <div
          id="hero"
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
            marginBottom: "0.75rem",
            textShadow: "0 0 60px rgba(239,159,39,0.3)",
          }}>
            Dhruv Malviya
          </h1>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "clamp(0.8rem, 1.8vw, 1.1rem)",
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.08em",
            marginBottom: "2rem",
          }}>
            Full-Stack Developer · Graphics Engineer · CS Undergraduate
          </p>
          <div style={{ display: "flex", gap: "1rem", pointerEvents: "auto" }}>
            <a
              href="https://github.com/DhruvMalviya0"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/dhruv-malviya-8a2765294"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
          </div>
          <div style={{
            position: "absolute",
            bottom: "2.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            animation: "bounce 2s infinite",
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>SCROLL</span>
            <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)" }} />
          </div>
        </div>

        {/* Planet sections */}
        {PLANETS.map((p) => (
          <div
            key={p.section}
            id={p.section}
            style={{ height: "100vh" }}
          />
        ))}
      </div>

      {/* Frosted glass overlay for section content */}
      <div
        ref={overlayRef}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          opacity: 0,
          pointerEvents: "none",
          width: "min(600px, 90vw)",
          backdropFilter: "blur(12px)",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "2.5rem",
          transition: "opacity 0.4s",
        }}
      >
        <div id="overlay-content" />
      </div>

      {/* Side nav dots */}
      <nav style={{
        position: "fixed",
        right: "24px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {["hero", ...PLANETS.map(p => p.section)].map((s, i) => (
          <button
            key={s}
            ref={(el) => { navDotsRef.current[i] = el; }}
            title={i === 0 ? "Home" : PLANETS[i - 1].name}
            onClick={() => {
              gsap.to(window, {
                duration: 1.2,
                scrollTo: { y: i * window.innerHeight },
                ease: "power2.inOut"
              });
            }}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              border: "none",
              background: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.3s ease",
              transform: i === 0 ? "scale(1.4)" : "scale(1)",
            }}
          />
        ))}
      </nav>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          zIndex: 30,
          opacity: 0,
          pointerEvents: "none",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "6px",
          padding: "4px 12px",
          color: "rgba(255,255,255,0.9)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.8rem",
          letterSpacing: "0.05em",
          transition: "opacity 0.2s",
          whiteSpace: "nowrap",
        }}
      />

      {/* Custom cursor */}
      <div
        ref={cursorRef}
        style={{
          position: "fixed",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate(-50%, -50%)",
          mixBlendMode: "difference",
        }}
      />
    </div>
  );
}
