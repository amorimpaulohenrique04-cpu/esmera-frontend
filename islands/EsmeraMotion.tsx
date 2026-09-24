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
          const element = entry.target as HTMLElement;
          element.classList.add("is-visible");
          observer.unobserve(element);
        });

        // IntersectionObserver classifies the initial viewport before CSS may
        // hide non-visible targets. No synchronous geometry read is needed.
        armMotion();
      },
      {
        threshold: .08,
        rootMargin: "0px 0px -4% 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));
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
