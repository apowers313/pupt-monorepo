# PUPT Documentation

This directory contains the VitePress documentation for PUPT (Powerful Universal Prompt Tool).

## Development

To work on the documentation locally:

```bash
# Install dependencies
npm install

# Start development server
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

The development server will be available at http://localhost:5173/

## Structure

- `/guide` - User guides and tutorials
- `/reference` - API and command reference
- `/api` - Programmatic API documentation
- `/examples` - Examples and recipes
- `/.vitepress` - VitePress configuration and theme

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch.

The workflow is defined in `.github/workflows/docs.yml`.

## Contributing

When adding new documentation:

1. Follow the existing structure and naming conventions
2. Add new pages to the sidebar in `.vitepress/config.js`
3. Include code examples with proper syntax highlighting
4. Test locally before submitting PR

## Style Guide

- Use clear, concise language
- Include practical examples
- Use proper markdown formatting
- Add syntax highlighting to code blocks
- Keep paragraphs short and scannable