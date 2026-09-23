import { useEffect } from "preact/hooks";

const MENU_SELECTOR = ".esv-nav-v2-desktop, .esv-mega-v2, .esv-nav-v2-drawer";
const MENU_EXIT_MS = 220;

function isModifiedActivation(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey ||
    event.shiftKey ||
    event.altKey;
}

function isSameDocumentHash(url: URL): boolean {
  const current = globalThis.location;
  return url.origin === current.origin && url.pathname === current.pathname &&
    url.search === current.search && Boolean(url.hash);
}

function beginMenuExit(): boolean {
  const mega = document.querySelector<HTMLElement>(".esv-mega-v2");
  const megaBackdrop = document.querySelector<HTMLElement>(
    ".esv-mega-backdrop",
  );
  const drawerBackdrop = document.querySelector<HTMLElement>(
    ".esv-nav-v2-backdrop",
  );

  if (!mega && !drawerBackdrop) return false;

  mega?.classList.add("is-closing");
  megaBackdrop?.classList.add("is-closing");
  drawerBackdrop?.classList.add("is-closing");
  return true;
}

export default function MenuNavigationCoordinator() {
  useEffect(() => {
    let pendingNavigation = false;
    let navigationTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

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
      if (isSameDocumentHash(url)) return;
      if (url.href === globalThis.location.href) return;

      if (!beginMenuExit()) return;

      event.preventDefault();
      if (pendingNavigation) return;
      pendingNavigation = true;

      const reduceMotion = globalThis.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      navigationTimer = globalThis.setTimeout(
        () => globalThis.location.assign(url.href),
        reduceMotion ? 0 : MENU_EXIT_MS,
      );
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (navigationTimer !== null) globalThis.clearTimeout(navigationTimer);
    };
  }, []);

  return null;
}
