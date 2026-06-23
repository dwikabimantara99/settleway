# Settleway Aurora Visual Direction

Date: 2026-06-23
Status: Founder-approved visual gate

This document supersedes the Batch 1 Field Ledger art direction for new
frontend work. The product constitution, workflow, system architecture, and
transaction-language honesty rules remain unchanged.

## Why The Existing Frontend Felt Generic

The Batch 1 frontend established useful discipline, but its visible system was
too uniform:

- most content used the same bordered white card;
- green was used as the dominant answer for actions, status, and decoration;
- page composition followed a predictable heading, filter card, and repeated
  card grid;
- the landing page used generic SaaS statistics and feature-card patterns;
- shape, depth, and motion did not distinguish marketing, discovery, and
  financial operations;
- operational truth was available, but the visual hierarchy did not make the
  next actor, funding responsibility, and verification state feel immediate.

## Research Sources And Adapted Principles

The implementation was informed by current public product and design guidance:

- [Microsoft 365](https://www.office.com/) for a connected-product sense of
  composition, calm navigation, and layered entry surfaces.
- [Fluent 2 design system](https://fluent2.microsoft.design/) for hierarchy,
  proximity, semantic color, accessible controls, responsive reflow, restrained
  elevation, and motion that supports orientation.
- Existing Settleway product documents and Batch 1 screenshots for workflow,
  financial truth, and corridor continuity.

The implementation adapts principles, not pixels. It does not copy Microsoft
branding, proprietary assets, application icons, illustrations, layouts, font
files, or source code.

## Settleway-Specific Interpretation

Settleway Aurora is a premium digital trade workspace:

- deep navy establishes financial authority;
- Settleway green communicates commitment and successful movement;
- azure and cyan identify verification, connected systems, and Stellar context;
- warm-white and cool-neutral surfaces preserve agricultural and operational
  clarity;
- atmospheric aurora color is limited to hero composition, selected command
  surfaces, assurance moments, and technical verification;
- commodity photography remains concrete and inspectable;
- bilateral buyer and seller obligations receive equal visual weight;
- blockchain detail is secondary to plain-language product state.

## Token Decisions

- Typography uses a production-safe local stack led by `Segoe UI Variable`,
  `Inter`, and system UI. No font CDN or proprietary redistributed font file is
  introduced.
- Financial values use tabular numerals.
- Identifiers use the existing local monospace stack.
- Radius varies by function: compact controls, product surfaces, floating
  utilities, and hero composition do not share one universal shape.
- Elevation uses tonal navy shadows and limited acrylic material for navigation,
  menus, modal, and technical drawers.
- Motion is short and directional, with complete reduced-motion handling.
- Focus rings use high-contrast azure rather than decorative glow.

## Component Decisions

The reference implementation uses:

- a translucent public navigation bar with one account-entry action;
- a product-driven Marketplace menu;
- asymmetric landing capability modules and a living workflow line;
- a marketplace command deck, featured opportunity, and compact secondary
  listings;
- bilateral commitment rows for funding responsibility;
- the signature Aurora Assurance Rail for principal, bonds, fees, deadline,
  custody state, next actor, policy, and honest Stellar verification;
- a secondary technical verification drawer for addresses and references;
- explicit empty, loading, error, and image-fallback states.

## Rejected Anti-Patterns

- six identical feature cards;
- decorative gradient identity text;
- colored icon squares for every feature;
- neon crypto dashboards and exchange-terminal density;
- fake metrics, customers, testimonials, or production claims;
- glassmorphism across the whole application;
- false `confirmed on-chain` language without a real reference;
- card-inside-card repetition;
- unsupported filters or invented backend behavior;
- motion that delays actions or runs continuously without purpose.

## Asset Provenance Policy

- The Settleway mark is founder-provided and stored locally.
- Commodity images already in the repository are retained as local project
  assets.
- Lucide remains the single interface icon source under its existing package
  license.
- No external image, illustration, font file, or design-template asset is added
  in this batch.
- Any future external asset must be documented with source URL, author, license,
  permitted use, and local optimization details before use.
