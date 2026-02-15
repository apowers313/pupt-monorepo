# DevOps, CI/CD & Infrastructure Prompts

**SDLC Phase:** Deployment, Infrastructure, Operations
**Category Clarity:** CLEAR
**Developer Trust:** VERY LOW (76% won't use AI for deployment/monitoring)

---

## Prompt 1: CI/CD Workflow Generation

**Source:** Reddit, Dev.to prompt collections
**Pattern:** Pipeline specification with stages
**Why it works:** Well-defined structure; AI output is directly verifiable

```
Generate a GitHub Actions workflow that:

Triggers:
- On push to main branch
- On pull request to main branch

Steps:
1. Check out code
2. Set up [language] [version]
3. Install dependencies (with caching)
4. Run linter
5. Run type checker
6. Run unit tests with coverage
7. Run integration tests
8. Build the application
9. [On main only] Deploy to [hosting provider]

Requirements:
- Fail fast on any step failure
- Cache dependencies between runs
- Use matrix strategy for [versions] if applicable
- Store test coverage as an artifact
- Post deployment URL as a PR comment
```

---

## Prompt 2: Dockerfile Generation

**Source:** Reddit, developer prompt collections
**Pattern:** Optimized container specification
**Why it works:** Common patterns; AI can optimize layers

```
Generate a Dockerfile to containerize a [framework] application.

Application details:
- Language: [language] [version]
- Package manager: [npm/yarn/pip/etc.]
- Build command: [command]
- Start command: [command]
- Exposed port: [port]

Requirements:
- Multi-stage build (separate build and runtime stages)
- Non-root user for runtime
- Minimize image size (use slim/alpine base where appropriate)
- Proper layer caching (copy dependency files before source)
- Health check endpoint: [endpoint]
- .dockerignore recommendations
```

---

## Prompt 3: Environment Setup Script

**Source:** Reddit, Dev.to
**Pattern:** Developer onboarding automation
**Why it works:** Standardizes team setup; reduces onboarding time

```
Write a setup script (bash) for a new developer joining this project.

The script should:
1. Check for required tools and versions: [list tools]
2. Install missing dependencies (or print instructions for manual install)
3. Copy .env.example to .env if .env doesn't exist
4. Install project dependencies
5. Set up the local database (create, migrate, seed)
6. Run a smoke test to verify everything works
7. Print a summary of what was set up and next steps

Requirements:
- Work on macOS and Linux
- Be idempotent (safe to run multiple times)
- Use clear error messages if something fails
- Don't require sudo
```

---

## Prompt 4: Infrastructure-as-Code

**Source:** Spacelift blog, DevOps-focused sources
**Pattern:** IaC from requirements
**Why it works:** Declarative infrastructure has clear, verifiable output

```
Generate [Terraform/Pulumi/CloudFormation] for:

Service: [describe the service]
Cloud provider: [AWS/GCP/Azure]

Resources needed:
- [resource 1, e.g., "PostgreSQL database, 2 vCPU, 8GB RAM"]
- [resource 2, e.g., "Container service running 2 instances"]
- [resource 3, e.g., "CDN for static assets"]
- [resource 4, e.g., "Load balancer with HTTPS"]

Requirements:
- Use variables for environment-specific values (dev/staging/prod)
- Include proper security groups / network policies
- Enable logging and monitoring
- Tag all resources with project and environment
- Include outputs for connection strings and endpoints

Do NOT hardcode any secrets or credentials.
```
