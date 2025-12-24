# Project Development Guidelines

> Static rules and coding standards. Claude reads this automatically. Do not modify.

**TL;DR:**
1. Read skills files before writing code
2. Follow existing patterns, make minimal changes
3. Run review agents after every code change

---

## Core Principles

### 1. Verification Before Action
- **Never assume** — always verify current state before making changes
- **Read before writing** — understand existing code patterns before modifying
- **Test after changes** — verify changes work as expected

### 2. Minimal Changes
- Make the smallest change that solves the problem
- Avoid refactoring code unrelated to the current task
- Don't add features or "improvements" unless explicitly requested

### 3. Consistency Over Preference
- Follow existing patterns in the codebase
- Match the style of surrounding code
- Use established project conventions, not personal preferences

---

## Required Reading Before Writing Code

Read the relevant skills files before writing ANY code:

| Task Type | Required Files |
|-----------|----------------|
| Any code | `.claude/skills/comment-standards.md` |
| TypeScript/JS | `.claude/skills/typescript-standards.md` |
| React/JSX/TSX | `.claude/skills/react-standards.md` |
| Python | `.claude/skills/python-standards.md` |
| Tests | `.claude/skills/testing-standards.md` |

---

## MCP Servers

This project uses MCP servers configured in `.mcp.json`.

| Server | When to Use |
|--------|-------------|
| **context7** | **Always** check library docs before suggesting API usage for external libraries |
| **github** | For PR reviews, issue management, and repository operations |

**Usage:**
- **context7**: Use `resolve-library-id` then `get-library-docs` to get current API documentation before writing code that uses external libraries.
- **github**: Prefer MCP tools over raw `gh` CLI commands for structured data access.

---

## Mandatory Workflows

### After Every Code Change

Track which files you modify. Before completing any coding task, invoke both review agents:

```
Task(
  subagent_type="code-standards-reviewer",
  prompt="Review these files I modified: [list files here]"
)

Task(
  subagent_type="architect",
  prompt="Review these files I modified: [list files here]"
)
```

Skip reviews only if no code files were modified (research, planning, Q&A only).

### On-Stop Hook

When you finish a task, `on-stop.sh` automatically verifies:
- Type checking passes
- All tests pass
- Linting rules satisfied
- Code is properly formatted

Address any failures before considering the task complete.

---

## Git Workflow

### Commit Messages
- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep subject line under 72 characters
- Use imperative mood: "Add feature" not "Added feature"

### Before Committing
1. Run linter and fix issues
2. Run tests
3. Review changes with `git diff`

### Commit Attribution
- No "Generated with Claude Code" or "Co-Authored-By: Claude" lines
- Enforced via `gitCommitCoAuthor: false` in `.claude/settings.json`

---

## TDD Workflow (Frontend Rebuild)

The frontend is being rebuilt TDD-style. Follow this workflow:

### For Each Feature
1. **Write E2E test first** (`src/__tests__/e2e/XX-feature.spec.ts`)
2. **Write hook unit test** (if applicable)
3. **Implement to make tests pass**
4. **Verify no regressions** (all previous tests still pass)

### Key Files to Preserve
- `src/core/` — All core logic (259 passing tests)
- `public/stockfish/` — WASM files
- `public/maia2/` — ONNX model

### Files Being Rebuilt
- `src/pages/` — All pages
- `src/components/` — All components
- `src/hooks/` — All hooks
- `src/contexts/` — EngineContext

### Implementation Order
See `IMPLEMENTATION-STRATEGY.md` for detailed phases (4-11).

---

## Memory & Documentation

| File | Purpose |
|------|---------|
| `.claude/CLAUDE.md` | Static rules and standards — do not modify |
| `CLAUDE.md` (root) | Living document for project context and memory |

**Update the root `CLAUDE.md` when:**
- User expresses preferences (coding style, tools, workflows)
- Architecture changes (new features, dependencies, file structure)
- Important decisions are made (include rationale)
- Tasks are completed (update Plan & Progress)
