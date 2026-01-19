# GameBacklog Development Style Guide

## 1. Design System & Theme

### Core Principles

- **Aesthetic**: Premium, "Gamer-centric", Modern, Dark Mode First.
- **Primary Colors**:
  - Primary Teal: `#00E5BC` (Action buttons, highlights, progress bars)
  - Background Dark: `#0B1121` (Main application background)
  - Surface Dark: `#161E32` (Cards, sidebars, modals)
- **Typography**:
  - Font Family: `Manrope` (Google Fonts)
  - Weights: Regular (400), Medium (500), Bold (700)

### Tailwind Configuration

We use a custom Tailwind configuration. Always use these semantic utility classes instead of hardcoded hex values.

| Semantic Name  | Class                         | Hex       | Usage                       |
| -------------- | ----------------------------- | --------- | --------------------------- |
| Primary        | `bg-primary` / `text-primary` | `#00E5BC` | Main actions, active states |
| Background     | `bg-background-dark`          | `#0B1121` | Page background             |
| Surface        | `bg-surface-dark`             | `#161E32` | Cards, sidepanel            |
| Surface Hover  | `bg-surface-hover`            | `#1F2943` | Hover states for list items |
| Border         | `border-border-dark`          | `#2A3550` | Dividers, card borders      |
| Text Secondary | `text-text-secondary`         | `#94A3B8` | Subtitles, metadata         |
| Accent Blue    | `text-accent-blue`            | `#00A3FF` | Info highlights             |
| Accent Purple  | `text-accent-purple`          | `#8B5CF6` | Creative/Magic highlights   |

## 2. Component Development

### Directory Structure

```
src/
├── components/         # Reusable UI components
│   ├── AppLayout.tsx   # Main layout shell
│   └── ...
├── services/           # API clients and types
│   └── api.ts          # Centralized API definition
├── App.tsx             # Main router setup
└── main.tsx            # Entry point
```

### Styling Guidelines

1. **Use Tailwind Utilities**: Avoid writing custom CSS in `index.css` unless for complex animations or resets.
2. **Dark Mode Default**: Build for dark mode first. Ensure `dark:` variants are used if supporting light mode switch (though current enforcement is Dark).
3. **Responsive Design**: Use mobile-first approach or at least ensure `md:` and `lg:` breakpoints are handled for complex grids.
   - Example: `grid-cols-1 md:grid-cols-3`
4. **Interactive Elements**: Always include `:hover` and `transition-colors` or `transition-all` on interactive elements.
   - Example: `hover:bg-primary-hover transition-colors`

### Component Pattern

```tsx
import React from 'react';

interface MyComponentProps {
  title: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <div className='bg-surface-dark p-6 rounded-2xl border border-border-dark'>
      <h2 className='text-white text-xl font-bold'>{title}</h2>
    </div>
  );
};
```

## 3. API & Data Fetching

- **Location**: All API calls must be defined in `src/services/api.ts`.
- **Client**: Use the exported `api` axios instance which handles `API_BASE_URL` and credentials.
- **Typing**: Always define and export interfaces for API responses (e.g., `User`, `Game`, `UserGame`).

## 4. Icons & Assets

- **Icons**: Use Google Material Symbols Outlined.
- **Implementation**:
  ```tsx
  <span className='material-symbols-outlined text-[20px]'>icon_name</span>
  ```

## 5. State Management

- Use local `useState` for component-level UI state.
- Use `useEffect` for data fetching on mount.
- For complex global state, consider context or a library (currently simple state is sufficient).

## 6. General Coding Standards

- **Linter**: ESLint + Prettier.
- **File Naming**: PascalCase for Components (`GameCard.tsx`), camelCase for logic/services (`api.ts`).
- **Clean Code**: Remove `console.log` before committing (except for critical error logging).
