import { describe, expect, it, vi } from "vitest";

import { callGeminiJsonChat, parseGeminiJsonText } from "../../../src/infrastructure/llm/gemini-json.client.js";

describe("gemini-json.client", () => {
  it("parses fenced JSON responses", () => {
    const parsed = parseGeminiJsonText('```json\n{"ok":true}\n```');
    expect(parsed).toEqual({ ok: true });
  });

  it("calls Gemini generateContent and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"resolutions":[]}' }] } }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGeminiJsonChat({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      system: "system prompt",
      user: '{"hello":"world"}'
    });

    expect(result).toEqual({ resolutions: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("test-key");
    expect(init.method).toBe("POST");

    vi.unstubAllGlobals();
  });
});
