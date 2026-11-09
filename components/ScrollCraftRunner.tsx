"use client";

import { useEffect } from "react";

interface ScrollCraftInstance {
  layout: () => void;
  read: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    ScrollCraft?: {
      mount: (
        root?: Document | Element | string,
        opts?: Record<string, unknown>
      ) => ScrollCraftInstance;
      reduce: boolean;
      instances: ScrollCraftInstance[];
    };
  }
}

export default function ScrollCraftRunner({
  rootId = "tc-showcase-root",
}: {
  rootId?: string;
}) {
  useEffect(() => {
    let instance: ScrollCraftInstance | null = null;
    let cancelled = false;
    let scriptEl: HTMLScriptElement | null = null;
    let relayoutRaf = 0;
    let ro: ResizeObserver | null = null;

    const scheduleLayout = () => {
      if (cancelled || !instance) return;
      if (relayoutRaf) return;
      relayoutRaf = requestAnimationFrame(() => {
        relayoutRaf = 0;
        if (!cancelled && instance) {
          instance.layout();
          instance.read();
        }
      });
    };

    const mountNow = () => {
      if (cancelled || !window.ScrollCraft) return;
      const rootEl = document.getElementById(rootId) || document;
      instance = window.ScrollCraft.mount(rootEl);

      // Dynamic sections (e.g. TrackingLookup results) change flow height after
      // mount(). Recompute act offsets whenever root/flow bounds change so
      // subsequent pinned & horizontal-pan acts keep accurate scroll anchors.
      if ("ResizeObserver" in window) {
        let lastHeight =
          rootEl instanceof HTMLElement
            ? rootEl.scrollHeight
            : document.documentElement.scrollHeight;
        ro = new ResizeObserver(() => {
          const nextHeight =
            rootEl instanceof HTMLElement
              ? rootEl.scrollHeight
              : document.documentElement.scrollHeight;
          if (Math.abs(nextHeight - lastHeight) >= 4) {
            lastHeight = nextHeight;
            scheduleLayout();
          }
        });
        if (rootEl instanceof Element) {
          ro.observe(rootEl);
        }
        rootEl.querySelectorAll('[data-sc-act="flow"]').forEach((sec) => {
          ro?.observe(sec);
        });
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          scheduleLayout();
        });
      }
    };

    // Ensure keyboard Tab into any pinned or panning act parks scroll cleanly
    // where the focused control and its cue are both visible on screen.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const rootEl = document.getElementById(rootId) || document;
      const actEl = target.closest("[data-sc-act]") as HTMLElement | null;
      if (!actEl || !rootEl.contains(actEl)) return;

      const device = actEl.getAttribute("data-sc-act") || "";
      if (device !== "pin" && device !== "scrub" && device !== "pan") return;

      const rect = target.getBoundingClientRect();
      const cueEl = target.closest("[data-sc-cue]") as HTMLElement | null;
      const cueOpacity = cueEl
        ? parseFloat(getComputedStyle(cueEl).opacity || "1")
        : 1;
      const outHoriz = rect.right < 0 || rect.left > window.innerWidth;
      const hiddenCue = cueOpacity < 0.85;

      if (!outHoriz && !hiddenCue) return;

      const actRect = actEl.getBoundingClientRect();
      const actTop = actRect.top + window.scrollY;
      const travel = Math.max(actEl.offsetHeight - window.innerHeight, 0);

      let targetP = 0.5;
      if (cueEl) {
        const spec = (cueEl.getAttribute("data-sc-cue") || "0")
          .trim()
          .split(/\s+/)
          .map(parseFloat);
        const from = isNaN(spec[0]) ? 0 : spec[0];
        const to = spec.length > 1 && !isNaN(spec[1]) ? spec[1] : null;
        targetP = to === null ? Math.min(0.95, from + 0.35) : (from + to) / 2;
      } else if (device === "pan") {
        targetP = 0.94;
      }

      const targetY = Math.round(actTop + travel * targetP);
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "instant" as ScrollBehavior,
      });
      instance?.read();
    };
    document.addEventListener("focusin", onFocusIn, true);

    const cleanup = () => {
      cancelled = true;
      if (relayoutRaf) cancelAnimationFrame(relayoutRaf);
      ro?.disconnect();
      document.removeEventListener("focusin", onFocusIn, true);
      if (instance) {
        instance.destroy();
        instance = null;
      }
    };

    if (window.ScrollCraft) {
      mountNow();
      return cleanup;
    }

    scriptEl = document.querySelector(
      'script[data-scrollcraft-engine="1"]'
    ) as HTMLScriptElement | null;

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.src = "/vendor/scrollcraft.js";
      scriptEl.async = false;
      scriptEl.setAttribute("data-scrollcraft-engine", "1");
      document.head.appendChild(scriptEl);
    }

    const onLoad = () => mountNow();
    scriptEl.addEventListener("load", onLoad, { once: true });

    return () => {
      scriptEl?.removeEventListener("load", onLoad);
      cleanup();
    };
  }, [rootId]);

  return null;
}
