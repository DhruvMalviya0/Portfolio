import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { projectBySlug } from "@/data/projects";

const ProjectDetailPanel = lazy(() => import("./ProjectDetailPanel"));

interface ProjectDetailApi {
  open: (slug: string, trigger?: HTMLElement | null) => void;
  close: () => void;
  activeSlug: string | null;
}

const ProjectDetailContext = createContext<ProjectDetailApi | null>(null);

export function useProjectDetail(): ProjectDetailApi {
  const ctx = useContext(ProjectDetailContext);
  if (!ctx) throw new Error("useProjectDetail must be used inside <ProjectDetailProvider>");
  return ctx;
}

const HASH_PREFIX = "#project/";

const slugFromHash = () => {
  const { hash } = window.location;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const slug = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  return projectBySlug(slug) ? slug : null;
};

const setHash = (slug: string | null) => {
  const { pathname, search } = window.location;
  history.replaceState(history.state, "", slug ? `${HASH_PREFIX}${slug}` : `${pathname}${search}`);
};

interface ProviderProps {
  children: ReactNode;
  /** Called when a #project/<slug> link is loaded, so the page can scroll to Projects. */
  onDeepLink?: (slug: string) => void;
}

export function ProjectDetailProvider({ children, onDeepLink }: ProviderProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const deepLinkRef = useRef(onDeepLink);
  deepLinkRef.current = onDeepLink;

  const open = useCallback((slug: string, trigger?: HTMLElement | null) => {
    triggerRef.current = trigger ?? null;
    setActiveSlug(slug);
    setHash(slug);
  }, []);

  const close = useCallback(() => {
    setActiveSlug(null);
    setHash(null);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, []);

  // Deep links: on load and when the hash is edited by hand.
  useEffect(() => {
    const handle = () => {
      const slug = slugFromHash();
      if (!slug) {
        // Hash changed to something that isn't a project: close any open panel.
        setActiveSlug(null);
        return;
      }
      deepLinkRef.current?.(slug);
      triggerRef.current = null;
      setActiveSlug(slug);
    };
    // Let the scroll sections lay out before jumping.
    const raf = requestAnimationFrame(handle);
    window.addEventListener("hashchange", handle);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", handle);
    };
  }, []);

  const api = useMemo(() => ({ open, close, activeSlug }), [open, close, activeSlug]);
  const project = activeSlug ? projectBySlug(activeSlug) : undefined;

  return (
    <ProjectDetailContext.Provider value={api}>
      {children}
      {project && (
        <Suspense fallback={null}>
          <ProjectDetailPanel key={project.slug} project={project} onClose={close} />
        </Suspense>
      )}
    </ProjectDetailContext.Provider>
  );
}
