import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
} from "react-native";
import { parseMarkdown } from "../features/markdown/markdown";
import { useAppTheme } from "../theme/ThemeProvider";
import { compactMarkdownNodes, MarkdownInline } from "./MarkdownInline";

type AppTextProps = TextProps & {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  muted?: boolean;
  markdown?: boolean;
  style?: StyleProp<TextStyle>;
};

export function AppText({
  variant = "body",
  muted = false,
  style,
  markdown = false,
  children,
  ...props
}: AppTextProps) {
  const { colors } = useAppTheme();
  const nodes = React.useMemo(
    () =>
      markdown && typeof children === "string"
        ? compactMarkdownNodes(parseMarkdown(children))
        : null,
    [markdown, children],
  );
  // Android Fabric ignores minimumFontScale and can shrink text to 4px.
  const adjustsFontSizeToFit =
    Platform.OS !== "android" && (props.adjustsFontSizeToFit ?? false);

  return (
    <Text
      {...props}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={props.minimumFontScale ?? 0.85}
      style={[
        styles.base,
        styles[variant],
        { color: muted ? colors.textMuted : colors.text },
        style,
      ]}
    >
      {nodes ? (
        <MarkdownInline nodes={nodes} linkColor={colors.primary} />
      ) : (
        children
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
    flexShrink: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18,
  },
});
