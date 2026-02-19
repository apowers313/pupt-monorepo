export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            ["@pupt/cli", "@pupt/lib", "@pupt/react", "@pupt/sde-prompts", "@pupt/test", "deps", "release", "ci", "docs", "tools", "workspace"],
        ],
    },
};
