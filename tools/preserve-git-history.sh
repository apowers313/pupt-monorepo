#!/bin/bash
set -e

echo "============================================================"
echo "  Preserving Git History for pupt-monorepo"
echo "============================================================"

# Package configuration - using local paths since repos are siblings
declare -A PACKAGE_PATHS
PACKAGE_PATHS["pupt"]="../pupt"
PACKAGE_PATHS["pupt-lib"]="../pupt-lib"
PACKAGE_PATHS["pupt-react"]="../pupt-react"
PACKAGE_PATHS["pupt-sde-prompts"]="../pupt-sde-prompts"

# All repos use master
DEFAULT_BRANCH="master"

# Order: pupt-lib first (foundation), then dependents
PACKAGES=("pupt-lib" "pupt" "pupt-react" "pupt-sde-prompts")
MONOREPO_DIR="$(pwd)"

# Verify we're in the monorepo root
if [ ! -f "nx.json" ]; then
    echo "FATAL: Must run from monorepo root (nx.json not found)"
    exit 1
fi

# Verify we have git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
    echo "FATAL: git-filter-repo not found. Install with: pip install git-filter-repo"
    exit 1
fi

# CRITICAL SAFEGUARD: Verify package directories DON'T exist yet
echo ""
echo "Pre-flight check: verifying no package directories have files..."
for pkg in "${PACKAGES[@]}"; do
    if [ -d "$pkg" ] && [ "$(ls -A "$pkg" 2>/dev/null)" ]; then
        echo "FATAL: $pkg/ directory already has files!"
        echo ""
        echo "History MUST be merged BEFORE files exist in the target directories."
        echo "If files already exist, git will treat them as separate lineages"
        echo "and 'git log' will only work with --follow (which is broken behavior)."
        echo ""
        echo "To fix: reset to the scaffold commit and re-run this script."
        exit 1
    fi
done
echo "Pre-flight check passed: no package directories exist."

# Verify source repos exist
echo ""
echo "Verifying source repos exist..."
for pkg in "${PACKAGES[@]}"; do
    SOURCE_PATH="${PACKAGE_PATHS[$pkg]}"
    if [ ! -d "$SOURCE_PATH/.git" ]; then
        echo "FATAL: $SOURCE_PATH is not a git repository"
        exit 1
    fi
    echo "  $pkg: $SOURCE_PATH (OK)"
done

for pkg in "${PACKAGES[@]}"; do
    echo ""
    echo "============================================================"
    echo "  Processing $pkg..."
    echo "============================================================"

    SOURCE_PATH="${PACKAGE_PATHS[$pkg]}"
    TEMP_DIR="/tmp/$pkg-history-rewrite"

    rm -rf "$TEMP_DIR"

    echo "  Cloning from $SOURCE_PATH..."
    git clone "$SOURCE_PATH" "$TEMP_DIR"

    echo "  Rewriting history: all files -> $pkg/ subdirectory..."
    cd "$TEMP_DIR"
    git checkout "$DEFAULT_BRANCH"
    git-filter-repo --to-subdirectory-filter "$pkg" --force

    cd "$MONOREPO_DIR"

    echo "  Adding temp remote and fetching..."
    git remote add "$pkg-temp" "$TEMP_DIR" 2>/dev/null || git remote set-url "$pkg-temp" "$TEMP_DIR"
    git fetch "$pkg-temp"

    echo "  Merging with --allow-unrelated-histories..."
    git merge --allow-unrelated-histories --no-edit \
        -m "feat(workspace): merge $pkg history into monorepo" \
        "$pkg-temp/$DEFAULT_BRANCH"

    git remote remove "$pkg-temp"
    rm -rf "$TEMP_DIR"

    COMMIT_COUNT=$(git log --oneline -- "$pkg/package.json" 2>/dev/null | wc -l)
    echo "  $pkg history merged ($COMMIT_COUNT commits for $pkg/package.json)"
done

echo ""
echo "============================================================"
echo "  History preservation complete!"
echo "============================================================"
echo ""
echo "Total commits in monorepo: $(git log --oneline | wc -l)"
echo ""
echo "NEXT STEP: Run ./tools/verify-history.sh before making ANY other commits."
