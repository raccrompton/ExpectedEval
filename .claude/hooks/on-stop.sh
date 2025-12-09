#!/bin/bash

# =============================================================================
# ON-STOP HOOK - Multi-Language Support
# =============================================================================
# This script runs automatically when Claude finishes responding.
# It performs quality checks to ensure code meets project standards.
#
# IMPORTANT: Uses stop_hook_active flag to prevent infinite loops.
# On subsequent stops (when Claude responds to hook output), the script
# exits silently to prevent recursion.
#
# Supported Languages:
#   - Node.js/TypeScript (package.json)
#   - Python (pyproject.toml, requirements.txt, setup.py)
#   - Rust (Cargo.toml)
#   - Go (go.mod)
#   - C# (*.csproj, *.sln)
#
# Exit Codes:
#   0 - All checks passed (or hook already active)
#   2 - One or more checks failed
#
# The script auto-detects your project type and runs appropriate checks.
# You can override detection by setting PROJECT_TYPE environment variable.
# =============================================================================

# -----------------------------------------------------------------------------
# INFINITE LOOP PREVENTION
# -----------------------------------------------------------------------------
# Read JSON input from stdin to check if stop hook is already active
# If active, exit silently to prevent infinite recursion

INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | grep -o '"stop_hook_active":\s*true' || echo "")

if [ -n "$STOP_HOOK_ACTIVE" ]; then
    # Hook already active from previous stop - exit silently
    exit 0
fi

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------

# Set to "true" to enable each check category, "false" to disable
CHECK_TYPES="true"      # Type checking (tsc, mypy, etc.)
CHECK_LINT="true"       # Linting (eslint, ruff, clippy, etc.)
CHECK_FORMAT="true"     # Formatting (prettier, black, rustfmt, etc.)
CHECK_TESTS="true"      # Unit tests

# Override auto-detection by uncommenting and setting:
# PROJECT_TYPE="node"   # Options: node, python, rust, go, csharp

# -----------------------------------------------------------------------------
# COLORS AND UTILITIES
# -----------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

HAS_ERRORS=0

# Check if a command exists
has_command() {
    command -v "$1" >/dev/null 2>&1
}

# Check if an npm script exists
has_npm_script() {
    [ -f "package.json" ] && grep -q "\"$1\":" package.json 2>/dev/null
}

# Check if a Python tool is available (handles both direct and module invocation)
has_python_tool() {
    has_command "$1" || python3 -m "$1" --version >/dev/null 2>&1 || python -m "$1" --version >/dev/null 2>&1
}

# Run a check with timing and output capture
run_check() {
    local name="$1"
    local enabled="$2"
    local cmd="$3"

    if [ "$enabled" != "true" ]; then
        echo -e "${YELLOW}⏭️  $name: SKIPPED (disabled)${NC}"
        return 0
    fi

    if [ -z "$cmd" ]; then
        echo -e "${YELLOW}⏭️  $name: SKIPPED (no tool available)${NC}"
        return 0
    fi

    echo -e "${BLUE}▶ Running $name...${NC}"
    echo -e "${CYAN}  Command: $cmd${NC}"

    local start_time=$(date +%s)
    local output
    local exit_code

    output=$(eval "$cmd" 2>&1)
    exit_code=$?

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ $name: PASSED${NC} (${duration}s)"
    else
        echo -e "${RED}❌ $name: FAILED${NC} (${duration}s)"
        echo ""
        echo -e "${YELLOW}Output:${NC}"
        echo "$output" | head -50
        if [ $(echo "$output" | wc -l) -gt 50 ]; then
            echo -e "${YELLOW}... (output truncated)${NC}"
        fi
        echo ""
        HAS_ERRORS=1
    fi

    return $exit_code
}

# -----------------------------------------------------------------------------
# PROJECT TYPE DETECTION
# -----------------------------------------------------------------------------

detect_project_type() {
    # Allow manual override
    if [ -n "$PROJECT_TYPE" ]; then
        echo "$PROJECT_TYPE"
        return
    fi

    # Detect based on config files (order matters - more specific first)
    if [ -f "Cargo.toml" ]; then
        echo "rust"
    elif [ -f "go.mod" ]; then
        echo "go"
    elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
        echo "python"
    elif [ -f "package.json" ]; then
        echo "node"
    elif ls *.csproj >/dev/null 2>&1 || ls *.sln >/dev/null 2>&1; then
        echo "csharp"
    else
        echo "unknown"
    fi
}

# -----------------------------------------------------------------------------
# LANGUAGE-SPECIFIC COMMAND CONFIGURATION
# -----------------------------------------------------------------------------

# Sets CMD_TYPES, CMD_LINT, CMD_FORMAT, CMD_TESTS based on project type
configure_commands() {
    local project_type="$1"

    # Reset commands
    CMD_TYPES=""
    CMD_LINT=""
    CMD_FORMAT=""
    CMD_TESTS=""

    case "$project_type" in
        node)
            # Node.js / TypeScript
            # Prefer npm scripts, fall back to direct commands
            if has_npm_script "typecheck"; then
                CMD_TYPES="npm run typecheck"
            elif has_npm_script "type-check"; then
                CMD_TYPES="npm run type-check"
            elif has_command "tsc"; then
                CMD_TYPES="npx tsc --noEmit"
            fi

            if has_npm_script "lint"; then
                CMD_LINT="npm run lint"
            elif has_command "eslint"; then
                CMD_LINT="npx eslint ."
            fi

            if has_npm_script "format:check"; then
                CMD_FORMAT="npm run format:check"
            elif has_npm_script "format"; then
                CMD_FORMAT="npm run format -- --check"
            elif has_command "prettier"; then
                CMD_FORMAT="npx prettier --check ."
            fi

            if has_npm_script "test"; then
                CMD_TESTS="npm test"
            elif has_command "vitest"; then
                CMD_TESTS="npx vitest run"
            elif has_command "jest"; then
                CMD_TESTS="npx jest"
            fi
            ;;

        python)
            # Python
            # Type checking
            if has_python_tool "mypy"; then
                # Check for src layout or flat layout
                if [ -d "src" ]; then
                    CMD_TYPES="python3 -m mypy src"
                else
                    CMD_TYPES="python3 -m mypy ."
                fi
            elif has_python_tool "pyright"; then
                CMD_TYPES="pyright"
            fi

            # Linting - prefer ruff (fast), fall back to flake8/pylint
            if has_python_tool "ruff"; then
                CMD_LINT="python3 -m ruff check ."
            elif has_python_tool "flake8"; then
                CMD_LINT="python3 -m flake8 ."
            elif has_python_tool "pylint"; then
                if [ -d "src" ]; then
                    CMD_LINT="python3 -m pylint src"
                fi
            fi

            # Formatting - prefer ruff format, fall back to black
            if has_python_tool "ruff"; then
                CMD_FORMAT="python3 -m ruff format --check ."
            elif has_python_tool "black"; then
                CMD_FORMAT="python3 -m black --check ."
            fi

            # Tests
            if has_python_tool "pytest"; then
                CMD_TESTS="python3 -m pytest"
            elif [ -f "manage.py" ]; then
                CMD_TESTS="python3 manage.py test"
            fi
            ;;

        rust)
            # Rust
            if has_command "cargo"; then
                CMD_TYPES="cargo check"
                CMD_LINT="cargo clippy -- -D warnings"
                CMD_FORMAT="cargo fmt --check"
                CMD_TESTS="cargo test"
            fi
            ;;

        go)
            # Go
            if has_command "go"; then
                CMD_TYPES="go build ./..."
                CMD_LINT="go vet ./..."
                if has_command "gofmt"; then
                    CMD_FORMAT="test -z \"\$(gofmt -l .)\""
                fi
                CMD_TESTS="go test ./..."
            fi
            # Use golangci-lint if available (more comprehensive)
            if has_command "golangci-lint"; then
                CMD_LINT="golangci-lint run"
            fi
            ;;

        csharp)
            # C# (.NET)
            if has_command "dotnet"; then
                CMD_TYPES="dotnet build --no-restore"
                CMD_FORMAT="dotnet format --verify-no-changes"
                CMD_TESTS="dotnet test --no-build"
            fi
            ;;

        *)
            echo -e "${YELLOW}⚠️  Unknown project type. No checks configured.${NC}"
            echo -e "${YELLOW}   Set PROJECT_TYPE env var or add a config file.${NC}"
            ;;
    esac
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------

# Print header
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    CODE QUALITY CHECKS                      ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detect and configure
PROJECT_TYPE=$(detect_project_type)
echo -e "${CYAN}📦 Detected project type: ${PROJECT_TYPE}${NC}"
echo ""

configure_commands "$PROJECT_TYPE"

# Run all checks
run_check "Type Check" "$CHECK_TYPES" "$CMD_TYPES"
run_check "Lint" "$CHECK_LINT" "$CMD_LINT"
run_check "Format" "$CHECK_FORMAT" "$CMD_FORMAT"
run_check "Tests" "$CHECK_TESTS" "$CMD_TESTS"

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $HAS_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✨ All checks passed!${NC}"
else
    echo -e "${RED}⚠️  Some checks failed. Please review and fix issues.${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Agent invocation reminder
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 AGENT REVIEW REMINDER${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "If you modified code, invoke the review agents:"
echo ""
echo "  • code-standards-reviewer - For code quality, documentation, naming"
echo "  • architect - For new files, features, security changes"
echo ""
echo "Use Task tool with subagent_type='general-purpose' and reference"
echo "the agent definitions in .claude/agents/"
echo ""

# Exit with appropriate code
if [ $HAS_ERRORS -eq 0 ]; then
    exit 0
else
    exit 2
fi
