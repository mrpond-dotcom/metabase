import type { VisualizerVizDefinition } from "metabase-types/api";
import {
  createMockCard,
  createMockColumn,
  createMockDashCardDataSeries,
  createMockDataset,
  createMockDatasetData,
} from "metabase-types/api/mocks";

import {
  getDashCardStyle,
  getMissingColumnsFromVisualizationSettings,
} from "./utils";

describe("getMissingColumnsFromVisualizationSettings", () => {
  const createMockSeriesWithCols = (cardId: number, cols: string[]) => [
    createMockDashCardDataSeries(
      createMockCard({ id: cardId }),
      createMockDataset({
        data: createMockDatasetData({
          cols: cols.map((name) => createMockColumn({ name })),
        }),
      }),
    ),
  ];

  it("returns an empty array when visualizerEntity is undefined", () => {
    const result = getMissingColumnsFromVisualizationSettings({
      visualizerEntity: undefined,
      rawSeries: [],
    });
    expect(result).toEqual([]);
  });

  it("returns an empty array when rawSeries is empty", () => {
    const result = getMissingColumnsFromVisualizationSettings({
      visualizerEntity: {
        columnValuesMapping: {},
        display: "bar",
        settings: {},
      },
      rawSeries: [],
    });
    expect(result).toEqual([]);
  });

  it("returns missing columns based on columnValuesMapping", () => {
    const visualizerEntity: VisualizerVizDefinition = {
      columnValuesMapping: {
        col1: [{ sourceId: "card:1", originalName: "col1", name: "col1" }],
        col2: [{ sourceId: "card:2", originalName: "col2", name: "col2" }],
      },
      display: "bar",
      settings: {},
    };

    const rawSeries = [
      ...createMockSeriesWithCols(1, ["col1"]),
      ...createMockSeriesWithCols(2, ["col3"]),
    ];

    const result = getMissingColumnsFromVisualizationSettings({
      visualizerEntity,
      rawSeries,
    });

    expect(result).toEqual([
      [{ sourceId: "card:2", originalName: "col2", name: "col2" }],
    ]);
  });

  it("handles missing series gracefully", () => {
    const visualizerEntity: VisualizerVizDefinition = {
      columnValuesMapping: {
        col1: [{ sourceId: "card:1", originalName: "col1", name: "col1" }],
        col2: [{ sourceId: "card:2", originalName: "col2", name: "col2" }],
      },
      display: "bar",
      settings: {},
    };

    const rawSeries = createMockSeriesWithCols(1, ["col1"]);

    const result = getMissingColumnsFromVisualizationSettings({
      visualizerEntity,
      rawSeries,
    });

    expect(result).toEqual([
      [{ sourceId: "card:2", originalName: "col2", name: "col2" }],
    ]);
  });
});

describe("getDashCardStyle", () => {
  it("keeps the default look when no card style is set", () => {
    expect(getDashCardStyle({})).toEqual({
      border: "default",
      shadow: "none",
      background: null,
    });
  });

  it("returns the chosen border, shadow, color, and opacity", () => {
    expect(
      getDashCardStyle({
        "dashcard.border": "bold",
        "dashcard.shadow": "md",
        "dashcard.background_color": "#509EE3",
        "dashcard.background_opacity": 40,
      }),
    ).toEqual({
      border: "bold",
      shadow: "md",
      background: { color: "#509EE3", opacity: 0.4 },
    });
  });

  it("changes only the opacity of the theme background when no color is chosen", () => {
    expect(
      getDashCardStyle({ "dashcard.background_opacity": 0 }).background,
    ).toEqual({ color: undefined, opacity: 0 });
  });

  it("keeps the theme background at full opacity", () => {
    expect(
      getDashCardStyle({ "dashcard.background_opacity": 100 }).background,
    ).toBeNull();
  });

  it("clamps opacity to the 0-100 range", () => {
    expect(
      getDashCardStyle({
        "dashcard.background_color": "#509EE3",
        "dashcard.background_opacity": 250,
      }).background,
    ).toEqual({ color: "#509EE3", opacity: 1 });
    expect(
      getDashCardStyle({ "dashcard.background_opacity": -20 }).background,
    ).toEqual({ color: undefined, opacity: 0 });
  });

  it("falls back to defaults for unknown stored values", () => {
    expect(
      getDashCardStyle({
        "dashcard.border": "dotted",
        "dashcard.shadow": "huge",
      }),
    ).toEqual({ border: "default", shadow: "none", background: null });
  });
});
