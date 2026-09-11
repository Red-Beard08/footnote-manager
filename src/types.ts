import type { TFile } from "obsidian";

export type MarkerMode = "number" | "symbol";
export type FootnoteIssue = "orphan-reference" | "unused-definition" | "duplicate-definition" | "malformed-definition";

export interface FootnoteDefinition {
  label: string;
  normalizedLabel: string;
  body: string;
  start: number;
  end: number;
  line: number;
}

export interface FootnoteReference {
  label: string;
  normalizedLabel: string;
  start: number;
  end: number;
  line: number;
}

export interface ParsedFootnotes {
  definitions: FootnoteDefinition[];
  references: FootnoteReference[];
  issues: FootnoteIssue[];
}

export interface NoteFootnotes extends ParsedFootnotes {
  file: TFile;
  modified: number;
}

export interface LibraryEntry {
  path: string;
  id: string;
  title: string;
  tags: string[];
  body: string;
  created: string;
  updated: string;
}

export interface FootnoteManagerSettings {
  settingsVersion: number;
  libraryRoot: string;
  libraryFolder: string;
  dashboardPath: string;
  sectionHeading: string;
  markerMode: MarkerMode;
  autoRenumber: boolean;
  dashStyling: boolean;
  readingFontSize: number;
  footnoteGap: number;
  showIssues: boolean;
  libraryEnabled: boolean;
  refreshOnModify: boolean;
  disableCompetingToolsPrompted: boolean;
}

export const DEFAULT_SETTINGS: FootnoteManagerSettings = {
  settingsVersion: 1,
  libraryRoot: "Footnote Manager",
  libraryFolder: "Library",
  dashboardPath: "Footnote Manager Dashboard.md",
  sectionHeading: "Footnotes",
  markerMode: "number",
  autoRenumber: true,
  dashStyling: true,
  readingFontSize: 0.86,
  footnoteGap: 0.35,
  showIssues: true,
  libraryEnabled: true,
  refreshOnModify: true,
  disableCompetingToolsPrompted: false
};

export interface DashboardStats {
  notes: NoteFootnotes[];
  definitions: number;
  references: number;
  issues: number;
  libraries: LibraryEntry[];
}
