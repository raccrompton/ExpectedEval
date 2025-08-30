# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **ExpectedEval** - a sophisticated chess analysis and training platform originally based on the Maia Chess Platform. ExpectedEval is now an independent project designed to enhance chess analysis capabilities with advanced expected evaluation features, leveraging human-like chess AI (Maia) alongside traditional Stockfish engine capabilities.

**Repository**: https://github.com/raccrompton/ExpectedEval

**Current Implementation Status**: The platform provides comprehensive chess analysis using dual Stockfish/Maia engines with winrate-based move evaluation. **Expected Winrate analysis: Core implementation complete, integration pending**. **Development Progress**: Phase 0 (Architecture Analysis), Phase 1.1 (Type Definitions), Phase 2.1 (Controller Hook), Phase 2.2 (Core Algorithm Functions), and Phase 2.3 (UI Components) implemented with comprehensive testing infrastructure. **Issues Recently Fixed**: Stockfish API mismatch corrected (streamEvaluations() API), missing UI components created (Button, format utilities). **Current Status**: Ready for Phase 3.1 (AnalysisSidebar Integration) - ExpectedWinrateControls and ExpectedWinrateResults components need wiring into AnalysisSidebar.tsx.

## Technology Stack

- **Next.js 15.2.3** (Pages Router, not App Router)
- **React 18.3.1** with TypeScript 5.1.6
- **Tailwind CSS 3.4.10** with custom theme system
- **Stockfish WebAssembly** (`lila-stockfish-web`) + **ONNX Runtime Web** for chess engines
- **Jest** with Testing Library for testing
- **Framer Motion 11.18.2** for animations
- **Recharts 2.15.0** for data visualization
- **Chess.ts 0.16.2** for chess game logic

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run export       # Export static site
npm run lint         # Run ESLint with auto-fix (ALWAYS run before committing)
npm test             # Run Jest tests
npx tsc --noEmit     # Check TypeScript errors without emitting files
```

### Test Commands
```bash
npm test             # Run all tests
npm test -- --watch # Run tests in watch mode
npm test -- --coverage # Run tests with coverage report
npm test specific.test.ts # Run specific test file
npm test -- --testPathPattern=expectedWinrate # Run tests matching pattern
npm run typecheck    # Check TypeScript with project version (5.1.6)
```

## Project Architecture

### State Management Pattern

The application follows a **Controller Hook + Context + Presentational Components** pattern:

1. **Controller Hooks** (`src/hooks/`): Contain all business logic and state management
   - `useAnalysisController` - Core chess position analysis logic
   - `usePlayController` - Game playing state and move handling  
   - `useTreeController` - Chess move tree navigation and variations
   - `useTrainingController` - Puzzle and training session management
   - `useTuringController` - Human vs AI discrimination testing
   - `useOpeningDrillController` - Opening practice and drills
   - `useExpectedWinrateController` - Expected Winrate analysis with engine coordination (IMPLEMENTED)

2. **Context Providers** (`src/contexts/`, `src/providers/`): Share controller state across components
   - Wrap controller hook state and methods
   - Enable consumption by child components without prop drilling
   - Examples: `AuthContext`, `ModalContext`, `StockfishEngineContext`, `MaiaEngineContext`, `SettingsContext`, `TourContext`

3. **Presentational Components** (`src/components/`): Pure UI components that receive data via props
   - Organized by feature domain (Analysis, Play, Openings, Training)
   - Consume contexts for state and actions

### File Organization

```
src/
├── api/             # Feature-based API client functions
├── components/      # UI components organized by feature domain
├── constants/       # Application constants and configuration
├── contexts/        # React Context definitions
├── hooks/           # Custom React hooks (business logic layer)
├── lib/             # Utility functions and helpers
├── pages/           # Next.js pages (Pages Router)
├── providers/       # Context provider implementations
├── styles/          # Global styles and Tailwind config
├── types/           # TypeScript type definitions by feature
└── test-utils.tsx   # Testing utilities and setup
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
- The platform adjusts centipawn scores: `cp *= -1` when `isBlackTurn`
- For winrate calculations: `cpToWinrate(cp * (isBlackTurn ? -1 : 1), false)`
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
- **Module Mapping**: Supports absolute imports with `src/` prefix and `@/` alias
- **Transform**: Handles TypeScript and JSX via Next.js babel presets
- **Transform Ignore**: Configured for chess libraries (`@react-chess`, `chess.ts`)

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
- **Prettier**: No semicolons, single quotes, 2-space indentation, Tailwind CSS class sorting
- **Pre-commit**: Always run `npm run lint` before committing
- **TypeScript**: Strict mode enabled with absolute imports via `src/` prefix

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
   - `useAnalysisController.ts` (lines 612-618) - Engine coordination patterns for Expected Winrate integration
   - `useEngineAnalysis.ts` - Engine readiness waits, conflict prevention, retry logic
   - `useMoveRecommendations.ts` (lines 659-667) - Move evaluation and processing patterns
2. **`src/providers/StockfishEngineContextProvider/`** - WebAssembly Stockfish integration
   - `engine.ts` (lines 195-219) - Critical perspective handling for current player evaluations
3. **`src/providers/MaiaEngineContextProvider/`** - ONNX Maia model handling
4. **`src/components/Analysis/`** - Analysis UI components with integration patterns
   - `AnalysisSidebar.tsx` (lines 177-186, 327-333) - Component replacement points for Expected Winrate
   - `MoveMap.tsx` - Responsive font sizing patterns using WindowSizeContext
   - `MovesByRating.tsx` (lines 42-48) - Container structure patterns for reuse
   - `MovesContainer.tsx` (lines 487-572, 574-664) - Tree visualization patterns for Expected Winrate tree UI
5. **`src/types/`** - TypeScript definitions for chess data structures
   - `expectedWinrate.ts` - Complete type definitions for Expected Winrate feature (269 lines, IMPLEMENTED)
   - `index.ts` - Barrel export includes Expected Winrate types
6. **Implementation Files** - Expected Winrate feature implementation
   - `src/hooks/useExpectedWinrateController/` - Controller logic with engine integration (~1,600 lines)
   - `src/components/Analysis/ExpectedWinrate/` - UI components with responsive design (900+ lines)
   - `__tests__/` - Comprehensive test coverage for algorithms and components
   - **Documentation**: `ExpectedWinrateAnalysis-PRD.md`, `ExpectedWinrate-DevelopmentPlan.md` (phase tracking)
7. **`next.config.js`** - Build configuration with WebAssembly support and API proxy
8. **`tailwind.config.js`** - Custom theme and responsive breakpoints
9. **`jest.config.js`** - Test configuration with module mapping for absolute imports

## Current Analysis Components

The platform currently implements sophisticated chess analysis through several key components:
- **AnalysisSidebar**: Main analysis interface container with responsive layout featuring two layout modes:
  - **Desktop Layout (xl+)**: 2-row layout with MoveMap at lines 177-186, MovesByRating at lines 151-156
  - **Mobile Layout (<xl)**: 3-row layout with MovesByRating at lines 327-333
- **MoveMap**: Visual representation of position evaluation and move quality with progressive font sizing
- **MovesByRating**: Ranked list of moves by engine evaluation with responsive container patterns
- **BlunderMeter**: Visual indicator of move quality and position assessment
- **Highlight**: Engine recommendations and move analysis display with Maia model selection
- **ConfigurableScreens**: Customizable analysis layout options

All components integrate with the analysis enabled/disabled toggle system and provide appropriate overlay states for disabled analysis mode.

## Project-Specific Information

### ExpectedEval Fork
This is a fork of the original Maia Chess Platform with additional Expected Winrate analysis capabilities:
- **Expected Winrate Analysis**: Advanced position evaluation with expected value calculations
  - **Status**: Core implementation complete, integration pending
  - **Implementation**: Complete system with ~1,600 lines of controller logic, 900+ lines of UI components, full test coverage
  - **Integration**: Uses existing engine contexts and analysis patterns, Stockfish API fixed, UI components created
  - **Remaining**: AnalysisSidebar integration (wiring components), backend auto-save (TODO placeholder)
- **Enhanced Move Evaluation**: Current implementation uses winrate-based move categorization instead of centipawn loss
- **Dual Engine Analysis**: Combines Stockfish objective evaluation with Maia human-like predictions

### Expected Winrate Development Progress and Integration Requirements

**Completed Phases:**
- **Phase 0**: Architecture integration analysis complete
- **Phase 1.1**: Type definitions implemented (269 lines in `src/types/expectedWinrate.ts`)
- **Phase 2.1**: Controller Hook implemented (`src/hooks/useExpectedWinrateController/`, ~1,600 lines total)
  - **Engine Coordination**: ✅ Stockfish integration (API fixed to use streamEvaluations())
  - **Cache Integration**: ✅ Session-based caching with Map storage
  - **Calculation Orchestrator**: ✅ Two-phase progressive calculation system
- **Phase 2.2**: Core Algorithm Functions implemented (integrated within controller)
- **Phase 2.3**: UI Components implemented (`src/components/Analysis/ExpectedWinrate/`, 900+ lines)
  - **ExpectedWinrateControls**: ✅ Parameter controls with responsive design
  - **ExpectedWinrateResults**: ✅ Results display with move ranking
  - **ExpectedWinrateTree**: ✅ Interactive tree visualization with board preview
  - **Supporting Components**: ✅ Button component and format utilities created
- **Testing Infrastructure**: Comprehensive test suite with controller and algorithm coverage

**Current Phase**: Phase 3.1 (AnalysisSidebar Integration)
- **Next Steps**: Wire ExpectedWinrateControls and ExpectedWinrateResults into AnalysisSidebar.tsx
- **Integration Status**: ❌ Components still need wiring (MoveMap and MovesByRating still rendered)
- **Backend Status**: ⚠️ Auto-save deferred (TODO placeholder in controller)
- **Final Step**: Enable Expected Winrate analysis within existing analysis framework

Based on Phase 0 analysis, the Expected Winrate feature integrates with existing architecture patterns:

#### Engine Integration Requirements:
- **Reuse Existing Engine Contexts**: Work within `StockfishEngineContext` and `MaiaEngineContext` rather than creating parallel systems
- **Follow `useEngineAnalysis` Patterns**: Use same engine readiness waits (3-second timeout), conflict prevention via `inProgressAnalyses` Set
- **Maintain Perspective Consistency**: Preserve current player perspective in evaluations (critical implementation detail)
- **Coordinate with Analysis State**: Use existing `setAnalysisState` counter for UI reactivity, integrate with auto-save system

#### UI Integration Requirements:
- **Component Replacement Strategy**: Replace MoveMap (lines 177-186) with `ExpectedWinrateControls`, replace MovesByRating (lines 327-333, 151-156) with `ExpectedWinrateResults`
- **Responsive Design Compliance**: Follow existing `xl:` breakpoint patterns (1280px), maintain container styling with `bg-background-1/60` and border patterns
- **Analysis Enabled/Disabled Integration**: Use existing overlay system for disabled states with appropriate messaging
- **WindowSizeContext Integration**: Implement progressive font sizing following existing patterns from MoveMap component

#### Data Processing Patterns:
- **Extend Existing Cache System**: Enhance `generateAnalysisCacheKey` rather than creating parallel caching, work with existing auto-save infrastructure
- **Reuse Move Processing Logic**: Adapt legal move enumeration and evaluation normalization from `useMoveRecommendations`
- **Maintain Data Quality Thresholds**: Follow existing patterns for meaningful analysis storage and backend sync

### Conventional Commits
The project follows [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Build process or auxiliary tool changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `docs:` - Documentation only changes
