#!/bin/bash
# Pre-push validation script
# Runs build, lint (including knip), and fast tests across all packages
# This script avoids nx to work around git hook issues with nx daemon

# Note: We don't use 'set -e' because we want to track all failures and report them at the end

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "========================================"
echo "Pre-push validation"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

run_step() {
    local name="$1"
    local cmd="$2"

    echo -e "${YELLOW}▶ $name${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name passed${NC}"
        echo ""
    else
        echo -e "${RED}✗ $name failed${NC}"
        echo ""
        FAILED=1
    fi
}

# Build all packages (required for cross-package imports)
run_step "Build" "pnpm -r run build"

# Lint all packages
run_step "Lint" "pnpm -r run lint"

# Run knip for dead code detection
run_step "Knip (dead code detection)" "pnpm run lint:knip"

# Run fast tests for each package
echo -e "${YELLOW}▶ Fast tests${NC}"

echo "  Testing pupt-lib (node)..."
(cd pupt-lib && npm run test:ci:node) || FAILED=1

echo "  Testing pupt..."
(cd pupt && npm run test:ci) || FAILED=1

echo "  Testing pupt-react..."
(cd pupt-react && npm run test:ci) || FAILED=1

echo "  Testing pupt-sde-prompts..."
(cd pupt-sde-prompts && npm run test:ci) || FAILED=1

echo "  Testing pupt-test..."
(cd pupt-test && npm run test:ci) || FAILED=1

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Fast tests passed${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
fi
echo ""

# Summary
echo "========================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push validation failed${NC}"
    echo "Fix the issues above before pushing."
    exit 1
fi
