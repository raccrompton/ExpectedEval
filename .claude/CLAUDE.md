# Project Development Guidelines

> Static rules and coding standards. Claude reads this automatically. Do not modify.

---

## Definition of Done

A coding task is **not complete** until:

1. Review agents have run on all modified files:
   - `code-standards-reviewer`
   - `architect`
2. All agent issues are resolved
3. If committing: `docs-updater` agent has run with summary of work
4. On-stop hook passes (type check, lint, format)

Skipping these steps is not allowed.

---

## Workflow Sequence

Follow these steps in order for every coding task.

### Step 1: Before Writing Code

1. Read `.claude/skills/comment-standards.md`
2. Read additional skills files for your task type:
   - TypeScript/JS → `typescript-standards.md`
   - React/TSX → `typescript-standards.md` + `react-standards.md`
   - Python → `python-standards.md`
   - Features/bug fixes → `testing-standards.md`

### Step 2: Write Code (TDD Cycle)

1. **Red**: Write a failing test that defines expected behavior
2. **Red**: Run the test, confirm it fails
3. **Green**: Write minimum code to make the test pass
4. **Refactor**: Clean up while keeping tests green
5. **Verify**: Run full test suite (120-second timeout) to catch regressions

### Step 3: After Writing Code

Skip this step only if no code files were modified. Track which files you modify throughout the task.

1. Invoke `code-standards-reviewer` and `architect` agents with your modified files
2. Address any failures before proceeding

### Step 4: Before Committing

1. Run linter and fix issues
2. Run tests
3. Review changes with `git diff`
4. If code files changed, invoke `docs-updater` agent with summary of work done
5. Commit using conventional format: `type(scope): description`

### Step 5: After Finishing (Automatic)

The `on-stop.sh` hook automatically verifies:

- Type checking passes
- Linting rules satisfied
- Code is properly formatted

If any check fails, fix the issues before considering the task complete.

---

## Core Principles

### 1. Verification Before Action

- **Never assume** — always verify current state before making changes
- **Read before writing** — understand existing code patterns before modifying
- **Test before and after** — write failing test first, verify it passes after implementation

### 2. Minimal Changes

- Make the smallest change that solves the problem
- Avoid refactoring code unrelated to the current task
- Don't add features or "improvements" unless explicitly requested

### 3. Consistency Over Preference

- Follow existing patterns in the codebase
- Match the style of surrounding code
- Use established project conventions, not personal preferences

---

## TDD Workflow Details

### Test Order by Feature Type

| Feature Type  | Write First      | Then                 |
| ------------- | ---------------- | -------------------- |
| UI/User flows | E2E (Playwright) | Component/unit tests |
| API/Backend   | Integration test | Unit tests           |
| Pure logic    | Unit test        | —                    |

### For Each Feature

1. Write E2E/integration test defining the user-visible behavior
2. Write unit tests for complex logic
3. Implement to make tests pass
4. Verify no regressions (all previous tests still pass)

### Prototypes

Write tests concurrently. No untested code merges to main.

See `.claude/skills/testing-standards.md` for test quality standards.

---

## Git Workflow Details

### Commit Message Format

- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep subject line under 72 characters
- Use imperative mood: "Add feature" not "Added feature"

### Commit Attribution

- No "Generated with Claude Code" or "Co-Authored-By: Claude" lines
- Enforced via `gitCommitCoAuthor: false` in `.claude/settings.json`

---

## MCP Servers

This project uses MCP servers configured in `.mcp.json`.

| Server       | When to Use                                                              |
| ------------ | ------------------------------------------------------------------------ |
| **context7** | Automatically for code generation, setup/configuration, and library docs |
| **github**   | For PR reviews, issue management, and repository operations              |

### context7 Usage

Automatically use `resolve-library-id` then `get-library-docs` without being asked when:

- Generating code that uses external libraries
- Providing setup or configuration steps for tools/frameworks
- Answering questions about library/API usage
- Writing code that integrates with third-party services

### github Usage

Prefer MCP tools over raw `gh` CLI commands for structured data access.

---

## Memory & Documentation

| File                | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `.claude/CLAUDE.md` | Static rules and standards — do not modify     |
| `CLAUDE.md` (root)  | Living document for project context and memory |

The `docs-updater` agent automatically updates root `CLAUDE.md` after code changes. It evaluates whether to update sections based on work done.
