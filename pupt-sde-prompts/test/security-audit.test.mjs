import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("security-audit.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("security-audit.prompt", {
      codeToAudit: "app.get('/user', (req, res) => res.json(db.query(req.query.id)));",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("security-audit.prompt", {
      codeToAudit: "app.get('/user', (req, res) => res.json(db.query(req.query.id)));",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("security-audit.prompt", {
      codeToAudit: "UNIQUE_AUDIT_MARKER_606",
    });
    expect(result.text).toContain("UNIQUE_AUDIT_MARKER_606");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("security-audit.prompt", {
      codeToAudit: "app.get('/user', (req, res) => res.json(db.query(req.query.id)));",
    });
    expect(result.text).toMatchSnapshot();
  });
});
