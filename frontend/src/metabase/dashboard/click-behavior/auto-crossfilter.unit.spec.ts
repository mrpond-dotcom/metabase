import type { ClickObject } from "metabase/visualizations/types";
import type { ComputedVisualizationSettings } from "metabase/viz-core";
import type {
  ClickBehavior,
  DashboardParameterMapping,
  DatasetColumn,
  Parameter,
} from "metabase-types/api";
import {
  createMockCard,
  createMockColumn,
  createMockDashboard,
  createMockDashboardCard,
  createMockParameter,
} from "metabase-types/api/mocks";

import { getAutoCrossfilterClickBehavior } from "./auto-crossfilter";
import {
  getClickBehavior,
  getDashboardDrillParameters,
  getDashboardDrillType,
} from "./dashboard-click-drill";

const CARD_ID = 1;
const CATEGORY_FIELD_ID = 10;

const categoryColumn = createMockColumn({
  id: CATEGORY_FIELD_ID,
  name: "CATEGORY",
  display_name: "Category",
  base_type: "type/Text",
  effective_type: "type/Text",
});
const countColumn = createMockColumn({ name: "count", display_name: "Count" });

const categoryParameter = createMockParameter({
  id: "category-param",
  slug: "category",
  type: "category",
});

const categoryMapping: DashboardParameterMapping = {
  card_id: CARD_ID,
  parameter_id: categoryParameter.id,
  target: ["dimension", ["field", CATEGORY_FIELD_ID, null]],
};

interface SetupOpts {
  parameters?: Parameter[];
  parameterMappings?: DashboardParameterMapping[];
  dimensions?: { value: string; column: DatasetColumn }[];
  column?: DatasetColumn;
  value?: string;
  cardId?: number;
  settings?: ComputedVisualizationSettings;
}

function setup({
  parameters = [categoryParameter],
  parameterMappings = [categoryMapping],
  dimensions = [{ value: "Gizmo", column: categoryColumn }],
  column,
  value,
  cardId,
  settings = {},
}: SetupOpts = {}): ClickObject {
  return {
    dimensions,
    column,
    value,
    cardId,
    settings,
    data: [{ col: countColumn, value: 42 }],
    extraData: {
      dashboard: createMockDashboard({ parameters }),
      dashcard: createMockDashboardCard({
        card_id: CARD_ID,
        card: createMockCard({ id: CARD_ID, display: "bar" }),
        parameter_mappings: parameterMappings,
      }),
      parameters,
    },
  };
}

describe("getAutoCrossfilterClickBehavior", () => {
  it("sets the dashboard filter wired to the clicked column", () => {
    expect(getAutoCrossfilterClickBehavior(setup())).toEqual({
      type: "crossfilter",
      parameterMapping: {
        "category-param": {
          id: "category-param",
          source: { type: "column", id: "CATEGORY", name: "Category" },
          target: { type: "parameter", id: "category-param" },
        },
      },
    });
  });

  it("matches columns referenced by name", () => {
    const clicked = setup({
      parameterMappings: [
        {
          ...categoryMapping,
          target: [
            "dimension",
            ["field", "CATEGORY", { "base-type": "type/Text" }],
          ],
        },
      ],
    });

    expect(getAutoCrossfilterClickBehavior(clicked)).not.toBeNull();
  });

  it("uses the clicked cell's column for table clicks", () => {
    const clicked = setup({
      dimensions: [],
      column: categoryColumn,
      value: "Widget",
    });

    expect(getAutoCrossfilterClickBehavior(clicked)).not.toBeNull();
  });

  it("does nothing for a column header click", () => {
    const clicked = setup({ dimensions: [], column: categoryColumn });

    expect(getAutoCrossfilterClickBehavior(clicked)).toBeNull();
  });

  it("does nothing when no filter is wired to the clicked column", () => {
    const clicked = setup({
      parameterMappings: [
        { ...categoryMapping, target: ["dimension", ["field", 999, null]] },
      ],
    });

    expect(getAutoCrossfilterClickBehavior(clicked)).toBeNull();
  });

  it("does nothing when the dashboard has no filters", () => {
    expect(
      getAutoCrossfilterClickBehavior(setup({ parameters: [] })),
    ).toBeNull();
  });

  it("does nothing when the card turned it off", () => {
    const clicked = setup({
      settings: { "dashcard.auto_crossfilter": false },
    });

    expect(getAutoCrossfilterClickBehavior(clicked)).toBeNull();
  });

  it("skips filters that cannot hold a single clicked value", () => {
    const dateRangeParameter = createMockParameter({
      id: "category-param",
      type: "date/range",
    });

    expect(
      getAutoCrossfilterClickBehavior(
        setup({ parameters: [dateRangeParameter] }),
      ),
    ).toBeNull();
  });

  it("only uses wiring for the clicked series", () => {
    const clicked = setup({ cardId: 2 });

    expect(getAutoCrossfilterClickBehavior(clicked)).toBeNull();
  });
});

describe("auto cross-filter through the dashboard click drill", () => {
  it("updates the wired dashboard filter with the clicked value", () => {
    const clicked = setup();

    expect(getDashboardDrillType(clicked)).toBe("dashboard-filter");
    expect(getDashboardDrillParameters(clicked)).toEqual([
      ["category-param", "Gizmo"],
    ]);
  });

  it("keeps a click behavior the card has configured", () => {
    const configured: ClickBehavior = { type: "actionMenu" };
    const clicked = setup({ settings: { click_behavior: configured } });

    expect(getClickBehavior(clicked)).toBe(configured);
    expect(getDashboardDrillType(clicked)).toBeNull();
  });
});
