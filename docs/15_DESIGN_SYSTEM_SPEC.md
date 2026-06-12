# 15 - Design System Specification

## Style direction

Settleway should feel like a serious B2B marketplace with a modern fintech/trust layer.

## Suggested tokens

Use Tailwind defaults where possible. Do not over-customize early.

Color concepts:

- Background: white / slate-50.
- Text: slate-900 / slate-700.
- Primary: emerald/green.
- Warning: amber.
- Error: red.
- Info: blue.
- Borders: slate-200.

## Typography

Use system fonts. Prefer clear hierarchy over decorative typography.

## Components requirements

Buttons:

- primary;
- secondary;
- ghost;
- danger.

Cards:

- rounded corners;
- subtle border;
- clear headings.

StatusPill:

- semantic colors;
- readable labels.

MoneyBreakdown:

- use table-like structure;
- align numbers clearly;
- explain each bond/fee.

EscrowStepper:

- show completed/current/pending states.

Timeline:

- chronological;
- actor;
- event type;
- tx/proof hash when available.

## Accessibility

- Good color contrast.
- Button text must be clear.
- Forms need labels.
- Status must not rely on color alone.
