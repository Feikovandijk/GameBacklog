# GameBacklog Design System

## Overview

**GameBacklog Manager** is a personal Steam library management platform that lets users sync their Steam libraries, track their game backlog, view analytics, and manage progress through a Kanban-style board. The product has a strong "developer / power-user" identity — it's built for people who treat their game backlog like a project board.

The app surface visible to users is called **"DevTracker"** in the sidebar — a nod to its dev-analytics DNA.

### Products / Surfaces
| Surface | Path | Tech |
|---|---|---|
| **User Dashboard** (`user-dashboard/`) | Main product — Vite + React + TypeScript + Tailwind | Primary design surface |
| **Dev Dashboard** (`devdashboard/`) | Platform-wide analytics (intentionally undocumented publicly) | Secondary surface |
| **API** (`api/`) | Node.js / Express / Supabase backend | No UI |

### Source Materials
- **Codebase**: [github.com/Feikovandijk/GameBacklog](https://github.com/Feikovandijk/GameBacklog)
- **Style guide**: `user-dashboard/style_guide.md` (in repo)
- **Tailwind config**: `user-dashboard/tailwind.config.ts` (in repo)
- No Figma link was provided.

---

## CONTENT FUNDAMENTALS

### Tone & Voice
- **Direct and technical.** Copy reads like a developer built it for themselves. No marketing fluff.
- **Second person ("you").** e.g. "Sign in to manage your game backlog", "Your library", "Welcome back, {name}."
- **Sentence case** throughout — not title case for UI labels.
- **No emoji** anywhere in the UI. Zero.
- **Concise.** Labels are short: "Library", "Board", "Trends", "Analysis". Descriptions are one-liners.
- **Functional labels over friendly labels.** Status labels: `currently_playing → "Playing"`, `want_to_play → "To Play"`, `completed_100 → "100% Completed"`.

### Example Copy
- Page header: *"Developer Dashboard"* + sub: *"Welcome back, {name}. Here's what's happening in your game ecosystem today."*
- Empty state: *"You haven't tracked any games yet."* + CTA: *"Start Tracking"*
- Button: *"Track New Game"*, *"Sync Steam Library"*, *"Add Game"*
- Modal confirm: *"This will remove 4 games from this column on your board. They will remain in your library."*

---

## VISUAL FOUNDATIONS

### Colors
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#00E5BC` | CTAs, active nav items, progress bars, highlights |
| `primary-hover` | `#00C4A1` | Hover state for primary buttons |
| `background-dark` | `#0B1121` | Main page background |
| `surface-dark` | `#161E32` | Cards, sidebar, modals, panels |
| `surface-hover` | `#1F2943` | Hover state on list rows, nav items |
| `border-dark` | `#2A3550` | All borders, dividers |
| `text-secondary` | `#94A3B8` | Subtitles, metadata, placeholder text |
| `accent-blue` | `#00A3FF` | Info highlights, secondary stats |
| `accent-purple` | `#8B5CF6` | Creative/magic highlights, drag overlays, gradients |
| `accent-yellow` | `#EAB308` | Occasional attention elements |
| `success` | `#10B981` | Success states |
| `status-error` | `#EF4444` | Errors, delete actions |
| `accent-green` | `#4ECB71` | Positive trends |
| `accent-orange` | `#FFB347` | Warnings |

### Typography
- **Font family**: Manrope (Google Fonts), weights 200–800
- Both `display` and `body` map to Manrope — single font family
- **H1**: 2.25–3rem, bold (700), tight tracking (`tracking-tight`)
- **H2**: 1.25rem, bold
- **Body**: 0.875–1rem, regular/medium
- **Labels/metadata**: 0.75rem, semibold uppercase for table headers
- **Monospace values**: `font-mono` for numbers, prices, player counts

### Spacing & Layout
- Fixed **64px sidebar** (w-64) on md+ screens
- **Sticky header** with `backdrop-blur-md` + `bg-background-dark/50` — glassmorphic
- Main content: `p-6 md:p-8 lg:px-10` padding
- Card grid: `gap-6` standard, `gap-4` tight (kanban)

### Cards
- Background: `bg-surface-dark`
- Border: `border border-border-dark`
- Radius: `rounded-2xl` (1rem) for cards, `rounded-xl` (0.75rem) for smaller elements
- Hover: `hover:border-primary/30` border highlight
- Shadow: subtle `shadow-sm`; primary glow: `shadow-lg shadow-primary/20`
- **No colored left-border accent** pattern

### Backgrounds
- **Dark mode only** — no light mode toggle in production
- Background is a flat deep navy (`#0B1121`) — no gradients on the page itself
- Login page uses radial gradient overlays: `accent-purple/20` top-left, `accent-blue/20` bottom-right — these are the ONLY decorative gradients
- Game card thumbnails use fallback gradients (indigo→purple, slate, emerald→teal, etc.) when Steam images unavailable

### Borders & Radii
- Cards: `rounded-2xl` (16px)
- Buttons, inputs, chips: `rounded-xl` (12px)
- Small chips / badges: `rounded-full` or `rounded-lg`
- Borders: always `border-dark` (`#2A3550`) at 1px
- Selected/active borders: `border-primary/50` or `border-primary/30`

### Animations & Transitions
- `transition-colors` on interactive elements (buttons, nav items, table rows)
- `transition-all` for hover states with multiple property changes
- Framer Motion `AnimatePresence` used for view mode switches (grid ↔ list)
- Loading spinners: `animate-spin rounded-full border-b-2 border-primary` (teal spinner)
- **No bounce animations.** Easing is standard ease-in-out.
- Icon micro-interactions: `group-hover:scale-110` on nav icons

### Interactive States
- **Hover nav**: `text-text-secondary → text-white + bg-surface-hover`
- **Active nav**: `bg-primary text-background-dark shadow-lg shadow-primary/20`
- **Button hover**: `bg-primary-hover` (slightly darker teal)
- **Row hover**: `hover:bg-surface-hover/50`
- **Card hover**: `hover:border-primary/50` + title `group-hover:text-primary`
- **Press states**: no shrink — colors only

### Shadows
- Primary glow: `shadow-lg shadow-primary/20` (teal glow on active buttons)
- Avatar glow: `shadow-lg shadow-primary/30` on logo
- Drag overlay: `shadow-2xl` + rotated 2deg

### Imagery
- **Game art**: Steam CDN images (`cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg`)
- Images used as `mix-blend-overlay opacity-60` overlaid on dark gradient fallbacks
- **No hand-drawn illustrations.** No textures. No patterns.
- Color vibe: dark, cool navy blues with teal accent. Cool-toned.

### Use of Transparency & Blur
- Glassmorphic sticky header: `bg-background-dark/50 backdrop-blur-md`
- Login card: `bg-surface-dark/50 backdrop-blur-xl border border-white/10`
- Overlays/modals: `bg-black/80 backdrop-blur-sm`
- Subtle: `bg-primary/10` for icon container tints

---

## ICONOGRAPHY

**Icon system: Google Material Symbols Outlined**

Usage pattern throughout the entire codebase:
```tsx
<span className="material-symbols-outlined text-[20px]">icon_name</span>
```

Loaded via Google Fonts CDN:
```
https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200
```

- **Fill**: always 0 (outlined, not filled)
- **Size**: `text-[20px]` standard, `text-[18px]` small, `text-[24px]` large
- **Weight**: inherits from font; active items use `font-bold` class on the span
- **No SVG icons** from file — all icons are the Material Symbols font
- **No emoji** used as icons
- **No unicode chars** as icons

### Key icons used
`dashboard`, `library_books`, `view_kanban`, `trending_up`, `analytics`, `settings`, `search`, `notifications`, `person`, `logout`, `add`, `add_circle`, `sync`, `edit`, `bookmark`, `inventory_2`, `note_alt`, `history`, `candlestick_chart`, `schedule`, `sports_esports`, `code`, `grid_view`, `view_list`, `arrow_forward`, `chevron_left`, `chevron_right`, `expand_more`, `warning`, `calendar_today`

---

## File Index

```
README.md                        — This file
SKILL.md                         — Agent skill definition
colors_and_type.css              — CSS custom properties for all colors + typography
assets/                          — Logos and visual assets
preview/                         — Design System card previews
  colors-brand.html              — Brand color palette
  colors-semantic.html           — Semantic / status colors
  type-scale.html                — Typography scale
  type-specimens.html            — Type specimens in context
  spacing-tokens.html            — Border radius + spacing tokens
  components-buttons.html        — Button states
  components-nav.html            — Sidebar + nav items
  components-cards.html          — Stat cards + game cards
  components-badges.html         — Status badges
  components-inputs.html         — Form inputs + search
  components-table.html          — Table rows
  components-modals.html         — Modal dialogs
ui_kits/
  user-dashboard/
    README.md                    — UI kit notes
    index.html                   — Interactive prototype (login → dashboard → library → kanban)
    Components.jsx               — Shared UI components
    LoginPage.jsx                — Login screen
    DashboardPage.jsx            — Dashboard overview
    LibraryPage.jsx              — Game library grid/list
    KanbanPage.jsx               — Kanban board
```
