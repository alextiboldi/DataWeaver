import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardCanvas, type DashboardPanelData } from "../dashboard-canvas";

// Mock react-grid-layout — avoid DOM measurement
vi.mock("react-grid-layout", () => ({
  GridLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="grid-layout">{children}</div>
  ),
  useContainerWidth: () => ({ containerRef: { current: null }, width: 1200, mounted: true }),
}));
vi.mock("react-grid-layout/css/styles.css", () => ({}));
vi.mock("react-resizable/css/styles.css", () => ({}));

vi.mock("@/components/viz/chart-renderer", () => ({
  ChartRenderer: () => <div data-testid="chart-renderer" />,
}));
vi.mock("@/components/data/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
}));

const noop = () => {};

function makePanels(count: number): DashboardPanelData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `panel-${i}`,
    chartType: "bar",
    title: `Panel ${i}`,
    description: null,
    sql: `SELECT * FROM table_${i}`,
    config: {},
    layout: { x: 0, y: i * 4, w: 6, h: 4 },
  }));
}

function renderCanvas(panels: DashboardPanelData[], dataSourceId?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DashboardCanvas
        panels={panels}
        dataSourceId={dataSourceId}
        onLayoutChange={noop}
        onRemovePanel={noop}
        onRenamePanel={noop}
      />
    </QueryClientProvider>
  );
}

describe("DashboardCanvas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates one fetch call per panel", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ columns: [], rows: [], rowCount: 0, executionMs: 0 }))
    );

    const panels = makePanels(3);
    renderCanvas(panels);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("sends correct SQL for each panel in fetch body", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ columns: [], rows: [], rowCount: 0, executionMs: 0 }))
    );

    const panels = makePanels(2);
    renderCanvas(panels);

    const bodies = fetchSpy.mock.calls.map((call) => {
      const init = call[1] as RequestInit;
      return JSON.parse(init.body as string);
    });
    expect(bodies[0].sql).toBe("SELECT * FROM table_0");
    expect(bodies[1].sql).toBe("SELECT * FROM table_1");
  });

  it("uses provided dataSourceId in fetch requests", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ columns: [], rows: [], rowCount: 0, executionMs: 0 }))
    );

    renderCanvas(makePanels(1), "my-source");

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.dataSourceId).toBe("my-source");
  });

  it('defaults dataSourceId to "default" when prop not provided', () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ columns: [], rows: [], rowCount: 0, executionMs: 0 }))
    );

    renderCanvas(makePanels(1));

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.dataSourceId).toBe("default");
  });

  it("renders loading state before queries resolve", () => {
    // fetch that never resolves
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    renderCanvas(makePanels(1));
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error message when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Connection refused" }), { status: 500 })
    );

    renderCanvas(makePanels(1));

    const errorEl = await screen.findByText("Connection refused");
    expect(errorEl).toBeInTheDocument();
  });
});
