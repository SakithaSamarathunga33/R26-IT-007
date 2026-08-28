import { useWindowDimensions } from "react-native";
import { layout } from "../theme/spacing";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= layout.tabletMin;
  const isLargePhone = width > 430 && width < layout.tabletMin;

  const contentMaxWidth = isTablet ? layout.contentMax : undefined;
  const reportMaxWidth = isTablet ? layout.reportMax : undefined;
  const padH = isTablet ? 32 : isLargePhone ? 26 : isSmallPhone ? 16 : 22;

  return {
    width,
    height,
    isSmallPhone,
    isLargePhone,
    isTablet,
    contentMaxWidth,
    reportMaxWidth,
    padH,
  };
}
