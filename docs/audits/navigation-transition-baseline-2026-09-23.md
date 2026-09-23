# Navigation transition audit — 2026-09-23

Production baseline: `main@50ef927406be852e0129610258f327ef62a729f5`.

## Original symptom

Cross-page navigation could show outgoing and incoming storefront content at the
same time. The issue was most visible when navigation started from an open mega
menu or mobile drawer and when moving between pages with different header
surfaces.

## Confirmed causes

The published storefront combined two independent problems:

1. Cross-document View Transitions captured both the browser `root` snapshot
   and a named `#main-content` snapshot. Old and new content were animated at
   the same time.
2. Menu links started native navigation while the mega menu or drawer was still
   running its exit animation.

The result was overlapping page content and, in some routes, an outgoing menu or
header surface captured on top of the destination page.

## Final navigation architecture

### Route handoff

`static/esmera-motion-v2.css` is the only stylesheet allowed to own
cross-document navigation motion.

- one View Transition snapshot: `root`
- outgoing document: 80 ms
- incoming document: 160 ms
- incoming snapshot is explicitly `opacity: 0` before its delayed animation
- no custom `view-transition-name`
- no named `main` snapshot
- `prefers-reduced-motion` disables the route animations

Browsers without cross-document View Transition support retain native document
navigation.

### Menu and drawer handoff

`DynamicMenu` remains the single owner of menu lifecycle state:
`opening → open → closing → closed`.

`MenuNavigationCoordinator` owns only navigation timing. It never mutates
`is-closing` classes directly. When an internal route is activated from an
open menu surface it:

1. prevents the native navigation;
2. requests the menu lifecycle to close;
3. waits for the lifecycle callback fired after the real exit animation;
4. navigates to the requested URL;
5. keeps a 240 ms fallback only to prevent dead navigation.

Modified clicks, external targets, downloads, same-document hashes and
reduced-motion navigation preserve native behavior.

### Motion ownership boundaries

- `esmera-motion-v2.css`: cross-document route handoff and canonical exit
  motion.
- `esmera-header.css`: header/mega/drawer visual opening states.
- `DynamicMenu.tsx`: menu/drawer lifecycle state.
- `ProductModal.tsx`: product-modal lifecycle state.
- `HeroCarousel.tsx`: hero-carousel lifecycle state.
- `esmera-catalog-v2.css`: catalog/menu structure only; legacy opening
  animation declarations were removed.
- recovery and CRO stylesheets must not define View Transition rules.

The shared event name used by the menu and navigation coordinator lives in
`lib/esmera/navigationMotion.ts`, avoiding duplicated event literals.

## Automated validation

Static contracts enforce:

- only `esmera-motion-v2.css` may contain View Transition route tokens;
- recovery, CRO, header and catalog styles cannot take ownership of route
  transitions;
- the catalog layer cannot reintroduce the legacy mega/drawer opening
  animations;
- menu navigation cannot directly add `is-closing`;
- the shared navigation event has one source of truth;
- the incoming root snapshot must start hidden.

The dedicated Playwright gate validates the real browser behavior at
`1440 × 900` and `390 × 844`.

Latest passing evidence:

- desktop mega → route request delay: **186 ms**
- mobile drawer → route request delay: **177 ms**
- sampled View Transition frames: **21**
- sampled overlap frames: **0**
- reduced-motion root animation: **none**
- reduced-motion old snapshot animation: **none**
- reduced-motion new snapshot animation: **none**

## Validation matrix

Routes and surfaces covered by the stabilization plan:

- Home → Coleção
- Coleção → Sobre
- Home → Favoritos
- Favoritos → Coleção
- Sobre → Termos
- Mega menu → destination route
- Mobile drawer → destination route

Target viewports:

- Desktop: 1440 × 900
- Tablet: 1024 × 768
- Mobile: 390 × 844

## Acceptance criteria

- no outgoing/incoming page overlap in sampled browser frames;
- no duplicated named `main` snapshot;
- menu and drawer exit before their navigation request starts;
- ordinary navigation remains immediate when no menu surface is open;
- reduced-motion users receive no route animation;
- component-local motion remains unchanged;
- lint, typecheck, tests and build pass;
- the dedicated navigation browser gate passes;
- the Deco preview builds successfully before merge.
