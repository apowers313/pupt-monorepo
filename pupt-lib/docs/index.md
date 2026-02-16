---
layout: home

hero:
  name: "pupt"
  text: "Prompts Worth Keeping"
  tagline: Write AI prompts that are structured, versioned, and shareable. Build them once, improve them over time, use them everywhere.
  image:
    src: /pupt.png
    alt: Pupt Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/apowers313/pupt-lib

features:
  - icon: "\uD83D\uDCC8"
    title: Improve Over Time
    details: Prompts are files you can iterate on, refine, and review in pull requests — just like any valuable work product.
  - icon: "\uD83D\uDD00"
    title: Version Controlled
    details: Track every change to your prompts in git. Roll back mistakes, compare versions, and see what changed.
  - icon: "\uD83E\uDDE9"
    title: Composable
    details: Build complex prompts from simple, reusable pieces. Use presets for common patterns like roles, constraints, and reasoning steps.
  - icon: "\uD83D\uDCE6"
    title: Shareable
    details: Share prompts with your team or publish them for the community. Import others' work with a single line.
  - icon: "\uD83D\uDCCB"
    title: Structured
    details: A simple tag-based syntax gives your prompts consistent structure — roles, tasks, constraints, examples — so you get reliable results.
  - icon: "\uD83C\uDF10"
    title: Works Everywhere
    details: Use your prompts with any AI tool — Claude, ChatGPT, Gemini, and more. Run them from the command line, a web app, or your own tools.
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
