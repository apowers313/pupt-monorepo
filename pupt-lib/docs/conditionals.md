# Conditionals

Conditionals let you include or exclude sections of a prompt based on user input, environment settings, or computed values. They make prompts dynamic -- the same prompt file can produce different output depending on the situation.

```tsx
<Prompt name="assistant">
  <Ask.Confirm name="verbose" label="Include detailed output?" silent />

  <Task>Help the user with their question.</Task>

  <If when="=verbose">
    <Section name="detail-level">
      Provide comprehensive explanations with examples and references.
    </Section>
  </If>
</Prompt>
```

When `verbose` is `true`, the detail-level section is included. When `false`, it's omitted entirely. The `silent` prop on `Ask.Confirm` means the "Yes"/"No" value doesn't appear in the rendered prompt -- it only drives the conditional logic.

## Quick Start

The most common pattern is `<If>` with a boolean or formula condition:

```tsx
// Boolean -- renders children when true
<If when={true}>This appears</If>
<If when={false}>This does not</If>

// Formula -- evaluates an Excel-like expression against user inputs
<If when="=count>5">There are many items.</If>

// Provider -- renders only for specific LLM providers
<If provider="anthropic">Use XML tags for structured output.</If>
```

## Types of Conditionals

pupt-lib provides two categories of conditional components:

| Category | Components | Purpose |
|----------|-----------|---------|
| **Control flow** | `If`, `ForEach` | Dynamically include/exclude content at render time based on runtime values |
| **Descriptive** | `When`, `Fallback`, `Fallbacks`, `EdgeCases` | Describe conditional behavior to the LLM as structured text in the prompt |

**Control flow** components change what appears in the rendered prompt. Content is either included or omitted.

**Descriptive** components always render -- they produce text that tells the LLM how to handle specific situations. They don't control rendering; they communicate instructions.

---

## `<If>` -- Conditional Rendering

`<If>` is the primary control flow component. It evaluates a condition and renders its children only when the condition is true.

### Boolean Conditions

The simplest form passes a JavaScript boolean directly:

```tsx
<If when={true}>
  This content is included.
</If>

<If when={false}>
  This content is excluded.
</If>
```

You can use any JavaScript expression that produces a boolean:

```tsx
const isAdmin = user.role === 'admin';

<If when={isAdmin}>
  You have full administrative access.
</If>
```

### Formula Conditions

For conditions that depend on user input collected by Ask components, use Excel-style formulas. Formulas start with `=` and can reference any input variable by name:

```tsx
<Ask.Number name="count" label="How many items?" default={3} silent />

<If when="=count>5">
  Processing a large batch.
</If>

<If when="=count<=5">
  Processing a small batch.
</If>
```

Formulas are evaluated by [HyperFormula](https://hyperformula.handsontable.com/), an Excel-compatible formula engine. This means you can use familiar spreadsheet functions:

```tsx
// Logical operators
<If when="=AND(role='admin', status='active')">
  Active admin content.
</If>

<If when="=OR(lang='en', lang='es')">
  English or Spanish content.
</If>

<If when="=NOT(dryRun)">
  Performing real operations.
</If>

// Math and comparisons
<If when="=price*quantity>1000">
  Large order detected.
</If>

<If when="=SUM(score1,score2,score3)>200">
  High combined score.
</If>

// String functions
<If when="=LEN(name)>0">
  Name was provided.
</If>

// Checking for blank/missing values
<If when="=ISBLANK(optionalField)">
  No optional field provided.
</If>
```

#### How Formulas Work

When a formula is evaluated:

1. Each input variable (from `context.inputs`) is placed in a spreadsheet cell.
2. Variable names in the formula are replaced with cell references (e.g., `count` becomes `A1`).
3. The formula is evaluated using the HyperFormula engine.
4. The result is converted to a boolean:
   - Boolean results are used directly (`TRUE`/`FALSE`).
   - Numbers: `0` is `false`, any other number is `true`.
   - Strings: empty string is `false`, non-empty is `true`.
   - Errors (invalid formula, division by zero, etc.) are `false`.

#### String Values Without `=`

If the `when` prop is a string that does *not* start with `=`, it's treated as a simple truthy check:

```tsx
// Non-empty string → true
<If when="hello">This renders.</If>

// Empty string → false
<If when="">This does not render.</If>
```

### Provider Conditions

Target content to specific LLM providers. This is useful when different models work better with different prompting styles:

```tsx
// Single provider
<If provider="anthropic">
  Use XML tags to structure your response.
</If>

// Multiple providers
<If provider={['anthropic', 'google']}>
  Content for Anthropic or Google models.
</If>

// Exclude a provider
<If notProvider="openai">
  Content for all providers except OpenAI.
</If>

// Exclude multiple providers
<If notProvider={['openai', 'google']}>
  Content for providers other than OpenAI and Google.
</If>
```

Supported providers: `anthropic`, `openai`, `google`, `meta`, `mistral`, `deepseek`, `xai`, `cohere`, `unspecified`.

#### Precedence

When multiple props are specified on the same `<If>`, they are evaluated in this order:

1. `provider` -- checked first
2. `notProvider` -- checked second
3. `when` -- checked last

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `when` | `boolean \| string` | `undefined` | Boolean value, or a formula string starting with `=` that evaluates against `context.inputs`. Non-formula strings are treated as truthy/falsy. |
| `provider` | `string \| string[]` | `undefined` | Render children only when the current LLM provider matches. Takes precedence over `when`. |
| `notProvider` | `string \| string[]` | `undefined` | Render children only when the current LLM provider does *not* match. |
| `children` | `PuptNode` | -- | Content to render when the condition is true. |

---

## `<ForEach>` -- Iteration

`<ForEach>` iterates over an array and renders content for each item. It accepts a render function as children that receives each item and its index.

```tsx
const languages = ['TypeScript', 'Python', 'Rust'];

<ForEach items={languages} as="lang">
  {(lang, index) => `${index + 1}. ${lang}\n`}
</ForEach>
```

Renders:

```
1. TypeScript
2. Python
3. Rust
```

### With Objects

```tsx
const reviewers = [
  { name: 'Alice', focus: 'security' },
  { name: 'Bob', focus: 'performance' },
];

<ForEach items={reviewers} as="reviewer">
  {(reviewer) => `- ${reviewer.name} reviews ${reviewer.focus}\n`}
</ForEach>
```

Renders:

```
- Alice reviews security
- Bob reviews performance
```

### Static Content Repetition

When children is not a function, the content is repeated for each item:

```tsx
<ForEach items={[1, 2, 3]} as="item">
  ---{'\n'}
</ForEach>
```

Renders:

```
---
---
---
```

### Empty Arrays

When `items` is empty, nothing is rendered:

```tsx
<ForEach items={[]} as="item">
  {(item) => `Item: ${item}`}
</ForEach>
// Renders: (nothing)
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `unknown[]` | *(required)* | Array of items to iterate over. Returns nothing if empty. |
| `as` | `string` | *(required)* | Descriptive name for each item (documents intent). |
| `children` | `((item, index) => PuptNode) \| PuptNode` | -- | Render function receiving each item and its zero-based index, or static content to repeat. |

---

## `<When>` -- Describing Conditional Scenarios

`<When>` describes a conditional scenario as structured text in the prompt. Unlike `<If>`, it does not control what renders -- it always produces output that tells the LLM what to do when a specific situation arises. Typically used inside `<EdgeCases>`.

```tsx
<When condition="input is empty" then="Ask the user to provide input" />
```

Renders (with default XML delimiter):

```xml
<when>
When input is empty: Ask the user to provide input
</when>
```

### Using Children Instead of `then`

Children take precedence over the `then` prop:

```tsx
<When condition="data is ambiguous">
  List all possible interpretations and ask the user to choose one.
</When>
```

### Condition Only

If no action is specified, only the condition is rendered:

```tsx
<When condition="user provides contradictory requirements" />
```

Renders:

```xml
<when>
When user provides contradictory requirements
</when>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `condition` | `string` | *(required)* | Description of the situation (e.g., "input is empty", "data is ambiguous"). |
| `then` | `string` | -- | Action to take when the condition occurs. Overridden by children if both are provided. |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Output format. `'xml'` wraps in `<when>` tags, `'markdown'` uses a `## when` header, `'none'` produces plain text. |
| `children` | `PuptNode` | -- | Action content (preferred over `then` if both are provided). |

---

## `<EdgeCases>` -- Grouping Conditional Scenarios

`<EdgeCases>` is a container for `<When>` components. It groups conditional scenarios into a labeled section and supports presets for common patterns.

```tsx
<EdgeCases>
  <When condition="input contains invalid characters" then="reject and explain which characters are not allowed" />
  <When condition="request exceeds rate limit" then="inform the user and suggest they try again later" />
</EdgeCases>
```

Renders:

```xml
<edge-cases>
<when>
When input contains invalid characters: reject and explain which characters are not allowed
</when>
<when>
When request exceeds rate limit: inform the user and suggest they try again later
</when>
</edge-cases>
```

### Using Presets

```tsx
// Standard preset -- handles missing data, out-of-scope, and ambiguity
<EdgeCases preset="standard" />

// Minimal preset -- just handles unclear input
<EdgeCases preset="minimal" />

// Combine preset with custom cases
<EdgeCases preset="standard">
  <When condition="API returns a 429 status" then="wait and retry with exponential backoff" />
</EdgeCases>
```

**Standard preset** includes:

| Condition | Action |
|-----------|--------|
| Input is missing required data | Ask the user to provide the missing information |
| Request is outside your expertise | Acknowledge limitations and suggest alternative resources |
| Multiple valid interpretations exist | List the interpretations and ask for clarification |

**Minimal preset** includes:

| Condition | Action |
|-----------|--------|
| Input is unclear | Ask for clarification |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset` | `'standard' \| 'minimal'` | -- | Include a predefined set of edge case handlers. |
| `extend` | `boolean` | -- | Reserved for future use. |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Output format wrapping. |
| `children` | `When` elements | -- | Custom `<When>` components to include. |

---

## `<Fallback>` -- Single Fallback Strategy

`<Fallback>` describes a single fallback behavior as an "If...then" statement. It tells the LLM what to do when something goes wrong. Typically used inside `<Fallbacks>`.

```tsx
<Fallback when="unable to complete the request" then="explain why and suggest alternatives" />
```

Renders:

```xml
<fallback>
If unable to complete the request, then explain why and suggest alternatives
</fallback>
```

### Using Children

Children override the `then` prop:

```tsx
<Fallback when="authentication fails">
  Ask the user to verify their credentials and try again.
</Fallback>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `when` | `string` | *(required)* | The error condition or situation (e.g., "unable to complete the request"). |
| `then` | `string` | *(required)* | Action to take. Overridden by children if both are provided. |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Output format wrapping. |
| `children` | `PuptNode` | -- | Action content (preferred over `then` if both are provided). |

---

## `<Fallbacks>` -- Grouping Fallback Strategies

`<Fallbacks>` is a container for `<Fallback>` components. It groups fallback strategies into a labeled section and supports presets.

```tsx
<Fallbacks>
  <Fallback when="rate limited" then="wait and retry" />
  <Fallback when="authentication fails" then="request new credentials" />
</Fallbacks>
```

### Using Presets

```tsx
// Standard preset -- covers common error scenarios
<Fallbacks preset="standard" />

// Combine preset with custom fallbacks
<Fallbacks preset="standard">
  <Fallback when="timeout occurs" then="retry the operation" />
</Fallbacks>
```

**Standard preset** includes:

| When | Then |
|------|------|
| Unable to complete the request | Explain why and suggest alternatives |
| Missing required information | Ask clarifying questions |
| Encountering an error | Describe the error and suggest a fix |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset` | `'standard'` | -- | Include the standard set of fallback behaviors. |
| `extend` | `boolean` | -- | Reserved for future use. |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Output format wrapping. |
| `children` | `Fallback` elements | -- | Custom `<Fallback>` components to include. |

---

## Delimiter Options

The descriptive conditional components (`When`, `Fallback`, `Fallbacks`, `EdgeCases`) support a `delimiter` prop that controls how their output is wrapped:

| Delimiter | Output |
|-----------|--------|
| `'xml'` (default) | Wrapped in XML tags: `<tag>content</tag>` |
| `'markdown'` | Preceded by a markdown header: `## tag` |
| `'none'` | Plain text with no wrapping |

Example with each delimiter:

```tsx
// XML (default)
<When condition="error occurs" then="handle it" />
// → <when>\nWhen error occurs: handle it\n</when>\n

// Markdown
<When condition="error occurs" then="handle it" delimiter="markdown" />
// → ## when\n\nWhen error occurs: handle it

// None
<When condition="error occurs" then="handle it" delimiter="none" />
// → When error occurs: handle it
```

---

## Combining Conditionals with Ask Components

The most powerful pattern is using Ask components to collect input, then using `<If>` to conditionally include sections based on that input. The `silent` prop on Ask components keeps the raw input values out of the prompt while making them available for formula evaluation.

```tsx
<Prompt name="report-builder">
  <Ask.Text name="topic" label="Report topic" required />
  <Ask.Number name="wordCount" label="Target word count" default={500} min={100} max={5000} silent />
  <Ask.Confirm name="includeSources" label="Include source citations?" silent />
  <Ask.Confirm name="includeCharts" label="Describe charts/visualizations?" silent />
  <Ask.Select name="audience" label="Target audience" default="general" silent>
    <Ask.Option value="general">General</Ask.Option>
    <Ask.Option value="technical">Technical</Ask.Option>
    <Ask.Option value="executive">Executive</Ask.Option>
  </Ask.Select>

  <Task>
    Write a report on {topic}, approximately {wordCount} words.
  </Task>

  <If when="=includeSources">
    <Constraint>Include source citations in APA format.</Constraint>
  </If>

  <If when="=includeCharts">
    <Constraint>Suggest charts or visualizations where data supports them.</Constraint>
  </If>

  <If when="=audience='technical'">
    <Constraint>Include code examples and technical details.</Constraint>
  </If>

  <If when="=audience='executive'">
    <Constraint>Keep the language concise. Lead with key findings and recommendations.</Constraint>
  </If>

  <If when="=wordCount>2000">
    <Constraint>Include a table of contents at the beginning.</Constraint>
  </If>

  <EdgeCases preset="standard" />

  <Fallbacks preset="standard" />
</Prompt>
```

---

## Formula Reference

Formulas used in `<If when="=...">` are powered by [HyperFormula](https://hyperformula.handsontable.com/) v3, an open-source Excel-compatible formula engine. Any formula that HyperFormula supports can be used. Below are the most useful functions for prompt conditionals, followed by the complete list.

### Commonly Used Functions

#### Comparison Operators

Standard operators work directly in formulas:

```tsx
<If when="=count>10">...</If>        // Greater than
<If when="=count<5">...</If>         // Less than
<If when="=count>=10">...</If>       // Greater than or equal
<If when="=count<=5">...</If>        // Less than or equal
<If when="=name='Alice'">...</If>    // Equality (use single quotes for strings)
```

#### Logical Functions

| Function | Description | Example |
|----------|-------------|---------|
| `AND(a, b, ...)` | True if all arguments are true | `=AND(age>=18, hasConsent)` |
| `OR(a, b, ...)` | True if any argument is true | `=OR(role='admin', role='owner')` |
| `NOT(a)` | Inverts a boolean | `=NOT(dryRun)` |
| `IF(test, then, else)` | Returns one of two values | `=IF(score>90, TRUE, FALSE)` |
| `IFS(test1, val1, ...)` | First matching condition | `=IFS(x>90, TRUE, x>50, TRUE)` |
| `IFERROR(value, fallback)` | Returns fallback if error | `=IFERROR(a/b, FALSE)` |
| `SWITCH(expr, case1, val1, ...)` | Multi-value matching | `=SWITCH(mode, "fast", TRUE, "slow", FALSE)` |
| `XOR(a, b, ...)` | True if odd number are true | `=XOR(optionA, optionB)` |

#### Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `SUM(a, b, ...)` | Sum of values | `=SUM(score1, score2, score3)>200` |
| `ABS(n)` | Absolute value | `=ABS(delta)<0.01` |
| `MOD(n, divisor)` | Remainder | `=MOD(count, 2)=0` |
| `ROUND(n, places)` | Round to decimal places | `=ROUND(ratio, 2)>0.5` |
| `INT(n)` | Round down to integer | `=INT(total)>100` |
| `MIN(a, b, ...)` | Smallest value | `=MIN(x, y, z)>0` |
| `MAX(a, b, ...)` | Largest value | `=MAX(x, y, z)<100` |
| `AVERAGE(a, b, ...)` | Arithmetic mean | `=AVERAGE(s1, s2, s3)>=80` |

#### Text Functions

| Function | Description | Example |
|----------|-------------|---------|
| `LEN(text)` | String length | `=LEN(name)>0` |
| `LEFT(text, n)` | First n characters | `=LEFT(code, 2)="US"` |
| `RIGHT(text, n)` | Last n characters | `=RIGHT(file, 3)="csv"` |
| `MID(text, start, n)` | Substring | `=MID(id, 1, 4)="PROJ"` |
| `UPPER(text)` | Uppercase | `=UPPER(status)="ACTIVE"` |
| `LOWER(text)` | Lowercase | `=LOWER(type)="error"` |
| `TRIM(text)` | Remove extra spaces | `=LEN(TRIM(input))>0` |
| `CONCATENATE(a, b, ...)` | Join strings | `=LEN(CONCATENATE(first, last))>0` |
| `EXACT(a, b)` | Case-sensitive compare | `=EXACT(password, confirm)` |
| `FIND(search, text)` | Find substring position | `=IFERROR(FIND("@", email), 0)>0` |
| `SUBSTITUTE(text, old, new)` | Replace text | -- |

#### Information Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ISBLANK(value)` | True if empty/null | `=ISBLANK(optionalField)` |
| `ISNUMBER(value)` | True if number | `=ISNUMBER(input)` |
| `ISTEXT(value)` | True if string | `=ISTEXT(value)` |
| `ISLOGICAL(value)` | True if boolean | `=ISLOGICAL(flag)` |
| `ISEVEN(n)` | True if even number | `=ISEVEN(count)` |
| `ISODD(n)` | True if odd number | `=ISODD(count)` |

### Value Type Handling

Input values from Ask components are mapped to spreadsheet cell types:

| JavaScript Type | Cell Type | Example |
|----------------|-----------|---------|
| `string` | Text cell | `"hello"` |
| `number` | Numeric cell | `42` |
| `boolean` | Boolean cell | `true` / `false` |
| `null` / `undefined` | Empty cell | -- |
| Other | String representation | `String(value)` |

### Complete Function List

HyperFormula v3 supports 395 built-in functions across 12 categories. Below is the full list. For detailed documentation on any function, see the [HyperFormula function reference](https://hyperformula.handsontable.com/guide/built-in-functions.html).

#### Date and Time (25 functions)

`DATE`, `DATEDIF`, `DATEVALUE`, `DAY`, `DAYS`, `DAYS360`, `EDATE`, `EOMONTH`, `HOUR`, `INTERVAL`, `ISOWEEKNUM`, `MINUTE`, `MONTH`, `NETWORKDAYS`, `NETWORKDAYS.INTL`, `NOW`, `SECOND`, `TIME`, `TIMEVALUE`, `TODAY`, `WEEKDAY`, `WEEKNUM`, `WORKDAY`, `WORKDAY.INTL`, `YEAR`, `YEARFRAC`

#### Engineering (50+ functions)

`BIN2DEC`, `BIN2HEX`, `BIN2OCT`, `BITAND`, `BITLSHIFT`, `BITOR`, `BITRSHIFT`, `BITXOR`, `COMPLEX`, `DEC2BIN`, `DEC2HEX`, `DEC2OCT`, `DELTA`, `ERF`, `ERFC`, `HEX2BIN`, `HEX2DEC`, `HEX2OCT`, `IMABS`, `IMAGINARY`, `IMARGUMENT`, `IMCONJUGATE`, `IMCOS`, `IMCOSH`, `IMCOT`, `IMCSC`, `IMCSCH`, `IMDIV`, `IMEXP`, `IMLN`, `IMLOG10`, `IMLOG2`, `IMPOWER`, `IMPRODUCT`, `IMREAL`, `IMSEC`, `IMSECH`, `IMSIN`, `IMSINH`, `IMSQRT`, `IMSUB`, `IMSUM`, `IMTAN`, `OCT2BIN`, `OCT2DEC`, `OCT2HEX`

#### Financial (30 functions)

`CUMIPMT`, `CUMPRINC`, `DB`, `DDB`, `DOLLARDE`, `DOLLARFR`, `EFFECT`, `FV`, `FVSCHEDULE`, `IPMT`, `ISPMT`, `MIRR`, `NOMINAL`, `NPER`, `NPV`, `PDURATION`, `PMT`, `PPMT`, `PV`, `RATE`, `RRI`, `SLN`, `SYD`, `TBILLEQ`, `TBILLPRICE`, `TBILLYIELD`, `XNPV`

#### Information (14 functions)

`ISBINARY`, `ISBLANK`, `ISERR`, `ISERROR`, `ISEVEN`, `ISFORMULA`, `ISLOGICAL`, `ISNA`, `ISNONTEXT`, `ISNUMBER`, `ISODD`, `ISREF`, `ISTEXT`, `NA`, `SHEET`, `SHEETS`

#### Logical (9 functions)

`AND`, `FALSE`, `IF`, `IFERROR`, `IFNA`, `IFS`, `NOT`, `OR`, `SWITCH`, `TRUE`, `XOR`

#### Lookup and Reference (13 functions)

`ADDRESS`, `CHOOSE`, `COLUMN`, `COLUMNS`, `FORMULATEXT`, `HLOOKUP`, `INDEX`, `MATCH`, `OFFSET`, `ROW`, `ROWS`, `VLOOKUP`, `XLOOKUP`

#### Math and Trigonometry (80+ functions)

`ABS`, `ACOS`, `ACOSH`, `ACOT`, `ACOTH`, `ARABIC`, `ASIN`, `ASINH`, `ATAN`, `ATAN2`, `ATANH`, `BASE`, `CEILING`, `CEILING.MATH`, `CEILING.PRECISE`, `COMBIN`, `COMBINA`, `COS`, `COSH`, `COT`, `COTH`, `COUNTUNIQUE`, `CSC`, `CSCH`, `DECIMAL`, `DEGREES`, `EVEN`, `EXP`, `FACT`, `FACTDOUBLE`, `FLOOR`, `FLOOR.MATH`, `FLOOR.PRECISE`, `GCD`, `INT`, `ISO.CEILING`, `LCM`, `LN`, `LOG`, `LOG10`, `MOD`, `MROUND`, `MULTINOMIAL`, `ODD`, `PI`, `POWER`, `PRODUCT`, `QUOTIENT`, `RADIANS`, `RAND`, `RANDBETWEEN`, `ROMAN`, `ROUND`, `ROUNDDOWN`, `ROUNDUP`, `SEC`, `SECH`, `SERIESSUM`, `SIGN`, `SIN`, `SINH`, `SQRT`, `SQRTPI`, `SUBTOTAL`, `SUM`, `SUMIF`, `SUMIFS`, `SUMPRODUCT`, `SUMSQ`, `SUMX2MY2`, `SUMX2PY2`, `SUMXMY2`, `TAN`, `TANH`, `TRUNC`

#### Matrix (4 functions)

`MAXPOOL`, `MEDIANPOOL`, `MMULT`, `TRANSPOSE`

#### Statistical (90+ functions)

`AVEDEV`, `AVERAGE`, `AVERAGEA`, `AVERAGEIF`, `AVERAGEIFS`, `BESSELI`, `BESSELJ`, `BESSELK`, `BESSELY`, `BETA.DIST`, `BETA.INV`, `BETADIST`, `BETAINV`, `BINOM.DIST`, `BINOM.INV`, `BINOMDIST`, `CHIDIST`, `CHIINV`, `CHISQ.DIST`, `CHISQ.DIST.RT`, `CHISQ.INV`, `CHISQ.INV.RT`, `CHISQ.TEST`, `CONFIDENCE`, `CONFIDENCE.NORM`, `CONFIDENCE.T`, `CORREL`, `COUNT`, `COUNTA`, `COUNTBLANK`, `COUNTIF`, `COUNTIFS`, `COVAR`, `COVARIANCE.P`, `COVARIANCE.S`, `DEVSQ`, `EXPON.DIST`, `EXPONDIST`, `F.DIST`, `F.DIST.RT`, `F.INV`, `F.INV.RT`, `F.TEST`, `FISHER`, `FISHERINV`, `FORECAST`, `GAMMA`, `GAMMA.DIST`, `GAMMA.INV`, `GAMMADIST`, `GAMMAINV`, `GAMMALN`, `GAMMALN.PRECISE`, `GAUSS`, `GEOMEAN`, `HARMEAN`, `HYPGEOM.DIST`, `HYPGEOMDIST`, `INTERCEPT`, `LARGE`, `LOGNORM.DIST`, `LOGNORM.INV`, `LOGNORMDIST`, `LOGNORMINV`, `MAX`, `MAXA`, `MAXIFS`, `MEDIAN`, `MIN`, `MINA`, `MINIFS`, `NEGBINOM.DIST`, `NEGBINOMDIST`, `NORM.DIST`, `NORM.INV`, `NORM.S.DIST`, `NORM.S.INV`, `NORMDIST`, `NORMINV`, `NORMSDIST`, `NORMSINV`, `PEARSON`, `PERCENTILE`, `PERCENTRANK`, `PERMUT`, `PHI`, `POISSON`, `POISSON.DIST`, `PROB`, `RSQ`, `SKEW`, `SKEW.P`, `SLOPE`, `SMALL`, `STANDARDIZE`, `STDEV`, `STDEV.P`, `STDEV.S`, `STDEVA`, `STDEVP`, `STDEVPA`, `STEYX`, `T.DIST`, `T.DIST.2T`, `T.DIST.RT`, `T.INV`, `T.INV.2T`, `T.TEST`, `TDIST`, `TINV`, `TTEST`, `VAR`, `VAR.P`, `VAR.S`, `VARA`, `VARP`, `VARPA`, `WEIBULL`, `WEIBULL.DIST`, `Z.TEST`, `ZTEST`

#### Text (18 functions)

`CHAR`, `CLEAN`, `CODE`, `CONCATENATE`, `EXACT`, `FIND`, `LEFT`, `LEN`, `LOWER`, `MID`, `PROPER`, `REPLACE`, `REPT`, `RIGHT`, `SEARCH`, `SPLIT`, `SUBSTITUTE`, `T`, `TEXT`, `TRIM`, `UNICHAR`, `UNICODE`, `UPPER`

#### Array Manipulation (3 functions)

`ARRAY_CONSTRAIN`, `ARRAYFORMULA`, `FILTER`
