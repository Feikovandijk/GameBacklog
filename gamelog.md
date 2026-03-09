# gamelog.md — Channel Operating Notes for `#gamelog`

Purpose: keep backlog + release conversations actionable, short, and linked to the actual repo workflows.

## 1) Project map (quick mental model)

- `api/` — Node + TypeScript backend, Steam sync workers, Supabase integration
- `user-dashboard/` — React + Vite user-facing UI
- `devdashboard/` — React + Vite dev analytics UI
- `.github/workflows/ci.yml` — PR/push validation (lint, type-check, build, tests)
- `.github/workflows/docker-publish.yml` — image build/publish on `main` push or manual dispatch
- `docker-compose.yml` — runtime stack (`api`, `worker`, `user-dashboard`)

## 2) CI/CD truths to remember

- CI on PRs: `Validation & Build` (Node 20.x)
  - API: lint + type-check + audit + build + tests
  - User dashboard: lint + type-check + audit + build
- Docker publish workflow does **not** run on PR by default.
  - It runs on push to `main` (or manual dispatch).
- Buildx GHA cache requires permissions that include `actions: write` in workflow job permissions.

## 3) Backlog triage format (use this in-channel)

When a bug/task appears, classify it fast:

- **Type:** bug | chore | feature | infra
- **Area:** api | user-dashboard | devdashboard | ci/cd | docker | db
- **Severity:** S0 blocking | S1 high | S2 normal | S3 low
- **Impact:** who is blocked (devs/users/release)
- **Repro:** yes/no + shortest repro
- **Owner:** @name
- **Next action:** 1 concrete step

Template:

- **Issue:**
- **Type/Area:**
- **Severity:**
- **Impact:**
- **Repro:**
- **Owner:**
- **Next action:**

## 4) Ticket breakdown rules

Break work into reviewable chunks:

1. Diagnosis (prove root cause)
2. Minimal fix
3. Verification (local + CI checks)
4. Rollout/merge note

For CI/CD fixes, require:

- exact workflow file changed
- why previous permissions/trigger failed
- expected signal after merge (which workflow should run)

## 5) “Done” criteria by area

### API changes
- `npm run --prefix api lint:ci`
- `npm run --prefix api type-check`
- `npm run --prefix api build`
- `npm run --prefix api test`

### User dashboard changes
- `npm run --prefix user-dashboard lint:ci`
- `npm run --prefix user-dashboard type-check`
- `npm run --prefix user-dashboard build`

### Devdashboard changes
- `npm run --prefix devdashboard lint:ci`
- `npm run --prefix devdashboard type-check`
- `npm run --prefix devdashboard build`

### Docker/CI changes
- workflow syntax valid
- triggers/permissions explicitly reviewed
- confirm whether verification occurs on PR or only after merge/manual run

## 6) Release-risk labels (for quick prioritization)

- **release-blocker:** merge must wait
- **post-merge-verify:** safe PR checks, but needs main/manual verification (common for docker publish)
- **ops-followup:** not blocking, but needs tracking ticket

## 7) Preferred response style in `#gamelog`

- concise status first: `state → risk → next step`
- include branch/commit/PR numbers when available
- avoid generic “looks good”; always include one concrete verification point

Example:

- **State:** fix pushed in PR #43 (`6c90ab8`)
- **Risk:** docker publish not validated on PR trigger
- **Next:** merge, then confirm `Docker Build & Push` on `main` succeeds

## 8) Handy commands

```bash
# repo health
git status

# run PR-style checks locally
npm run --prefix api lint:ci && npm run --prefix api type-check && npm run --prefix api build && npm run --prefix api test
npm run --prefix user-dashboard lint:ci && npm run --prefix user-dashboard type-check && npm run --prefix user-dashboard build
npm run --prefix devdashboard lint:ci && npm run --prefix devdashboard type-check && npm run --prefix devdashboard build

# inspect workflows
ls .github/workflows
```

---

If this file drifts from actual workflows, update it immediately after the workflow change PR is merged.
