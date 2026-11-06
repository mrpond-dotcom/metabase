import type { VisualizerVizDefinitionWithColumns } from "metabase/redux/store/visualizer";
import { registerVisualizations } from "metabase/visualizations/register";
import type {
  DatasetColumn,
  VisualizationDisplay,
  VisualizerColumnReference,
} from "metabase-types/api";
import {
  createMockCategoryColumn,
  createMockDatetimeColumn,
  createMockNumericColumn,
} from "metabase-types/api/mocks";

import {
  createDataSource,
  createVisualizerColumnReference,
  extractReferencedColumns,
} from "../utils";

import {
  addColumnToCartesianChart,
  canSetLegendColumnForCartesianChart,
  setLegendColumnForCartesianChart,
} from "./cartesian";

registerVisualizations();

const dataSource = createDataSource("card", 1, "Orders");
const otherDataSource = createDataSource("card", 2, "Products");

const createdAtColumn = createMockDatetimeColumn({ id: 1, name: "CREATED_AT" });
const countColumn = createMockNumericColumn({ id: 2, name: "count" });
const categoryColumn = createMockCategoryColumn({ id: 3, name: "CATEGORY" });
const vendorColumn = createMockCategoryColumn({ id: 4, name: "VENDOR" });
const averageColumn = createMockNumericColumn({ id: 5, name: "avg" });

interface SetupOpts {
  display?: VisualizationDisplay;
  columns?: DatasetColumn[];
}

function addColumn(
  state: VisualizerVizDefinitionWithColumns,
  column: DatasetColumn,
): VisualizerColumnReference {
  const columnRef = createVisualizerColumnReference(
    dataSource,
    column,
    extractReferencedColumns(state.columnValuesMapping),
  );
  addColumnToCartesianChart(state, {}, column, columnRef, dataSource);
  return columnRef;
}

function setup({
  display = "bar",
  columns = [createdAtColumn, countColumn],
}: SetupOpts = {}): VisualizerVizDefinitionWithColumns {
  const state: VisualizerVizDefinitionWithColumns = {
    display,
    columns: [],
    settings: {},
    columnValuesMapping: {},
  };
  columns.forEach((column) => addColumn(state, column));
  return state;
}

function setLegend(
  state: VisualizerVizDefinitionWithColumns,
  column: DatasetColumn,
) {
  const columnRef = createVisualizerColumnReference(
    dataSource,
    column,
    extractReferencedColumns(state.columnValuesMapping),
  );
  setLegendColumnForCartesianChart(state, {}, column, columnRef, dataSource);
}

function getDimensionSources(state: VisualizerVizDefinitionWithColumns) {
  const dimensionNames: string[] = state.settings["graph.dimensions"] ?? [];
  return dimensionNames.map((name) => state.columnValuesMapping[name]?.[0]);
}

describe("legend well for cartesian charts", () => {
  it("splits the chart by the dropped column", () => {
    const state = setup();

    setLegend(state, categoryColumn);

    expect(getDimensionSources(state)).toEqual([
      expect.objectContaining({ originalName: "CREATED_AT" }),
      expect.objectContaining({ originalName: "CATEGORY" }),
    ]);
  });

  it("replaces the column the chart was split by before", () => {
    const state = setup();

    setLegend(state, categoryColumn);
    setLegend(state, vendorColumn);

    expect(getDimensionSources(state)).toEqual([
      expect.objectContaining({ originalName: "CREATED_AT" }),
      expect.objectContaining({ originalName: "VENDOR" }),
    ]);
    const originalNames = extractReferencedColumns(
      state.columnValuesMapping,
    ).map(({ originalName }) => originalName);
    expect(originalNames).not.toContain("CATEGORY");
  });

  it("does not accept a column without an x-axis dimension to split", () => {
    const state = setup({ columns: [countColumn] });

    expect(canSetLegendColumnForCartesianChart(state, {}, categoryColumn)).toBe(
      false,
    );
    setLegend(state, categoryColumn);
    expect(state.settings["graph.dimensions"]).toBeUndefined();
  });

  it("does not accept a column when the chart shows several metrics", () => {
    const state = setup({
      columns: [createdAtColumn, countColumn, averageColumn],
    });

    expect(canSetLegendColumnForCartesianChart(state, {}, categoryColumn)).toBe(
      false,
    );
  });

  it("does not accept a metric column", () => {
    const state = setup();

    expect(canSetLegendColumnForCartesianChart(state, {}, averageColumn)).toBe(
      false,
    );
  });

  it("is not available for scatter charts", () => {
    const state = setup({ display: "scatter" });

    expect(canSetLegendColumnForCartesianChart(state, {}, categoryColumn)).toBe(
      false,
    );
  });

  it("is not available for charts combining several data sources", () => {
    const state = setup();
    state.columnValuesMapping["COLUMN_99"] = [
      {
        name: "COLUMN_99",
        originalName: "count",
        sourceId: otherDataSource.id,
      },
    ];

    expect(canSetLegendColumnForCartesianChart(state, {}, categoryColumn)).toBe(
      false,
    );
  });
});
