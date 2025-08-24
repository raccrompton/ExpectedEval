# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Maia Chess Platform Frontend - a sophisticated chess analysis and training application featuring human-like chess AI (Maia) alongside traditional Stockfish engine capabilities.

## Technology Stack

- **Next.js 15.2.3** (Pages Router, not App Router)
- **React 18.3.1** with TypeScript 5.1.6
- **Tailwind CSS 3.4.10** with custom theme system
- **Stockfish WebAssembly** (`lila-stockfish-web`) + **ONNX Runtime Web** for chess engines
- **Jest** with Testing Library for testing
- **Framer Motion** for animations
- **Recharts** for data visualization

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint with auto-fix (ALWAYS run before committing)
npm test             # Run Jest tests
npx tsc --noEmit     # Check TypeScript errors without emitting files
```

## Project Architecture

### State Management Pattern

The application follows a **Controller Hook + Context + Presentational Components** pattern:

1. **Controller Hooks** (`src/hooks/`): Contain all business logic and state management
   - `useAnalysisController` - Core chess position analysis logic
   - `usePlayController` - Game playing state and move handling  
   - `useTreeController` - Chess move tree navigation and variations
   - `useTrainingController` - Puzzle and training session management

2. **Context Providers** (`src/contexts/`, `src/providers/`): Share controller state across components
   - Wrap controller hook state and methods
   - Enable consumption by child components without prop drilling
   - Examples: `AuthContext`, `ModalContext`, `StockfishEngineContext`, `MaiaEngineContext`

3. **Presentational Components** (`src/components/`): Pure UI components that receive data via props
   - Organized by feature domain (Analysis, Play, Openings, Training)
   - Consume contexts for state and actions

### File Organization

```
src/
├── api/             # Feature-based API client functions
├── components/      # UI components organized by feature domain
├── contexts/        # React Context definitions
├── hooks/           # Custom React hooks (business logic layer)
├── pages/           # Next.js pages (Pages Router)
├── providers/       # Context provider implementations
├── types/           # TypeScript type definitions by feature
├── lib/             # Utility functions and helpers
└── styles/          # Global styles and Tailwind config
```

### Import Strategy

- **Absolute imports**: Use `src/` prefix (configured in tsconfig.json)
- **Barrel exports**: Most directories have `index.ts` for clean imports
- **Example**: `import { useAnalysisController } from 'src/hooks'`

## Chess Engine Integration

### Dual-Engine Architecture

The platform runs two chess engines client-side:

#### Stockfish Engine (`src/contexts/StockfishEngineContext/`)
- **Implementation**: WebAssembly via `lila-stockfish-web` 
- **Purpose**: Provides "objective" best moves and evaluations
- **Files**: `public/stockfish/` (WASM + neural network files)
- **Key Feature**: Evaluations are converted to current player's perspective (not always White's)

#### Maia Engine (`src/contexts/MaiaEngineContext/`)
- **Implementation**: ONNX neural network with `onnxruntime-web`
- **Purpose**: Provides "human-like" move predictions at different skill levels
- **Models**: Multiple variants (1100-1900 rating levels) in `public/maia2/`
- **Key Feature**: Downloads models on-demand and caches them locally

### Critical Implementation Detail: Stockfish Evaluation Perspective

**IMPORTANT**: Stockfish evaluations are processed to be from the **current player's perspective**, not White's perspective:
- Stockfish's raw output is always from White's perspective
- The platform multiplies by -1 when it's Black's turn
- This ensures positive values always mean "good for whoever is moving next"
- Implementation in `src/providers/StockfishEngineContextProvider/engine.ts`

## API Integration

- **Proxy Setup**: Next.js rewrites `/api/*` to `https://dock2.csslab.ca/api/*`
- **Organization**: Feature-based modules in `src/api/`
- **Pattern**: Each feature exports functions through barrel exports
- **Base Path**: All calls use `/api/v1/` prefix

## Theme and Styling

### Tailwind Configuration (`tailwind.config.js`)
- **Custom Breakpoints**: `3xl` (1920px), `4xl` (2560px) for ultra-wide displays
- **CSS Custom Properties**: Color system uses CSS variables for theme switching
- **Dark Mode**: Class-based dark mode support

### Color System (`src/styles/themes.css`)
Uses CSS custom properties for consistent theming:
- `--color-backdrop`, `--color-text-primary`, `--color-text-secondary`
- Separate color schemes for human vs engine moves
- Responsive design considerations for mobile and large displays

## Testing Setup

### Jest Configuration (`jest.config.js`)
- **Environment**: jsdom for React component testing
- **Coverage**: Configured to exclude pages, types, and declaration files
- **Module Mapping**: Supports absolute imports with `src/` prefix
- **Transform**: Handles TypeScript and JSX via Next.js babel presets

### Test Organization
- **Location**: `__tests__/` directory mirrors `src/` structure
- **Patterns**: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- **Tools**: Testing Library for React component testing

## Build Configuration

### Next.js Config (`next.config.js`)
- **Transpilation**: Uses `next-transpile-modules` for `@react-chess/chessground`
- **Headers**: COOP/COEP headers for WebAssembly and SharedArrayBuffer support
- **Rewrites**: API proxy and PostHog analytics routing
- **Output**: Standalone mode for deployment

### Key Requirements
- **WebAssembly Support**: Requires specific headers for Stockfish WASM
- **CORS Configuration**: Handles chess engine and analytics integrations
- **Static Assets**: Chess piece SVGs, engine files, and model weights

## Development Workflow

### Code Quality
- **ESLint**: Next.js + TypeScript + Prettier integration
- **Prettier**: No semicolons, single quotes, 2-space indentation
- **Pre-commit**: Always run `npm run lint` before committing

### Branching Strategy
- **Main Branch**: `main` (synced with production deployment)
- **Development**: Feature branches merged via pull requests
- **Deployment**: Vercel automatic deployment from main branch

## Key Implementation Patterns

### Component Pattern
```typescript
interface ComponentNameProps {
  // Props interface
}

export const ComponentName = ({ prop1, prop2 }: ComponentNameProps) => {
  // Component implementation
}
```

### Controller Hook Pattern
```typescript
export const useFeatureController = () => {
  // State and business logic
  // Chess engine interactions
  // API calls
  
  return {
    // State and methods for components
  }
}
```

### Context Provider Pattern
```typescript
const FeatureContext = createContext<ControllerState | null>(null)

export const FeatureProvider = ({ children }) => {
  const controller = useFeatureController()
  return (
    <FeatureContext.Provider value={controller}>
      {children}
    </FeatureContext.Provider>
  )
}
```

## Critical Files for Understanding

1. **`src/hooks/useAnalysisController/`** - Core chess analysis logic and engine coordination
2. **`src/providers/StockfishEngineContextProvider/`** - WebAssembly Stockfish integration  
3. **`src/providers/MaiaEngineContextProvider/`** - ONNX Maia model handling
4. **`src/components/Analysis/`** - Analysis UI components and interactions
5. **`src/types/`** - TypeScript definitions for chess data structures
6. **`next.config.js`** - Build configuration with WebAssembly support
7. **`tailwind.config.js`** - Custom theme and responsive breakpoints
