#!/bin/bash
# Copies uncommitted changes (modified + untracked) from original repos
set -e

PACKAGES=("pupt" "pupt-lib" "pupt-react" "pupt-sde-prompts")
MONOREPO_DIR="$(pwd)"

# Verify we're in the monorepo root
if [ ! -f "nx.json" ]; then
    echo "FATAL: Must run from monorepo root (nx.json not found)"
    exit 1
fi

for pkg in "${PACKAGES[@]}"; do
    SOURCE="../$pkg"
    DEST="$MONOREPO_DIR/$pkg"

    if [ ! -d "$SOURCE/.git" ]; then
        echo "WARN: $SOURCE is not a git repo, skipping"
        continue
    fi

    echo "Processing uncommitted files for $pkg..."
    COPIED=0

    cd "$SOURCE"

    # Get list of modified/added/untracked files
    git status --porcelain | while IFS= read -r line; do
        status="${line:0:2}"
        file="${line:3}"

        # Skip deleted files
        if [[ "$status" == " D" ]] || [[ "$status" == "D " ]] || [[ "$status" == "DD" ]]; then
            continue
        fi

        # Copy the file to monorepo, preserving directory structure
        src_file="$SOURCE/$file"
        dst_file="$DEST/$file"

        if [ -f "$src_file" ]; then
            mkdir -p "$(dirname "$dst_file")"
            cp "$src_file" "$dst_file"
            echo "  Copied: $file"
        fi
    done

    cd "$MONOREPO_DIR"
    echo "$pkg uncommitted files copied."
    echo ""
done

echo "All uncommitted files copied. They are NOT committed in the monorepo."
echo "Review with: git status"
