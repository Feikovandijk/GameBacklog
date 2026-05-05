# GameBacklog User Dashboard — UI Kit

## Overview
Interactive click-through prototype of the GameBacklog user-facing "DevTracker" app.

## Screens
- **Login** — Steam OAuth login screen with glassmorphic card
- **Dashboard** — Stat cards, recently played, market pulse table, popular tags
- **Library** — Game grid (card view) + list view with filters and search
- **Board** — Kanban columns (Backlog / Playing / Completed / Dropped)

## Usage
Open `index.html` for the full prototype.

## Component Files
| File | Contents |
|---|---|
| `Components.jsx` | Shared: Icon, StatusBadge, StatCard, GameCard, AppLayout, mock data |
| `LoginPage.jsx` | Login screen |
| `DashboardPage.jsx` | Dashboard overview |
| `LibraryPage.jsx` | Game library (grid + list) |
| `KanbanPage.jsx` | Kanban board |

## Design Notes
- Dark mode only, `#0B1121` background
- Font: Manrope (Google Fonts)
- Icons: Google Material Symbols Outlined
- Primary: `#00E5BC` (teal)
- Cards: `rounded-2xl`, `border-border-dark`
- Active nav: `bg-primary text-background-dark`
