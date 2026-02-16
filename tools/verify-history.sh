#!/bin/bash
set -e

echo "============================================================"
echo "  Verifying Git History Preservation"
echo "============================================================"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Verify package directories exist with files
echo "Check 1: Package directories exist..."
for pkg in pupt-lib pupt pupt-react pupt-sde-prompts; do
    if [ -f "$pkg/package.json" ]; then
        echo "  OK: $pkg/package.json exists"
    else
        echo "  FAIL: $pkg/package.json not found"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 2: Verify no nested .git directories
echo ""
echo "Check 2: No nested .git directories..."
NESTED_GIT=$(find . -name ".git" -type d | grep -v "^./.git$" || true)
if [ -z "$NESTED_GIT" ]; then
    echo "  OK: Only one .git directory"
else
    echo "  FAIL: Found nested .git directories:"
    echo "$NESTED_GIT"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Total commit count
echo ""
echo "Check 3: Total commit count..."
TOTAL=$(git log --oneline | wc -l)
echo "  Total commits: $TOTAL"
if [ "$TOTAL" -lt 50 ]; then
    echo "  WARN: Expected 250+ commits (pupt=137 + pupt-lib=97 + pupt-react=20 + pupt-sde-prompts=4 + scaffold)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 4: CRITICAL - Verify history works WITHOUT --follow
echo ""
echo "Check 4: File history works WITHOUT --follow (CRITICAL)..."
for pkg in pupt-lib pupt pupt-react pupt-sde-prompts; do
    if [ ! -f "$pkg/package.json" ]; then
        continue
    fi

    NO_FOLLOW=$(git log --oneline -- "$pkg/package.json" 2>/dev/null | wc -l)
    WITH_FOLLOW=$(git log --oneline --follow -- "$pkg/package.json" 2>/dev/null | wc -l)

    if [ "$NO_FOLLOW" -gt 3 ]; then
        echo "  OK: $pkg - $NO_FOLLOW commits without --follow (history linked)"
    elif [ "$WITH_FOLLOW" -gt "$NO_FOLLOW" ]; then
        echo "  FAIL: $pkg - only $NO_FOLLOW commits without --follow ($WITH_FOLLOW with --follow)"
        echo "       History NOT properly linked. Files existed before history merge."
        ERRORS=$((ERRORS + 1))
    else
        echo "  WARN: $pkg - only $NO_FOLLOW commits (may be a new repo with few commits)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Check 5: Verify git blame shows original dates
echo ""
echo "Check 5: git blame shows original commit dates..."
for pkg in pupt-lib pupt; do
    if [ ! -f "$pkg/package.json" ]; then
        continue
    fi
    OLDEST_DATE=$(git blame "$pkg/package.json" 2>/dev/null | head -1 | grep -oP '\d{4}-\d{2}-\d{2}')
    echo "  $pkg/package.json first line blame date: $OLDEST_DATE"
done

# Check 6: Verify authors are preserved
echo ""
echo "Check 6: Commit authors..."
git shortlog -sn | head -5

# Summary
echo ""
echo "============================================================"
if [ $ERRORS -gt 0 ]; then
    echo "  VERIFICATION FAILED with $ERRORS error(s), $WARNINGS warning(s)"
    echo ""
    echo "  DO NOT proceed with adaptation commits."
    echo "  Fix: git reset --hard <initial-scaffold-commit> && ./tools/preserve-git-history.sh"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo "  Verification PASSED with $WARNINGS warning(s)"
else
    echo "  All history checks passed!"
fi
echo "============================================================"
