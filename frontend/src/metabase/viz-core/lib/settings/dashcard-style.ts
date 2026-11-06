import { t } from "ttag";

import { color } from "metabase/ui/colors";
import type {
  DashCardBorderStyle,
  DashCardShadowSize,
  Series,
  VisualizationSettings,
} from "metabase-types/api";

import type { VisualizationSettingsDefinitions } from "../../types";

const getCardStyleSection = () => t`Card style`;

const isBackgroundHidden = (_series: Series, settings: VisualizationSettings) =>
  settings["dashcard.background"] === false;

const getBorderStyleOptions = (): {
  name: string;
  value: DashCardBorderStyle;
}[] => [
  { name: t`Default`, value: "default" },
  { name: t`Bold`, value: "bold" },
  { name: t`None`, value: "none" },
];

const getShadowSizeOptions = (): {
  name: string;
  value: DashCardShadowSize;
}[] => [
  { name: t`None`, value: "none" },
  { name: t`Small`, value: "sm" },
  { name: t`Medium`, value: "md" },
  { name: t`Large`, value: "lg" },
];

/** Dashboard-only settings that control how a dashcard's container looks. */
export const DASHCARD_STYLE_SETTINGS: VisualizationSettingsDefinitions = {
  "dashcard.background_color": {
    getSection: getCardStyleSection,
    get title() {
      return t`Background color`;
    },
    widget: "color",
    dashboard: true,
    getDefault: () => color("background_surface-primary"),
    getHidden: isBackgroundHidden,
  },
  "dashcard.background_opacity": {
    getSection: getCardStyleSection,
    get title() {
      return t`Background opacity (%)`;
    },
    widget: "number",
    dashboard: true,
    getDefault: () => 100,
    getProps: () => ({
      placeholder: "100",
      options: { isInteger: true, isNonNegative: true },
    }),
    getHidden: isBackgroundHidden,
  },
  "dashcard.border": {
    getSection: getCardStyleSection,
    get title() {
      return t`Border`;
    },
    widget: "segmentedControl",
    dashboard: true,
    getDefault: () => "default",
    getProps: () => ({ options: getBorderStyleOptions() }),
  },
  "dashcard.shadow": {
    getSection: getCardStyleSection,
    get title() {
      return t`Shadow`;
    },
    widget: "segmentedControl",
    dashboard: true,
    getDefault: () => "none",
    getProps: () => ({ options: getShadowSizeOptions() }),
  },
};
