# Project Development Guidelines

> Static rules and coding standards. Claude reads this automatically. Do not modify.

**Summary:**

1. Read skills files before writing code
2. Follow TDD: write failing test first, then implement
3. Follow existing patterns, make minimal changes
4. Run review agents after every code change

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

## Required Reading Before Writing Code

Read the relevant skills files before writing ANY code:

| Task Type          | Required Files                           |
| ------------------ | ---------------------------------------- |
| Any code           | `.claude/skills/comment-standards.md`    |
| Features/bug fixes | `.claude/skills/testing-standards.md`    |
| TypeScript/JS      | `.claude/skills/typescript-standards.md` |
| React/JSX/TSX      | `.claude/skills/react-standards.md`      |
| Python             | `.claude/skills/python-standards.md`     |

---

## MCP Servers

This project uses MCP servers configured in `.mcp.json`.

| Server       | When to Use                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| **context7** | **Automatically** for code generation, setup/configuration, and library docs |
| **github**   | For PR reviews, issue management, and repository operations                  |

**Usage:**

- **context7**: Automatically use `resolve-library-id` then `get-library-docs` without being asked when:
  - Generating code that uses external libraries
  - Providing setup or configuration steps for tools/frameworks
  - Answering questions about library/API usage
  - Writing code that integrates with third-party services
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

### TDD Workflow

Follow Red-Green-Refactor for all code changes:

1. **Red** — Write a failing test that defines expected behavior, watch it fail
2. **Green** — Write minimum code to make the test pass
3. **Refactor** — Clean up while keeping tests green
4. **Verify** — Run full test suite to catch regressions

**Test order by feature type:**

| Feature Type  | Test First       | Then                 |
| ------------- | ---------------- | -------------------- |
| UI/User flows | E2E (Playwright) | Component/unit tests |
| API/Backend   | Integration test | Unit tests           |
| Pure logic    | Unit test        | —                    |

**For each feature:**

1. Write E2E/integration test defining the user-visible behavior
2. Write unit tests for complex logic
3. Implement to make tests pass
4. Verify no regressions (all previous tests still pass)

**Prototypes:** Write tests concurrently. No untested code merges to main.

See `.claude/skills/testing-standards.md` for test quality standards.

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

## Memory & Documentation

| File                | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `.claude/CLAUDE.md` | Static rules and standards — do not modify     |
| `CLAUDE.md` (root)  | Living document for project context and memory |

**Update the root `CLAUDE.md` when:**

- User expresses preferences (coding style, tools, workflows)
- Architecture changes (new features, dependencies, file structure)
- Important decisions are made (include rationale)
- Tasks are completed (update Plan & Progress)
