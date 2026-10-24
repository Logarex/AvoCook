import MarkdownIt, { type Token } from "markdown-it";

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false });

export function isSafeMarkdownLink(url: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(url.trim()) && !/[\u0000-\u0020\u007f]/.test(url);
}

markdown.validateLink = isSafeMarkdownLink;
markdown.renderer.rules.image = (tokens, index) => {
  const token = tokens[index];
  const label = markdown.utils.escapeHtml(token.content || String(token.attrGet("src") || ""));
  const url = String(token.attrGet("src") || "");
  return isSafeMarkdownLink(url)
    ? `<a href="${markdown.utils.escapeHtml(url)}">${label}</a>`
    : label;
};

export type MarkdownNode = {
  type: string;
  tag: string;
  content: string;
  attrs: Record<string, string>;
  children: MarkdownNode[];
};

function tokenTree(tokens: Token[]): MarkdownNode[] {
  const root: MarkdownNode[] = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.nesting === -1) {
      stack.pop();
      continue;
    }
    const node: MarkdownNode = {
      type: token.type.replace(/_open$/, ""),
      tag: token.tag,
      content: token.content,
      attrs: Object.fromEntries((token.attrs || []).map(([key, value]) => [key, String(value)])),
      children: token.children ? tokenTree(token.children) : []
    };
    stack[stack.length - 1].push(node);
    if (token.nesting === 1) stack.push(node.children);
  }
  return root;
}

export function parseMarkdown(value: string): MarkdownNode[] {
  return tokenTree(markdown.parse(value, {}));
}

export function renderMarkdownHtml(value: string, inline = false): string {
  return inline ? markdown.renderInline(value) : markdown.render(value);
}

export function markdownToPlainText(value: string): string {
  function text(nodes: MarkdownNode[]): string {
    return nodes.map((node) => {
      if (node.type === "softbreak" || node.type === "hardbreak") return "\n";
      if (node.type === "image") return node.content;
      const content = node.children.length ? text(node.children) : node.content;
      return content + (/^(paragraph|heading|list_item|fence|code_block|tr)$/.test(node.type) ? "\n" : "");
    }).join("");
  }
  return text(parseMarkdown(value)).replace(/\n{3,}/g, "\n\n").trim();
}

export function hasBlockMarkdown(value: string): boolean {
  const nodes = parseMarkdown(value);
  const formattedParagraphs = /\n\s*\n/.test(value) && nodes.some((node) =>
    node.children.some((inline) => inline.children.some((child) => child.type !== "text" && child.type !== "softbreak")));
  return nodes.some((node) => node.type !== "paragraph") || formattedParagraphs;
}

export function splitRecipeText(value: string): string[] {
  const normalized = value.replace(/\r\n?/g, "\n");
  if (hasBlockMarkdown(normalized)) return normalized.trim() ? [trimMarkdownText(normalized)] : [];
  return normalized.split(/\n|(?:<br\s*\/?>)/i).map((line) => line.trim()).filter(Boolean);
}

export function trimMarkdownText(value: string): string {
  return parseMarkdown(value).some((node) => node.type === "code_block")
    ? value.replace(/^(?:[ \t]*\r?\n)+/, "").trimEnd()
    : value.trim();
}
