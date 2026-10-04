import { useEffect, type RefObject } from "react";

/**
 * Keeps wheel/touch gestures inside a scrollable element from reaching the
 * document-level section navigation while the element can still scroll in
 * the gesture's direction. At the top/bottom edge the gesture is released, so
 * the next swipe/scroll moves to the neighbouring section as usual.
 */
export function useScrollContainment(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canScroll = (dir: number) =>
      dir > 0
        ? el.scrollTop + el.clientHeight < el.scrollHeight - 1
        : el.scrollTop > 0;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && canScroll(Math.sign(e.deltaY))) e.stopPropagation();
    };

    // Edge state is captured at touchstart: a swipe that *starts* at the
    // bottom releases to the page, one that scrolls *to* the bottom doesn't.
    let startY = 0;
    let atTop = true;
    let atBottom = true;
    const contained = (dy: number) => (dy > 0 ? !atBottom : !atTop);

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      atTop = !canScroll(-1);
      atBottom = !canScroll(1);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (contained(startY - e.touches[0].clientY)) e.stopPropagation();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (contained(startY - e.changedTouches[0].clientY)) e.stopPropagation();
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref]);
}
