import type { FootnoteDefinition, FootnoteReference, ParsedFootnotes } from "./types";

const SYMBOLS = ["†", "‡", "§", "¶", "‖", "※", "#", "*", "**", "***"];

export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function parseFootnotes(markdown: string): ParsedFootnotes {
  const definitions: FootnoteDefinition[] = [];
  const references: FootnoteReference[] = [];
  const definitionRegex = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]?(.*(?:\n(?: {2,4}|\t).*)*)/gm;
  let match: RegExpExecArray | null;
  while ((match = definitionRegex.exec(markdown))) {
    const body = match[2].replace(/\n(?: {2,4}|\t)/g, "\n").trimEnd();
    const label = match[1];
    const start = match.index;
    definitions.push({ label, normalizedLabel: normalizeLabel(label), body, start, end: start + match[0].length, line: markdown.slice(0, start).split("\n").length });
  }
  const referenceRegex = /\[\^([^\]\s]+)\](?!:)/g;
  while ((match = referenceRegex.exec(markdown))) {
    const before = markdown.slice(Math.max(0, match.index - 2), match.index);
    if (before.endsWith("^") || definitions.some(def => def.start <= match!.index && match!.index < def.end)) continue;
    const label = match[1];
    references.push({ label, normalizedLabel: normalizeLabel(label), start: match.index, end: match.index + match[0].length, line: markdown.slice(0, match.index).split("\n").length });
  }
  const definitionCounts = new Map<string, number>();
  definitions.forEach(def => definitionCounts.set(def.normalizedLabel, (definitionCounts.get(def.normalizedLabel) ?? 0) + 1));
  const definitionLabels = new Set(definitions.map(def => def.normalizedLabel));
  const referenceLabels = new Set(references.map(ref => ref.normalizedLabel));
  const issues: ParsedFootnotes["issues"] = [];
  if (definitions.some(def => (definitionCounts.get(def.normalizedLabel) ?? 0) > 1)) issues.push("duplicate-definition");
  if ([...referenceLabels].some(label => !definitionLabels.has(label))) issues.push("orphan-reference");
  if ([...definitionLabels].some(label => !referenceLabels.has(label))) issues.push("unused-definition");
  if (/^ {0,3}\[\^[^\]\s]+\](?:\s*)$/m.test(markdown)) issues.push("malformed-definition");
  return { definitions, references, issues };
}

export function markerFor(index: number, mode: "number" | "symbol"): string {
  if (mode === "number") return String(index + 1);
  if (index < SYMBOLS.length) return SYMBOLS[index];
  return `${SYMBOLS[index % SYMBOLS.length]}${Math.floor(index / SYMBOLS.length) + 1}`;
}

export function nextNumericLabel(parsed: ParsedFootnotes): string {
  const used = new Set(parsed.definitions.map(def => Number(def.label)).filter(Number.isInteger));
  let next = 1;
  while (used.has(next)) next += 1;
  return String(next);
}

export function replaceRange(source: string, start: number, end: number, replacement: string): string {
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

export function renumberMarkdown(markdown: string): string {
  const parsed = parseFootnotes(markdown);
  const numericLabels = parsed.definitions.filter(def => /^\d+$/.test(def.label)).map(def => def.normalizedLabel);
  if (!numericLabels.length) return markdown;
  const mapping = new Map<string, string>();
  numericLabels.forEach((label, index) => mapping.set(label, String(index + 1)));
  const referenceRegex = /\[\^([^\]\s]+)\](?!:)/g;
  let result = markdown.replace(referenceRegex, (whole, label: string) => mapping.has(normalizeLabel(label)) ? `[^${mapping.get(normalizeLabel(label))}]` : whole);
  result = result.replace(/(^ {0,3}\[\^)([^\]\s]+)(\]:)/gm, (whole, prefix: string, label: string, suffix: string) => mapping.has(normalizeLabel(label)) ? `${prefix}${mapping.get(normalizeLabel(label))}${suffix}` : whole);
  return result;
}

export function convertNumericToSymbols(markdown: string): string {
  const parsed = parseFootnotes(markdown);
  const numeric = parsed.definitions.filter(def => /^\d+$/.test(def.label));
  if (!numeric.length) return markdown;
  const mapping = new Map<string, string>();
  numeric.forEach((definition, index) => mapping.set(definition.normalizedLabel, markerFor(index, "symbol")));
  let result = markdown.replace(/\[\^([^\]\s]+)\](?!:)/g, (whole, label: string) => mapping.has(normalizeLabel(label)) ? `[^${mapping.get(normalizeLabel(label))}]` : whole);
  result = result.replace(/(^ {0,3}\[\^)([^\]\s]+)(\]:)/gm, (whole, prefix: string, label: string, suffix: string) => mapping.has(normalizeLabel(label)) ? `${prefix}${mapping.get(normalizeLabel(label))}${suffix}` : whole);
  return result;
}

export function safeFileName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, " ").slice(0, 120) || "Untitled";
}

export function id(prefix = "FNL"): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

export function now(): string { return new Date().toISOString().slice(0, 16); }
