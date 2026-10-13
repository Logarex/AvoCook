import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { parseMarkdown, type MarkdownNode } from "../features/markdown/markdown";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { MarkdownInline, markdownCodeStyle } from "./MarkdownInline";

export function MarkdownText({ children, style, containerStyle, muted = false, variant = "body" }: {
  children: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  muted?: boolean;
  variant?: React.ComponentProps<typeof AppText>["variant"];
}) {
  const { colors } = useAppTheme();
  const nodes = useMemo(() => parseMarkdown(children), [children]);
  const text = (children: React.ReactNode, key: number, extra?: TextStyle, heading = false) =>
    <AppText key={key} variant={variant} accessibilityRole={heading || variant === "title" ? "header" : undefined} muted={muted} style={[style, extra]}>{children}</AppText>;
  function render(nodes: MarkdownNode[]): React.ReactNode {
    return nodes.map((node, index) => {
      switch (node.type) {
        case "inline":
          return text(<MarkdownInline nodes={node.children} linkColor={colors.primary} interactive />, index);
        case "paragraph":
          return <View key={index} style={styles.paragraph}>{render(node.children)}</View>;
        case "heading":
          return text(<MarkdownInline nodes={node.children[0]?.children || []} linkColor={colors.primary} interactive />, index,
            { fontWeight: "700", fontSize: node.tag === "h1" ? 24 : node.tag === "h2" ? 22 : 18, lineHeight: 28 }, true);
        case "bullet_list":
        case "ordered_list":
          return <View key={index} style={styles.list}>{node.children.map((item, itemIndex) =>
            <View key={itemIndex} style={styles.listRow}>
              <AppText muted={muted} style={style}>{node.type === "ordered_list" ? `${Number(node.attrs.start || 1) + itemIndex}.` : "•"}</AppText>
              <View style={styles.listContent}>{render(item.children)}</View>
            </View>)}</View>;
        case "blockquote":
          return <View key={index} style={[styles.quote, { borderColor: colors.primary }]}>{render(node.children)}</View>;
        case "fence":
        case "code_block":
          return text(node.content.replace(/\n$/, ""), index, { ...markdownCodeStyle, backgroundColor: colors.input, padding: 8 });
        case "hr":
          return <View key={index} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginVertical: 8 }} />;
        case "table":
          return <ScrollView horizontal key={index}><View>{render(node.children)}</View></ScrollView>;
        case "tr":
          return <View key={index} style={styles.tableRow}>{render(node.children)}</View>;
        case "th":
        case "td":
          return <View key={index} style={[styles.cell, { borderColor: colors.border }]}>{render(node.children)}</View>;
        default:
          return <React.Fragment key={index}>{node.children.length ? render(node.children) : text(node.content, index)}</React.Fragment>;
      }
    });
  }
  return <View style={[styles.root, containerStyle]}>{render(nodes)}</View>;
}

const styles = StyleSheet.create({
  root: { flexShrink: 1, minWidth: 0 },
  paragraph: { marginBottom: 4 },
  list: { gap: 4 },
  listRow: { flexDirection: "row", gap: 8 },
  listContent: { flex: 1, minWidth: 0 },
  quote: { borderLeftWidth: 3, paddingLeft: 10, marginVertical: 4 },
  tableRow: { flexDirection: "row" },
  cell: { width: 150, padding: 8, borderWidth: StyleSheet.hairlineWidth }
});
