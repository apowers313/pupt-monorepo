# pt install

Install prompt collections from external sources like Git repositories, enabling prompt sharing and reuse across teams and projects.

## Synopsis

```bash
pt install <source> [options]
```

## Purpose

The `install` command:
- Downloads prompts from Git repositories
- Manages shared prompt libraries
- Enables team collaboration
- Supports versioned prompt collections
- Handles dependencies and updates
- Integrates with package managers

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--target <dir>` | `-t` | Installation directory |
| `--branch <branch>` | `-b` | Git branch to install |
| `--tag <tag>` | | Install specific version tag |
| `--depth <n>` | `-d` | Git clone depth (default: 1) |
| `--force` | `-f` | Overwrite existing prompts |
| `--no-deps` | | Skip dependency installation |
| `--help` | `-h` | Show help information |

## Source Types

### Git Repositories
```bash
# HTTPS URL
pt install https://github.com/user/prompts

# SSH URL
pt install git@github.com:user/prompts.git

# GitHub shorthand
pt install user/prompts
```

### Local Directories
```bash
# Local path
pt install ./shared-prompts

# Absolute path
pt install /usr/local/share/prompts
```

### Future Support
- NPM packages: `pt install @org/prompts`
- URL archives: `pt install https://example.com/prompts.tar.gz`

## Examples

### Basic Installation
```bash
# Install from GitHub
pt install awesome-user/prompt-collection

# Install specific branch
pt install user/prompts --branch develop

# Install to custom location
pt install user/prompts --target ~/.pt/external
```

### Team Collaboration
```bash
# Install team prompts
pt install github.com/myteam/shared-prompts

# Install specific version
pt install team/prompts --tag v2.1.0

# Shallow clone for faster install
pt install large-repo/prompts --depth 1
```

### Local Development
```bash
# Link local development
pt install ../my-prompt-dev --target ~/.pt/dev

# Force overwrite
pt install ./updated-prompts --force
```

## Repository Structure

Expected structure for installable prompt repositories:

```
prompt-repo/
├── README.md           # Repository documentation
├── prompts/           # Prompt files
│   ├── api/          # Category folders
│   │   ├── client.md
│   │   └── docs.md
│   └── frontend/
│       └── component.md
├── .pt-manifest.json  # Optional manifest
└── package.json       # Optional npm metadata
```

### Manifest File

Optional `.pt-manifest.json`:

```json
{
  "name": "awesome-prompts",
  "version": "1.0.0",
  "description": "Collection of awesome prompts",
  "author": "Your Name",
  "prompts": [
    {
      "path": "prompts/api/client.md",
      "title": "API Client Generator",
      "tags": ["api", "typescript"]
    }
  ],
  "dependencies": {
    "base-prompts": "^2.0.0"
  }
}
```

## Installation Process

### 1. Source Resolution
```bash
# Expands shortcuts
user/repo → https://github.com/user/repo

# Validates URLs
git@github.com:user/repo.git ✓
```

### 2. Download
```bash
# Clone repository
Cloning into '~/.pt/git-prompts/user-repo'...

# Or copy local files
Copying from './shared-prompts'...
```

### 3. Validation
```bash
# Check structure
✓ Valid prompt repository
✓ Found 15 prompt files
⚠ No manifest file (optional)
```

### 4. Installation
```bash
# Copy prompts
Installing to ~/.pt/git-prompts/user-repo...
✓ Installed 15 prompts

# Update configuration
✓ Added to promptDirs in config
```

## Managing Installed Prompts

### List Installed
```bash
# Show all installed sources
pt install --list

# Output:
awesome-prompts    v1.2.0  github.com/user/awesome-prompts
team-prompts       main    github.com/company/prompts
local-dev          -       ./my-prompts
```

### Update Prompts
```bash
# Update specific source
pt install user/prompts --update

# Update all sources
pt install --update-all
```

### Remove Prompts
```bash
# Remove installed source
pt install user/prompts --remove

# Clean up unused
pt install --clean
```

## Dependency Management

### Installing Dependencies
```json
// .pt-manifest.json
{
  "dependencies": {
    "base-prompts": "^1.0.0",
    "util-prompts": "^2.1.0"
  }
}
```

```bash
# Install with dependencies
pt install user/prompts

# Skip dependencies
pt install user/prompts --no-deps
```

### Version Constraints
- `^1.0.0`: Compatible versions
- `~1.0.0`: Patch versions only
- `1.0.0`: Exact version
- `*`: Any version

## Creating Installable Repositories

### Basic Setup
```bash
# Create repository
mkdir my-prompts && cd my-prompts
git init

# Add prompts
mkdir prompts
pt add prompts/hello.md

# Create README
echo "# My Prompts" > README.md

# Commit and push
git add .
git commit -m "Initial prompts"
git remote add origin git@github.com:user/my-prompts
git push -u origin main
```

### With Manifest
```bash
# Create manifest
cat > .pt-manifest.json << EOF
{
  "name": "my-prompts",
  "version": "1.0.0",
  "description": "My prompt collection",
  "prompts": [
    {
      "path": "prompts/hello.md",
      "title": "Hello World",
      "tags": ["example"]
    }
  ]
}
EOF
```

### Versioning
```bash
# Tag version
git tag -a v1.0.0 -m "First release"
git push origin v1.0.0

# Users install specific version
pt install user/prompts --tag v1.0.0
```

## Best Practices

### Repository Organization
1. **Clear Structure**: Use consistent folder organization
2. **Documentation**: Include README with examples
3. **Versioning**: Tag stable releases
4. **Categories**: Group related prompts
5. **Testing**: Test prompts before publishing

### Manifest Benefits
- Dependency tracking
- Metadata for search
- Installation validation
- Update notifications

### Security
- Review prompts before installation
- Use specific versions in production
- Verify repository authenticity
- Avoid sensitive data in prompts

## Troubleshooting

### Installation Failures
```bash
# Debug mode
pt install user/prompts --debug

# Common issues:
- Network connectivity
- Git authentication
- Permission denied
- Invalid repository structure
```

### Authentication
```bash
# SSH key issues
ssh-add ~/.ssh/id_rsa

# HTTPS credentials
git config --global credential.helper cache

# Use personal access token
pt install https://token@github.com/user/prompts
```

### Conflicts
```bash
# Handle existing files
pt install user/prompts --force

# Backup first
cp -r ~/.pt/prompts ~/.pt/prompts.bak
pt install user/prompts
```

## Configuration

Configure installation behavior:

```json
{
  "gitPromptDir": "~/.pt/git-prompts",
  "install": {
    "autoUpdate": false,
    "checkSignatures": false,
    "defaultBranch": "main",
    "depth": 1
  }
}
```

## Related Commands

- [`pt`](/commands/pt) - Use installed prompts
- [`pt add`](/commands/add) - Create new prompts
- [`pt review`](/commands/review) - Analyze prompt usage

## Next Steps

1. Browse available prompt collections
2. Create your own prompt repository
3. Share prompts with your team
4. Set up automated updates