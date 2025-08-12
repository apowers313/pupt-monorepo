---
title: API Client Generator
labels: [api, typescript, client]
variables:
  - name: serviceName
    type: input
    message: "What is the name of your API service?"
    default: "MyAPI"
  - name: authType
    type: select
    message: "Choose authentication type:"
    choices: ["none", "api-key", "oauth2", "basic"]
---

# {{serviceName}} API Client

Generate a TypeScript API client for {{serviceName}}.

## Authentication
Type: {{authType}}

## Base Configuration
```typescript
export class {{serviceName}}Client {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  // Add methods here
}
```

Generated on {{date}} by {{username}}.
