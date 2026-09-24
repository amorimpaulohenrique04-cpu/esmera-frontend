import { useEffect, useRef, useState } from "preact/hooks";
import type { HeroSlide } from "../sections/Esmera/Hero.tsx";
import {
  optimizePayloadMediaURL,
  payloadMediaSrcSet,
} from "../components/esmera/ResponsiveMedia.tsx";

export interface Props {
  slides: HeroSlide[];
  autoplay: boolean;
  autoplaySeconds: number;
  overlay: 10 | 20 | 30;
  focalPoint: "left" | "center" | "right";
}

type CarouselPhase = "idle" | "loading" | "transitioning";

const HERO_TRANSITION_FALLBACK_MS = 440;

function prefersReducedMotion(): boolean {
  return Boolean(
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
}

function preferredSlideSource(slide: HeroSlide): string {
  const compact = globalThis.matchMedia?.("(max-width: 767px)").matches;
  const source = compact && slide.mobileImage
    ? slide.mobileImage
    : slide.desktopImage;
  return optimizePayloadMediaURL(source, compact ? 750 : 1800);
}

async function decodeSlide(slide: HeroSlide): Promise<void> {
  if (typeof Image === "undefined") return;
  const image = new Image();
  image.src = preferredSlideSource(slide);

  if (typeof image.decode === "function") {
    try {
      await image.decode();
      return;
    } catch {
      // Some browsers reject decode for cached/cross-origin images even when
      // the resource is usable. Fall back to the normal load/error lifecycle.
    }
  }

  if (image.complete) return;
  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

function SlidePicture(
  { slide, className, priority, onTransitionEnd }: {
    slide: HeroSlide;
    className: string;
    priority: "high" | "low";
    onTransitionEnd?: (event: TransitionEvent) => void;
  },
) {
  return (
    <picture
      class={`esv-hero-picture esv-hero-carousel-media ${className}`}
      onTransitionEnd={onTransitionEnd}
    >
      {slide.mobileImage && (
        <source
          media="(max-width: 767px)"
          srcset={payloadMediaSrcSet(slide.mobileImage, 900)}
          sizes="100vw"
          width="900"
          height="1125"
        />
      )}
      <img
        {...{ fetchPriority: priority }}
        src={optimizePayloadMediaURL(slide.desktopImage, 1800)}
        srcset={payloadMediaSrcSet(slide.desktopImage, 1800)}
        sizes="100vw"
        alt={slide.alt}
        width="1800"
        height="1200"
        loading={priority === "high" ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

function SlideCopy(
  { slide, className, hidden }: {
    slide: HeroSlide;
    className: string;
    hidden: boolean;
  },
) {
  return (
    <div
      class={`esv-shell esv-hero-content esv-hero-carousel-content ${className}`}
      aria-hidden={hidden ? "true" : undefined}
    >
      <h1 class="esv-hero-statement">
        {slide.statement.split(/\n+/).map((line, index) => (
          <span class="esv-hero-line" key={`${line}-${index}`}>{line}</span>
        ))}
      </h1>
      {slide.cta && (
        <a
          class="esv-hero-cta"
          href={slide.cta.href}
          tabIndex={hidden ? -1 : undefined}
        >
          {slide.cta.label}
        </a>
      )}
    </div>
  );
}

export default function HeroCarousel(
  { slides, autoplay, autoplaySeconds, overlay, focalPoint }: Props,
) {
  const [active, setActive] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [phase, setPhase] = useState<CarouselPhase>("idle");
  const [paused, setPaused] = useState(false);
  const transitionToken = useRef(0);
  const transitionFallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionFrame = useRef<number | null>(null);

  const clearTransitionHandles = () => {
    if (transitionFallback.current !== null) {
      globalThis.clearTimeout(transitionFallback.current);
      transitionFallback.current = null;
    }
    if (transitionFrame.current !== null) {
      cancelAnimationFrame(transitionFrame.current);
      transitionFrame.current = null;
    }
  };

  const finishTransition = (target: number) => {
    clearTransitionHandles();
    setActive(target);
    setIncoming(null);
    setPhase("idle");
  };

  const requestSlide = (target: number) => {
    if (slides.length < 2 || target === active || phase !== "idle") return;

    if (prefersReducedMotion()) {
      setActive(target);
      return;
    }

    const token = ++transitionToken.current;
    setPhase("loading");

    void decodeSlide(slides[target]).then(() => {
      if (token !== transitionToken.current) return;
      setIncoming(target);
      transitionFrame.current = requestAnimationFrame(() => {
        transitionFrame.current = null;
        if (token !== transitionToken.current) return;
        setPhase("transitioning");
        transitionFallback.current = globalThis.setTimeout(
          () => finishTransition(target),
          HERO_TRANSITION_FALLBACK_MS,
        );
      });
    });
  };

  useEffect(() => {
    if (
      !autoplay || paused || phase !== "idle" || slides.length < 2 ||
      prefersReducedMotion()
    ) return;
    const timer = globalThis.setInterval(
      () => requestSlide((active + 1) % slides.length),
      autoplaySeconds * 1000,
    );
    return () => globalThis.clearInterval(timer);
  }, [autoplay, paused, autoplaySeconds, slides.length, active, phase]);

  useEffect(() => {
    if (slides.length < 2 || typeof Image === "undefined") return;
    const next = slides[(active + 1) % slides.length];
    const preload = new Image();
    preload.src = preferredSlideSource(next);
  }, [active, slides]);

  useEffect(() => () => {
    transitionToken.current += 1;
    clearTransitionHandles();
  }, []);

  const currentSlide = slides[active];
  const incomingSlide = incoming === null ? null : slides[incoming];
  const transitioning = phase === "transitioning";

  return (
    <>
      <section
        class={`esv-hero esv-hero-carousel is-overlay-${overlay} is-focal-${focalPoint}${
          transitioning ? " is-transitioning" : ""
        }${phase === "loading" ? " is-loading" : ""}`}
        style={{ display: "grid" }}
        aria-roledescription="carousel"
        aria-label="Destaques Esméra"
        aria-busy={phase === "loading" ? "true" : undefined}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocusIn={() => setPaused(true)}
        onFocusOut={() => setPaused(false)}
      >
        <SlidePicture
          slide={currentSlide}
          className="is-current"
          priority={active === 0 ? "high" : "low"}
        />
        {incomingSlide && (
          <SlidePicture
            slide={incomingSlide}
            className="is-incoming"
            priority="low"
            onTransitionEnd={(event) => {
              if (
                phase === "transitioning" &&
                event.propertyName === "opacity" &&
                incoming !== null &&
                event.currentTarget === event.target
              ) {
                finishTransition(incoming);
              }
            }}
          />
        )}

        <div class="esv-hero-overlay" aria-hidden="true" />

        <SlideCopy
          slide={currentSlide}
          className="is-current"
          hidden={incomingSlide !== null}
        />
        {incomingSlide && (
          <SlideCopy
            slide={incomingSlide}
            className="is-incoming"
            hidden={false}
          />
        )}

        <div
          class="esv-hero-carousel-controls"
          aria-label="Controles do carrossel"
        >
          <button
            type="button"
            aria-label="Slide anterior"
            disabled={phase !== "idle"}
            onClick={() =>
              requestSlide((active - 1 + slides.length) % slides.length)}
          >
            ←
          </button>
          <span aria-live="polite">{active + 1} / {slides.length}</span>
          <button
            type="button"
            aria-label="Próximo slide"
            disabled={phase !== "idle"}
            onClick={() => requestSlide((active + 1) % slides.length)}
          >
            →
          </button>
        </div>
      </section>
    </>
  );
}
