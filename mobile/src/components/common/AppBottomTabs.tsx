import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { layout } from "../../theme/spacing";

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? colors.brand : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" fill={active ? c : "none"} stroke={c} strokeWidth={active ? 0 : 2} />
    </Svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  const c = active ? colors.brand : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.2" stroke={c} strokeWidth={active ? 2.4 : 2} />
      <Path d="M12 8v4.4l3 1.8" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? colors.brand : colors.textInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.4" r="3.8" stroke={c} strokeWidth={active ? 2.4 : 2} />
      <Path d="M5 20a7 7 0 0 1 14 0" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" />
    </Svg>
  );
}

const ICONS = {
  Home: HomeIcon,
  History: HistoryIcon,
  Profile: ProfileIcon,
};

export default function AppBottomTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name as keyof typeof ICONS] ?? HomeIcon;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.item, focused && styles.itemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={route.name}
            >
              <Icon active={focused} />
              <Text style={[styles.label, focused && styles.labelActive]}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bgSoft,
    borderTopWidth: 1,
    borderTopColor: colors.tabLine,
    paddingTop: 10,
  },
  inner: {
    maxWidth: layout.tabBarMax,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  item: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 72,
  },
  itemActive: { backgroundColor: colors.brandTint },
  label: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.textInactive },
  labelActive: { fontFamily: fonts.extraBold, color: colors.brand },
});
