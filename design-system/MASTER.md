# Meen Fina design system

Source of truth for how the app looks, moves and reads. Page files in `design-system/pages/` override this file for that page only; none exist yet.

Produced with the UI/UX Pro Max skill on 2026-11-16, then adjusted for this product (see "Where this departs from the tool's output").

## Product

- **What it is:** a friends' anonymous "who…?" voting game, installed as a PWA.
- **Who uses it:** small friend groups, mostly on phones, mostly in Egyptian Arabic (RTL), sometimes English.
- **When:** short bursts in a group chat: open a link, vote in seconds, come back for the reveal.
- **Feel:** warm, playful, tactile. A party game, not a dashboard. The reveal is the one big moment; everything else stays quick and quiet.

## Style: soft and tactile

Chunky rounded shapes, warm surfaces, buttons that feel pressable. Borrowed from claymorphism, kept light for cheap phones.

- Rounded everything: 12px controls, 16px cards, 24px sheets, pill buttons.
- Depth from one soft shadow plus a 1px border. No blur, no stacked shadows, no gradients on text.
- One accent moment per screen. The primary action is the only coral fill on a screen.
- Colour comes from people: avatars and winners carry the vibrancy, chrome stays neutral.

**Avoid:** neon/glow, glassmorphism blur, CRT or glitch effects, emoji as icons, more than one primary button per screen, dense layouts.

## Colour

Keep the coral and teal identity. All text pairs below meet WCAG AA; ratios were calculated, not estimated.

### Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#fff8f1` | `#17120e` | Page background |
| `--color-surface` | `#ffffff` | `#241d17` | Cards, sheets |
| `--color-text` | `#1b1612` | `#fbf1e6` | Body and headings |
| `--color-text-muted` | `#6b5f55` | `#b8a999` | Secondary text |
| `--color-primary` | `#ff6b3d` | `#ff7a4d` | Primary button fill, brand marks |
| `--color-on-primary` | `#1b1612` | `#1b1612` | Text and icons on coral |
| `--color-primary-text` | `#c2410c` | `#ff946d` | Coral-coloured text, links, secondary button label |
| `--color-accent` | `#14b8a6` | `#2dd4bf` | Decorative teal: badges, winner highlights, fills |
| `--color-accent-text` | `#0f766e` | `#2dd4bf` | Teal text |
| `--color-focus` | `#0f766e` | `#2dd4bf` | Focus ring |
| `--color-danger` | `#b91c1c` | `#fca5a5` | Errors, destructive actions |
| `--color-success` | `#15803d` | `#4ade80` | Confirmations |
| `--color-border` | `#f0e2d4` | `#3a2f26` | Decorative dividers and card edges |
| `--color-border-strong` | `#9a8470` | `#857262` | Input and control outlines (must be visible) |
| `--color-skeleton-base` | `#f3e6d9` | `#2e251d` | Loading skeleton |
| `--color-skeleton-shine` | `#fff3e8` | `#3a2f26` | Loading skeleton |

### Changes from the current build, and why

| Change | Current | Problem | New |
|---|---|---|---|
| Text on coral buttons (light) | white, 2.83:1 | Fails AA (needs 4.5) | ink `#1b1612`, 6.34:1 |
| Secondary button label (light) | `#e5501f`, 3.63:1 | Fails AA | `#c2410c`, 4.92:1 |
| Focus ring (light) | teal `#14b8a6`, 2.36:1 | Fails the 3:1 minimum for focus indicators | `#0f766e`, 5.2:1 |
| Error text | reuses coral | Errors look like brand text | dedicated `--color-danger`, 6.15:1 |
| Input outlines | `--color-border`, 1.21:1 | Controls have no visible edge | `--color-border-strong`, 3.38:1 |

### Rules

- Never put raw hex values in components; use tokens.
- Coral as a fill, never as small text on the background. Use `--color-primary-text` for text.
- Colour never carries meaning alone: errors get an icon or words, winners get a label, "voted" gets a tick.
- Focus ring on a coral button uses `--color-text` (6.34:1), because teal on coral is 1.93:1.
- Dark mode is its own palette, checked separately. Do not invert.

## Typography

**One family: Rubik**, for Arabic and Latin. It has both scripts in one design, rounded terminals that suit the style, and it is already loaded. Fallback: `system-ui, -apple-system, 'Segoe UI', sans-serif`.

Weights: 400 body, 600 labels and buttons, 800 headings and the big reveal. Load only these three.

| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `--text-display` | 2rem (32px) | 800 | 1.2 | Winner name on reveal |
| `--text-h1` | 1.75rem (28px) | 800 | 1.25 | Screen title |
| `--text-h2` | 1.25rem (20px) | 700 | 1.3 | Section title, question text |
| `--text-body` | 1rem (16px) | 400 | 1.6 | Default |
| `--text-label` | 1rem (16px) | 600 | 1.3 | Buttons, list titles |
| `--text-small` | 0.875rem (14px) | 400 | 1.5 | Meta, counts, hints |
| `--text-caption` | 0.8125rem (13px) | 600 | 1.4 | Badges only |

Rules:

- Sizes in `rem` so the system text-size setting works. Nothing below 13px.
- Arabic: no letter-spacing, no italics, no all-caps styling. Line height 1.6 for body so diacritics do not clip.
- User-written text (group names, questions, display names) gets `dir="auto"` and wraps; never truncate a question.
- Counts and timers use `font-variant-numeric: tabular-nums` so they do not jitter.
- Inputs are 16px or larger, so iOS Safari does not zoom on focus.

## Space, shape, depth

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48 (`--space-1` … `--space-12`). Add 32 and 48 to the existing tokens.
- **Layout:** single column, max 480px, 16px gutter, centred on wide screens.
- **Rhythm:** 8px inside a group, 16px between items, 24px between sections, 32px before the primary action.
- **Radius:** `--radius-control` 12px, `--radius-card` 16px, `--radius-sheet` 24px, `--radius-pill` 999px.
- **Elevation:** `--shadow-card` (resting), `--shadow-raised` (pressed-up cards, sheets), none on flat rows. Dark mode leans on the border, not the shadow.
- **Touch:** every target at least 44×44px, 48px for primary actions, 8px between neighbours.
- **Safe areas:** pad the page with `env(safe-area-inset-*)`; a bottom-anchored primary action sits above the home indicator.
- **RTL:** logical properties only (`margin-inline`, `padding-block`, `inset-inline-start`). Back arrows and chevrons mirror; logos, avatars and numerals do not.

## Motion

Motion explains what just happened. One or two moving things per screen, except the reveal.

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 120ms | Button and tile press |
| `--dur-quick` | 200ms | Fades, colour changes, small moves |
| `--dur-enter` | 250ms | Cards, sheets and screens arriving |
| `--dur-exit` | 160ms | Anything leaving (faster than entering) |
| `--dur-celebrate` | 700ms | Reveal only |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entering, responding to a tap |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Moving between two on-screen places |
| `--ease-pop` | `cubic-bezier(0.2, 1.4, 0.4, 1)` | Reveal and selection pop only |

Rules:

- Animate `transform` and `opacity` only. No animating width, height, top or left.
- Press feedback on every tappable thing: scale to 0.97 in `--dur-press`. Never delay the action for the animation.
- Lists enter with a 30–40ms stagger, capped at about 8 items.
- Nothing blocks input, and a second tap interrupts a running animation.
- `prefers-reduced-motion: reduce` turns moves and scales into plain fades and removes confetti.
- Loading is a skeleton in the shape of the content, never a spinner.

Where motion earns its place: vote selection (the chosen tile pops, others dim), vote sent (button to tick), live "voted" count ticking up, the reveal (winner scales in, confetti once), a new question arriving in the list.

## Components

- **Primary button:** coral fill, ink label, pill, 48px tall, full width on phones. One per screen. Busy state disables it and swaps the label for a skeleton bar of the same width.
- **Secondary button:** transparent, 2px `--color-primary` border, `--color-primary-text` label.
- **Destructive action:** secondary shape in `--color-danger`, always behind a confirm step.
- **Card:** surface, 16px radius, 1px border, `--shadow-card`, 16px padding. Tappable cards get press feedback and a visible focus ring.
- **Member tile (voting):** avatar plus name, at least 72px tall. Selected state shows a tick and a 3px ring, not colour alone.
- **Input:** 48px tall, 12px radius, `--color-border-strong` outline, visible label above (not placeholder-only), error text below in `--color-danger` with `role="alert"`.
- **Badge:** pill, 13px/600. Teal fill with ink text for neutral status.
- **Icons:** one SVG set (Lucide), 24px, 1.75 stroke, `currentColor`. Replace the `⚙` character and any emoji used as controls. Icon-only buttons need an `aria-label`.
- **Empty states:** one line saying what goes here, one primary action. No dead ends.
- **Errors:** say what happened and what to do next, next to where it happened.

## Accessibility baseline

- Text contrast 4.5:1 (3:1 for 24px+ and for control outlines and focus rings).
- Focus ring: 3px solid `--color-focus`, 2px offset, on every interactive element via `:focus-visible`.
- One `h1` per screen, headings in order.
- Live results and vote counts announce through an `aria-live="polite"` region.
- Works at 200% text size without clipped or overlapping text.
- Works with VoiceOver and TalkBack in both languages: every control has a name.

## Where this departs from the tool's output

The generator's first pass was for a marketing site, so three recommendations were replaced:

| Tool suggested | Used instead | Why |
|---|---|---|
| Layout pattern "Hero + Testimonials + CTA" | Single-column app screens | That is a landing-page pattern; this is an app. |
| Style "Retro-Futurism" (neon, CRT scanlines, glitch) | Soft and tactile | The tool itself rates it poor for accessibility and performance, and it fights the warm identity. |
| Fonts Fredoka + Nunito | Rubik | Neither has Arabic glyphs; Arabic is the main language. |
| Rose and blue palette | Existing coral and teal, with fixes | The identity is already in the icon and theme; the real problem was contrast, fixed above. |

Kept from the tool: the accessibility, touch, typography and motion rules, and the pre-delivery checklist below.

## Pre-release checklist

- [ ] No raw hex colours or pixel font sizes in components; tokens only
- [ ] Every text pair checked at 4.5:1 in light and dark
- [ ] Every control reachable by keyboard with a visible focus ring
- [ ] Touch targets 44px or more, 8px apart
- [ ] No emoji used as icons
- [ ] Arabic and English both checked on every changed screen; nothing clipped or mirrored wrongly
- [ ] Reduced-motion setting respected
- [ ] No layout shift when content or fonts load
- [ ] Checked at 375px wide and at 200% text size
- [ ] Checked as an installed app on iPhone and Android (safe areas, status bar colour)
