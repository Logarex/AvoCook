import React from "react";
import { Linking, Platform, Text, type TextStyle } from "react-native";
import { isSafeMarkdownLink, type MarkdownNode } from "../features/markdown/markdown";

export const markdownCodeStyle: TextStyle = {
  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
};

export function MarkdownInline({ nodes, linkColor, interactive = false }: {
  nodes: MarkdownNode[];
  linkColor: string;
  interactive?: boolean;
}) {
  return <>{nodes.map((node, index) => {
    if (node.type === "softbreak" || node.type === "hardbreak") return "\n";
    if (node.type === "text") return node.content;
    const url = node.attrs.href || node.attrs.src;
    const isLink = (node.type === "link" || node.type === "image") && url && isSafeMarkdownLink(url);
    const style: TextStyle = {
      ...(node.type === "strong" ? { fontWeight: "700" } : {}),
      ...(node.type === "em" ? { fontStyle: "italic" } : {}),
      ...(node.type === "s" ? { textDecorationLine: "line-through" } : {}),
      ...(node.type === "code_inline" ? markdownCodeStyle : {}),
      ...(isLink && interactive ? { color: linkColor, textDecorationLine: "underline" } : {})
    };
    return <Text key={index} style={style}
      accessibilityRole={isLink && interactive ? "link" : undefined}
      onPress={isLink && interactive ? (event) => {
        event.stopPropagation();
        void Linking.openURL(url).catch(() => undefined);
      } : undefined}>
      {node.children.length && node.type !== "image"
        ? <MarkdownInline nodes={node.children} linkColor={linkColor} interactive={interactive} />
        : node.content}
    </Text>;
  })}</>;
}

export function compactMarkdownNodes(nodes: MarkdownNode[]): MarkdownNode[] {
  return nodes.flatMap((node, index) => {
    const separator: MarkdownNode = { type: "text", tag: "", content: " ", attrs: {}, children: [] };
    if (node.type === "inline") return node.children;
    if (node.children.length) return [...(index ? [separator] : []), ...compactMarkdownNodes(node.children)];
    return [node];
  });
}
