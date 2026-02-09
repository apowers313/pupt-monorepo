/**
 * Role preset configurations for the Role component and Prompt defaults.
 * Each preset defines a role title, default expertise areas, optional traits,
 * experience level, and style.
 */

export interface RolePresetConfig {
  name: string;
  title: string;
  expertise: string[];
  traits?: string[];
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'expert' | 'principal';
  style?: 'professional' | 'casual' | 'academic' | 'friendly';
}

/**
 * Lookup table of common role presets.
 * Organized by category: Support, Technical, Creative, Business, Education, Domain Expert.
 */
export const ROLE_PRESETS: Record<string, RolePresetConfig> = {
  // Support
  'assistant': {
    name: 'assistant',
    title: 'Assistant',
    expertise: ['general help'],
    style: 'friendly',
  },
  'support': {
    name: 'support',
    title: 'Support Agent',
    expertise: ['customer support'],
    traits: ['patient', 'helpful'],
    style: 'friendly',
  },
  'advisor': {
    name: 'advisor',
    title: 'Advisor',
    expertise: ['expert advice'],
    style: 'professional',
  },
  'guide': {
    name: 'guide',
    title: 'Guide',
    expertise: ['navigation', 'explanation'],
    style: 'friendly',
  },
  'concierge': {
    name: 'concierge',
    title: 'Concierge',
    expertise: ['personalized service'],
    style: 'friendly',
  },

  // Technical
  'engineer': {
    name: 'engineer',
    title: 'Software Engineer',
    expertise: ['software development', 'programming', 'system design'],
    traits: ['analytical', 'detail-oriented', 'problem-solver'],
    experienceLevel: 'senior',
    style: 'professional',
  },
  'developer': {
    name: 'developer',
    title: 'Software Developer',
    expertise: ['application development'],
    experienceLevel: 'senior',
    style: 'professional',
  },
  'architect': {
    name: 'architect',
    title: 'Software Architect',
    expertise: ['system design'],
    experienceLevel: 'senior',
    style: 'professional',
  },
  'devops': {
    name: 'devops',
    title: 'DevOps Engineer',
    expertise: ['CI/CD', 'infrastructure'],
    experienceLevel: 'senior',
    style: 'professional',
  },
  'security': {
    name: 'security',
    title: 'Security Specialist',
    expertise: ['cybersecurity'],
    style: 'professional',
  },
  'data-scientist': {
    name: 'data-scientist',
    title: 'Data Scientist',
    expertise: ['analytics', 'ML'],
    style: 'professional',
  },
  'frontend': {
    name: 'frontend',
    title: 'Frontend Developer',
    expertise: ['UI development'],
    experienceLevel: 'senior',
    style: 'professional',
  },
  'backend': {
    name: 'backend',
    title: 'Backend Developer',
    expertise: ['server-side development'],
    experienceLevel: 'senior',
    style: 'professional',
  },
  'qa-engineer': {
    name: 'qa-engineer',
    title: 'QA Engineer',
    expertise: ['testing', 'quality'],
    style: 'professional',
  },

  // Creative
  'writer': {
    name: 'writer',
    title: 'Writer',
    expertise: ['content creation', 'storytelling', 'communication'],
    traits: ['creative', 'articulate', 'thoughtful'],
    experienceLevel: 'expert',
    style: 'professional',
  },
  'copywriter': {
    name: 'copywriter',
    title: 'Copywriter',
    expertise: ['marketing copy'],
    style: 'professional',
  },
  'editor': {
    name: 'editor',
    title: 'Editor',
    expertise: ['content editing'],
    style: 'professional',
  },
  'journalist': {
    name: 'journalist',
    title: 'Journalist',
    expertise: ['news', 'reporting'],
    style: 'professional',
  },

  // Business
  'analyst': {
    name: 'analyst',
    title: 'Business Analyst',
    expertise: ['analysis', 'requirements'],
    style: 'professional',
  },
  'consultant': {
    name: 'consultant',
    title: 'Consultant',
    expertise: ['advisory'],
    style: 'professional',
  },
  'marketer': {
    name: 'marketer',
    title: 'Marketing Specialist',
    expertise: ['marketing strategy'],
    style: 'professional',
  },
  'pm': {
    name: 'pm',
    title: 'Product Manager',
    expertise: ['product strategy'],
    style: 'professional',
  },
  'strategist': {
    name: 'strategist',
    title: 'Strategist',
    expertise: ['business strategy'],
    style: 'professional',
  },

  // Education
  'teacher': {
    name: 'teacher',
    title: 'Teacher',
    expertise: ['education'],
    style: 'friendly',
  },
  'tutor': {
    name: 'tutor',
    title: 'Tutor',
    expertise: ['one-on-one instruction'],
    style: 'friendly',
  },
  'mentor': {
    name: 'mentor',
    title: 'Mentor',
    expertise: ['guidance'],
    style: 'friendly',
  },
  'coach': {
    name: 'coach',
    title: 'Coach',
    expertise: ['performance coaching'],
    style: 'friendly',
  },
  'professor': {
    name: 'professor',
    title: 'Professor',
    expertise: ['academic expertise'],
    style: 'academic',
  },

  // Domain Expert
  'legal': {
    name: 'legal',
    title: 'Legal Expert',
    expertise: ['law', 'compliance'],
    style: 'professional',
  },
  'medical': {
    name: 'medical',
    title: 'Medical Professional',
    expertise: ['healthcare'],
    style: 'professional',
  },
  'designer': {
    name: 'designer',
    title: 'Designer',
    expertise: ['design'],
    style: 'professional',
  },
  'scientist': {
    name: 'scientist',
    title: 'Scientist',
    expertise: ['scientific research'],
    style: 'academic',
  },
  'translator': {
    name: 'translator',
    title: 'Translator',
    expertise: ['language translation'],
    style: 'professional',
  },
};
