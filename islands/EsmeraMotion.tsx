import { useEffect } from "preact/hooks";

const REVEAL_SELECTOR = '[data-motion="reveal"], [data-motion="media-reveal"]';
const MOTION_READY_FALLBACK_MS = 500;

export default function EsmeraMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in globalThis)) return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );
    if (elements.length === 0) return;

    const revealGroups = new Map<Element, HTMLElement[]>();

    elements.forEach((element) => {
      element.classList.add("esv-reveal");
      if (element.dataset.motion === "media-reveal") {
        element.classList.add("esv-reveal-media");
      }

      const order = Number.parseInt(element.dataset.motionOrder ?? "", 10);
      if (Number.isFinite(order)) {
        element.style.setProperty(
          "--esv-reveal-delay",
          `${Math.min(Math.max(order, 0) * 30, 90)}ms`,
        );
      }

      // Observe the editorial section rather than each transformed figure.
      // Deferred CSS may settle a figure's own box after hydration; the section
      // remains the stable semantic trigger and reveals its children together.
      const trigger = element.closest("section") ?? element;
      const group = revealGroups.get(trigger) ?? [];
      group.push(element);
      revealGroups.set(trigger, group);
    });

    let readyFrame = 0;
    let ready = false;

    const armMotion = () => {
      if (ready) return;
      ready = true;
      readyFrame = requestAnimationFrame(() => {
        root.classList.add("esv-motion-ready");
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const group = revealGroups.get(entry.target) ?? [];
          group.forEach((element) => element.classList.add("is-visible"));
          observer.unobserve(entry.target);
        });

        // IntersectionObserver classifies the initial viewport before CSS may
        // hide non-visible targets. No synchronous geometry read is needed.
        armMotion();
      },
      {
        threshold: 0,
        rootMargin: "0px 0px 12% 0px",
      },
    );

    revealGroups.forEach((_group, trigger) => observer.observe(trigger));
    const fallback = globalThis.setTimeout(
      armMotion,
      MOTION_READY_FALLBACK_MS,
    );

    return () => {
      globalThis.clearTimeout(fallback);
      if (readyFrame) cancelAnimationFrame(readyFrame);
      observer.disconnect();
      root.classList.remove("esv-motion-ready");
      elements.forEach((element) => {
        element.classList.remove(
          "esv-reveal",
          "esv-reveal-media",
          "is-visible",
        );
        element.style.removeProperty("--esv-reveal-delay");
      });
    };
  }, []);

  return null;
}
