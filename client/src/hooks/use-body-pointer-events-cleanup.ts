import { useEffect } from "react";
import { useLocation } from "wouter";

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[data-radix-popper-content-wrapper] [data-state="open"]',
  '[data-state="open"][data-side]',
  '[data-vaul-drawer][data-state="open"]',
].join(",");

function isBodyStuck(): boolean {
  if (typeof document === "undefined") return false;
  const pe = document.body.style.pointerEvents;
  if (pe !== "none") return false;
  return !document.querySelector(OPEN_OVERLAY_SELECTOR);
}

function clearStuckPointerEvents(reason: string) {
  if (!isBodyStuck()) return;
  document.body.style.pointerEvents = "";
  if (typeof window !== "undefined" && (window as any).__POINTER_EVENTS_DEBUG__) {
    // eslint-disable-next-line no-console
    console.warn(`[pointer-events-cleanup] cleared stuck pointer-events:none on body (reason=${reason})`);
  }
}

export function useBodyPointerEventsCleanup() {
  const [location] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => clearStuckPointerEvents("route-change"), 120);
    return () => clearTimeout(t);
  }, [location]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let scheduled = false;
    const checkSoon = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        clearStuckPointerEvents("mutation-observer");
      }, 80);
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (
          m.type === "attributes" &&
          m.attributeName === "style" &&
          document.body.style.pointerEvents === "none"
        ) {
          checkSoon();
          return;
        }
        if (m.type === "childList" && m.removedNodes.length > 0) {
          checkSoon();
          return;
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: false,
    });

    const onPointerUp = () => clearStuckPointerEvents("pointerup");
    window.addEventListener("pointerup", onPointerUp, true);

    const interval = window.setInterval(() => clearStuckPointerEvents("interval"), 2000);

    return () => {
      observer.disconnect();
      window.removeEventListener("pointerup", onPointerUp, true);
      window.clearInterval(interval);
    };
  }, []);
}
