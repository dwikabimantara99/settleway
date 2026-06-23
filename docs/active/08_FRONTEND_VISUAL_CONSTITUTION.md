# Settleway Frontend Visual Constitution

> Historical Batch 1 baseline. New frontend work is governed by
> `docs/active/11_SETTLEWAY_AURORA_VISUAL_DIRECTION.md`. Product truth and
> transaction-language rules in this file remain useful where they do not
> conflict with the Aurora direction.

## Thesis

Settleway uses the **Field Ledger** visual language: an institutional trade
workspace with agricultural warmth, financial precision, and optional Stellar
verification. It must feel calm, bilateral, and operational rather than
crypto-centric, retail, or template-driven.

## Brand And Semantic Color

- Navy `#1D2D4E`: structure, headings, navigation, financial authority.
- Green `#276A42`: valid action, commitment progress, successful movement.
- Canvas: warm stone `#F5F3EE`; surfaces are warm white rather than glass.
- Blue: information and Stellar/Testnet verification only.
- Amber: deadline, pending risk, and required attention.
- Red: breach, dispute, destructive action, and failure only.
- Status must always combine color with text and, where useful, an icon.

Use the semantic CSS tokens in `web/src/app/globals.css`. Do not introduce a
page-local palette when an existing semantic token applies.

## Type And Numbers

- Sans-serif: system UI stack for dependable cross-platform rendering.
- Page title: 32-40 px desktop, 28-32 px compact screens.
- Section title: 18-22 px. Operational card titles stay compact.
- Body: 14-16 px with 1.5-1.7 line height.
- Money, quantities, and deadlines use tabular numerals.
- Monospace is reserved for hashes, wallet addresses, transaction IDs, and
  contract references.
- Letter spacing is zero except short uppercase operational eyebrows.

## Geometry

- Spacing follows a 4 px base rhythm.
- Content widths: `72rem` standard, `84rem` dense Deal Room.
- Radius: 6 px controls, 8 px panels, 10 px exceptional dialogs.
- Borders carry hierarchy; shadows are limited to menus, dialogs, and sticky
  rails.
- Do not nest decorative cards. Prefer page regions, dividers, rows, and rails.

## Product Patterns

- **Bilateral Commitment:** buyer and seller receive equal visual weight.
- **Assurance Rail:** sticky desktop summary, in-flow mobile summary, containing
  secured amounts, funding, next actor, deadline, policy, and verification.
- **Trade Timeline:** each stage names state, actor, timestamp/deadline, and
  evidence where available.
- **Verification Surface:** plain-language state first; hashes and explorer
  links remain secondary and inspectable.
- One primary action per context. Critical actions are never hover-only.

## Icons, Motion, And Photography

- Lucide is the single interface icon family.
- Icons clarify commands and state; they are not placed in colorful squares by
  default.
- Motion is limited to short entry, disclosure, and confirmation transitions.
- Respect `prefers-reduced-motion`; no glow, pulse, floating, or continuous
  decoration.
- Commodity photography must be local, documentary, inspectable, and
  commodity-specific. No random remote URLs or generic field hero imagery.
- Current raster logo has a white background. Replace it with a founder-issued
  transparent SVG or PNG when available; do not auto-trace it.

## Density And Responsive Behavior

- Discovery pages may breathe; Deal Room and negotiation pages remain dense
  enough for repeated operational use.
- At 360-390 px, primary actions remain visible, financial rows stack without
  overflow, and touch targets approach 44 px.
- At 768 px, content uses two-column regions only when labels remain readable.
- At 1280-1440 px, Deal Room uses a main workspace plus Assurance Rail.
- Wide layouts constrain line length and do not stretch operational rows.

## Accessibility

- WCAG AA contrast is the minimum target.
- Every interactive element has visible focus treatment.
- Menus, dialogs, forms, tabs, and disclosure controls are keyboard reachable.
- Inputs have explicit labels and errors are associated with their controls.
- Color is never the only indication of status.
- Loading uses non-flashing skeletons and all motion is disabled or reduced
  under reduced-motion preference.

## Transaction Language

- `Pending`: action is required or confirmation has not arrived.
- `Confirming`: submitted but not yet verified.
- `Confirmed on Testnet`: verified Testnet reference exists.
- `Protected`: both commitments cleared and escrow lock is recorded.
- `Delivered`: delivery milestone recorded, buyer review pending.
- `Settled`: deterministic completion and settlement references recorded.
- `Refunded`, `Expired`, `Cancelled`: terminal outcomes with explicit cause.
- Never label simulated or local values as on-chain verified.

## Forbidden Patterns

- Purple-blue AI gradients, glowing orbs, glassmorphism, gradient identity text.
- Universal hover-lift cards or oversized rounded containers.
- Arbitrary metric-card dashboard headers and vanity charts.
- Decorative stepper dots without actor, action, or evidence meaning.
- Fake testimonials, adoption claims, corporate logos, or trust badges.
- Emoji icons, mixed icon systems, hidden critical actions.
- Optimistic funded, protected, or settled UI before verified state exists.
