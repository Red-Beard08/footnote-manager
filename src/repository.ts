import { App, normalizePath, parseYaml, TFile } from "obsidian";
import type { DashboardStats, FootnoteManagerSettings, LibraryEntry, NoteFootnotes } from "./types";
import { convertNumericToSymbols, id, normalizeLabel, now, parseFootnotes, replaceRange, safeFileName, renumberMarkdown } from "./utils";

export class FootnoteRepository {
  constructor(private app: App, private settings: FootnoteManagerSettings) {}

  updateSettings(settings: FootnoteManagerSettings): void { this.settings = settings; }

  async scan(): Promise<DashboardStats> {
    const notes: NoteFootnotes[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (file.path.startsWith(".obsidian/") || file.path.startsWith(".trash/")) continue;
      const text = await this.app.vault.cachedRead(file);
      const parsed = parseFootnotes(text);
      if (parsed.definitions.length || parsed.references.length || parsed.issues.length) notes.push({ file, modified: file.stat.mtime, ...parsed });
    }
    const libraries = this.settings.libraryEnabled ? await this.readLibrary() : [];
    return { notes: notes.sort((a, b) => b.modified - a.modified), definitions: notes.reduce((sum, note) => sum + note.definitions.length, 0), references: notes.reduce((sum, note) => sum + note.references.length, 0), issues: notes.reduce((sum, note) => sum + note.issues.length, 0), libraries };
  }

  async read(file: TFile): Promise<NoteFootnotes> {
    const text = await this.app.vault.read(file);
    return { file, modified: file.stat.mtime, ...parseFootnotes(text) };
  }

  async updateDefinition(file: TFile, label: string, body: string): Promise<void> {
    await this.app.vault.process(file, current => {
      const parsed = parseFootnotes(current);
      const definition = parsed.definitions.find(item => item.normalizedLabel === normalizeLabel(label));
      if (!definition) return current;
      const indentation = body.includes("\n") ? body.split("\n").map((line, index) => index === 0 ? line : `    ${line}`).join("\n") : body;
      const replacement = `[^${definition.label}]: ${indentation}`;
      return replaceRange(current, definition.start, definition.end, replacement);
    });
  }

  async removeDefinition(file: TFile, label: string): Promise<void> {
    await this.app.vault.process(file, current => {
      const parsed = parseFootnotes(current);
      const definition = parsed.definitions.find(item => item.normalizedLabel === normalizeLabel(label));
      if (!definition) return current;
      let start = definition.start;
      if (start > 0 && current[start - 1] === "\n") start -= 1;
      return replaceRange(current, start, definition.end, "");
    });
  }

  async appendDefinition(file: TFile, label: string, body: string): Promise<void> {
    await this.app.vault.process(file, current => {
      const parsed = parseFootnotes(current);
      if (parsed.definitions.some(item => item.normalizedLabel === normalizeLabel(label))) return current;
      const heading = `\n\n## ${this.settings.sectionHeading}\n`;
      const prefix = new RegExp(`(^|\\n)#{1,6}\\s+${escapeRegex(this.settings.sectionHeading)}\\s*$`, "im").test(current) ? "\n" : heading;
      const indented = body.split("\n").map((line, index) => index === 0 ? line : `    ${line}`).join("\n");
      return `${current.trimEnd()}${prefix}[^${label}]: ${indented}\n`;
    });
  }

  async renumber(file: TFile): Promise<boolean> {
    const before = await this.app.vault.read(file);
    const after = renumberMarkdown(before);
    if (after === before) return false;
    await this.app.vault.process(file, () => after);
    return true;
  }

  async convertToSymbols(file: TFile): Promise<boolean> {
    const before = await this.app.vault.read(file);
    const after = convertNumericToSymbols(before);
    if (after === before) return false;
    await this.app.vault.process(file, () => after);
    return true;
  }

  async saveLibraryEntry(title: string, body: string, tags: string[]): Promise<TFile> {
    await this.ensureLibraryFolders();
    const stamp = now();
    const entryId = id();
    const path = normalizePath(`${this.settings.libraryRoot}/${this.settings.libraryFolder}/${safeFileName(title)} - ${entryId}.md`);
    const yaml = ["---", "type: footnote-library-entry", `id: ${entryId}`, `title: ${quoteYaml(title)}`, `tags:`, ...(tags.length ? tags.map(tag => `  - ${quoteYaml(tag)}`) : ["  - footnote"]), `created: ${stamp}`, `updated: ${stamp}`, "---", "", body.trim(), ""].join("\n");
    return this.app.vault.create(path, yaml);
  }

  async ensureLibraryFolders(): Promise<void> {
    for (const folder of [this.settings.libraryRoot, normalizePath(`${this.settings.libraryRoot}/${this.settings.libraryFolder}`)]) {
      if (!folder || this.app.vault.getAbstractFileByPath(folder)) continue;
      await this.app.vault.createFolder(folder);
    }
  }

  private async readLibrary(): Promise<LibraryEntry[]> {
    const prefix = normalizePath(`${this.settings.libraryRoot}/${this.settings.libraryFolder}`) + "/";
    const entries: LibraryEntry[] = [];
    for (const file of this.app.vault.getMarkdownFiles().filter(item => item.path.startsWith(prefix))) {
      const text = await this.app.vault.cachedRead(file);
      const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
      if (!frontmatterMatch) continue;
      const data = parseYaml(frontmatterMatch[1]) as Record<string, unknown>;
      entries.push({ path: file.path, id: String(data.id ?? ""), title: String(data.title ?? file.basename), tags: Array.isArray(data.tags) ? data.tags.map(String) : [], body: text.slice(frontmatterMatch[0].length).trim(), created: String(data.created ?? ""), updated: String(data.updated ?? "") });
    }
    return entries.sort((a, b) => b.updated.localeCompare(a.updated));
  }
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function quoteYaml(value: string): string { return JSON.stringify(value.replace(/\r?\n/g, " ")); }
