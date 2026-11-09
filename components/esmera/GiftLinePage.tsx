import { asset } from "$fresh/runtime.ts";
import { GiftBuy, GiftPrice, GiftShot } from "./GiftLineParts.tsx";
import GiftLineSelector from "../../islands/GiftLineSelector.tsx";
import { optimizePayloadMediaURL } from "../../lib/esmera/mediaVariant.ts";
import type {
  GiftFamily,
  GiftLineViewModel,
  GiftPiece,
} from "../../lib/esmera/giftLine.ts";
import type { StorefrontMediaV2 } from "../../lib/esmera/storefront.ts";

const NOTE =
  "Uma seleção especial para presentear com significado e exclusividade.";

export interface Props {
  line: GiftLineViewModel;
  coverImage?: StorefrontMediaV2 | null;
}

function GiftHero({ coverImage }: Pick<Props, "coverImage">) {
  return (
    <section class="gl-hero">
      <figure class="gl-hero__photo">
        <img
          src={coverImage
            ? optimizePayloadMediaURL(coverImage.url, 1200)
            : asset("/presenteaveis-capa.webp")}
          alt={coverImage?.alt ||
            "Mãos seguram a caixa verde da Esméra, com abelha na tampa, fita dourada e cartão de presente"}
          width={1366}
          height={912}
          decoding="async"
          {...{ fetchPriority: "high" }}
        />
      </figure>
      <svg
        class="gl-hero__curve"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 0H502C470 180 462 330 470 470C480 700 540 880 563 1000H0Z" />
      </svg>
      <div class="gl-hero__copy">
        <h1 class="gl-hero__title">
          Linha<br />Presenteável
        </h1>
        <span class="gl-short-rule" aria-hidden="true" />
        <p class="gl-hero__note">{NOTE}</p>
      </div>
    </section>
  );
}

function GiftCard({ piece }: { piece: GiftPiece }) {
  return (
    <article class="gl-card">
      <GiftShot
        piece={piece}
        sizes="(max-width: 860px) calc(100vw - 40px), 46vw"
      />
      <div class="gl-card__bar">
        <h3 class="gl-card__name">{piece.label}</h3>
        <span class="gl-card__divider" aria-hidden="true" />
        <p class="gl-card__value">
          <span class="gl-card__price">
            <GiftPrice piece={piece} />
          </span>
          {piece.installment && (
            <span class="gl-terms">{piece.installment}</span>
          )}
        </p>
        <GiftBuy piece={piece} icon={piece.isPurchasable} />
      </div>
    </article>
  );
}

function GiftCardsFamily({ family }: { family: GiftFamily }) {
  return (
    <section class="gl-cards" aria-label={family.name}>
      <header class="gl-cards__head">
        <div>
          {family.eyebrow && <p class="gl-eyebrow">{family.eyebrow}</p>}
          <h2 class="gl-title">{family.name}</h2>
        </div>
        {family.phrase && <p class="gl-cards__phrase">{family.phrase}</p>}
      </header>
      <div class="gl-cards__grid">
        {family.pieces.map((piece) => (
          <GiftCard
            piece={piece}
            key={piece.id}
          />
        ))}
      </div>
    </section>
  );
}

function GiftSolo({ family }: { family: GiftFamily }) {
  const piece = family.pieces[0];
  return (
    <section
      class={`gl-solo${family.mirrored ? " gl-solo--mirrored" : ""}`}
      aria-label={family.name}
    >
      <div class="gl-solo__copy">
        {family.eyebrow && <p class="gl-eyebrow">{family.eyebrow}</p>}
        <h2 class="gl-title">{piece.label}</h2>
        <span class="gl-short-rule" aria-hidden="true" />
        <p class="gl-solo__price">
          <GiftPrice piece={piece} />
        </p>
        {piece.installment && <p class="gl-terms">{piece.installment}</p>}
        <GiftBuy piece={piece} />
        {piece.phrase && <p class="gl-solo__phrase">{piece.phrase}</p>}
      </div>
      <GiftShot
        piece={piece}
        sizes="(max-width: 860px) calc(100vw - 40px), 58vw"
      />
    </section>
  );
}

function GiftFamilySection({ family }: { family: GiftFamily }) {
  if (family.format === "selector") return <GiftLineSelector family={family} />;
  if (family.format === "solo") return <GiftSolo family={family} />;
  return <GiftCardsFamily family={family} />;
}

function GiftBranch() {
  return (
    <svg class="gl-close__branch" viewBox="0 0 300 130" aria-hidden="true">
      <path d="M8 122C70 108 170 78 292 8" />
      <path d="M60 110Q60 78 96 66Q94 98 60 110ZM60 110Q76 90 96 66" />
      <path d="M100 99Q128 92 150 120Q118 124 100 99ZM100 99Q124 106 150 120" />
      <path d="M140 86Q136 56 170 38Q174 70 140 86ZM140 86Q154 64 170 38" />
      <path d="M180 69Q208 60 234 88Q200 94 180 69ZM180 69Q206 76 234 88" />
      <path d="M220 50Q214 24 242 6Q250 34 220 50ZM220 50Q232 28 242 6" />
      <path d="M258 30Q280 20 298 44Q272 52 258 30ZM258 30Q278 34 298 44" />
    </svg>
  );
}

export default function GiftLinePage(props: Props) {
  return (
    <div class="gl-page">
      <GiftHero coverImage={props.coverImage} />
      <div class="gl-chapters">
        {props.line.families.map((family) => (
          <GiftFamilySection family={family} key={family.key} />
        ))}
      </div>
      <section class="gl-close" aria-label="Frase da linha">
        <div class="gl-close__inner">
          <div>
            <p class="gl-close__quote">Que o essencial permaneça.</p>
            <span class="gl-short-rule" aria-hidden="true" />
          </div>
          <GiftBranch />
        </div>
      </section>
    </div>
  );
}
