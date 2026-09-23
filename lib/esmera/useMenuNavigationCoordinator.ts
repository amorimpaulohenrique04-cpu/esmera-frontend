import { useEffect } from "preact/hooks";
import {
  MENU_NAVIGATION_REQUEST_EVENT,
  type MenuNavigationRequestDetail,
} from "./navigationMotion.ts";

const MENU_SELECTOR = ".esv-nav-v2-desktop, .esv-mega-v2, .esv-nav-v2-drawer";
const ACTIVE_MENU_SURFACE_SELECTOR = ".esv-mega-v2, .esv-nav-v2-backdrop";
const MENU_NAVIGATION_FALLBACK_MS = 240;

function isModifiedActivation(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey ||
    event.shiftKey || event.altKey;
}

function isSameDocumentHash(url: URL): boolean {
  const current = globalThis.location;
  return url.origin === current.origin && url.pathname === current.pathname &&
    url.search === current.search && Boolean(url.hash);
}

function hasActiveMenuSurface(): boolean {
  return Boolean(document.querySelector(ACTIVE_MENU_SURFACE_SELECTOR));
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
    false;
}

/**
 * Navigation handoff belongs to the header interaction surface. Keeping it in
 * the EsmeraHeader island avoids a second global hydration root and bundle.
 */
export function useMenuNavigationCoordinator(): void {
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let navigationPending = false;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedActivation(event)) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !anchor.closest(MENU_SELECTOR)) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      let url: URL;
      try {
        url = new URL(anchor.href, globalThis.location.href);
      } catch {
        return;
      }

      if (url.origin !== globalThis.location.origin) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (isSameDocumentHash(url) || url.href === globalThis.location.href) return;
      if (!hasActiveMenuSurface() || prefersReducedMotion()) return;

      event.preventDefault();
      if (navigationPending) return;
      navigationPending = true;

      let navigated = false;
      const navigate = () => {
        if (navigated) return;
        navigated = true;
        if (fallbackTimer) {
          globalThis.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        globalThis.location.assign(url.href);
      };

      fallbackTimer = globalThis.setTimeout(
        navigate,
        MENU_NAVIGATION_FALLBACK_MS,
      );

      document.dispatchEvent(
        new CustomEvent(MENU_NAVIGATION_REQUEST_EVENT, {
          detail: { navigate } satisfies MenuNavigationRequestDetail,
        }),
      );
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (fallbackTimer) globalThis.clearTimeout(fallbackTimer);
    };
  }, []);
}
