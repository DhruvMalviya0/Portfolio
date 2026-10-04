import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Project } from "@/data/projects";
import { ProjectDetailBody } from "./ProjectDetailBody";
import { accentVars } from "./ProjectBits";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 260;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Frosted side panel (desktop) / bottom sheet (mobile). Lazy-loaded. */
export default function ProjectDetailPanel({ project, onClose }: { project: Project; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<"enter" | "open" | "exit">("enter");
  const titleId = `pd-title-${project.slug}`;

  const closingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setState("exit");
    window.setTimeout(onClose, prefersReducedMotion() ? 0 : EXIT_MS);
  }, [onClose]);

  // Enter transition + initial focus.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setState("open"));
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Esc to close, Tab trapped inside the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  // Keep gestures from reaching the page's scroll-driven section navigation.
  useEffect(() => {
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    if (!root || !backdrop) return;
    const stop = (e: Event) => e.stopPropagation();
    const block = (e: Event) => e.preventDefault();
    const events = ["wheel", "touchstart", "touchmove", "touchend"] as const;
    events.forEach(t => root.addEventListener(t, stop, { passive: true }));
    backdrop.addEventListener("wheel", block, { passive: false });
    backdrop.addEventListener("touchmove", block, { passive: false });
    return () => {
      events.forEach(t => root.removeEventListener(t, stop));
      backdrop.removeEventListener("wheel", block);
      backdrop.removeEventListener("touchmove", block);
    };
  }, []);

  return createPortal(
    <div ref={rootRef} className={`project-detail-root is-${state}`} style={accentVars(project.accent)}>
      <div ref={backdropRef} className="pd-backdrop" onClick={requestClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="pd-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button ref={closeBtnRef} type="button" className="pd-close" onClick={requestClose} aria-label="Close project details">
          ✕
        </button>
        <ProjectDetailBody project={project} titleId={titleId} />
      </aside>
    </div>,
    document.body,
  );
}
