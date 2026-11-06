import type { MouseEvent } from "react";

import { getVirtualCardType } from "metabase/dashboard/utils";
import type {
  BaseDashboardCard,
  Card,
  DashCardBorderStyle,
  DashCardDataSeries,
  DashCardSeriesItem,
  DashCardShadowSize,
  VisualizationSettings,
  VisualizerColumnValueSource,
  VisualizerDataSourceId,
  VisualizerSeriesItem,
  VisualizerVizDefinition,
} from "metabase-types/api";
import {
  DASHCARD_BORDER_STYLES,
  DASHCARD_SHADOW_SIZES,
} from "metabase-types/api";
import {
  isVirtualCard,
  isVisualizerSeriesItem,
} from "metabase-types/guards/dashboard";

const VIZ_WITH_CUSTOM_MAPPING_UI = ["heading", "placeholder"];

/** Keeps a click on an interactive element inside a dashcard from starting a grid drag. */
export function preventDragOrInputFocus(event: MouseEvent) {
  event.stopPropagation();
}

export function shouldShowParameterMapper({
  dashcard,
  isEditingParameter,
}: {
  dashcard: BaseDashboardCard;
  isEditingParameter?: boolean;
}) {
  const display = getVirtualCardType(dashcard);
  return (
    isEditingParameter &&
    !(display && VIZ_WITH_CUSTOM_MAPPING_UI.includes(display))
  );
}

export function getMissingColumnsFromVisualizationSettings(options: {
  visualizerEntity: VisualizerVizDefinition | undefined;
  rawSeries: DashCardDataSeries;
}) {
  const { visualizerEntity, rawSeries } = options;

  if (!visualizerEntity || !rawSeries?.length) {
    return [];
  }

  const { columnValuesMapping } = visualizerEntity;

  const colsForCards: Record<VisualizerDataSourceId, Set<string>> = {};
  rawSeries.forEach((series) => {
    const cardId: VisualizerDataSourceId = `card:${series.card.id}`;
    if (!colsForCards[cardId]) {
      colsForCards[cardId] = new Set();
    }
    series.data?.cols.forEach((col) => {
      colsForCards[cardId].add(col.name);
    });
  });

  const missingCols: VisualizerColumnValueSource[][] = [];
  Object.entries(columnValuesMapping).forEach(([_columnRef, columns]) => {
    const missing = columns.filter((column) => {
      if (typeof column === "string") {
        return false; // This is a data source name reference, not a column
      }

      return (
        !colsForCards[column.sourceId] ||
        !colsForCards[column.sourceId].has(column.originalName)
      );
    });

    if (missing.length > 0) {
      missingCols.push(missing);
    }
  });

  return missingCols;
}

export function getCardsFromSeries(
  series: (DashCardSeriesItem | VisualizerSeriesItem)[],
): Card[] {
  const cards: Card[] = [];
  for (const item of series) {
    if (isVisualizerSeriesItem(item)) {
      continue;
    }
    const card = item.card;
    if (isVirtualCard(card)) {
      continue;
    }
    cards.push(card);
  }
  return cards;
}

const MAX_BACKGROUND_OPACITY_PERCENT = 100;

type DashCardStyleSettingKey = keyof Pick<
  VisualizationSettings,
  | "dashcard.border"
  | "dashcard.shadow"
  | "dashcard.background_color"
  | "dashcard.background_opacity"
>;

export interface DashCardStyle {
  border: DashCardBorderStyle;
  shadow: DashCardShadowSize;
  /** `null` when the card keeps the theme background. */
  background: {
    /** `undefined` keeps the theme color and only changes its opacity. */
    color: string | undefined;
    /** Between 0 and 1. */
    opacity: number;
  } | null;
}

/**
 * Reads the user's "Card style" settings, ignoring stored values that are not
 * valid so a bad value falls back to the default look.
 */
export function getDashCardStyle(
  settings: Partial<Record<DashCardStyleSettingKey, unknown>>,
): DashCardStyle {
  const border =
    DASHCARD_BORDER_STYLES.find(
      (style) => style === settings["dashcard.border"],
    ) ?? "default";
  const shadow =
    DASHCARD_SHADOW_SIZES.find(
      (size) => size === settings["dashcard.shadow"],
    ) ?? "none";

  const storedColor = settings["dashcard.background_color"];
  const color =
    typeof storedColor === "string" && storedColor.length > 0
      ? storedColor
      : undefined;

  const storedOpacity = settings["dashcard.background_opacity"];
  const opacityPercent =
    typeof storedOpacity === "number" && Number.isFinite(storedOpacity)
      ? Math.min(Math.max(storedOpacity, 0), MAX_BACKGROUND_OPACITY_PERCENT)
      : MAX_BACKGROUND_OPACITY_PERCENT;

  const hasCustomBackground =
    color !== undefined || opacityPercent < MAX_BACKGROUND_OPACITY_PERCENT;

  return {
    border,
    shadow,
    background: hasCustomBackground
      ? { color, opacity: opacityPercent / MAX_BACKGROUND_OPACITY_PERCENT }
      : null,
  };
}
