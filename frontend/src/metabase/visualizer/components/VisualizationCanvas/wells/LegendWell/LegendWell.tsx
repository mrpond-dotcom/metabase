import { useDroppable } from "@dnd-kit/core";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { t } from "ttag";

import { useDispatch, useSelector } from "metabase/redux";
import { Box, Text } from "metabase/ui";
import { DROPPABLE_ID } from "metabase/visualizer/constants";
import { useCanHandleActiveItem } from "metabase/visualizer/hooks/use-can-handle-active-item";
import {
  getVisualizationType,
  getVisualizerColumnValuesMapping,
  getVisualizerComputedSettings,
  getVisualizerDatasetColumns,
  getVisualizerRawSettings,
} from "metabase/visualizer/selectors";
import { canSetLegendColumnForCartesianChart } from "metabase/visualizer/visualizations/cartesian";
import { removeColumn } from "metabase/visualizer/visualizer.slice";
import type { DatasetColumn } from "metabase-types/api";

import { WellItem } from "../WellItem";
import S from "../well.module.css";

/** Drop zone that splits a cartesian chart into one colored series per value. */
export function LegendWell() {
  const dispatch = useDispatch();

  const display = useSelector(getVisualizationType);
  const rawSettings = useSelector(getVisualizerRawSettings);
  const computedSettings = useSelector(getVisualizerComputedSettings);
  const columnValuesMapping = useSelector(getVisualizerColumnValuesMapping);
  const columns = useSelector(getVisualizerDatasetColumns);

  const { active, isOver, setNodeRef } = useDroppable({
    id: DROPPABLE_ID.LEGEND_WELL,
  });

  const isSuitableColumn = useCallback(
    (column: DatasetColumn) =>
      canSetLegendColumnForCartesianChart(
        {
          display: display ?? null,
          settings: rawSettings,
          columnValuesMapping,
        },
        computedSettings,
        column,
      ),
    [display, rawSettings, columnValuesMapping, computedSettings],
  );

  const canHandleActiveItem = useCanHandleActiveItem({
    active,
    isSuitableColumn,
  });

  const legendColumn = useMemo(() => {
    const [, legendColumnName] = computedSettings["graph.dimensions"] ?? [];
    return columns.find((column) => column.name === legendColumnName);
  }, [columns, computedSettings]);

  const handleRemove = useCallback(() => {
    if (legendColumn) {
      dispatch(removeColumn({ name: legendColumn.name }));
    }
  }, [dispatch, legendColumn]);

  return (
    <Box
      className={cx(S.Well, {
        [S.isOver]: isOver,
        [S.isActive]: canHandleActiveItem,
      })}
      data-testid="legend-well"
      ref={setNodeRef}
    >
      {legendColumn ? (
        <WellItem onRemove={handleRemove}>
          <Text truncate>{t`Legend: ${legendColumn.display_name}`}</Text>
        </WellItem>
      ) : (
        <Text c="text-disabled" ta="center">{t`Legend`}</Text>
      )}
    </Box>
  );
}
