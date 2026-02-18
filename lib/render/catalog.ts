import { schema } from "@json-render/react";
import { z } from "zod";

const dataRowSchema = z.record(z.string(), z.unknown());

export const chatCatalog = schema.createCatalog({
  actions: {},
  components: {
    Stack: {
      props: z.object({
        direction: z.enum(["vertical", "horizontal"]).default("vertical"),
        gap: z.enum(["sm", "md", "lg"]).default("md"),
      }),
      slots: ["default"],
      description:
        "Layout container that stacks children vertically or horizontally",
    },
    Grid: {
      props: z.object({
        columns: z.enum(["2", "3", "4"]).default("2"),
      }),
      slots: ["default"],
      description: "Multi-column grid layout",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["1", "2", "3"]).default("2"),
      }),
      description: "Section heading",
    },
    Text: {
      props: z.object({
        content: z.string(),
      }),
      description: "Body text or description",
    },
    MetricCard: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        change: z.string().optional(),
        changeType: z.enum(["positive", "negative", "neutral"]).optional(),
      }),
      description:
        "Single KPI metric card showing a label, formatted value, and optional change indicator",
    },
    BarChart: {
      props: z.object({
        data: z.array(dataRowSchema),
        xKey: z.string(),
        yKeys: z.array(z.string()),
        title: z.string().optional(),
      }),
      description: "Bar chart for categorical comparisons",
    },
    LineChart: {
      props: z.object({
        data: z.array(dataRowSchema),
        xKey: z.string(),
        yKeys: z.array(z.string()),
        title: z.string().optional(),
      }),
      description: "Line chart for trends over time",
    },
    AreaChart: {
      props: z.object({
        data: z.array(dataRowSchema),
        xKey: z.string(),
        yKeys: z.array(z.string()),
        title: z.string().optional(),
      }),
      description: "Area chart for cumulative trends",
    },
    PieChart: {
      props: z.object({
        data: z.array(dataRowSchema),
        nameKey: z.string(),
        valueKey: z.string(),
        title: z.string().optional(),
      }),
      description: "Pie chart for part-to-whole relationships",
    },
    ScatterChart: {
      props: z.object({
        data: z.array(dataRowSchema),
        xKey: z.string(),
        yKey: z.string(),
        title: z.string().optional(),
      }),
      description: "Scatter plot for correlation analysis",
    },
    DataTable: {
      props: z.object({
        columns: z.array(
          z.object({ name: z.string(), type: z.string().optional() })
        ),
        rows: z.array(dataRowSchema),
        title: z.string().optional(),
      }),
      description: "Data table for detailed tabular view",
    },
  },
});
