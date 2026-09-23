import { useEffect } from "preact/hooks";

const REVEAL_SELECTOR = '[data-motion="reveal"], [data-motion="media-reveal"]';

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

    const viewportHeight = globalThis.innerHeight || 800;

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

      // Anything already visible at hydration stays visible. The motion-ready
      // class is only enabled after this pass, so hydration never hides content
      // that the server has already painted above the fold.
      const rect = element.getBoundingClientRect();
      if (rect.top < viewportHeight * .96 && rect.bottom > 0) {
        element.classList.add("is-visible");
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.classList.add("is-visible");
          observer.unobserve(element);
        });
      },
      {
        threshold: .08,
        rootMargin: "0px 0px -4% 0px",
      },
    );

    elements.forEach((element) => {
      if (!element.classList.contains("is-visible")) observer.observe(element);
    });

    const frame = requestAnimationFrame(() => {
      root.classList.add("esv-motion-ready");
    });

    return () => {
      cancelAnimationFrame(frame);
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
