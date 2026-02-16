# Security Audit Framework: Research-Backed Best Practices

## 1. Executive Summary

This document synthesizes academic research, industry standards, and practitioner guidance on security code auditing. It establishes a framework grounded in empirical evidence for evaluating and improving security audit processes, particularly for LLM-assisted code review prompts.

---

## 2. Industry Standards and Taxonomies

### 2.1 OWASP Top 10:2025

The eighth edition of the OWASP Top 10, released in 2025, is based on analysis of over 175,000 CVE records and practitioner feedback. Two new categories were added and one was consolidated.

| Rank | Category | Key Changes from 2021 |
|------|----------|-----------------------|
| A01 | Broken Access Control | Maintains #1; SSRF absorbed into this category |
| A02 | Security Misconfiguration | Up from #5; 3.00% of apps tested had CWEs in this category |
| A03 | Software Supply Chain Failures | **NEW** - Acknowledges growing pipeline risks |
| A04 | Cryptographic Failures | Down from #2 |
| A05 | Injection | Down from #3 |
| A06 | Insecure Design | Down from #4; improved due to threat modeling adoption |
| A07 | Authentication Failures | Renamed from "Identification and Authentication Failures" |
| A08 | Software or Data Integrity Failures | Stable |
| A09 | Security Logging and Alerting Failures | Renamed; alerting added |
| A10 | Mishandling of Exceptional Conditions | **NEW** - 24 CWEs for error handling, logic errors, fail-open |

**Key methodology shift:** The 2025 edition analyzed 589 CWEs (up from ~400 in 2021) and explicitly shifted focus from symptoms to root causes.

Sources:
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [GitLab: OWASP Top 10 2025 Analysis](https://about.gitlab.com/blog/2025-owasp-top-10-whats-changed-and-why-it-matters/)
- [Fastly: New 2025 OWASP Top 10](https://www.fastly.com/blog/new-2025-owasp-top-10-list-what-changed-what-you-need-to-know)

### 2.2 CWE Top 25 Most Dangerous Software Weaknesses (2025)

MITRE's 2025 list was derived from scoring 39,080 CVE records (June 2024 - June 2025), using frequency and average CVSS severity.

| Rank | CWE-ID | Name | Score |
|------|--------|------|-------|
| 1 | CWE-79 | Cross-site Scripting (XSS) | 60.38 |
| 2 | CWE-89 | SQL Injection | 28.72 |
| 3 | CWE-352 | Cross-Site Request Forgery (CSRF) | 13.64 |
| 4 | CWE-862 | Missing Authorization | 13.28 |
| 5 | CWE-787 | Out-of-bounds Write | 12.68 |
| 6 | CWE-22 | Path Traversal | 8.99 |
| 7 | CWE-416 | Use After Free | 8.47 |
| 8 | CWE-125 | Out-of-bounds Read | 7.88 |
| 9 | CWE-78 | OS Command Injection | 7.85 |
| 10 | CWE-94 | Code Injection | 7.57 |
| 11 | CWE-120 | Classic Buffer Overflow | 6.96 |
| 12 | CWE-434 | Unrestricted File Upload | 6.87 |
| 13 | CWE-476 | NULL Pointer Dereference | 6.41 |
| 14 | CWE-121 | Stack-based Buffer Overflow | 5.75 |
| 15 | CWE-502 | Deserialization of Untrusted Data | 5.23 |
| 16 | CWE-122 | Heap-based Buffer Overflow | 5.21 |
| 17 | CWE-863 | Incorrect Authorization | 4.14 |
| 18 | CWE-20 | Improper Input Validation | 4.09 |
| 19 | CWE-284 | Improper Access Control | 4.07 |
| 20 | CWE-200 | Exposure of Sensitive Information | 4.01 |
| 21 | CWE-306 | Missing Authentication | 3.47 |
| 22 | CWE-918 | Server-Side Request Forgery (SSRF) | 3.36 |
| 23 | CWE-77 | Command Injection | 3.15 |
| 24 | CWE-639 | Authorization Bypass via User-Controlled Key | 2.62 |
| 25 | CWE-770 | Resource Allocation Without Limits | 2.54 |

**New entries in 2025:** CWE-120 (Classic Buffer Overflow), CWE-121 (Stack-based Buffer Overflow), CWE-122 (Heap-based Buffer Overflow), CWE-284 (Improper Access Control), CWE-639 (Authorization Bypass), CWE-770 (Resource Allocation Without Limits).

Sources:
- [MITRE CWE Top 25 2025](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html)
- [CISA: 2025 CWE Top 25](https://www.cisa.gov/news-events/alerts/2025/12/11/2025-cwe-top-25-most-dangerous-software-weaknesses)
- [Infosecurity Magazine: Top 25 2025](https://www.infosecurity-magazine.com/news/top-25-dangerous-software)

---

## 3. Testing Methodologies: SAST vs. DAST vs. Manual Review

### 3.1 Comparative Effectiveness

| Method | Strengths | Weaknesses | Best For |
|--------|-----------|------------|----------|
| SAST | Early detection, high coverage, finds high-severity issues, white-box | 47-80% miss rate on real-world vulns; 76%+ irrelevant warnings in vulnerable functions; scalability issues | Known vulnerability patterns, coding standards, early SDLC |
| DAST | Finds runtime issues, access control flaws, misconfigurations; no source needed | Cannot pinpoint code location; slower; limited to deployed applications | Broken access control, misconfigurations, runtime behavior |
| Manual Review | Finds business logic flaws, complex chains, severe vulns; contextual understanding | Slow, expensive, inconsistent between reviewers; none find all vulns | Business logic, auth flows, cryptographic implementations |
| IAST/RASP | Real-time, lower false positives, runtime context | Requires instrumented runtime; performance overhead | Runtime validation of SAST/DAST findings |

### 3.2 Key Empirical Findings

**Static Analysis Effectiveness (Kaestner et al., 2022, ISSTA):**
- State-of-the-art SAST tools miss 47-80% of real-world vulnerabilities despite performing well on synthetic benchmarks
- Commercial tools (CommSCA) outperform open-source by 6-24 percentage points
- Source: [ACM ISSTA 2022](https://dl.acm.org/doi/10.1145/3533767.3534380)

**SAST for Code Review (Bhandari et al., 2024, ISSTA):**
- A single SAST tool produces warnings in vulnerable functions of only 52% of vulnerability-contributing commits
- At least 76% of warnings in vulnerable functions are irrelevant to the actual vulnerability
- 22% of vulnerability-contributing commits remain undetected due to rule limitations
- Source: [arXiv:2407.12241](https://arxiv.org/abs/2407.12241)

**Manual vs. Automated (Elder et al.):**
- Exploratory Manual Penetration Testing (EMPT) found more severe vulnerabilities than automated tools
- Each technique (SAST, DAST, EMPT) found vulnerabilities the others missed
- Source: [PubMed: Comparative evaluation](https://pubmed.ncbi.nlm.nih.gov/40567702/)

**Conclusion:** No single method is sufficient. The research consistently shows that combining SAST, DAST, and manual review achieves the highest detection rate.

---

## 4. Threat Modeling Frameworks

### 4.1 STRIDE

Classifies threats into six categories:
- **S**poofing identity
- **T**ampering with data
- **R**epudiation
- **I**nformation disclosure
- **D**enial of service
- **E**levation of privilege

Best for: Teams new to threat modeling; agile development; simpler systems.

### 4.2 PASTA (Process for Attack Simulation and Threat Analysis)

Seven-step risk-centric methodology:
1. Define scope and objectives
2. Define technical scope
3. Application decomposition
4. Threat analysis
5. Vulnerability analysis
6. Attack modeling and simulation
7. Risk and impact analysis

Best for: Mature organizations; high-assurance systems; finance, healthcare, critical infrastructure.

### 4.3 Complementary Use

Research indicates STRIDE and PASTA can be combined: STRIDE provides structured threat categorization while PASTA adds realistic attack simulation and business risk correlation. A comparative analysis found that STRIDE's simplicity complements PASTA's depth.

Sources:
- [Aptori: STRIDE vs PASTA](https://www.aptori.com/blog/stride-vs-pasta-a-comparison-of-threat-modeling-methodologies)
- [Software Secured: Comparison of STRIDE, DREAD, PASTA](https://www.softwaresecured.com/post/comparison-of-stride-dread-pasta)
- [TechRxiv: Comparative Analysis of Threat Modelling Methods](https://www.techrxiv.org/users/845749/articles/1234181-a-comparative-analysis-of-threat-modelling-methods-stride-dread-vast-pasta-octave-and-linddun)
- [IriusRisk: 5 Threat Modeling Methodologies](https://www.iriusrisk.com/threat-modeling-methodologies)

---

## 5. Security Code Review Checklists

### 5.1 Consolidated 10-Point Checklist (Industry Consensus)

Based on synthesis of OWASP Code Review Guide, HackTheBox, CodeAnt, and Failsafe checklists:

1. **Input Validation**: Validate type, length, format, range; server-side revalidation; contextual escaping for SQL, LDAP, OS commands
2. **Authentication and Authorization**: Proper session handling; deny-by-default authorization; rate limiting; account lockout; MFA
3. **Data Encryption and Secure Communication**: Standard algorithms (AES-256); proper key management; encryption at rest and in transit; TLS for all communication
4. **Exception Handling and Logging**: No sensitive data in error messages; no stack traces to users; secure failure modes; audit logging of security events
5. **Dependency Management**: Known CVE scanning; update frequency assessment; automated alerts (Dependabot, Snyk)
6. **API and Integration Security**: Authentication between services; access control on stored data; proper exception handling at integration points
7. **CSRF Protection**: Tokens for state-changing operations; framework-provided protections; SameSite cookie configuration
8. **Server-Side Code Execution Validation**: Input validation before execution; never execute untrusted data
9. **Business Logic Review**: Payment bypass; privilege escalation via logic flaws; workflow circumvention
10. **Code Quality and Standards**: Documentation; test coverage; adherence to style guides; security-specific linting

Sources:
- [HackTheBox: 10-point Secure Code Review Checklist](https://www.hackthebox.com/blog/secure-code-reviews)
- [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/)
- [CodeAnt: Secure Code Audits 2025](https://www.codeant.ai/blogs/source-code-audit-checklist-best-practices-for-secure-code)
- [Failsafe: Application Security Code Review Guide 2025](https://getfailsafe.com/application-security-code-review-the-ultimate-2025-guide/)

### 5.2 OWASP Code Review Guide Principles

- **Risk-based approach**: Prioritize review based on risk assessment and previous incidents
- **Manual + Automated**: Blend SAST with manual deep dives; focus manual review on business logic and auth flows
- **Team culture**: All developers should participate in security review, not just AppSec specialists
- **Continuous process**: Integrate into CI/CD, not one-time audits

---

## 6. Academic Studies on Security Review Effectiveness

### 6.1 Human Code Review Study (UC Berkeley, Edmundson et al., 2013)

**Key findings from 30 developers reviewing a web application with 7 known vulnerabilities:**
- No subject found all vulnerabilities
- More experience did not correlate with higher accuracy
- Reports of false vulnerabilities were significantly correlated with reports of valid vulnerabilities (reviewers who found more real bugs also reported more false positives)

Source: [UC Berkeley: Empirical Study on Security Code Review](https://people.eecs.berkeley.edu/~daw/papers/coderev-essos13.pdf)

### 6.2 OpenSSL/PHP Case Study (Springer, 2024)

**Analysis of 135,560 code review comments in OpenSSL and PHP:**
- Reviewers raised security concerns in 35 of 40 coding weakness categories
- Memory errors and resource management (related to past vulnerabilities) were discussed less often than expected
- 39-41% of security concerns were actively addressed
- 30-36% were merely acknowledged without fixes
- 18-20% went unfixed due to disagreements

Source: [Springer: Toward Effective Secure Code Reviews](https://link.springer.com/article/10.1007/s10664-024-10496-y)

### 6.3 Implications for LLM-Assisted Review

- LLMs achieve ~62-68% vulnerability detection rates vs. 32% for traditional SAST, but with 91% false positive rate
- LLMs excel at isolated code segments but struggle with broader architectural context
- 12-65% of LLM-generated code contains CWE-classified vulnerabilities
- Combining LLM analysis with SAST reduces false positives while improving recall

Sources:
- [arXiv: Large Language Models and Code Security (Systematic Review)](https://arxiv.org/html/2412.15004v2)
- [arXiv: LLMs in Software Security](https://arxiv.org/html/2502.07049v2)

---

## 7. Supply Chain Security

### 7.1 Current Threat Landscape

The September 2025 npm ecosystem attack compromised 18 widely-used packages (2.6 billion weekly downloads) including chalk, debug, ansi-styles, and strip-ansi. The "Shai-Hulud" self-replicating worm also infiltrated npm via compromised maintainer accounts.

### 7.2 Key Attack Vectors

- **Account takeover**: Phishing campaigns targeting maintainers
- **Post-install scripts**: Arbitrary code execution at install time
- **Dependency confusion**: Private package name squatting
- **Hash collision**: SHA-1 integrity verification vulnerabilities in old lockfiles
- **Typosquatting**: Malicious packages with similar names to popular ones

### 7.3 Best Practices

1. Disable lifecycle scripts by default; use explicit allow-lists
2. Pin dependency versions to known-safe releases
3. Enforce minimum package age policies (pnpm, yarn)
4. Mandate phishing-resistant MFA on all developer accounts
5. Adopt trusted publishing (npm, July 2025)
6. Maintain Software Bill of Materials (SBOM)
7. Regular `npm audit` / `pnpm audit` scanning
8. Rotate credentials after any security incident

Sources:
- [CISA: npm Ecosystem Compromise Alert](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem)
- [Snyk: NPM Security Best Practices After Shai-Hulud](https://snyk.io/articles/npm-security-best-practices-shai-hulud-attack/)
- [Datadog: Learnings from npm Compromises](https://securitylabs.datadoghq.com/articles/learnings-from-recent-npm-compromises/)

---

## 8. Authentication and Authorization Review Patterns

### 8.1 Access Control Models

| Model | Description | Audit Complexity | Best For |
|-------|-------------|-----------------|----------|
| RBAC | Permissions assigned to roles; roles assigned to users | Low - auditable role-permission matrix | Most organizations; clear role boundaries |
| ABAC | Decisions based on user, resource, and environment attributes | High - complex policy evaluation | Dynamic access requirements; fine-grained control |
| Hybrid | RBAC for base permissions; ABAC for context-aware adjustments | Medium | Zero Trust architectures |

### 8.2 Review Patterns

- **Separation of concerns**: Authentication (who) must be separate from authorization (what)
- **Centralized policy**: Use policy services (e.g., Open Policy Agent) for complex systems
- **Deny by default**: All access denied unless explicitly permitted
- **Comprehensive logging**: Capture who, what, when, why for access events
- **Unused privilege detection**: Regular review of permission usage patterns

Sources:
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Okta: RBAC vs ABAC](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)

---

## 9. Cryptographic Implementation Review

### 9.1 Common Mistakes (Top 10)

1. Hard-coded keys and secrets in source code
2. Weak/predictable PRNGs instead of CSPRNGs
3. IV/nonce reuse in symmetric encryption
4. Accepting invalid or self-signed TLS certificates
5. Using AES-ECB mode (leaks plaintext patterns)
6. Improper padding schemes
7. Using deprecated algorithms (MD5, SHA-1, DES, RC4)
8. Missing key rotation policies
9. Storing sensitive data without encryption at rest
10. Mixed content (HTTP resources on HTTPS pages)

### 9.2 Algorithm Recommendations

| Purpose | Recommended | Avoid |
|---------|-------------|-------|
| Symmetric encryption | AES-GCM (authenticated) | AES-ECB, DES, 3DES, RC4 |
| Password hashing | Argon2id, bcrypt, scrypt | MD5, SHA-1, SHA-256 (unsalted) |
| Message authentication | HMAC-SHA256 | HMAC-MD5, HMAC-SHA1 |
| Key derivation | HKDF, PBKDF2 (high iterations) | Custom KDFs |
| Random generation | CSPRNG (crypto.randomBytes, secrets module) | Math.random(), random module |
| TLS | TLS 1.2+ (prefer 1.3) | SSL, TLS 1.0, TLS 1.1 |

### 9.3 Key Management

- Use dedicated KMS (AWS KMS, HashiCorp Vault, Google Cloud KMS)
- Rotate keys every 90 days minimum
- Restrict key access using IAM and audit logs
- Scan repositories for exposed secrets
- Use environment variables or secret managers, never hardcode

Sources:
- [NIST: Hitchhiker's Guide to Cryptography Code Audit](https://csrc.nist.gov/presentations/2024/a-hitchhikers-guide-to-cryptography-code-audit)
- [AppSec Engineer: 10 Cryptography Mistakes](https://www.appsecengineer.com/blog/10-cryptography-mistakes-youre-probably-making)
- [Codacy: Cryptographic Failures Guide](https://blog.codacy.com/cryptographic-failures-owasp-top-10)

---

## 10. Language-Specific Vulnerability Patterns

### 10.1 Vulnerability Rates by Language

Research on AI-generated code (which mirrors common developer patterns) found:
- **Python**: 16.18-18.50% vulnerability rate
- **JavaScript**: 8.66-8.99% vulnerability rate
- **TypeScript**: 2.50-7.14% vulnerability rate (type safety helps)

### 10.2 Language-Specific Patterns

| Language | Top Vulnerability Patterns |
|----------|---------------------------|
| JavaScript | Prototype pollution, CWE-310 (Crypto Issues), CWE-22 (Path Traversal), XSS via innerHTML/document.write, eval() injection |
| TypeScript | CWE-20 (Improper Input Validation), type assertion bypasses (as any), runtime type confusion |
| Python | CWE-772 (Missing Resource Release), pickle deserialization, os.system/subprocess with shell=True, format string injection |
| Java | Deserialization (CWE-502), XXE via XML parsers, JNDI injection, reflection abuse |
| C/C++ | Buffer overflows (CWE-120/121/122), use-after-free (CWE-416), null pointer dereference (CWE-476) |

Sources:
- [arXiv: Security Vulnerabilities in AI-Generated Code](https://arxiv.org/html/2510.26103)
- [Aikido: Code Security Vulnerabilities](https://www.aikido.dev/blog/code-security-vulnerabilities)
- [SonarSource: TypeScript Vulnerability Rules](https://rules.sonarsource.com/typescript/type/vulnerability/)

---

## 11. Framework for Evaluating Security Audit Prompts

Based on the research above, an effective security audit prompt should incorporate:

### 11.1 Required Elements (Critical)

- [ ] Complete OWASP Top 10:2025 coverage including both new categories (A03, A10)
- [ ] CWE Top 25 2025 reference with specific CWE IDs
- [ ] Systematic data flow analysis (source-to-sink tracing)
- [ ] Trust boundary identification and mapping
- [ ] Evidence-based findings with code-level specificity
- [ ] CVSS severity scoring with exploitability justification
- [ ] Remediation with secure code examples in the same language/framework
- [ ] False positive mitigation (framework-aware analysis)

### 11.2 Important Elements

- [ ] Threat modeling integration (STRIDE categories as minimum)
- [ ] Supply chain security assessment (especially for 2025 landscape)
- [ ] Cryptographic implementation review checklist
- [ ] Authentication/authorization pattern review
- [ ] Language-specific vulnerability pattern awareness
- [ ] Compliance mapping (CWE, PCI DSS, NIST, OWASP ASVS)
- [ ] Limitations acknowledgment (what SAST/manual review cannot catch)
- [ ] DAST/runtime testing recommendations where static review is insufficient

### 11.3 Nice-to-Have Elements

- [ ] Attack tree or kill chain construction for complex vulnerabilities
- [ ] SBOM/dependency analysis guidance
- [ ] Race condition and concurrency analysis
- [ ] Memory safety analysis (for applicable languages)
- [ ] Positive security pattern recognition
- [ ] Confidence levels on findings

---

## 12. Key Takeaways for Prompt Design

1. **No single method catches everything**: Research consistently shows 47-80% miss rates for automated tools and incomplete detection by manual reviewers. Prompts should acknowledge this limitation and recommend complementary testing methods.

2. **False positives are a major problem**: 76%+ of SAST warnings in vulnerable functions are irrelevant. Prompts must emphasize evidence-based findings and framework-awareness to avoid noise.

3. **Business logic flaws require human insight**: Automated tools consistently miss business logic vulnerabilities. Manual review prompts should explicitly call out workflow bypass, payment logic, and privilege escalation via intended functionality.

4. **Supply chain is now a top-3 risk**: The OWASP 2025 elevation of supply chain to A03 and the September 2025 npm attacks demonstrate this is no longer a secondary concern. Prompts must treat dependency analysis as a first-class audit activity.

5. **Context matters for severity**: The same vulnerability in an internal tool vs. a public-facing financial application has radically different risk profiles. Effective prompts must incorporate threat profile into severity assessment.

6. **Root causes over symptoms**: The OWASP 2025 methodology shift toward root causes should be reflected in remediation guidance -- fixing the systemic issue, not just the symptom.

7. **Cryptographic reviews need specialized knowledge**: Common mistakes (IV reuse, ECB mode, weak PRNGs) are well-documented and should be explicitly enumerated in review guidance.

8. **Error handling is now recognized as a top-10 risk**: OWASP A10:2025 elevates exceptional condition handling. Prompts should explicitly cover fail-open behavior, information leakage in errors, and denial of service via error paths.
