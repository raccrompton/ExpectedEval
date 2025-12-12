#!/bin/bash

# =============================================================================
# ON-EDIT HOOK - Quick Lint Check
# =============================================================================
# This script runs automatically after Claude edits or writes a file.
# It performs a quick lint check on just the modified file for fast feedback.
#
# For full checks (type-check, all linting, tests), see on-stop.sh
#
# Exit Codes:
#   0 - Check passed or no linter available
#   1 - Lint errors found
# =============================================================================

# -----------------------------------------------------------------------------
# PARSE INPUT
# -----------------------------------------------------------------------------
# PostToolUse hooks receive JSON with tool_input containing the file path

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":\s*"[^"]*"' | sed 's/"file_path":\s*"//' | sed 's/"$//')

# Exit if we couldn't extract a file path
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Get just the filename for display
FILENAME=$(basename "$FILE_PATH")

# -----------------------------------------------------------------------------
# COLORS
# -----------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# UTILITY FUNCTIONS
# -----------------------------------------------------------------------------

has_command() {
    command -v "$1" >/dev/null 2>&1
}

has_npm_script() {
    [ -f "package.json" ] && grep -q "\"$1\":" package.json 2>/dev/null
}

# -----------------------------------------------------------------------------
# DETERMINE FILE TYPE AND RUN APPROPRIATE LINTER
# -----------------------------------------------------------------------------

# Get file extension
EXT="${FILE_PATH##*.}"

case "$EXT" in
    ts|tsx|js|jsx|mjs|cjs)
        # TypeScript/JavaScript - use ESLint
        if has_npm_script "lint"; then
            echo -e "${CYAN}🔍 Linting ${FILENAME}...${NC}"
            OUTPUT=$(npm run lint -- --format=compact "$FILE_PATH" 2>&1)
            EXIT_CODE=$?
        elif has_command "eslint"; then
            echo -e "${CYAN}🔍 Linting ${FILENAME}...${NC}"
            OUTPUT=$(npx eslint --format=compact "$FILE_PATH" 2>&1)
            EXIT_CODE=$?
        else
            exit 0
        fi
        ;;

    py)
        # Python - use ruff (fast) or flake8
        if has_command "ruff"; then
            echo -e "${CYAN}🔍 Linting ${FILENAME}...${NC}"
            OUTPUT=$(python3 -m ruff check "$FILE_PATH" 2>&1)
            EXIT_CODE=$?
        elif has_command "flake8"; then
            echo -e "${CYAN}🔍 Linting ${FILENAME}...${NC}"
            OUTPUT=$(python3 -m flake8 "$FILE_PATH" 2>&1)
            EXIT_CODE=$?
        else
            exit 0
        fi
        ;;

    rs)
        # Rust - quick check (clippy is slow, so just syntax check)
        if has_command "rustfmt"; then
            echo -e "${CYAN}🔍 Checking ${FILENAME} format...${NC}"
            OUTPUT=$(rustfmt --check "$FILE_PATH" 2>&1)
            EXIT_CODE=$?
        else
            exit 0
        fi
        ;;

    go)
        # Go - use go vet on the file's package
        if has_command "go"; then
            DIR=$(dirname "$FILE_PATH")
            echo -e "${CYAN}🔍 Vetting ${FILENAME}...${NC}"
            OUTPUT=$(go vet "$DIR" 2>&1)
            EXIT_CODE=$?
        else
            exit 0
        fi
        ;;

    cs)
        # C# - format check only (build is slow)
        if has_command "dotnet"; then
            echo -e "${CYAN}🔍 Checking ${FILENAME} format...${NC}"
            OUTPUT=$(dotnet format --verify-no-changes --include "$FILE_PATH" 2>&1)
            EXIT_CODE=$?
        else
            exit 0
        fi
        ;;

    *)
        # Unknown file type - skip
        exit 0
        ;;
esac

# -----------------------------------------------------------------------------
# OUTPUT RESULTS
# -----------------------------------------------------------------------------

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ${FILENAME}: OK${NC}"
    exit 0
else
    echo -e "${RED}❌ ${FILENAME}: Issues found${NC}"
    echo ""
    echo "$OUTPUT" | head -20
    if [ $(echo "$OUTPUT" | wc -l) -gt 20 ]; then
        echo -e "${YELLOW}... (truncated)${NC}"
    fi
    echo ""
    exit 1
fi
