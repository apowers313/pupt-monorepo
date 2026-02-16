# Implementation & Code Generation Prompts

**SDLC Phase:** Coding, Feature Development
**Category Clarity:** CLEAR -- the largest category
**Developer Trust:** MEDIUM-HIGH for small tasks; LOW for complex multi-file work

---

## Prompt 1: Feature Implementation (Detailed)

**Source:** Addy Osmani Playbook
**Pattern:** Fully specified with constraints
**Why it works:** Leaves minimal ambiguity; gets usable output on first try

```
Create a React functional component called ProductList that displays a list
of products and includes a text input to filter the products by name. The
component should:
- Fetch an array of products from /api/products
- Store them in state
- Allow the user to type in a search box to filter displayed products by
  name (case-insensitive match)
- Display filtered list in a simple <ul> with product names
- Include basic error handling and a loading state while fetching
```

---

## Prompt 2: Role-Based Generation

**Source:** Multiple sources (7+ cite this as a key pattern)
**Pattern:** Persona assignment
**Why it works:** Primes domain-specific vocabulary and best practices

```
You are a senior Python backend developer specializing in security.
Generate a Flask route to handle user registration. It should:
- Accept email, password, and display name
- Validate email format and password strength (min 12 chars, mixed case, number)
- Hash password with bcrypt
- Check for duplicate emails
- Return appropriate HTTP status codes for each failure mode
- Include rate limiting considerations
```

---

## Prompt 3: Few-Shot with Examples

**Source:** Academic research (15-40% accuracy improvement)
**Pattern:** Input/output examples to enforce conventions
**Why it works:** The model matches the pattern, not just the description

```
Convert the following API responses to our standard error format.

### Example 1 Input:
{ "error": "not_found", "message": "User does not exist" }

### Example 1 Output:
{ "status": 404, "error": { "code": "RESOURCE_NOT_FOUND", "message": "User does not exist", "timestamp": "ISO-8601" } }

### Example 2 Input:
{ "error": "unauthorized", "message": "Invalid token" }

### Example 2 Output:
{ "status": 401, "error": { "code": "AUTH_FAILURE", "message": "Invalid token", "timestamp": "ISO-8601" } }

### Now convert:
{ "error": "rate_limited", "message": "Too many requests" }
```

---

## Prompt 4: Test-Driven Implementation

**Source:** Cursor tips, TDD with AI blog, multiple Reddit threads
**Pattern:** Tests as specification
**Why it works:** Cited as the single most effective prompt pattern for Cursor; tests verify correctness automatically

```
Write tests first, then the code, then run the tests and update the code
until tests pass.

The function should:
- [behavior 1]
- [behavior 2]
- [edge case 1]
- [edge case 2]

Use [testing framework]. Follow the Arrange-Act-Assert pattern.
```

---

## Prompt 5: Scaffold from Existing Pattern

**Source:** Addy Osmani Playbook
**Pattern:** Reference-based generation
**Why it works:** Produces consistent code by matching existing patterns

```
Here is an existing UserCard component:
[paste existing component code]

Now create a TeamCard component that follows the same patterns but:
- Displays team name and description instead of user name
- Shows member avatars (max 5, with "+N" overflow)
- Includes a shared project count
- Uses the same styling approach and state management patterns
```

---

## Prompt 6: Constrained Generation

**Source:** Reddit, PostHog .cursorrules
**Pattern:** Explicit constraints to prevent unwanted patterns
**Why it works:** Prevents common AI tendencies (overengineering, wrong patterns)

```
Implement a [feature description].

Constraints:
- Use [specific library/framework] version [X]
- Do NOT use [forbidden approach]
- Do NOT add any dependencies not already in package.json
- Follow the existing code patterns in [reference file]
- Keep it simple -- no abstractions unless there are 3+ use cases
- No classes; use functional style
- Handle errors with Result types, not thrown exceptions
```

---

## Prompt 7: MVP Boilerplate

**Source:** Reddit prompt collections
**Pattern:** Structured scaffold request
**Why it works:** Gets a working starting point quickly for prototyping

```
You are an expert full-stack developer building an MVP for [describe product].

Tech Stack: [list technologies]
Key Features: [list 3-5 core features]

Generate:
1. Project folder structure
2. Database schema with relationships
3. API endpoints for core features
4. Basic frontend component hierarchy
5. Authentication flow

Keep it minimal -- only what's needed for the first demo. No premature
optimization or abstraction.
```

---

## Prompt 8: Inline TODO Completion (Copilot-style)

**Source:** GitHub Copilot best practices
**Pattern:** Code comments as prompts
**Why it works:** Natural integration with autocomplete-style tools

```typescript
// TODO: Validate the request payload
// - Ensure name is a non-empty string (max 100 chars)
// - Ensure email matches RFC 5322 format
// - Ensure age is a positive integer between 13 and 150
// - Return a ValidationError with field-specific messages on failure
```

---

## Prompt 9: Iterative Refinement

**Source:** Addy Osmani, universal recommendation
**Pattern:** Draft-then-refine dialogue
**Why it works:** Gets progressively closer to what you need

```
[After receiving initial output]

Good start, but I need these changes:
1. Use the built-in array filter method instead of a for loop
2. Add TypeScript generics so the function is type-safe
3. Handle the case where the input array is empty (return empty array, don't throw)

Keep everything else the same.
```

---

## Prompt 10: Build Error Resolution Loop

**Source:** Cursor tips, Claude Code workflows
**Pattern:** Automated fix-verify cycle
**Why it works:** Leverages AI's ability to iterate on compiler/test feedback

```
Run the build command to see errors, then fix them, and run the build again
until it passes. Don't change any behavior -- only fix the errors.
```

---

## Prompt 11: Cross-Language Translation

**Source:** Stack Overflow Blog, developer discussions
**Pattern:** Language conversion with idiomatic adaptation
**Why it works:** AI excels at syntax transformation when patterns are clear

```
Convert this [source language] code to idiomatic [target language]:

[paste code]

Don't just translate syntax 1:1. Use [target language] idioms and best
practices. For example:
- Use [target language pattern] instead of [source language pattern]
- Use the standard library equivalents where they exist
- Follow [target language] naming conventions
```

---

## Prompt 12: Pseudocode to Implementation

**Source:** Academic research (7-16 point F1 improvement)
**Pattern:** Structured specification to code
**Why it works:** Reduces ambiguity by providing algorithmic structure

```
Implement the following in [language]:

FUNCTION process_order(order):
    VALIDATE order.items IS NOT EMPTY
    VALIDATE order.customer_id EXISTS in database
    SET total = 0
    FOR EACH item IN order.items:
        VALIDATE item.quantity > 0
        SET item_price = LOOKUP item.product_id price
        SET total = total + (item_price * item.quantity)
    IF order.coupon_code IS NOT NULL:
        SET discount = APPLY_COUPON(order.coupon_code, total)
        SET total = total - discount
    CREATE transaction_record(order, total)
    RETURN Success(transaction_id)

Use [ORM] for database access and [validation library] for input validation.
Handle each failure case with appropriate error types.
```
