# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Main app code
  - `api/` (feature-based API clients), `components/` (UI by feature), `contexts/` (React Context), `hooks/` (controller/business logic), `lib/` (utilities), `pages/` (Next.js routes), `providers/`, `styles/`, `types/`.
- `__tests__/`: Jest tests (unit/integration).
- `public/`: Static assets (icons, models, wasm).
- `.github/workflows/ci.yml`: Lint, test, build on PRs.
- Import aliases: `src/...` and `@/...` map to `src/`.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js dev server at http://localhost:3000.
- `npm run build`: Production build (outputs to `.next`).
- `npm start`: Run the production server.
- `npm run export`: Static export when needed.
- `npm run lint`: ESLint with Prettier integration (auto-fix).
- `npm test`: Run Jest test suite.
- `npm run typecheck`: TypeScript type checking without emit.

## Coding Style & Naming Conventions
- Formatting: Prettier (`semi: false`, `singleQuote: true`, `tabWidth: 2`, Tailwind class sorting).
- Linting: ESLint (`next/core-web-vitals`, TypeScript, Prettier). Fix before pushing.
- Naming: Components `PascalCase` (e.g., `GameBoard.tsx`); hooks `camelCase` with `use` prefix (e.g., `useLocalStorage.ts`); utilities `camelCase`; barrel exports via `index.ts`.
- Imports: Prefer `src/...` or `@/...` aliases; avoid long relative paths.

## Testing Guidelines
- Framework: Jest + React Testing Library (`jsdom`). Setup in `jest.setup.js` (mocks router, images, engines).
- Locations: `__tests__/**/*.{ts,tsx}` and `src/**/*.{test,spec}.{ts,tsx}`.
- Coverage: Collected from `src/**` (excludes `pages/` and `types/`). Example: `npm test -- --coverage`.
- Conventions: Mirror file names (`Component.test.tsx`, `useHook.test.ts`). Test critical hooks/controllers and rendering logic.

## Commit & Pull Request Guidelines
- Commits: Follow Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`).
- PRs: Include clear description, linked issues, and screenshots/GIFs for UI changes. Note testing strategy and risk.
- CI: PRs must pass lint, tests, and build (see `ci.yml`).

## Security & Configuration Tips
- Do not commit secrets. Use local env files (`.env.local`) when introducing config.
- Large assets live under `public/`; prefer remote fetching or compression when feasible.
