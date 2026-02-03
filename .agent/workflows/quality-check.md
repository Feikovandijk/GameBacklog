---
description: Run code quality checks (lint, type-check, test, format)
---

# Code Quality Checks

Run these before committing or to verify CI will pass.

## Full Quality Check (All Packages)

### API

// turbo

```bash
cd api && npm run lint && npm run type-check && npm run test
```

### User Dashboard

// turbo

```bash
cd user-dashboard && npm run lint && npm run type-check
```

## Individual Commands

### Linting

// turbo

```bash
cd api && npm run lint
cd user-dashboard && npm run lint
```

### Type Checking

// turbo

```bash
cd api && npm run type-check
cd user-dashboard && npm run type-check
```

### Auto-Fix Issues

Fix ESLint issues:
// turbo

```bash
cd api && npm run lint:fix
cd user-dashboard && npm run lint:fix
```

Format with Prettier:
// turbo

```bash
cd api && npm run format
cd user-dashboard && npm run format
```

## Run Tests

API tests (Jest):
// turbo

```bash
cd api && npm run test
```

With coverage:

```bash
cd api && npm run test:coverage
```

## Notes

- Pre-commit hooks auto-format staged files
- CI runs these checks on every push to `main` and `dev`
