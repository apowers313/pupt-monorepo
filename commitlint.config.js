export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            ["pupt", "pupt-lib", "pupt-react", "pupt-sde-prompts", "deps", "release", "ci", "docs", "tools", "workspace"],
        ],
    },
};
