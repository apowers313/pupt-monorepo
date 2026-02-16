#!/bin/bash
# Merges lcov coverage reports from all packages into a single report
# Usage: ./tools/merge-coverage.sh [--ci]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

PACKAGES=("pupt" "pupt-lib" "pupt-react" "pupt-sde-prompts")
COVERAGE_DIR=".coverage-packages"
OUTPUT_DIR="coverage"

# Clean up previous merged coverage
rm -rf "$COVERAGE_DIR" "$OUTPUT_DIR"
mkdir -p "$COVERAGE_DIR" "$OUTPUT_DIR"

echo "Collecting coverage reports..."
FOUND=0

for pkg in "${PACKAGES[@]}"; do
    LCOV="$pkg/coverage/lcov.info"
    if [ -f "$LCOV" ]; then
        cp "$LCOV" "$COVERAGE_DIR/$pkg-lcov.info"
        echo "  Found: $LCOV"
        FOUND=$((FOUND + 1))
    else
        echo "  Missing: $LCOV (skipped)"
    fi
done

if [ $FOUND -eq 0 ]; then
    echo "No coverage reports found. Run tests with coverage first."
    exit 1
fi

echo ""
echo "Merging $FOUND coverage reports..."
pnpm exec lcov-result-merger "$COVERAGE_DIR/*-lcov.info" "$OUTPUT_DIR/lcov.info"

echo "Merged coverage written to $OUTPUT_DIR/lcov.info"

# If --ci flag is passed, also generate JSON summary
if [ "$1" = "--ci" ]; then
    echo "CI mode: coverage report ready for upload"
fi
