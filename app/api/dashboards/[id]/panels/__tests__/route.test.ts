import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const mockFindUnique = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  default: {
    dashboard: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    dashboardPanel: {
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/dashboards/dash-1/panels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "dash-1" });

describe("POST /api/dashboards/[id]/panels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when chartType is missing", async () => {
    const res = await POST(makeRequest({ title: "T", sql: "SELECT 1" }), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/chartType/);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeRequest({ chartType: "bar", sql: "SELECT 1" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when sql is missing", async () => {
    const res = await POST(makeRequest({ chartType: "bar", title: "T" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when dashboard not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCount.mockResolvedValue(0);

    const res = await POST(
      makeRequest({ chartType: "bar", title: "T", sql: "SELECT 1" }),
      { params }
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("creates panel with default layout based on panelCount", async () => {
    mockFindUnique.mockResolvedValue({ id: "dash-1" });
    mockCount.mockResolvedValue(3);
    mockCreate.mockResolvedValue({ id: "panel-1" });

    await POST(
      makeRequest({ chartType: "bar", title: "Sales", sql: "SELECT 1" }),
      { params }
    );

    const createCall = mockCreate.mock.calls[0][0];
    // panelCount=3 → x: (3%2)*6=6, y: floor(3/2)*4=4
    expect(createCall.data.layout).toEqual({ x: 6, y: 4, w: 6, h: 4 });
  });

  it("uses custom layout when provided", async () => {
    mockFindUnique.mockResolvedValue({ id: "dash-1" });
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue({ id: "panel-2" });

    const customLayout = { x: 0, y: 0, w: 12, h: 8 };
    await POST(
      makeRequest({ chartType: "line", title: "Revenue", sql: "SELECT 1", layout: customLayout }),
      { params }
    );

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.layout).toEqual(customLayout);
  });
});
