import { describe, it, expect } from "vitest";
import { makeQueryClient } from "../query-client";

describe("makeQueryClient", () => {
  it("returns a QueryClient with staleTime of 30 seconds", () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
  });

  it("returns a QueryClient with retry set to 1", () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });

  it("returns a new instance on each call (factory, not singleton)", () => {
    const a = makeQueryClient();
    const b = makeQueryClient();
    expect(a).not.toBe(b);
  });
});
