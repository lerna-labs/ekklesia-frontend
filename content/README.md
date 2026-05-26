# Per-deployment content & theming

This tree holds the editorial content (markdown blocks) and brand theming for
each Ekklesia deployment. The frontend picks one deployment at build time via
the `VITE_APP_CONTENT` env var; anything unknown collapses to `_default`.

## Directory layout

```
content/
├── _default/                ← Generic Ekklesia copy + theme — always loaded as the base layer
│   ├── theme.sample.json    ← Worked example. Copy this when starting a new deployment.
│   └── en/                  ← Language code. Today only `en` is wired in.
│       ├── home/            ← hero, upcoming, live, closed
│       ├── faqs/            ← NNN-slug.md, ordered by leading number
│       ├── footer/          ← tagline, copyright
│       ├── voter-directory/ ← intro
│       └── errors/          ← generic
└── <deployment>/            ← e.g. `intersect`. Only ship files that override defaults.
    ├── theme.json
    └── en/
        └── home/hero.md     ← overrides _default/en/home/hero.md
```

At runtime the loader (`src/lib/content.js`) merges in this order — later
layers win for same paths; new paths accumulate:

1. `_default/en/`
2. `_default/<active-lang>/`
3. `<deployment>/en/`
4. `<deployment>/<active-lang>/`

A deployment that only wants a brand recolor needs **just `theme.json`** — no
markdown overrides required. To add a custom logo, drop an asset at
`static/brand/<deployment>/logo.svg` (or `.png` / `.webp`); the Header
component picks it up automatically. See "Logo" below.

## Theming (`theme.json`)

A flat JSON object at `content/<deployment>/theme.json`. Every key is optional;
missing keys fall through to the defaults baked into `src/app.css`. The
applier (`src/lib/base/theme.js`) writes whatever it finds onto
`document.documentElement` at boot.

**All colors are hex** (`#RRGGBB`, with `#RGB`, `#RRGGBBAA`, and `#RGBA`
shorthand variants accepted — alpha is parsed but discarded; Tailwind
`<alpha-value>` carries opacity utilities like `bg-primary/80`). Internally the
applier converts each hex to an `H S% L%` triplet before writing the CSS var,
which keeps Tailwind's `hsl(var(--token) / <alpha-value>)` pattern working.
Operators never touch the HSL form — paste hex straight out of the brand
guide.

### Themable keys

#### Core shadcn tokens

| Key                       | Controls                                            |
| ---                       | ---                                                 |
| `primary`                 | Default Button bg, primary CTA                      |
| `primary-foreground`      | Text/icons on `--primary` surfaces                  |
| `secondary`               | Secondary Button bg                                 |
| `secondary-foreground`    | Text/icons on `--secondary` surfaces                |
| `accent`                  | Hover bg on ghost buttons and menu items            |
| `accent-foreground`       | Text/icons on `--accent` surfaces                   |
| `destructive`             | Destructive button bg, error highlights             |
| `destructive-foreground`  | Text/icons on `--destructive` surfaces              |
| `ring`                    | Keyboard focus ring                                 |

#### Header

| Key                  | Controls                                            |
| ---                  | ---                                                 |
| `header-background`  | Sticky header bg (was `#1E1E2F`)                    |
| `header-foreground`  | Header text & nav button colours. **Auto-derived from `header-background` (white on dark, black on light) when omitted** — pick one, get the other for free. |

#### Brand accent palette

These five replace the raw `orange-*` Tailwind classes that used to be
scattered through 20+ components. Set them and your brand colour flows through
the scroll progress strip, vote CTAs, ProposalVote highlights, version-update
banner, filter/sort badges, markdown links, ranked result rank-1 bar, and
"View Results" buttons.

| Key                | Controls                                              |
| ---                | ---                                                   |
| `brand`            | Resting brand bg / accent text                        |
| `brand-hover`      | Hover state for `brand`-bg elements; brand text colour |
| `brand-fg`         | Text/icons on `brand` surfaces                        |
| `brand-soft`       | Soft tinted bg (callout panels, gradient highlights)  |
| `brand-soft-fg`    | Text/icons on `brand-soft` surfaces                   |

#### Testnet-warning banner

The strip that warns voters they're on a non-production network (preprod) is
themed **separately from `brand`** on purpose: it must stay a loud, obviously
cautionary colour even when a deployment's brand accent is a low-contrast hue.
The banner only renders on testnet builds (`VITE_NETWORK_ID == 0`); on mainnet
it never appears, so these keys have no effect there.

| Key                          | Controls                                            |
| ---                          | ---                                                 |
| `network-warning`            | Testnet-banner background                           |
| `network-warning-foreground` | Banner text. **Auto-derived** (white on dark, black on light) when omitted. |

#### Geometry & typography

| Key             | Format                          | Controls                                            |
| ---             | ---                             | ---                                                 |
| `radius`        | CSS length (`0.5rem`, `8px`)    | Base corner radius (cards, buttons, inputs)         |
| `font-heading`  | Google Fonts family name        | `h1` / `h2` / `h3`                                  |
| `font-body`     | Google Fonts family name        | Body copy                                           |

### What's *not* themable here

- The `slate-*` Tailwind classes used throughout the app remain (neutral
  spine; see `.claude/design/STYLE_GUIDE.md` §2.1). They're meant to stay
  neutral across deployments.
- Chart palette slots 2+ in `src/lib/results/groupResults.js` and ranks 2-8 in
  `src/lib/results/RankedGroupResult.svelte` are intentionally fixed
  distinct-hue palettes (indigo / cyan / fuchsia / etc.) so adjacent options
  stay visually distinct. Only the brand-marked slot 0 / rank 1 reads
  `--brand-hover`.
- Dark-mode tokens in `src/app.css` aren't surfaced — dark mode isn't shipped.

### Worked example

A copy of `content/_default/theme.sample.json` at the current `app.css`
defaults — start by copying this file and override the keys you actually want
to change:

```json
{
  "primary": "#0F172A",
  "primary-foreground": "#F8FAFC",
  "secondary": "#F1F5F9",
  "secondary-foreground": "#0F172A",
  "accent": "#F1F5F9",
  "accent-foreground": "#0F172A",
  "destructive": "#DC2626",
  "destructive-foreground": "#F8FAFC",
  "ring": "#020817",
  "header-background": "#1E1E2F",
  "header-foreground": "#FFFFFF",
  "brand": "#F97316",
  "brand-hover": "#EA580C",
  "brand-fg": "#FFFFFF",
  "brand-soft": "#FFF7ED",
  "brand-soft-fg": "#7C2D12",
  "radius": "0.5rem",
  "font-heading": "Inter",
  "font-body": "Inter"
}
```

A minimal partial override — change only the brand accent and header
background, inherit everything else. `header-foreground` auto-derives:

```json
{
  "header-background": "#0033AD",
  "brand": "#0033AD",
  "brand-hover": "#002277",
  "brand-fg": "#FFFFFF",
  "brand-soft": "#E6ECFA",
  "brand-soft-fg": "#0033AD"
}
```

### Fonts

`font-heading` and `font-body` accept any Google Fonts family name. The
applier appends a single `<link>` with weights `400;500;600;700` for both
families on first paint. **Omit these keys to keep the default system sans
stack** — the sample includes Inter for illustration, but the unthemed default
is the OS font.

To use a non-Google font (self-hosted, `@fontsource`, etc.), leave these keys
unset and wire the font into `src/app.css` directly.

## Per-deployment brand assets

Drop brand-specific image assets into `static/brand/<deployment>/`. Two
flavours of asset, picked up at different points in the build:

### Logo (runtime)

`static/brand/<deployment>/logo.{svg,png,webp}` is served verbatim at runtime
by `Header.svelte`. It tries each extension in order via an `onerror` chain
and falls back to the `BRAND.name` wordmark when none resolve. The image
renders at `h-10 w-auto`, so horizontal logos work as-is; portrait/square
logos should be sized ~40px tall after trimming. No env var, no config —
drop the file and rebuild.

Because runtime resolution uses `/brand/<deployment>/logo.<ext>`, every
deployment's logo ships in the build output. Only the active deployment's
copy is actually requested by the browser.

### Favicons + social card (build-time copy)

`scripts/brand-build-output.js` copies any of the following filenames from
`static/brand/<deployment>/` over the build root, replacing the default
Ekklesia icons for the active deployment:

| Filename                          | Served at                       | Used by                          |
| ---                               | ---                             | ---                              |
| `favicon.ico`                     | `/favicon.ico`                  | Browser tab + bookmarks          |
| `favicon-16x16.png`               | `/favicon-16x16.png`            | Browser tab (small)              |
| `favicon-32x32.png`               | `/favicon-32x32.png`            | Browser tab (retina)             |
| `apple-touch-icon.png`            | `/apple-touch-icon.png`         | iOS home screen                  |
| `android-chrome-192x192.png`      | `/android-chrome-192x192.png`   | Android home screen / PWA        |
| `android-chrome-512x512.png`      | `/android-chrome-512x512.png`   | Android PWA install card         |
| `social.png`                      | `/social.png`                   | OpenGraph / Twitter card preview |

Only drop the files you want to override — the rest fall through to the
default. The script logs every file it copies so a build log shows the
operator exactly what landed.

### Webmanifest theme colour

The PWA `site.webmanifest`'s `theme_color` and `background_color` are
rewritten at build time from the deployment's `theme.json`
`header-background` value, so the Android task switcher / PWA install
card chrome matches the in-app sticky header. No separate config needed.

### OG card palette

`brand-build-output.js` also emits `build/<mode>/og-palette.json`,
derived from the merged `theme.json`. The Ekklesia backend's OG image
generator (`/og/ballot/:id.png`, `/og/proposal/:id.png`) reads this file
when its `OG_PALETTE_FILE` env var is set to its absolute path — drop
that into the backend deployment and social cards pick up the
deployment's brand colours.

Mapping (theme.json key → OG palette key):

| theme.json                | OG palette                                  | Notes                                          |
| ---                       | ---                                         | ---                                            |
| `header-background`       | `bgVia` (mid gradient stop)                 | Lightness capped at 16% so the editorial dark backdrop survives even when the header is a saturated mid-lightness colour (e.g. Intersect's `#0228AA` at L=34% — would otherwise wash out same-hue brand text). Hue + saturation preserved. |
| derived darker            | `bgFrom`                                    | `bgVia` × 0.53 lightness (or × 1.06 for light headers) |
| derived lighter           | `bgTo`                                      | `bgVia` × 1.27 lightness (or × 0.94 for light headers) |
| **contrast-ranked** from `brand` / `primary` / `brand-hover` | `brandPrimary` | The highest-contrast candidate against `bgVia` wins, so same-hue deployments auto-promote a brighter colour. Drives the eyebrow text, top-right glow, and bottom-row dot. |
| **contrast-ranked** (second-best, distinct from `brandPrimary`) | `brandSecondary` | Bottom-left glow. Auto-derives to `brand-hover` for monochromatic deployments. |
| `header-foreground`       | `textPrimary` + `decorativeOverlay`         | Body title + diagonal hairline                 |
| derived (70% alpha)       | `textSecondary`                             | Period label, host label                       |
| derived (8% / 18% alpha)  | `chipBg` / `chipBorder`                     | "BALLOT" / "PROPOSAL" chip                     |

> **Why contrast-rank the brand colours:** the OG card paints the eyebrow
> text (`"EKKLESIA VOTE"` / `"BALLOT"`) in `brandPrimary` on top of the
> gradient bg. If both come from the same hue family (e.g. Intersect's
> cardano-blue brand on tangy-blue header), the text crushes into the
> background. Ranking by WCAG contrast against `bgVia` and picking the
> winner avoids that — Intersect's electric-blue (`primary`) auto-takes
> the role, while Ekklesia's default orange (`brand`) keeps it on
> deployments where the warm accent already pops.

The backend auto-derives `glowPrimary`, `glowSecondary`, `accentTop`, and
`accentBottom` from `brandPrimary` / `brandSecondary`, so we deliberately
omit those — anyone reading the JSON sees only what the build actually
controls.

**Deployment wire-up** (one-time):

```bash
# on the backend host
export OG_PALETTE_FILE=/srv/ekklesia/frontend/build/production/og-palette.json
export OG_CARDS_ENABLED=true
export OG_BRAND_NAME="<wordmark text>"   # e.g. "INTERSECT"
export OG_BRAND_HOST="vote.<domain>"     # bottom-row host label
```

Bump `OG_RENDERER_VERSION` on the backend after editing this file to
invalidate the OG card cache.

## Adding a new deployment

1. `mkdir content/<deployment>/`
2. `cp content/_default/theme.sample.json content/<deployment>/theme.json`,
   then edit. Delete keys you don't want to override.
3. (Optional) `mkdir static/brand/<deployment>/` and drop in:
   - `logo.svg` (or `.png` / `.webp`) for the header wordmark replacement
   - any of the favicon / social card filenames listed above to override
     the defaults
4. (Optional) Add markdown overrides under `content/<deployment>/en/<slot>/<slug>.md`.
   Frontmatter and slot conventions are documented inline in
   `scripts/lint-content.js`.
5. Run `npm run lint:content` to validate frontmatter and `theme.json`.
6. Build with `VITE_APP_CONTENT=<deployment> npm run build`.

The linter enforces:

- Markdown frontmatter shape per slot
- FAQ filename prefixes match their `order` field
- Only known theme keys appear in `theme.json`
- Hex colour format, radius lengths, and font names are well-formed
