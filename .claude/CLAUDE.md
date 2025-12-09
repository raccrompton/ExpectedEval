# Project Development Guidelines

> This file contains project-specific rules and coding standards. Claude reads this automatically.

---

## Documentation Standards

> **MANDATORY**: All code must follow educational documentation standards.

**Reference**: `.claude/skills/educational-documentation.md`

### Requirements
- **Line-by-line comments** explaining purpose and reasoning in plain English
- **File-level documentation** explaining the file's role and dependencies
- **Function-level documentation** with parameters, returns, and examples
- **Explain programming concepts** that beginners might not know
- Comments should teach the "why", not just restate the code

Write code as if teaching a friend who is learning to program.

---

## Core Principles

### 1. Verification Before Action
- **Never assume** - Always verify current state before making changes
- **Read before writing** - Understand existing code patterns before modifying
- **Test after changes** - Verify changes work as expected

### 2. Minimal Changes
- Make the smallest change that solves the problem
- Avoid refactoring code unrelated to the current task
- Don't add features or "improvements" unless explicitly requested

### 3. Consistency Over Preference
- Follow existing patterns in the codebase
- Match the style of surrounding code
- Use established project conventions, not personal preferences

---

## Mandatory Workflows

### After Every Code Change
Claude **MUST** invoke the `code-standards-reviewer` agent to verify:
- Code follows project style guidelines
- No regressions introduced
- Patterns match existing codebase

### For Architecture Decisions
Claude **MUST** invoke the `architect` agent when:
- Adding new files or modules
- Changing project structure
- Implementing new features
- Making security-related changes

---

## Project Structure

> **Example**: Replace with your actual project layout.

```
# Example: React/TypeScript web project
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page/route components
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API/external service integrations
│   └── types/              # Type definitions
├── tests/
├── public/

# Example: Python project
├── src/
│   ├── core/               # Core business logic
│   ├── api/                # API endpoints
│   ├── models/             # Data models
│   └── utils/
├── tests/

# Always present (Claude configuration)
├── .claude/
│   ├── agents/             # Subagent definitions
│   ├── hooks/              # Automation scripts
│   └── skills/             # Domain knowledge files
└── CLAUDE.md
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `API_ENDPOINTS.ts` |
| Test files | *.test.* or *.spec.* | `auth.test.ts` |
| Config files | lowercase with dots | `eslint.config.js` |

---

## Code Quality Standards

### General Rules
- **No magic numbers** - Use named constants
- **No commented-out code** - Delete it; use git history
- **No console.log in production** - Use proper logging
- **Handle errors explicitly** - Don't swallow exceptions

### Type Safety (TypeScript)
- Explicit type annotations for function parameters and return types
- Avoid `any` - Use `unknown` and type guards instead
- No type assertions (`as Type`) - Use proper type narrowing
- Prefer `interface` for objects, `type` for unions/intersections

### Functions
- Single responsibility - One function, one job
- Keep functions small - Under 50 lines ideally
- Descriptive names that indicate behavior
- Return early for edge cases (guard clauses)

### Comments
- Follow educational documentation standards (see Documentation Standards above)
- Every line should have a comment explaining purpose and reasoning
- No TODO comments in production code
- JSDoc for public APIs

---

## Testing Requirements

### Before Submitting Changes
1. All existing tests must pass
2. New functionality requires new tests
3. Bug fixes should include regression tests

### Test Organization
- Co-locate tests with source files OR use dedicated test directory
- Name tests descriptively: `should_return_null_when_input_is_empty`
- One assertion concept per test

---

## Development Commands

> **Example**: Replace with your project's actual commands.

```bash
# Example: Node.js/TypeScript project
npm run dev              # Start development server
npm run build            # Production build
npm test                 # Run all tests
npm run lint             # Check for lint errors
npm run typecheck        # TypeScript type checking

# Example: Python project
python -m pytest         # Run tests
ruff check .             # Lint
mypy src/                # Type checking
black --check .          # Format check
```

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
- Do not include "Generated with Claude Code" or "Co-Authored-By: Claude" lines
- Commits should have clean messages with no AI attribution
- This is enforced via `gitCommitCoAuthor: false` in `.claude/settings.json`

---

## Security Checklist

- [ ] No secrets in code (use environment variables)
- [ ] Input validation on all user data
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries to prevent SQL injection
- [ ] Authentication checks on protected routes
- [ ] Rate limiting on public endpoints

---

## Skills Reference

For detailed coding standards, Claude should reference:
- `.claude/skills/typescript-standards.md` - TypeScript/JavaScript patterns
- `.claude/skills/python-standards.md` - Python patterns (if applicable)
- `.claude/skills/testing-standards.md` - Testing best practices
- `.claude/skills/educational-documentation.md` - **Required** educational comment standards

---

## MCP Servers

This project uses MCP (Model Context Protocol) servers configured in `.mcp.json`.

### Required Servers

| Server | When to Use |
|--------|-------------|
| **context7** | **Always** check library docs before suggesting API usage for external libraries |
| **github** | For PR reviews, issue management, and repository operations |

### Usage Guidelines

- **context7**: Before writing code that uses external libraries, use `resolve-library-id` then `get-library-docs` to get current API documentation. This prevents outdated API suggestions.
- **github**: Prefer MCP tools over raw `gh` CLI commands for structured data access to PRs, issues, and repository content.

---

## On-Stop Hook

When Claude finishes a task, the `on-stop.sh` hook automatically runs to verify:
- Type checking passes
- All tests pass
- Linting rules satisfied
- Code is properly formatted

**Claude must address any failures** before considering the task complete.
