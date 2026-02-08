---
layout: home

hero:
  name: "PUPT"
  text: "Your Faithful Prompt Companion"
  tagline: Powerful Universal Prompt Tool - A versatile CLI for managing and using AI prompts with advanced templating
  image:
    src: /pupt.png
    alt: PUPT Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/apowers313/pupt

features:
  - icon: ✏️
    title: Prompt Management
    details: Create, edit, and organize prompts with ease. Use YAML frontmatter for metadata and Handlebars templates for dynamic content.
  - icon: 🔍
    title: Interactive Search
    details: Quickly find prompts with fuzzy search. Preview content before selection and navigate effortlessly through your prompt library.
  - icon: 🤖
    title: Tool Integration
    details: Seamlessly integrate with Claude Code, Kiro, or any CLI tool. Configure default commands and options for your workflow.
  - icon: 📊
    title: History & Analytics
    details: Track prompt executions, add annotations, and analyze usage patterns. Generate insights to improve your prompts over time.
  - icon: 📝
    title: Advanced Templates
    details: Use Handlebars templates with custom helpers. Collect user input interactively with various input types including file selection.
  - icon: 📦
    title: Shareable Prompts
    details: Install prompts from Git repositories. Share your prompt collections with your team or the community.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
}

.VPHero .image-container {
  transform: scale(1.2);
}

@media (min-width: 640px) {
  .VPHero .image-container {
    transform: scale(1.3);
  }
}

@media (min-width: 960px) {
  .VPHero .image-container {
    transform: scale(1.4);
  }
}
</style>