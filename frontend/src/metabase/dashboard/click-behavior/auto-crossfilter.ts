import { isQuestionDashCard } from "metabase/utils/dashboard";
import type { ClickObject } from "metabase/visualizations/types";
import type {
  ClickBehaviorParameterMapping,
  CrossFilterClickBehavior,
  DashboardParameterMapping,
  DatasetColumn,
  Parameter,
} from "metabase-types/api";
import { isDimensionTarget } from "metabase-types/guards";

import type { ClickBehaviorClickObject } from "./types";

/**
 * Builds the click behavior a card gets when it has no click behavior of its
 * own: clicking a value sets every dashboard filter that is wired to that
 * column on this card. Returns `null` when the click doesn't land on a value
 * of a wired column, so the regular drill-through menu opens instead.
 */
export function getAutoCrossfilterClickBehavior(
  clicked: ClickBehaviorClickObject,
): CrossFilterClickBehavior | null {
  const dashcard = clicked.extraData?.dashcard;
  const parameters = clicked.extraData?.parameters ?? [];
  const isAutoCrossfilterOff =
    clicked.settings?.["dashcard.auto_crossfilter"] === false;

  if (
    isAutoCrossfilterOff ||
    dashcard == null ||
    !isQuestionDashCard(dashcard) ||
    parameters.length === 0 ||
    clicked.brushRange != null
  ) {
    return null;
  }

  const clickedColumns = getClickedColumns(clicked);
  const cardId = clicked.cardId ?? dashcard.card_id;
  const mappings = (dashcard.parameter_mappings ?? []).filter(
    (mapping) => mapping.card_id === cardId,
  );

  const parameterMapping = mappings.reduce<ClickBehaviorParameterMapping>(
    (result, mapping) => {
      const parameter = parameters.find(
        ({ id }) => id === mapping.parameter_id,
      );
      const column = clickedColumns.find((column) =>
        isMappingForColumn(mapping, column),
      );

      if (parameter == null || column == null || !canCrossfilter(parameter)) {
        return result;
      }

      return {
        ...result,
        [parameter.id]: {
          id: parameter.id,
          source: {
            type: "column",
            id: column.name,
            name: column.display_name,
          },
          target: { type: "parameter", id: parameter.id },
        },
      };
    },
    {},
  );

  if (Object.keys(parameterMapping).length === 0) {
    return null;
  }

  return { type: "crossfilter", parameterMapping };
}

function getClickedColumns(
  clicked: Pick<ClickObject, "dimensions" | "column" | "value">,
): DatasetColumn[] {
  if (clicked.dimensions != null && clicked.dimensions.length > 0) {
    return clicked.dimensions.map(({ column }) => column);
  }

  // a header click has a column but no value, and must keep its column menu
  const { column, value } = clicked;
  return column != null && value !== undefined ? [column] : [];
}

function isMappingForColumn(
  { target }: DashboardParameterMapping,
  column: DatasetColumn,
): boolean {
  if (!isDimensionTarget(target)) {
    return false;
  }

  const [, reference] = target;
  const [referenceType, fieldIdOrName] = reference;

  if (referenceType === "field") {
    return typeof fieldIdOrName === "number"
      ? column.id === fieldIdOrName
      : column.name === fieldIdOrName;
  }

  if (referenceType === "expression") {
    return column.name === fieldIdOrName;
  }

  return false;
}

// a clicked point is a single value, which these filters can't hold
const NON_CROSSFILTERABLE_PARAMETER_TYPES = new Set([
  "date/range",
  "date/relative",
]);

function canCrossfilter(parameter: Parameter): boolean {
  return !NON_CROSSFILTERABLE_PARAMETER_TYPES.has(parameter.type);
}
