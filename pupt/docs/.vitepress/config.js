import { defineConfig } from 'vitepress'

export default defineConfig({
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.includes('-')
      },
      transformAssetUrls: {
        // Disable processing of these tags
        video: false,
        source: false,
        img: false,
        image: false
      }
    }
  },
  ignoreDeadLinks: [
    // Ignore localhost URLs in documentation examples
    /^http:\/\/localhost/
  ],
  title: 'PUPT',
  description: 'Prompt Utility & Personalization Tool - A powerful CLI for managing AI prompts with advanced templating',
  base: '/pupt-monorepo/cli/',

  head: [
    ['link', { rel: 'icon', href: '/pupt-monorepo/cli/pupt.png' }]
  ],
  
  themeConfig: {
    logo: '/pupt.png',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Commands', link: '/commands/' },
      { text: 'Prompts', link: '/prompts' },
      { text: 'Examples', link: '/examples/' }
    ],
    
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Prompt Templates', link: '/guide/prompt-templates' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          { text: 'Development', link: '/guide/development' }
        ]
      },
      {
        text: 'Commands',
        items: [
          { text: 'Overview', link: '/commands/' },
          { text: 'pt (default)', link: '/commands/pt' },
          { text: 'pt init', link: '/commands/init' },
          { text: 'pt add', link: '/commands/add' },
          { text: 'pt edit', link: '/commands/edit' },
          { text: 'pt run', link: '/commands/run' },
          { text: 'pt history', link: '/commands/history' },
          { text: 'pt annotate', link: '/commands/annotate' },
          { text: 'pt install', link: '/commands/install' },
          { text: 'pt review', link: '/commands/review' },
          { text: 'pt help', link: '/commands/help' }
        ]
      },
      {
        text: 'Prompts',
        items: [
          { text: 'General Purpose Prompts', link: '/prompts#general-purpose-prompts' },
          { text: 'Development Workflow Prompts', link: '/prompts#development-workflow-prompts' },
          { text: 'Implementation Prompts', link: '/prompts#implementation-prompts' },
          { text: 'Quality Assurance Prompts', link: '/prompts#quality-assurance-prompts' },
          { text: 'CI/CD Prompts', link: '/prompts#cicd-prompts' },
          { text: 'Documentation Prompts', link: '/prompts#documentation-prompts' },
          { text: 'Prompt Management', link: '/prompts#prompt-management' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Recipes', link: '/examples/' }
        ]
      }
    ],
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/apowers313/pupt-monorepo' }
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present'
    },
    
    search: {
      provider: 'local'
    }
  }
})