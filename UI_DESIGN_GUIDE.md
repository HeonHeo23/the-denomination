# UI Design Guide

## Design Direction

Create a tactile institutional strategy game: archival, thoughtful, and consequential. Use paper, wood, ink, brass, seals, and restrained depth to support the feeling of managing a living denomination.

## Abstract Principles

- **Clarity before atmosphere:** Decorative elements support recognition, navigation, or decision-making.
- **Decisions have weight:** Important actions receive space, hierarchy, confirmation, and visible consequences.
- **State remains legible:** Active, inactive, changed, urgent, and settled states are immediately distinguishable.
- **Relationships tell the story:** The graph makes causes, effects, and institutional tensions easy to follow.
- **Progress feels deliberate:** Year advancement creates a rhythm of preparation, resolution, and reflection.
- **Information earns its space:** Detail appears progressively through nodes, dossiers, reports, and Chronicle entries.

## User Experience

The player should always understand:

1. Where the institution currently stands.
2. Which decisions are available.
3. What a decision costs.
4. Which relationships may respond.
5. What changed after the year advanced.
6. Which situations require attention.

The primary flow is:

`Orient → Inspect → Adjust → Forecast → Advance → Observe → Reflect`

## Interaction Rules

- Make **Advance Year** the clearest primary action.
- Use graph nodes as readable interactive pieces with clear focus and hover states.
- Keep the primary graph focused on active, graph-visible nodes. Preserve a
  just-ended node through the following playable turn, then remove it when
  the next turn begins resolving.
- Provide a searchable institutional index for every Scenario node, including
  inactive and graph-hidden nodes, with dossiers as the shared detail surface.
- Use dossiers for analysis and Stance editing.
- Use Sheets for overview, Situations, and Chronicle review, and more.
- Keep feedback timely and purposeful.

## Visual Hierarchy

Use scale, spacing, typography, alignment, and material contrast before decoration. Reserve stronger accents for player control, active Situations, changed state, warnings, and primary actions.

## Responsive and Accessible Behavior

Support 360px, 768px, and desktop layouts. Preserve keyboard navigation, visible focus, graph pan and zoom, accessible dialogs and Sheets, readable header truncation, strong contrast, and touch-friendly controls.

## Styling Ownership

- Global tokens, typography, resets, base styles, and Tailwind mappings belong in `src/index.css`.
  Styling Ownership
- shadcn primitives for standard reusable UI controls.
- Semantic theme tokens for shared visual values such as colors, borders, radii, and foreground/background relationships.
- Tailwind utilities for normal component layout, spacing, sizing, typography, responsive behavior, and interaction states.
- Custom CSS only when the style is substantially clearer or more practical in CSS than in Tailwind.
- Reuse surface, seal, meter, metadata, and state treatments across features.

### Components

Custom feature CSS is acceptable for:

- complex animations
- unusual pseudo-elements or selectors
- visualization or canvas-related styling
- complex state-dependent styling that becomes unreadable in Tailwind
- third-party library overrides

### Design Tokens

- Use semantic tokens instead of repeated raw visual values.
- Do not create a new token for a one-off value.

### Single Ownership

- Each visual property should have one clear owner.
- Do not define the same property for the same component in both Tailwind and CSS.
- Avoid Tailwind padding plus CSS padding on the same element, Tailwind colors overridden by feature CSS, duplicated responsive rules, or component CSS overriding shadcn defaults without a specific reason
- When migrating a style to Tailwind or a shared primitive, delete the superseded CSS

### Avoid

Do not introduce:

- !important without a documented external-library reason
- deep DOM-dependent selectors
- nth-child selectors for component semantics
- arbitrary absolute positioning used to repair normal layout
- duplicate utility classes implemented in CSS
- large global feature-specific style sections
- unnecessary Tailwind arbitrary values when standard tokens are sufficient
- tokens that are only used once
