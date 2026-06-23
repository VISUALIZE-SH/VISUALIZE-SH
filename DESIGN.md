# VISUALIZE-SH — Design System

The look and feel are derived from **[harshadparanjape.com](https://www.harshadparanjape.com/)**.

**Source palette** — `#3b0b55` (deep purple) · `#f0d5ff` (lilac) · `#dcfbb6` (lime)
· `#ffd358` (gold).
**Source type** — headings **Open Sans**, body/content **Source Sans Pro**.

This document is the reference; the implementation lives in CSS custom properties in
[`src/index.css`](src/index.css) (`:root`) and in the graph palette in
[`src/graph/palette.ts`](src/graph/palette.ts).

> **One rule:** UI chrome should reference a **token**, never a raw hex value.
> Change a token here (and in `:root`) and the whole app follows.

---

## Principles

- **Purple anchors, lime + gold enliven.** Deep purple is the brand and frame;
  lilac, lime, and gold keep it from going monochrome — gold and lime carry the two
  largest node groups so the graph reads colorful, not purple-on-purple.
- **Light, airy type.** Open Sans headings over Source Sans Pro body — including a
  light (300) treatment for the wordmark — echoes the source site.
- **Purple is the brand, violet is interactive.** Deep purple `#3b0b55` marks
  identity and active/primary states; violet `#7d1ba8` is reserved for links and
  things you can click.

---

## Color

### Brand

| Token | Hex | Use |
|---|---|---|
| `--brand` | `#3b0b55` | Primary brand; active toggle fill, `·SH` mark, header rule, primaries |
| `--brand-dark` | `#2a073e` | Pressed / hover-on-brand |
| `--brand-ink` | `#1a0426` | Strongest text, graph labels, scrims |
| `--lilac` | `#f0d5ff` | Soft tinted backgrounds & highlights (e.g. draft badge) |
| `--lime` | `#dcfbb6` | Soft green accent / positive highlight |
| `--gold` | `#ffd358` | Warm accent; pulse meter, attention |
| `--link` | `#7d1ba8` | Links, focus rings, selected accents |
| `--link-hover` | `#a646d1` | Link hover |

### Neutrals

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#f7f4f9` | Page background (faint lilac tint) |
| `--surface` | `#ffffff` | Cards, header, panels, modals |
| `--surface-2` | `#fcfbfd` | Insets, hovers, segmented controls |
| `--border` | `#e6e0ec` | Default 1px borders |
| `--border-strong` | `#d6cee0` | Hover / emphasis borders |
| `--text` | `#1a0426` | Headings & strong text |
| `--text-2` | `#555555` | Body text |
| `--text-3` | `#999999` | Muted / captions |

### Status (aligned to the site's alert palette)

| Token | Hex | Meaning |
|---|---|---|
| `--ok` | `#3c763d` | approved, positive result |
| `--info` | `#31708f` | investigational, ongoing |
| `--warn` | `#8a6d3b` | mixed result, draft notes |
| `--bad` | `#a94442` | negative result, errors |
| `--muted` | `#777777` | discontinued, terminated |
| `--draft` | `#7d1ba8` | draft (uncurated) marker (on a `--lilac` chip) |

`--accent` and `--accent-2` are kept as semantic aliases (`--brand` and `--link`)
so pre-existing rules adopt the palette automatically.

### Graph node palette (categorical)

Seven distinct hues, jewel-toned to sit with the brand. The "subject" of the graph
— conditions — takes the brand violet. Defined in `GROUP_META`
([`palette.ts`](src/graph/palette.ts)); the Legend and detail dots read from the
same source so they never drift.

| Group | Hex | Shape | Note |
|---|---|---|---|
| Condition / anatomy | `#7c1fb0` | ellipse | brand violet |
| Device | `#5ba32b` | hexagon | saturated **lime** (largest device presence) |
| Pharmaceutical | `#2f6fed` | round-rectangle | |
| Procedure | `#ec7211` | round-triangle | |
| Digital therapy | `#d6249f` | diamond | |
| Clinical trial | `#eab308` | star | saturated **gold** (the 50 trial stars) |
| Company | `#64748b` | rectangle | neutral slate |

Node **size** encodes degree (connectedness); **label size** encodes `pulse`
(0–10 news attention); a **dashed** border marks drafts. See the in-app Legend.

---

## Typography

Loaded from Google Fonts in [`index.html`](index.html). Per the source site,
**headings use Open Sans and body/content uses Source Sans Pro**.

- **`--font`** (body/UI): `'Source Sans 3', 'Source Sans Pro', Helvetica, Arial, sans-serif`
- **`--font-display`** (headings, wordmark): `'Open Sans', Helvetica, Arial, sans-serif`
- **`--font-mono`**: system monospace stack

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Wordmark `VISUALIZE·SH` | Open Sans | 19px | 300 | `letter-spacing: 0.04em`; `·SH` in `--brand` @ 600 |
| Headings `h1–h3` | Open Sans | contextual | 600 | `letter-spacing: -0.005em`, color `--text` |
| Body | Source Sans Pro | 14px | 400 | `line-height: 1.45`, color `--text-2` |
| Labels / facts | Source Sans Pro | 12–13px | 400/600 | |
| Captions / meta | Source Sans Pro | 11px | 400 | color `--text-3` |
| Graph node labels | Source Sans Pro | 9–26px (by `pulse`) | 400 | color `--brand-ink` |

Open Sans weights: **300** (wordmark only), **400**, **600**, **700**.
Source Sans Pro weights: **400**, **600**, **700**, plus italic 400.

---

## Shape, depth & spacing

| Token | Value | Use |
|---|---|---|
| `--radius` | `10px` | Cards, panels, modals |
| `--radius-sm` | `6px` | Buttons, inputs, chips, badges |
| `--shadow` | soft 2-layer (brand-ink tint) | Dropdowns, raised surfaces |
| `--shadow-lg` | deep | Modals |

Spacing follows a loose **4px grid** (4 / 6 / 8 / 10 / 16 / 20 px) — the values
already used throughout `index.css`.

---

## Component conventions

- **Header** — white surface with a 3px `--brand` rule along the top.
- **Buttons** — `.icon-btn` / `.text-btn`: `--surface` on `--border`, hover raises
  to `--border-strong` + `--text`. `.seg-btn.active`: solid `--brand` on white.
- **Inputs** — `--surface-2` fill, focus switches to `--surface` with a `--link`
  border.
- **Badges** — pill (`--radius` 20px), soft tinted background + status-token text;
  the **draft** badge is `--brand` on a `--lilac` chip.
- **Chips** (related entities) — pill outline with a leading group-color dot.
- **Pulse meter** — track `--bg`, fill is a **`--gold → --brand`** gradient.

---

## Extending it

1. Need a new color or size? Add a **token** in `:root` (`index.css`) and document it
   here — don't inline a hex in a component.
2. New node category? Add it to `GROUP_META` with a hue distinct from the other six,
   and add the row above.
3. Keep links violet and primaries purple. Use `--lilac` / `--lime` / `--gold` as
   secondary accents and tints — but don't introduce hues outside the brand palette.
