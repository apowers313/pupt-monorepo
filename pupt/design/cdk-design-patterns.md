# Programmatic Prompt Definition: Design Patterns Research

> **Purpose**: This document explores alternatives to Handlebars templates for defining prompts in pupt. Instead of declarative templates with embedded logic, we investigate programmatic approaches where prompts are defined using code.
>
> **Date**: December 2024
>
> **Status**: Research/Exploration

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State: Handlebars Templates](#current-state-handlebars-templates)
3. [LLM/Prompt-Specific Frameworks](#llmprompt-specific-frameworks)
   - [DSPy](#dspy-stanford)
   - [LMQL](#lmql-eth-zurich)
   - [Microsoft Guidance](#microsoft-guidance)
   - [Outlines](#outlines)
   - [LangChain LCEL](#langchain-lcel)
   - [Microsoft POML](#microsoft-poml)
4. [Infrastructure as Code](#infrastructure-as-code)
   - [AWS CDK](#aws-cdk)
   - [Pulumi](#pulumi)
   - [Terraform CDK](#terraform-cdk)
5. [Configuration Languages](#configuration-languages)
   - [Pkl (Apple)](#pkl-apple)
   - [CUE](#cue)
   - [Dhall](#dhall)
   - [Jsonnet](#jsonnet)
6. [Email Template Systems](#email-template-systems)
   - [React Email](#react-email)
   - [mjml-react](#mjml-react)
7. [Document Generation](#document-generation)
   - [Typst](#typst)
8. [HTML/UI Generation](#htmlui-generation)
   - [Kotlin DSL / kotlinx.html](#kotlin-dsl--kotlinxhtml)
   - [Marko.js](#markojs)
   - [Ink.js](#inkjs)
   - [React/JSX Patterns](#reactjsx-patterns)
9. [SQL Query Builders](#sql-query-builders)
   - [Kysely](#kysely)
   - [Drizzle](#drizzle)
10. [Task Runners](#task-runners)
    - [Gulp](#gulp)
11. [Pattern Analysis](#pattern-analysis)
12. [Recommendations for Pupt](#recommendations-for-pupt)
13. [References](#references)

---

## Executive Summary

This research explores how various tools and frameworks use programming languages to define what would traditionally be templates or configuration files. The goal is to identify patterns that could improve pupt's prompt definition system.

### Key Findings

1. **Two dominant paradigms exist**:
   - **Tree/Construct model** (CDK, Pulumi): Hierarchical composition with parent-child relationships
   - **Pipeline/Stream model** (Gulp, LCEL): Sequential transformations through pipes

2. **Type safety is a major advantage**: Tools like Kysely, Kotlin DSL, and TypeScript-based CDKs provide compile-time validation and IDE support that templates cannot offer.

3. **LLM-specific frameworks are emerging**: DSPy, LMQL, Guidance, and Outlines all address the unique challenges of prompt engineering with programmatic approaches.

4. **Constraint systems are powerful**: LMQL and Guidance allow specifying output constraints that are enforced during generation, not just validated after.

5. **Synthesis/compilation step is common**: Many tools (CDK, Typst, DSPy) have a "build" step that transforms code into the final output format.

---

## Current State: Handlebars Templates

Pupt currently uses Handlebars templates for prompt definition:

```handlebars
---
name: code-review
description: Review code for issues
variables:
  - name: language
    type: string
---
You are an expert {{language}} code reviewer.

Review the following code:
{{file contents="src/**/*.ts"}}

{{#if focus}}
Focus on: {{focus}}
{{/if}}
```

### Current Strengths
- Simple, familiar syntax
- Clear separation of metadata (frontmatter) and content
- Works well for straightforward prompts
- Easy to read and understand

### Current Limitations
- Limited logic capabilities (only basic helpers)
- No type checking or validation at authoring time
- Difficult to compose or reuse prompt fragments
- No IDE support for prompt-specific constructs
- Testing prompts requires running them
- Complex prompts become hard to maintain
- No programmatic access to prompt structure

---

## LLM/Prompt-Specific Frameworks

### DSPy (Stanford)

> **Repository**: https://github.com/stanfordnlp/dspy
> **Documentation**: https://dspy.ai/
> **Philosophy**: "Programming—not prompting—language models"

DSPy (Declarative Self-improving Python) is a framework that treats prompt engineering as a programming problem rather than a writing problem.

#### Core Concepts

**Signatures**: Define the input/output contract for a prompt module.

```python
class CodeReview(dspy.Signature):
    """Review code for bugs, security issues, and improvements."""

    code: str = dspy.InputField(desc="The code to review")
    language: str = dspy.InputField(desc="Programming language")
    issues: list[str] = dspy.OutputField(desc="List of issues found")
    severity: str = dspy.OutputField(desc="Overall severity: low, medium, high")
```

**Modules**: Composable building blocks that use signatures.

```python
# Simple module
reviewer = dspy.ChainOfThought(CodeReview)

# Composed pipeline
class FullReview(dspy.Module):
    def __init__(self):
        self.analyze = dspy.ChainOfThought(CodeAnalysis)
        self.review = dspy.ChainOfThought(CodeReview)
        self.summarize = dspy.ChainOfThought(ReviewSummary)

    def forward(self, code, language):
        analysis = self.analyze(code=code, language=language)
        review = self.review(code=code, context=analysis.context)
        return self.summarize(review=review)
```

**Optimizers**: Automatically improve prompts based on metrics.

```python
from dspy.teleprompt import BootstrapFewShot

# Define metric
def review_quality(example, prediction):
    return len(prediction.issues) > 0 and prediction.severity in ["low", "medium", "high"]

# Optimize
optimizer = BootstrapFewShot(metric=review_quality)
optimized_reviewer = optimizer.compile(reviewer, trainset=examples)
```

#### Strengths
- **Separation of concerns**: Interface (signature) vs implementation (module)
- **Automatic optimization**: Prompts improve based on metrics without manual tuning
- **Composability**: Modules can be nested and combined
- **Type hints**: Python type annotations provide documentation and basic validation
- **Testing**: Modules can be unit tested with assertions
- **Portability**: Same code works across different LLM backends

#### Weaknesses
- **Learning curve**: Requires understanding DSPy's abstractions
- **Python-only**: No TypeScript/JavaScript implementation
- **Optimization requires examples**: Need labeled data for automatic improvement
- **Black box optimization**: Hard to understand why optimized prompts work
- **Heavy dependency**: Large framework for simple use cases

#### Relevance to Pupt
- **High relevance**: Signature pattern could define prompt contracts
- **Module composition** aligns with pupt's goal of reusable prompts
- **Optimization concept** could inform a `pt optimize` command
- Consider: TypeScript port of signature/module concepts

---

### LMQL (ETH Zurich)

> **Repository**: https://github.com/eth-sri/lmql
> **Documentation**: https://lmql.ai/
> **Research Paper**: https://arxiv.org/abs/2212.06094
> **Philosophy**: "Prompting is Programming"

LMQL is a query language for LLMs that adds SQL-like constraints to prompt programming.

#### Core Concepts

**Query Structure**: Combines text prompts with Python control flow and constraints.

```python
@lmql.query
def code_review(code: str, language: str):
    '''lmql
    "You are an expert {language} code reviewer."
    "Review this code:\n{code}\n"

    "Issues found:"
    for i in range(3):
        "- [ISSUE_{i}]" where len(ISSUE_{i}) < 200

    "Severity: [SEVERITY]" where SEVERITY in ["low", "medium", "high"]

    return {
        "issues": [ISSUE_0, ISSUE_1, ISSUE_2],
        "severity": SEVERITY
    }
    '''
```

**Constraint Types**:

```python
# Length constraints
"[SUMMARY]" where len(SUMMARY) < 100

# Choice constraints
"[RATING]" where RATING in ["1", "2", "3", "4", "5"]

# Regex constraints
"[EMAIL]" where re.match(r"[\w.-]+@[\w.-]+", EMAIL)

# Type constraints
"[COUNT]" where int(COUNT) > 0

# Custom validation
"[JSON_DATA]" where is_valid_json(JSON_DATA)
```

**Decoding Strategies**:

```python
# Different search strategies
@lmql.query(decoder="beam", n=3)  # Beam search with 3 beams
@lmql.query(decoder="sample", temperature=0.7)  # Sampling
@lmql.query(decoder="argmax")  # Greedy decoding
```

#### Strengths
- **Constraint enforcement**: Constraints applied during generation, not after
- **Python superset**: Familiar syntax, easy to learn
- **Eager evaluation**: Invalid outputs rejected early, saving tokens
- **Multi-model support**: Works with OpenAI, Azure, HuggingFace
- **Structured output**: Guaranteed valid JSON, enums, etc.
- **Efficiency**: Reduces API calls through intelligent constraint application

#### Weaknesses
- **Python-only**: No JavaScript/TypeScript support
- **Query syntax overhead**: Simple prompts don't need query structure
- **Limited ecosystem**: Fewer integrations than LangChain
- **Debugging complexity**: Constraint failures can be hard to diagnose
- **Performance overhead**: Constraint checking adds latency

#### Relevance to Pupt
- **Very high relevance**: Constraint system could ensure prompt outputs are valid
- **`where` clauses** could replace post-processing validation
- Consider: Implementing constraint DSL in template frontmatter
- Consider: TypeScript constraint expressions

---

### Microsoft Guidance

> **Repository**: https://github.com/guidance-ai/guidance
> **Documentation**: https://www.microsoft.com/en-us/research/project/guidance-control-lm-output/
> **Philosophy**: Token-level control over LLM generation

Guidance provides fine-grained control over LLM outputs by interleaving generation with programmatic constraints.

#### Core Concepts

**Template-like syntax with control flow**:

```python
from guidance import models, gen, select, block

lm = models.OpenAI("gpt-4")

# Interleaved generation and control
lm += f"""
Review the following {language} code:
```{language}
{code}
```

Analysis:
{{#block}}
Category: {select(['bug', 'security', 'performance', 'style'], name='category')}
Severity: {gen('severity', regex='[1-5]')}
Description: {gen('description', max_tokens=100, stop='\\n')}
{{/block}}

{{#if category == 'security'}}
Security Impact: {gen('security_impact', max_tokens=50)}
{{/if}}
"""
```

**Grammar-based constraints**:

```python
from guidance import grammar

# Define a grammar for valid output
json_value = grammar.select([
    grammar.string(),
    grammar.number(),
    grammar.literal("true"),
    grammar.literal("false"),
    grammar.literal("null"),
])

# Use grammar in generation
lm += f"Result: {gen(grammar=json_value)}"
```

**Stateful generation**:

```python
# Access previous generations
lm += f"First issue: {gen('issue1', max_tokens=50)}\n"
lm += f"Second issue: {gen('issue2', max_tokens=50)}\n"
lm += f"Summary of {lm['issue1']} and {lm['issue2']}: {gen('summary')}"
```

#### Strengths
- **Token-level control**: Constraints applied at each token, not post-hoc
- **Grammar support**: Full CFG support for complex structured output
- **Stateful**: Can reference previous generations in the same prompt
- **Flexible**: Mixes template syntax with programmatic control
- **Backend agnostic**: Works with transformers, llama.cpp, OpenAI
- **Efficient**: Reduces retries by constraining generation

#### Weaknesses
- **Python-only**: No TypeScript implementation
- **Complex syntax**: Mixing template and Python can be confusing
- **Learning curve**: Grammar definitions require understanding formal languages
- **Limited tooling**: Less IDE support than pure Python
- **Token overhead**: Some constraints increase token usage

#### Relevance to Pupt
- **High relevance**: Grammar-based constraints could ensure structured outputs
- **Stateful generation** pattern useful for multi-step prompts
- Consider: Implementing `gen()` and `select()` as template helpers
- Consider: Grammar definitions in YAML frontmatter

---

### Outlines

> **Repository**: https://github.com/dottxt-ai/outlines
> **Documentation**: https://dottxt-ai.github.io/outlines/
> **Philosophy**: Guaranteed structured generation via finite state machines

Outlines uses FSM (finite state machine) theory to guarantee that LLM outputs conform to specified schemas.

#### Core Concepts

**Pydantic model generation**:

```python
from outlines import models, generate
from pydantic import BaseModel, Field
from typing import Literal

class CodeIssue(BaseModel):
    description: str = Field(max_length=200)
    severity: Literal["low", "medium", "high"]
    line_number: int = Field(ge=1)

class CodeReview(BaseModel):
    issues: list[CodeIssue]
    overall_quality: Literal["poor", "fair", "good", "excellent"]
    summary: str

model = models.transformers("mistral")
generator = generate.json(model, CodeReview)

review = generator(f"Review this code:\n{code}")
# review is guaranteed to be valid CodeReview
```

**Regex-constrained generation**:

```python
from outlines import generate

# IP address pattern
ip_generator = generate.regex(model, r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")

# Version number
version_generator = generate.regex(model, r"v\d+\.\d+\.\d+")

# Custom identifier
id_generator = generate.regex(model, r"[A-Z]{2,4}-\d{4,6}")
```

**Grammar-based generation**:

```python
from outlines import generate

# EBNF grammar for arithmetic expressions
arithmetic_grammar = """
    ?start: expression
    ?expression: term (("+" | "-") term)*
    ?term: factor (("*" | "/") factor)*
    ?factor: NUMBER | "(" expression ")"
    NUMBER: /[0-9]+/
"""

expr_generator = generate.cfg(model, arithmetic_grammar)
```

**Choice generation**:

```python
from outlines import generate

# Constrained choice
sentiment = generate.choice(model, ["positive", "negative", "neutral"])
result = sentiment("The product was amazing!")  # Guaranteed to be one of the three
```

#### Strengths
- **Guaranteed structure**: 100% valid output via FSM constraints
- **Pydantic integration**: Use existing data models directly
- **Multiple constraint types**: Regex, JSON schema, CFG, choices
- **Efficient**: O(1) average constraint checking per token
- **Rust core**: High performance with Python bindings
- **Simple API**: Easy to use compared to Guidance

#### Weaknesses
- **Transformers focus**: Best support for local models, OpenAI support limited
- **Python-only**: No TypeScript implementation
- **Schema required**: Must define schema upfront, less flexible
- **Limited reasoning**: Constraints on output, not on reasoning process

#### Relevance to Pupt
- **Very high relevance**: Pydantic-style output schemas would be powerful
- Consider: TypeScript equivalent using Zod schemas
- Consider: Output schema in prompt frontmatter
- Consider: `pt validate` command for checking outputs

---

### LangChain LCEL

> **Repository**: https://github.com/langchain-ai/langchain
> **Documentation**: https://python.langchain.com/docs/concepts/lcel/
> **Blog Post**: https://blog.langchain.com/langchain-expression-language/
> **Philosophy**: Declarative chain composition with streaming support

LCEL (LangChain Expression Language) provides a declarative way to compose LLM operations using pipe operators.

#### Core Concepts

**Pipe-based composition**:

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template(
    "Review this {language} code:\n{code}\n\nProvide feedback:"
)
model = ChatOpenAI()
parser = StrOutputParser()

# Chain using pipe operator
chain = prompt | model | parser

# Execute
result = chain.invoke({"language": "python", "code": code})
```

**Parallel execution with dictionaries**:

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough

# Parallel branches
analysis_chain = RunnableParallel(
    security=security_prompt | model | parser,
    performance=performance_prompt | model | parser,
    style=style_prompt | model | parser,
)

# Combine with context
full_chain = (
    {"code": RunnablePassthrough(), "analyses": analysis_chain}
    | summary_prompt
    | model
)
```

**Automatic coercion**:

```python
# Functions become RunnableLambda
def format_issues(issues: list) -> str:
    return "\n".join(f"- {i}" for i in issues)

# Dicts become RunnableParallel
chain = (
    {"formatted": format_issues, "original": RunnablePassthrough()}
    | prompt
    | model
)
```

**Streaming and batching**:

```python
# Automatic streaming
async for chunk in chain.astream({"code": code}):
    print(chunk, end="")

# Automatic batching
results = chain.batch([
    {"code": code1},
    {"code": code2},
    {"code": code3},
])
```

#### Strengths
- **Intuitive syntax**: Pipe operator is familiar and readable
- **Automatic optimizations**: Streaming, batching, async built-in
- **Composable**: Easy to build complex chains from simple parts
- **Observable**: LangSmith integration for debugging
- **Type coercion**: Functions and dicts automatically wrapped
- **Ecosystem**: Large library of pre-built components

#### Weaknesses
- **Magic behavior**: Automatic coercion can be confusing
- **Debugging**: Complex chains hard to debug without LangSmith
- **Overhead**: Large dependency for simple use cases
- **Learning curve**: Many concepts to understand (Runnables, etc.)
- **Python-centric**: JavaScript version less mature

#### Relevance to Pupt
- **Medium relevance**: Pipe pattern could work for prompt pipelines
- Consider: `pt run prompt1 | pt run prompt2` shell composition
- Consider: LCEL-like TypeScript DSL for programmatic prompts
- Note: LangChain is heavy; pupt should stay lightweight

---

### Microsoft POML

> **Repository**: https://github.com/microsoft/poml
> **Announcement**: https://www.marktechpost.com/2025/08/13/microsoft-releases-poml-prompt-orchestration-markup-language/
> **Philosophy**: HTML-like semantic structure for prompts

POML (Prompt Orchestration Markup Language) brings semantic components to prompt engineering.

#### Core Concepts

**Semantic components**:

```xml
<prompt>
  <role>
    You are an expert code reviewer with 10 years of experience
    in security analysis.
  </role>

  <context>
    <file src="{{file_path}}" language="{{language}}" />
    <git-diff branch="main" />
  </context>

  <task>
    Review the provided code for security vulnerabilities.
    Focus on OWASP Top 10 issues.
  </task>

  <constraints>
    <max-issues>10</max-issues>
    <severity-levels>critical, high, medium, low</severity-levels>
  </constraints>

  <output-format>
    <schema type="json">
      {
        "issues": [{"description": "string", "severity": "string"}],
        "summary": "string"
      }
    </schema>
  </output-format>

  <examples>
    <example>
      <input>def login(user, pass): return db.query(f"SELECT * FROM users WHERE user='{user}'")</input>
      <output>{"issues": [{"description": "SQL injection vulnerability", "severity": "critical"}]}</output>
    </example>
  </examples>
</prompt>
```

**Modular includes**:

```xml
<prompt>
  <include src="roles/security-expert.poml" />
  <include src="formats/json-output.poml" />

  <task>{{task_description}}</task>
</prompt>
```

#### Strengths
- **Semantic clarity**: Clear separation of prompt components
- **Modular**: Reusable components via includes
- **Familiar syntax**: HTML-like, easy to learn
- **Self-documenting**: Structure describes purpose
- **Tool-friendly**: Easy to parse and validate
- **Format-agnostic**: Can render to different LLM formats

#### Weaknesses
- **New/immature**: Limited ecosystem and tooling
- **Verbose**: More markup than plain text prompts
- **XML limitations**: Less expressive than programming languages
- **No logic**: Still declarative, limited conditionals

#### Relevance to Pupt
- **Medium relevance**: Semantic components could improve readability
- Consider: POML-inspired frontmatter sections
- Consider: Component library for common prompt patterns
- Note: XML might be too verbose for pupt's style

---

## Infrastructure as Code

### AWS CDK

> **Repository**: https://github.com/aws/aws-cdk
> **Documentation**: https://docs.aws.amazon.com/cdk/
> **Philosophy**: Define cloud infrastructure using familiar programming languages

AWS CDK (Cloud Development Kit) allows defining AWS infrastructure using TypeScript, Python, Java, C#, or Go instead of YAML/JSON CloudFormation templates.

#### Core Concepts

**Constructs** (building blocks at three levels):

```typescript
import { Stack, App } from 'aws-cdk-lib';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';

class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // L2 Construct: High-level with sensible defaults
    const bucket = new Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // L2 Construct with grant helper
    const fn = new Function(this, 'Handler', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset('lambda'),
      handler: 'index.handler',
    });

    // Permissions handled declaratively
    bucket.grantRead(fn);
  }
}
```

**L3 Patterns** (multi-resource abstractions):

```typescript
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

// Creates Lambda + API Gateway + IAM roles + CloudWatch logs
const api = new LambdaRestApi(this, 'Api', {
  handler: fn,
});
```

**Tokens** (lazy evaluation):

```typescript
// bucket.bucketName is a Token, not a string
// Resolved at synthesis time
const config = {
  bucketName: bucket.bucketName,  // Token
  region: Stack.of(this).region,  // Token
};
```

**Aspects** (cross-cutting concerns):

```typescript
import { Aspects, Tag } from 'aws-cdk-lib';

// Apply to all resources in stack
Aspects.of(stack).add(new Tag('Environment', 'Production'));

// Custom aspect for validation
class BucketEncryptionChecker implements IAspect {
  visit(node: IConstruct) {
    if (node instanceof Bucket && !node.encryptionKey) {
      Annotations.of(node).addError('Bucket must be encrypted');
    }
  }
}
```

**Synthesis**:

```typescript
const app = new App();
new MyStack(app, 'Dev', { env: { region: 'us-east-1' } });
new MyStack(app, 'Prod', { env: { region: 'us-west-2' } });

app.synth();  // Generates CloudFormation JSON
```

#### Strengths
- **Full language power**: Loops, conditions, functions, classes
- **Type safety**: Compile-time validation, IDE autocomplete
- **Abstraction levels**: L1 (raw), L2 (opinionated), L3 (patterns)
- **Composition**: Constructs compose naturally
- **Testing**: Standard unit testing frameworks work
- **Reuse**: npm packages for sharing constructs
- **Multi-language**: Same constructs in TS, Python, Java, C#, Go

#### Weaknesses
- **Synthesis step**: Extra build step required
- **CloudFormation limits**: Ultimately generates CFn, inherits limits
- **Abstraction leakage**: Sometimes need to understand underlying CFn
- **Large dependency**: Heavy SDK
- **Learning curve**: Must understand CDK + AWS concepts

#### Relevance to Pupt
- **Very high relevance**: Core model for programmatic prompt definition
- **Construct pattern**: Prompts as composable constructs
- **L1/L2/L3 levels**: Raw text → helper methods → patterns
- **Synthesis**: Code → final prompt text
- **Aspects**: Cross-cutting concerns (e.g., safety checks, formatting)
- Consider: Direct port of construct model to TypeScript prompts

---

### Pulumi

> **Repository**: https://github.com/pulumi/pulumi
> **Documentation**: https://www.pulumi.com/docs/
> **Comparison**: https://www.pulumi.com/docs/iac/comparisons/terraform/
> **Philosophy**: Real programming languages, real infrastructure

Pulumi takes the IaC concept further than CDK by not requiring an intermediate template format.

#### Core Concepts

**Native language resources**:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Conditional logic
const isProd = pulumi.getStack() === "prod";

const bucket = new aws.s3.Bucket("data", {
    versioning: { enabled: isProd },
    tags: { Environment: pulumi.getStack() },
});

// Loops
const files = ["config.json", "data.csv", "schema.sql"];
for (const file of files) {
    new aws.s3.BucketObject(file, {
        bucket: bucket.id,
        source: new pulumi.asset.FileAsset(`./files/${file}`),
    });
}

// Async/await
async function getLatestAmi() {
    const ami = await aws.ec2.getAmi({
        mostRecent: true,
        owners: ["amazon"],
    });
    return ami.id;
}
```

**Automation API** (programmatic control):

```typescript
import { LocalWorkspace } from "@pulumi/pulumi/automation";

// Create or select stack programmatically
const stack = await LocalWorkspace.createOrSelectStack({
    stackName: "dev",
    projectName: "my-project",
    program: async () => {
        // Define resources here
        const bucket = new aws.s3.Bucket("bucket");
        return { bucketName: bucket.id };
    },
});

// Deploy programmatically
const result = await stack.up();
console.log(`Bucket: ${result.outputs.bucketName.value}`);
```

**Component resources**:

```typescript
class ReviewPipeline extends pulumi.ComponentResource {
    public readonly endpoint: pulumi.Output<string>;

    constructor(name: string, args: ReviewPipelineArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:app:ReviewPipeline", name, {}, opts);

        const fn = new aws.lambda.Function(`${name}-handler`, {
            // ...
        }, { parent: this });

        const api = new aws.apigateway.RestApi(`${name}-api`, {
            // ...
        }, { parent: this });

        this.endpoint = api.invokeUrl;
        this.registerOutputs({ endpoint: this.endpoint });
    }
}
```

#### Strengths
- **No intermediate format**: Direct to cloud API, no YAML/JSON
- **Automation API**: Embed infrastructure in applications
- **State management**: Built-in state with Pulumi Cloud or self-hosted
- **Secrets handling**: Native encryption for sensitive values
- **Policy as code**: Enforce rules programmatically
- **Testing**: Full unit and integration testing
- **Import existing**: Import existing cloud resources

#### Weaknesses
- **State dependency**: Requires state storage
- **Vendor ecosystem**: Smaller than Terraform provider ecosystem
- **Complexity**: More concepts than simple YAML
- **Team adoption**: Requires programming skills

#### Relevance to Pupt
- **High relevance**: Automation API pattern for embedding prompts in applications
- **Component resources**: Reusable prompt packages
- Consider: `Prompt.createOrSelect()` API for programmatic access
- Consider: State management for prompt versions/history

---

### Terraform CDK

> **Repository**: https://github.com/hashicorp/terraform-cdk
> **Documentation**: https://developer.hashicorp.com/terraform/cdktf
> **Philosophy**: CDK pattern for Terraform

Terraform CDK (CDKTF) brings CDK-style programming to Terraform's provider ecosystem.

#### Core Concepts

```typescript
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    new S3Bucket(this, "bucket", {
      bucket: "my-bucket",
      tags: { Environment: "dev" },
    });
  }
}

const app = new App();
new MyStack(app, "dev");
app.synth();  // Generates Terraform JSON
```

#### Strengths
- **Terraform ecosystem**: Access to all Terraform providers
- **CDK patterns**: Same familiar constructs model
- **HCL escape hatch**: Can use existing Terraform modules

#### Weaknesses
- **Two abstractions**: Must understand both CDK and Terraform
- **Synthesis overhead**: Extra step to generate Terraform JSON
- **BSL license**: Terraform's new license may be concerning

#### Relevance to Pupt
- **Medium relevance**: Shows CDK pattern can wrap different backends
- Consider: Pupt CDK generating Handlebars (migration path)

---

## Configuration Languages

### Pkl (Apple)

> **Repository**: https://github.com/apple/pkl
> **Documentation**: https://pkl-lang.org/
> **Philosophy**: Configuration as code with rich validation

Pkl (pronounced "pickle") is Apple's configuration language that bridges the gap between static config files and full programming languages.

#### Core Concepts

**Type definitions with constraints**:

```pkl
module PromptConfig

class Variable {
  name: String
  type: "string" | "number" | "boolean" | "file"
  required: Boolean = true
  default: String?
  description: String?
}

class Prompt {
  name: String(length.isInRange(1, 50))
  description: String(length <= 200)
  version: String(matches(Regex(#"^\d+\.\d+\.\d+$"#)))
  variables: Listing<Variable>

  // Computed property
  requiredVariables: Listing<Variable> = variables.filter((v) -> v.required)
}
```

**Templates and inheritance**:

```pkl
// Base template
abstract class BasePrompt {
  role: String
  style: String = "professional"
  maxTokens: UInt16 = 1000
}

// Specialized prompt
class CodeReviewPrompt extends BasePrompt {
  role = "expert code reviewer"
  language: String
  focus: Listing<String>

  // Validation
  hidden validateFocus = focus.length.isInRange(1, 5)
}

// Instance
myReview: CodeReviewPrompt {
  language = "TypeScript"
  focus = new { "security"; "performance"; "readability" }
}
```

**Output generation**:

```pkl
// Render to different formats
output {
  renderer = new JsonRenderer {}
}

// Or YAML
output {
  renderer = new YamlRenderer {}
}

// Or custom template
output {
  value = """
    You are a \(role) specializing in \(language).

    Focus areas:
    \(focus.map((f) -> "- " + f).join("\n"))
    """
}
```

**Modules and imports**:

```pkl
// prompts/base.pkl
module prompts.base

abstract class Prompt { ... }

// prompts/review.pkl
amends "base.pkl"

class CodeReviewPrompt extends Prompt { ... }
```

#### Strengths
- **Rich type system**: Constraints, unions, generics
- **Validation built-in**: Types are validators
- **Multiple outputs**: JSON, YAML, Properties, custom
- **IDE support**: VSCode, IntelliJ, Neovim plugins
- **Language bindings**: Swift, Java, Kotlin, Go
- **Immutable**: No side effects, safe execution
- **Templating**: String interpolation with expressions

#### Weaknesses
- **New ecosystem**: Limited community and packages
- **Apple focus**: Primary use cases are Apple-centric
- **No JavaScript binding**: TypeScript not supported
- **Learning curve**: Novel syntax takes time

#### Relevance to Pupt
- **High relevance**: Type-safe prompt configuration
- **Constraint validation**: Ensure prompts are well-formed
- **Template inheritance**: Base prompts with specializations
- Consider: Pkl-inspired schema for prompt metadata
- Consider: Similar constraint syntax in TypeScript

---

### CUE

> **Repository**: https://github.com/cue-lang/cue
> **Documentation**: https://cuelang.org/
> **Philosophy**: Constraint-based configuration (types = values = constraints)

CUE unifies types, values, and constraints into a single concept based on lattice theory.

#### Core Concepts

**Constraints as types**:

```cue
// Schema and instance are the same syntax
#Prompt: {
    name:        string & =~"^[a-z-]+$"
    description: string & strings.MaxRunes(200)
    version:     =~"^\\d+\\.\\d+\\.\\d+$"

    variables: [...#Variable]

    // Default values
    maxTokens: int | *1000
    temperature: float & >=0 & <=2 | *0.7
}

#Variable: {
    name:     string
    type:     "string" | "number" | "file"
    required: bool | *true
}

// Concrete value (validated against schema)
codeReview: #Prompt & {
    name:        "code-review"
    description: "Review code for issues"
    version:     "1.0.0"
    variables: [
        {name: "language", type: "string"},
        {name: "code", type: "file"},
    ]
}
```

**Unification** (merging constraints):

```cue
// Base configuration
base: {
    maxTokens: int
    temperature: float
}

// Specialized for production
prod: base & {
    maxTokens: 500
    temperature: 0.3
}

// Further specialized
prodSecure: prod & {
    maxTokens: 200  // More restrictive
}
```

**Disjunctions** (choices):

```cue
// Allowed values
severity: "low" | "medium" | "high" | "critical"

// Default with fallback
format: *"json" | "yaml" | "text"
```

#### Strengths
- **Unification model**: Elegant merging of constraints
- **No inheritance bugs**: Composition-only, no OOP issues
- **JSON superset**: Valid JSON is valid CUE
- **Tooling**: Formatting, validation, export
- **Hermetic**: Deterministic evaluation
- **Kubernetes focus**: Strong K8s ecosystem

#### Weaknesses
- **Conceptually different**: Hard to learn for OOP programmers
- **Limited logic**: No general-purpose functions
- **Verbose for simple cases**: Overhead for small configs
- **Niche adoption**: Less mainstream than YAML

#### Relevance to Pupt
- **Medium relevance**: Constraint unification is interesting
- Consider: Applying CUE-style constraints to prompt variables
- Consider: Merging base prompts with specialized overrides

---

### Dhall

> **Repository**: https://github.com/dhall-lang/dhall-lang
> **Documentation**: https://dhall-lang.org/
> **Philosophy**: Programmable configuration that is always terminating

Dhall is a functional configuration language with strong guarantees about termination and purity.

#### Core Concepts

**Functional configuration**:

```dhall
let Variable = { name : Text, type : Text, required : Bool }

let Prompt = {
    name : Text,
    description : Text,
    variables : List Variable,
    maxTokens : Natural
}

let defaultPrompt : Prompt = {
    name = "",
    description = "",
    variables = [] : List Variable,
    maxTokens = 1000
}

let codeReview : Prompt = defaultPrompt // {
    name = "code-review",
    description = "Review code for issues",
    variables = [
        { name = "language", type = "string", required = True },
        { name = "code", type = "file", required = True }
    ]
}

in codeReview
```

**Imports**:

```dhall
-- Import from file
let base = ./base.dhall

-- Import from URL (with hash for integrity)
let kubernetes = https://raw.githubusercontent.com/dhall-lang/dhall-kubernetes/master/package.dhall
    sha256:abc123...

in base // { ... }
```

#### Strengths
- **Guaranteed termination**: Always halts (Turing-incomplete by design)
- **Strong typing**: Catches errors before runtime
- **Imports with hashes**: Integrity verification
- **Pure functional**: No side effects
- **Standard library**: Built-in functions for common operations

#### Weaknesses
- **Performance**: Can be slow and memory-heavy
- **Verbose**: Functional style requires more code
- **Turing-incomplete**: Can't express some algorithms
- **Small community**: Limited ecosystem

#### Relevance to Pupt
- **Low relevance**: Too verbose and unfamiliar for most users
- Note: Termination guarantee interesting for safety

---

### Jsonnet

> **Repository**: https://github.com/google/jsonnet
> **Documentation**: https://jsonnet.org/
> **Philosophy**: JSON + templating + functions

Jsonnet extends JSON with variables, conditionals, functions, and imports.

#### Core Concepts

**Templated JSON**:

```jsonnet
// Base template
local basePrompt = {
    version: "1.0.0",
    maxTokens: 1000,
    temperature: 0.7,
};

// Function for creating prompts
local makePrompt(name, description, variables) = basePrompt + {
    name: name,
    description: description,
    variables: variables,
};

// Concrete prompt
{
    codeReview: makePrompt(
        "code-review",
        "Review code for issues",
        [
            { name: "language", type: "string" },
            { name: "code", type: "file" },
        ]
    ) + {
        // Override
        maxTokens: 2000,
    },

    // Conditional
    [if std.extVar("includeDraft") then "draftReview"]: makePrompt(
        "draft-review",
        "Quick draft review",
        []
    ),
}
```

**Standard library**:

```jsonnet
local prompts = import 'prompts.libsonnet';

{
    // String manipulation
    formatted: std.asciiUpper(prompts.name),

    // Array operations
    requiredVars: std.filter(function(v) v.required, prompts.variables),

    // Object manipulation
    merged: std.mergePatch(prompts.base, prompts.override),
}
```

#### Strengths
- **JSON compatible**: Output is always valid JSON
- **Functions**: Reusable logic without complexity
- **Imports**: Modular configuration
- **Widely used**: Kubernetes, Grafana, many tools
- **Simple model**: Easy to understand for JSON users

#### Weaknesses
- **Dynamically typed**: Runtime errors only
- **Limited IDE support**: Basic compared to TypeScript
- **JSON output only**: Can't generate other formats easily
- **No validation**: Must validate output separately

#### Relevance to Pupt
- **Medium relevance**: Simple functional model
- Consider: Jsonnet-style functions for prompt variants
- Note: Could generate prompt JSON from Jsonnet

---

## Email Template Systems

### React Email

> **Repository**: https://github.com/resendlabs/react-email
> **Documentation**: https://react.email
> **Philosophy**: React components for email

React Email provides React components specifically designed for email compatibility.

#### Core Concepts

```tsx
import {
  Html, Head, Body, Container,
  Section, Row, Column,
  Heading, Text, Link, Button,
  Img, Hr
} from '@react-email/components';

interface WelcomeEmailProps {
  username: string;
  actionUrl: string;
}

export function WelcomeEmail({ username, actionUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container>
          <Heading>Welcome, {username}!</Heading>
          <Text>
            Thank you for signing up. Click below to get started.
          </Text>
          <Section>
            <Button href={actionUrl} style={buttonStyle}>
              Get Started
            </Button>
          </Section>
          <Hr />
          <Text style={footerStyle}>
            © 2024 Company Name
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = { fontFamily: 'Arial, sans-serif' };
const buttonStyle = { backgroundColor: '#007bff', color: '#fff' };
const footerStyle = { color: '#666', fontSize: '12px' };
```

#### Strengths
- **React ecosystem**: Familiar for React developers
- **TypeScript support**: Full type safety
- **Component reuse**: Standard React patterns
- **Preview**: Built-in preview and testing
- **Email-safe**: Components handle cross-client compatibility

#### Weaknesses
- **React dependency**: Requires React knowledge
- **Compilation step**: Must render to HTML
- **Email limitations**: Some React patterns don't work in email

#### Relevance to Pupt
- **High relevance**: Component-based prompt composition
- Consider: React-like components for prompt sections
- Consider: Preview/render workflow similar to React Email

---

### mjml-react

> **Repository**: https://github.com/Faire/mjml-react
> **Documentation**: https://mjml.io/
> **Philosophy**: React → MJML → Email HTML

mjml-react combines React's component model with MJML's email-safe rendering.

#### Core Concepts

```tsx
import {
  Mjml, MjmlHead, MjmlBody, MjmlPreview,
  MjmlSection, MjmlColumn, MjmlText, MjmlButton
} from 'mjml-react';
import { render } from 'mjml-react';

function EmailTemplate({ name, link }) {
  return (
    <Mjml>
      <MjmlHead>
        <MjmlPreview>Welcome to our platform</MjmlPreview>
      </MjmlHead>
      <MjmlBody>
        <MjmlSection>
          <MjmlColumn>
            <MjmlText>Hello {name}!</MjmlText>
            <MjmlButton href={link}>Get Started</MjmlButton>
          </MjmlColumn>
        </MjmlSection>
      </MjmlBody>
    </Mjml>
  );
}

// Render to HTML
const { html } = render(<EmailTemplate name="User" link="https://..." />);
```

#### Strengths
- **Two-stage rendering**: React → MJML → HTML
- **MJML benefits**: Responsive email without hacks
- **Type safety**: TypeScript support
- **Familiar**: React patterns

#### Weaknesses
- **Two dependencies**: MJML + React
- **MJML syntax**: Different from standard HTML

#### Relevance to Pupt
- **Medium relevance**: Shows multi-stage rendering pattern
- Consider: Prompt components → intermediate format → final text

---

## Document Generation

### Typst

> **Repository**: https://github.com/typst/typst
> **Documentation**: https://typst.app/docs/
> **Philosophy**: Programmable typesetting (LaTeX alternative)

Typst is a modern document preparation system with a focus on programmability and fast compilation.

#### Core Concepts

**Document with code**:

```typst
// Variables and functions
#let title = "Code Review Report"
#let today = datetime.today()

// Function definition
#let issue(severity, description) = {
  box(
    fill: if severity == "critical" { red } else if severity == "high" { orange } else { yellow },
    inset: 8pt,
    [*#severity*: #description]
  )
}

// Document structure
= #title
_Generated: #today.display()_

== Issues Found

#for item in issues [
  #issue(item.severity, item.description)
]

== Summary
#if issues.len() == 0 [
  No issues found!
] else [
  Found #issues.len() issues requiring attention.
]
```

**Templates and show rules**:

```typst
// Template function
#let report(title: str, author: str, body) = {
  set document(title: title, author: author)
  set page(numbering: "1 / 1")
  set heading(numbering: "1.1")

  align(center)[
    #text(size: 24pt, weight: "bold")[#title]
    #v(1em)
    #text(size: 14pt)[#author]
  ]

  body
}

// Use template
#show: report.with(title: "Analysis", author: "System")

= Introduction
...
```

**Package imports**:

```typst
#import "@preview/tablex:0.0.6": tablex, rowspanx

#tablex(
  columns: 3,
  [Name], [Type], [Required],
  [language], [string], [yes],
  [code], [file], [yes],
)
```

#### Strengths
- **Fast compilation**: Milliseconds vs seconds for LaTeX
- **Readable syntax**: Clean, consistent language
- **Full scripting**: Loops, conditions, functions
- **Modern tooling**: Built-in LSP, formatter
- **Small binary**: Single executable, no multi-GB install
- **Growing ecosystem**: Active package development

#### Weaknesses
- **Young project**: Less mature than LaTeX
- **Smaller ecosystem**: Fewer packages than LaTeX
- **PDF focus**: Limited output formats (HTML in development)
- **LLM unfamiliarity**: AI models struggle with Typst syntax

#### Relevance to Pupt
- **Medium relevance**: Shows programmable text generation
- Consider: Typst-like template syntax for prompts
- Consider: Show rules for transforming sections

---

## HTML/UI Generation

### Kotlin DSL / kotlinx.html

> **Repository**: https://github.com/Kotlin/kotlinx.html
> **Documentation**: https://kotlinlang.org/docs/type-safe-builders.html
> **Ktor Docs**: https://ktor.io/docs/server-html-dsl.html
> **Philosophy**: Type-safe HTML builders using Kotlin DSL features

Kotlin's type-safe builders provide compile-time validated HTML generation.

#### Core Concepts

**Type-safe HTML**:

```kotlin
import kotlinx.html.*
import kotlinx.html.stream.createHTML

fun reviewReport(issues: List<Issue>): String = createHTML().html {
    head {
        title { +"Code Review Report" }
        style {
            +"""
                .critical { color: red; }
                .warning { color: orange; }
            """
        }
    }
    body {
        h1 { +"Code Review Results" }

        if (issues.isEmpty()) {
            p { +"No issues found!" }
        } else {
            ul {
                for (issue in issues) {
                    li(classes = issue.severity) {
                        strong { +issue.title }
                        +": ${issue.description}"
                    }
                }
            }
        }

        footer {
            p { +"Generated at ${LocalDateTime.now()}" }
        }
    }
}
```

**Custom DSL markers**:

```kotlin
@DslMarker
annotation class PromptDsl

@PromptDsl
class PromptBuilder {
    private val sections = mutableListOf<String>()

    fun role(block: () -> String) {
        sections.add("Role: ${block()}")
    }

    fun task(block: () -> String) {
        sections.add("Task: ${block()}")
    }

    fun context(block: ContextBuilder.() -> Unit) {
        val builder = ContextBuilder()
        builder.block()
        sections.add("Context:\n${builder.build()}")
    }

    fun build(): String = sections.joinToString("\n\n")
}

@PromptDsl
class ContextBuilder {
    private val items = mutableListOf<String>()

    fun file(path: String) {
        items.add("File: $path")
    }

    fun variable(name: String, value: String) {
        items.add("$name: $value")
    }

    fun build(): String = items.joinToString("\n")
}

// Usage
fun prompt(block: PromptBuilder.() -> Unit): String {
    val builder = PromptBuilder()
    builder.block()
    return builder.build()
}

val reviewPrompt = prompt {
    role { "expert code reviewer" }
    context {
        file("src/main.kt")
        variable("language", "Kotlin")
    }
    task { "Review the code for bugs and improvements" }
}
```

#### Strengths
- **Compile-time safety**: Invalid structures caught at compile time
- **IDE support**: Full autocomplete and refactoring
- **Familiar syntax**: Kotlin developers immediately productive
- **Flexible**: Can create custom DSLs for any domain
- **Type inference**: Less boilerplate than explicit types
- **@DslMarker**: Prevents accidental scope leakage

#### Weaknesses
- **Kotlin-only**: Can't use from other languages
- **Learning curve**: DSL creation requires understanding receivers
- **Verbose creation**: Setting up DSL requires boilerplate
- **Not HTML-like**: Appearance differs from target format

#### Relevance to Pupt
- **Very high relevance**: Direct model for TypeScript prompt DSL
- Consider: TypeScript equivalent using builder pattern
- Consider: @DslMarker-like scope control in TypeScript
- Consider: Ktor's template system for prompt templates

---

### Marko.js

> **Repository**: https://github.com/marko-js/marko
> **Documentation**: https://markojs.com/
> **Philosophy**: HTML reimagined with streaming and reactivity

Marko.js is a UI framework that extends HTML with components, state, and streaming.

#### Core Concepts

**Component syntax**:

```marko
// review-card.marko
class {
  onCreate() {
    this.state = { expanded: false };
  }

  toggleExpanded() {
    this.state.expanded = !this.state.expanded;
  }
}

<div class="review-card">
  <h3 on-click("toggleExpanded")>
    ${input.title}
    <span class="toggle">${state.expanded ? "▼" : "▶"}</span>
  </h3>

  <if(state.expanded)>
    <div class="details">
      ${input.description}
    </div>
  </if>
</div>
```

**Control flow**:

```marko
<ul>
  <for|issue| of=input.issues>
    <li class=issue.severity>
      ${issue.description}
    </li>
  </for>
</ul>

<if(input.issues.length === 0)>
  <p>No issues found!</p>
</if>
<else>
  <p>Found ${input.issues.length} issues.</p>
</else>
```

**Async/streaming**:

```marko
<await(fetchReviewData())>
  <@placeholder>
    <loading-spinner />
  </@placeholder>

  <@then|data|>
    <review-results data=data />
  </@then>

  <@catch|err|>
    <error-message error=err />
  </@catch>
</await>
```

#### Strengths
- **Streaming**: Out-of-order rendering for performance
- **HTML-like**: More familiar than JSX
- **Server-optimized**: Separate server/client compilation
- **Battle-tested**: Powers eBay
- **Small runtime**: Optimized bundle sizes

#### Weaknesses
- **Smaller ecosystem**: Less popular than React
- **Different paradigm**: Not standard React patterns
- **Learning curve**: Unique syntax to learn

#### Relevance to Pupt
- **Medium relevance**: Async/streaming patterns interesting
- Consider: Async prompt sections that resolve in parallel
- Note: Control flow syntax more readable than Handlebars

---

### Ink.js

> **Repository**: https://github.com/vadimdemedes/ink
> **Components**: https://github.com/vadimdemedes/ink-ui
> **Philosophy**: React for command-line interfaces

Ink brings React's component model to terminal applications.

#### Core Concepts

**Terminal components**:

```tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { TextInput, Select, Spinner } from '@inkjs/ui';

function PromptRunner({ prompt }: { prompt: Prompt }) {
  const [status, setStatus] = useState<'input' | 'running' | 'done'>('input');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>('');
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape) exit();
  });

  if (status === 'input') {
    return (
      <Box flexDirection="column">
        <Text bold>{prompt.name}</Text>
        <Text dimColor>{prompt.description}</Text>

        {prompt.variables.map(v => (
          <Box key={v.name}>
            <Text>{v.name}: </Text>
            <TextInput
              onSubmit={value => {
                setVariables(prev => ({ ...prev, [v.name]: value }));
              }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (status === 'running') {
    return (
      <Box>
        <Spinner />
        <Text> Running prompt...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Complete</Text>
      <Text>{result}</Text>
    </Box>
  );
}

render(<PromptRunner prompt={myPrompt} />);
```

**Flexbox layout**:

```tsx
<Box flexDirection="row" gap={2}>
  <Box width="50%">
    <Text>Left panel</Text>
  </Box>
  <Box width="50%">
    <Text>Right panel</Text>
  </Box>
</Box>
```

#### Strengths
- **React patterns**: Hooks, components, state
- **Rich ecosystem**: Many community components
- **Flexbox**: Familiar layout model
- **Testing**: Can test with ink-testing-library
- **TypeScript**: Full type support

#### Weaknesses
- **Node-only**: Can't run in browser
- **React dependency**: Must understand React
- **Terminal limits**: Some UI patterns impossible

#### Relevance to Pupt
- **Medium relevance**: Already considering for CLI UI
- Consider: React-based interactive prompt builder
- Consider: Component library for prompt input types

---

### React/JSX Patterns

> **Documentation**: https://react.dev/
> **Patterns**: https://www.patterns.dev/react/
> **Philosophy**: Component composition for UIs

React's patterns are widely applicable beyond web UIs.

#### Core Patterns

**Compound components**:

```tsx
// Usage
<Prompt>
  <Prompt.Role>Expert code reviewer</Prompt.Role>
  <Prompt.Context>
    <Prompt.File path="src/main.ts" />
    <Prompt.Variable name="language" value="TypeScript" />
  </Prompt.Context>
  <Prompt.Task>Review for security issues</Prompt.Task>
</Prompt>

// Implementation
const PromptContext = createContext<PromptState | null>(null);

function Prompt({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PromptState>({});
  return (
    <PromptContext.Provider value={{ state, setState }}>
      {children}
    </PromptContext.Provider>
  );
}

Prompt.Role = function Role({ children }: { children: string }) {
  const ctx = useContext(PromptContext);
  useEffect(() => {
    ctx?.setState(s => ({ ...s, role: children }));
  }, [children]);
  return null;  // Or render preview
};

Prompt.Context = function Context({ children }: { children: ReactNode }) {
  return <div className="context">{children}</div>;
};
```

**Render props**:

```tsx
<PromptBuilder>
  {({ addSection, render }) => (
    <>
      <button onClick={() => addSection('role', 'Expert reviewer')}>
        Add Role
      </button>
      <pre>{render()}</pre>
    </>
  )}
</PromptBuilder>
```

**Higher-order components**:

```tsx
function withVariables<P extends PromptProps>(
  WrappedPrompt: ComponentType<P>
) {
  return function WithVariables(props: Omit<P, 'variables'>) {
    const variables = useVariableResolver(props);
    return <WrappedPrompt {...props as P} variables={variables} />;
  };
}
```

#### Strengths
- **Composition**: Build complex from simple
- **Encapsulation**: Components hide implementation
- **Familiar**: Largest community of any UI framework
- **Flexible**: Multiple patterns for different needs
- **Testable**: Components easy to unit test

#### Weaknesses
- **Overhead**: React runtime for non-UI tasks
- **Rendering model**: Virtual DOM not needed for text
- **Bundle size**: Large for simple use cases

#### Relevance to Pupt
- **High relevance**: Composition patterns directly applicable
- Consider: Compound component pattern for prompt sections
- Consider: Hooks for variable resolution, context injection

---

## SQL Query Builders

### Kysely

> **Repository**: https://github.com/kysely-org/kysely
> **Documentation**: https://kysely.dev/
> **Philosophy**: Type-safe SQL query builder

Kysely provides type-safe SQL queries with full TypeScript integration.

#### Core Concepts

**Type-safe queries**:

```typescript
import { Kysely, PostgresDialect } from 'kysely';

interface Database {
  prompts: {
    id: string;
    name: string;
    content: string;
    created_at: Date;
  };
  executions: {
    id: string;
    prompt_id: string;
    result: string;
    executed_at: Date;
  };
}

const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

// Fully typed query
const prompts = await db
  .selectFrom('prompts')
  .innerJoin('executions', 'executions.prompt_id', 'prompts.id')
  .select(['prompts.name', 'executions.result'])
  .where('prompts.name', '=', 'code-review')
  .orderBy('executions.executed_at', 'desc')
  .limit(10)
  .execute();
// Type: Array<{ name: string; result: string }>
```

**Query building**:

```typescript
// Conditional queries
let query = db.selectFrom('prompts').selectAll();

if (filter.name) {
  query = query.where('name', 'like', `%${filter.name}%`);
}

if (filter.createdAfter) {
  query = query.where('created_at', '>', filter.createdAfter);
}

const results = await query.execute();
```

#### Strengths
- **Full type safety**: Compile-time query validation
- **IDE support**: Autocomplete for columns, tables
- **SQL-like**: Familiar syntax for SQL developers
- **Lightweight**: Small bundle size
- **Composable**: Queries can be built incrementally

#### Weaknesses
- **Not an ORM**: No relations, migrations built-in
- **Schema sync**: Must keep types in sync with DB
- **Raw SQL escape hatch**: Sometimes needed

#### Relevance to Pupt
- **High relevance**: Type-safe builder pattern for prompts
- Consider: `promptBuilder.role('...').context(...).task('...')`
- Consider: Compile-time validation of prompt structure

---

### Drizzle

> **Repository**: https://github.com/drizzle-team/drizzle-orm
> **Documentation**: https://orm.drizzle.team/
> **Philosophy**: TypeScript ORM that looks like SQL

Drizzle combines ORM features with SQL-like query syntax.

#### Core Concepts

**Schema definition**:

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const executions = pgTable('executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptId: uuid('prompt_id').references(() => prompts.id),
  result: text('result'),
  executedAt: timestamp('executed_at').defaultNow(),
});
```

**Query syntax**:

```typescript
import { eq, desc, and, like } from 'drizzle-orm';

// Select with conditions
const results = await db
  .select()
  .from(prompts)
  .where(and(
    like(prompts.name, '%review%'),
    eq(prompts.active, true)
  ))
  .orderBy(desc(prompts.createdAt));

// Relations
const withExecutions = await db.query.prompts.findMany({
  with: {
    executions: {
      limit: 5,
      orderBy: [desc(executions.executedAt)],
    },
  },
});
```

#### Strengths
- **Schema as code**: TypeScript schema definitions
- **Migrations**: Built-in migration generation
- **Relations**: ORM-style relation queries
- **Lightweight**: Small bundle, fast
- **Multiple DBs**: Postgres, MySQL, SQLite, etc.

#### Weaknesses
- **Newer project**: Less mature than Prisma
- **Learning curve**: Custom operators to learn
- **Breaking changes**: Active development

#### Relevance to Pupt
- **Medium relevance**: Schema-first pattern interesting
- Consider: Prompt schema definitions like Drizzle tables
- Consider: Migration system for prompt versions

---

## Task Runners

### Gulp

> **Repository**: https://github.com/gulpjs/gulp
> **Documentation**: https://gulpjs.com/
> **Philosophy**: Stream-based task automation

Gulp uses Node.js streams to process files through transformation pipelines.

#### Core Concepts

**Stream pipelines**:

```javascript
const { src, dest, series, parallel, watch } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const minify = require('gulp-clean-css');
const rename = require('gulp-rename');

function styles() {
  return src('src/**/*.scss')
    .pipe(sass().on('error', sass.logError))  // Transform
    .pipe(minify())                            // Transform
    .pipe(rename({ suffix: '.min' }))          // Transform
    .pipe(dest('dist'));                       // Output
}

function scripts() {
  return src('src/**/*.js')
    .pipe(babel())
    .pipe(uglify())
    .pipe(dest('dist'));
}

// Parallel execution
exports.build = parallel(styles, scripts);

// Sequential execution
exports.deploy = series(
  clean,
  parallel(styles, scripts),
  upload
);

// Watch for changes
exports.watch = function() {
  watch('src/**/*.scss', styles);
  watch('src/**/*.js', scripts);
};
```

**Custom plugins**:

```javascript
const through = require('through2');

function uppercasePlugin() {
  return through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      file.contents = Buffer.from(
        file.contents.toString().toUpperCase()
      );
    }
    cb(null, file);
  });
}

// Use in pipeline
src('*.txt')
  .pipe(uppercasePlugin())
  .pipe(dest('out'));
```

#### Strengths
- **Stream efficiency**: Memory-efficient file processing
- **Composable**: Pipelines from small transformations
- **Parallel/series**: Explicit control over execution order
- **Plugin ecosystem**: Many pre-built transformations
- **Watch**: Built-in file watching

#### Weaknesses
- **Async complexity**: Stream error handling tricky
- **File-focused**: Not ideal for non-file tasks
- **Configuration**: Still code, can get complex
- **Declining usage**: Many prefer npm scripts or bundlers

#### Relevance to Pupt
- **Medium relevance**: Pipeline pattern for prompt processing
- Consider: `prompt().pipe(resolveVars()).pipe(addContext()).pipe(render())`
- Consider: Parallel execution of independent prompt sections
- Note: Already using some stream concepts in output capture

---

## Pattern Analysis

### Comparison Matrix

| Pattern | Type Safety | Composition | Learning Curve | Bundle Size | Best For |
|---------|-------------|-------------|----------------|-------------|----------|
| **DSPy Signatures** | Medium | High | Medium | Large | ML pipelines |
| **LMQL Constraints** | High | Medium | High | Medium | Structured output |
| **Guidance Grammar** | High | High | High | Medium | Token control |
| **CDK Constructs** | High | Very High | Medium | Large | Hierarchical |
| **Pulumi Components** | High | Very High | Medium | Medium | Full language |
| **Pkl Templates** | High | High | Medium | Small | Config |
| **Kotlin DSL** | Very High | High | Low (for Kotlin) | N/A | Type-safe builders |
| **React Components** | High | Very High | Low | Medium | UI composition |
| **Kysely Builder** | Very High | High | Low | Small | SQL-like queries |
| **Gulp Pipelines** | Low | High | Low | Small | Sequential transforms |

### Paradigm Categories

#### 1. Tree/Construct Model
**Examples**: CDK, Pulumi, React

```
App
├── Stack (Prompt Collection)
│   ├── Construct (Prompt)
│   │   ├── Role Section
│   │   ├── Context Section
│   │   └── Task Section
│   └── Construct (Another Prompt)
└── Stack (Another Collection)
```

**Characteristics**:
- Parent-child relationships
- Scoped resources (constructs know their parent)
- Tree traversal for cross-cutting concerns (Aspects)
- Synthesis step generates final output

**Pros**: Natural for hierarchical prompts, good for reuse
**Cons**: More structure than simple prompts need

#### 2. Pipeline/Stream Model
**Examples**: Gulp, LCEL, Unix pipes

```
input → transform1 → transform2 → transform3 → output
```

**Characteristics**:
- Linear data flow
- Each step transforms input to output
- Easy to understand execution order
- Parallel branches possible

**Pros**: Simple mental model, easy debugging
**Cons**: Less suitable for hierarchical structures

#### 3. Constraint/Grammar Model
**Examples**: LMQL, Guidance, Outlines, CUE

```
Define constraints → Generate within constraints → Validate
```

**Characteristics**:
- Output must satisfy conditions
- Constraints applied during or after generation
- Type systems as constraint systems
- Schema-driven development

**Pros**: Guaranteed valid output, clear contracts
**Cons**: Must know constraints upfront, less flexible

#### 4. Builder/Fluent Model
**Examples**: Kysely, Kotlin DSL

```typescript
builder
  .role("expert")
  .context(ctx => ctx.file("main.ts"))
  .task("Review code")
  .build()
```

**Characteristics**:
- Method chaining
- Compile-time type checking
- IDE autocomplete
- Immutable transformations

**Pros**: Great DX, type safety, discoverability
**Cons**: Verbose for simple cases

---

## Recommendations for Pupt

Based on this research, here are recommendations for programmatic prompt definition in pupt:

### Recommended Approach: Hybrid Model

Combine the best patterns from multiple paradigms:

1. **Use Construct/Tree model for structure** (from CDK)
2. **Use Builder pattern for API** (from Kysely, Kotlin DSL)
3. **Use Constraints for validation** (from LMQL, Outlines)
4. **Keep synthesis step** (code → final prompt text)

### Proposed API Design

```typescript
// 1. Type-safe prompt definition
import { Prompt, Role, Context, Task, Output } from 'pupt';

const codeReview = new Prompt('code-review', {
  description: 'Review code for issues',
  version: '1.0.0',
})
  .role('expert code reviewer specializing in {language}')
  .context(ctx => ctx
    .file('{file_path}')
    .variable('language', { type: 'string', required: true })
    .gitDiff({ staged: true })
  )
  .task(`
    Review the code for:
    - Security vulnerabilities
    - Performance issues
    - Code style problems
  `)
  .output(schema => schema
    .field('issues', z.array(z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      line: z.number().optional(),
    })))
    .field('summary', z.string().max(200))
  );

// 2. Composition
const securityReview = codeReview.extend({
  name: 'security-review',
})
  .role(prev => `${prev} with security expertise`)
  .task(prev => `${prev}\n\nFocus especially on OWASP Top 10.`);

// 3. Synthesis
const promptText = codeReview.render({
  language: 'TypeScript',
  file_path: 'src/main.ts',
});

// 4. Or use in pupt CLI
export default codeReview;
```

### Implementation Phases

#### Phase 1: Core Builder API
- `Prompt` class with builder methods
- Variable resolution
- Basic rendering/synthesis
- TypeScript types for IDE support

#### Phase 2: Composition & Reuse
- `extend()` for prompt inheritance
- Component extraction and reuse
- Import/export for sharing

#### Phase 3: Constraints & Validation
- Zod integration for output schemas
- Runtime validation
- Constraint hints for LLM

#### Phase 4: Advanced Features
- Aspects for cross-cutting concerns
- Optimization hints
- Multi-stage prompts

### Migration Strategy

1. **Support both**: Handlebars templates and programmatic
2. **Conversion tool**: `pt convert template.md prompt.ts`
3. **Gradual adoption**: Users can mix approaches
4. **Feature parity**: All template features available programmatically

### Open Questions

1. **File format**: `.ts` vs `.mts` vs `.prompt.ts`?
2. **Runtime**: Compile to JSON or execute at runtime?
3. **Dependencies**: Allow npm imports in prompts?
4. **Testing**: How to unit test prompts?
5. **Versioning**: Schema for prompt compatibility?

---

## References

### LLM/Prompt Frameworks
- [DSPy GitHub](https://github.com/stanfordnlp/dspy) - Stanford's prompt programming framework
- [DSPy Documentation](https://dspy.ai/) - Official DSPy docs
- [LMQL](https://lmql.ai/) - Query language for LLMs
- [LMQL Paper](https://arxiv.org/abs/2212.06094) - "Prompting Is Programming"
- [Microsoft Guidance](https://github.com/guidance-ai/guidance) - Token-level control
- [Outlines](https://github.com/dottxt-ai/outlines) - Structured generation
- [LangChain LCEL](https://python.langchain.com/docs/concepts/lcel/) - Expression language
- [Microsoft POML](https://github.com/microsoft/poml) - Prompt markup language

### Infrastructure as Code
- [AWS CDK](https://docs.aws.amazon.com/cdk/) - Cloud Development Kit
- [Pulumi](https://www.pulumi.com/docs/) - Infrastructure as code
- [Pulumi vs Terraform](https://www.pulumi.com/docs/iac/comparisons/terraform/)
- [Terraform CDK](https://developer.hashicorp.com/terraform/cdktf)

### Configuration Languages
- [Pkl](https://pkl-lang.org/) - Apple's configuration language
- [CUE](https://cuelang.org/) - Constraint-based configuration
- [Dhall](https://dhall-lang.org/) - Functional configuration
- [Jsonnet](https://jsonnet.org/) - Data templating language
- [Configuration Language Comparison](https://pv.wtf/posts/taming-the-beast)

### Email Templates
- [React Email](https://react.email) - React components for email
- [MJML](https://mjml.io/) - Email framework
- [mjml-react](https://github.com/Faire/mjml-react) - React + MJML

### Document Generation
- [Typst](https://typst.app/) - Modern typesetting system
- [Typst GitHub](https://github.com/typst/typst)

### HTML/UI Generation
- [Kotlin Type-Safe Builders](https://kotlinlang.org/docs/type-safe-builders.html)
- [Ktor HTML DSL](https://ktor.io/docs/server-html-dsl.html)
- [kotlinx.html](https://github.com/Kotlin/kotlinx.html)
- [Marko.js](https://markojs.com/) - Streaming UI framework
- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [React Patterns](https://www.patterns.dev/react/)

### SQL Query Builders
- [Kysely](https://kysely.dev/) - Type-safe SQL builder
- [Drizzle](https://orm.drizzle.team/) - TypeScript ORM
- [Kysely vs Drizzle](https://marmelab.com/blog/2025/06/26/kysely-vs-drizzle.html)

### Task Runners
- [Gulp](https://gulpjs.com/) - Stream-based task runner

---

## Appendix: Code Examples from Research

### DSPy Signature Example
```python
class CodeReview(dspy.Signature):
    """Review code for bugs and improvements."""
    code: str = dspy.InputField()
    language: str = dspy.InputField()
    issues: list[str] = dspy.OutputField()
    severity: str = dspy.OutputField()
```

### LMQL Query Example
```python
@lmql.query
def review(code: str):
    '''lmql
    "Review: {code}"
    "Issues: [ISSUES]" where len(ISSUES) < 500
    "Severity: [SEV]" where SEV in ["low", "medium", "high"]
    '''
```

### CDK Construct Example
```typescript
class ReviewPipeline extends Construct {
  constructor(scope: Construct, id: string, props: ReviewPipelineProps) {
    super(scope, id);
    // Define resources
  }
}
```

### Kotlin DSL Example
```kotlin
val prompt = prompt {
    role { "expert reviewer" }
    task { "review code" }
}
```

### Kysely Builder Example
```typescript
const query = db
  .selectFrom('prompts')
  .select(['name', 'content'])
  .where('active', '=', true);
```
