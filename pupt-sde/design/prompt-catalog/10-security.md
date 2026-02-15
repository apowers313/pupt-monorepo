# Security Prompts

**SDLC Phase:** Security Review, Vulnerability Assessment
**Category Clarity:** FUZZY (overlaps with code review)
**Developer Trust:** LOW (45% of AI-generated code has security flaws)

---

## Prompt 1: CWE-Aware Secure Code Generation

**Source:** Endor Labs research (reduced weakness density by 59-64%)
**Pattern:** Anti-Pattern Avoidance Prompt
**Why it works:** Explicitly naming CWEs to avoid dramatically reduces vulnerabilities

```
Generate secure [language] code that: [describe the coding task].

The code MUST avoid these critical CWEs:
- CWE-89: SQL Injection (use parameterized queries)
- CWE-79: Cross-Site Scripting (sanitize all output)
- CWE-20: Improper Input Validation (validate all user input)
- CWE-200: Information Exposure (don't leak internals in errors)
- CWE-798: Hardcoded Credentials (use environment variables)
- CWE-22: Path Traversal (validate and sanitize file paths)
- CWE-502: Insecure Deserialization (validate before deserializing)

For each security measure implemented, add a comment explaining which
CWE it mitigates.
```

---

## Prompt 2: Security Audit of Existing Code

**Source:** Augment Code, Veracode report
**Pattern:** Systematic vulnerability scan
**Why it works:** Structured checklist prevents missing common categories

```
Perform a security audit of the following code. Check the OWASP Top 10:

1. **Injection** (SQL, NoSQL, OS command, LDAP)
2. **Broken Authentication** (weak sessions, credential storage)
3. **Sensitive Data Exposure** (unencrypted data, verbose errors)
4. **XML External Entities** (if applicable)
5. **Broken Access Control** (missing auth checks, IDOR)
6. **Security Misconfiguration** (default credentials, debug mode)
7. **Cross-Site Scripting** (stored, reflected, DOM-based)
8. **Insecure Deserialization**
9. **Known Vulnerable Components** (check dependency versions)
10. **Insufficient Logging** (missing audit trail)

For each finding:
- Severity: Critical / High / Medium / Low
- CWE identifier
- The vulnerable code with line reference
- Exploitation scenario
- Remediation with code example

[paste code]
```

---

## Prompt 3: Supply Chain Security Check

**Source:** DarkReading, ACM research on package hallucination
**Pattern:** Dependency verification
**Why it works:** 21-30% of AI-suggested packages are hallucinated

```
Review the dependencies in this code / package.json / requirements.txt:

[paste dependency list or code with imports]

For each dependency:
1. Verify it exists on [npm/PyPI/crates.io] (flag any that don't)
2. Check if the version specified is current or deprecated
3. Identify any known vulnerabilities in the specified version
4. Flag any dependencies that seem unnecessarily broad (e.g., pulling
   in a large framework for one utility function)
5. Check for typosquatting risk (similar names to popular packages)

Also check for:
- Packages not in the dependency file but referenced in imports
- Unused packages in the dependency file
```

---

## Prompt 4: Authentication/Authorization Review

**Source:** Security engineering blogs, code review guides
**Pattern:** Auth-specific deep dive
**Why it works:** Auth is the #1 attack surface; focused review catches more

```
Review this authentication/authorization implementation for security issues:

[paste auth code]

Check specifically for:
1. Password storage (bcrypt/argon2 with proper cost factor?)
2. Session management (secure, httpOnly, sameSite cookies?)
3. Token handling (short expiry? proper rotation? stored securely?)
4. Rate limiting on login/signup endpoints
5. Account enumeration prevention (same response for valid/invalid users)
6. CSRF protection on state-changing operations
7. Privilege escalation (can a user access another user's resources?)
8. JWT vulnerabilities (alg:none, weak secret, missing expiry)
9. OAuth/OIDC implementation (state parameter, PKCE, redirect validation)

For each issue found, provide the fix with code.
```

---

## Prompt 5: Secure API Endpoint Review

**Source:** Security-focused code review guides
**Pattern:** Input boundary analysis
**Why it works:** API endpoints are the primary attack surface

```
Review this API endpoint for security:

[paste endpoint code]

Check:
1. Input validation (are all parameters validated? type, range, format?)
2. Authentication (is the endpoint properly protected?)
3. Authorization (does it verify the user can access THIS resource?)
4. Output sanitization (does it filter sensitive fields from responses?)
5. Error handling (do errors leak implementation details?)
6. Rate limiting (is this endpoint rate-limited?)
7. Request size limits (can someone send a 10GB payload?)
8. SQL/NoSQL injection (are queries parameterized?)
9. File upload security (if applicable: type validation, size limits, storage)

For each issue, show the vulnerable code and the secure replacement.
```
