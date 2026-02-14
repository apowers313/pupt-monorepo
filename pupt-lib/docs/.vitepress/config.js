import { defineConfig } from 'vitepress';

export default defineConfig({
  vite: {
    server: {
      allowedHosts: ['dev.ato.ms'],
    },
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.includes('-'),
      },
      transformAssetUrls: {
        video: false,
        source: false,
        img: false,
        image: false,
      },
    },
  },
  ignoreDeadLinks: [/^http:\/\/localhost/],
  title: 'pupt-lib',
  description:
    'Write AI prompts that are structured, versioned, and shareable',
  base: '/pupt-lib/',

  head: [['link', { rel: 'icon', href: '/pupt-lib/pupt.png' }]],

  themeConfig: {
    logo: '/pupt.png',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/what-is-pupt' },
      { text: 'Components', link: '/components/' },
      { text: 'Sharing', link: '/modules/using-modules' },
      { text: 'Developers', link: '/developers/first-component' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'What is Pupt?', link: '/guide/what-is-pupt' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          {
            text: 'Writing Your First Prompt',
            link: '/guide/first-prompt',
          },
          {
            text: 'Variables & Inputs',
            link: '/guide/variables-and-inputs',
          },
          {
            text: 'Conditional Logic',
            link: '/guide/conditional-logic',
          },
          { text: 'Environment & Context', link: '/guide/environment' },
        ],
      },
      {
        text: 'Components',
        items: [
          { text: 'Overview', link: '/components/' },
          { text: 'Structural', link: '/components/structural' },
          { text: 'Ask (Inputs)', link: '/components/ask' },
          { text: 'Control Flow', link: '/components/control-flow' },
          { text: 'Data', link: '/components/data' },
          {
            text: 'Examples & Reasoning',
            link: '/components/examples-reasoning',
          },
          {
            text: 'Post-Execution',
            link: '/components/post-execution',
          },
          { text: 'Utility', link: '/components/utility' },
          { text: 'Meta', link: '/components/meta' },
          { text: 'Presets', link: '/components/presets' },
        ],
      },
      {
        text: 'Sharing',
        items: [
          { text: 'Using Modules', link: '/modules/using-modules' },
          { text: 'Publishing', link: '/modules/publishing' },
        ],
      },
      {
        text: 'Developers',
        items: [
          {
            text: 'Writing Components',
            link: '/developers/first-component',
          },
          {
            text: 'Writing Modules',
            link: '/developers/first-module',
          },
          {
            text: 'Creating Modules',
            link: '/developers/creating-modules',
          },
          { text: 'API Reference', link: '/developers/api' },
          { text: 'Variables Reference', link: '/developers/variables' },
          {
            text: 'Environment Reference',
            link: '/developers/environment',
          },
          {
            text: 'Conditionals Reference',
            link: '/developers/conditionals',
          },
          { text: 'Browser Support', link: '/developers/browser' },
        ],
      },
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/apowers313/pupt-lib',
      },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present',
    },

    search: {
      provider: 'local',
    },
  },
});
