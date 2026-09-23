import { useEffect } from "preact/hooks";

const MENU_SELECTOR = ".esv-nav-v2-desktop, .esv-mega-v2, .esv-nav-v2-drawer";

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

      // Native navigation starts in this activation; motion follows the state.
      beginMenuExit();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
