import { ItemView, MarkdownView, Notice, WorkspaceLeaf } from "obsidian";
import type FootnoteManagerPlugin from "./main";
import type { DashboardStats, NoteFootnotes } from "./types";

export const DASHBOARD_VIEW = "footnote-manager-dashboard";

export class FootnoteDashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: FootnoteManagerPlugin) { super(leaf); }
  getViewType(): string { return DASHBOARD_VIEW; }
  getDisplayText(): string { return "Footnote Manager"; }
  getIcon(): string { return "footprints"; }
  async onOpen(): Promise<void> { await this.render(); }
  async render(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement; root.empty(); root.addClass("footnote-manager-view");
    const data = await this.plugin.repository.scan();
    const header = root.createDiv({ cls: "footnote-manager-header" });
    const title = header.createDiv(); title.createEl("div", { text: "FOOTNOTE MANAGER", cls: "footnote-manager-eyebrow" }); title.createEl("h1", { text: "Native notes, easier to manage." }); title.createEl("p", { text: "Review, edit, and style footnotes without leaving Markdown." });
    const actions = header.createDiv({ cls: "footnote-manager-actions" }); this.action(actions, "Manage current note", "edit", () => void this.plugin.openCurrentManager()); this.action(actions, "New footnote", "plus", () => void this.plugin.openAddFootnote()); this.action(actions, "Refresh", "refresh-cw", () => void this.render());
    const metrics = root.createDiv({ cls: "footnote-manager-metrics" }); this.metric(metrics, "Notes", String(data.notes.length)); this.metric(metrics, "Definitions", String(data.definitions)); this.metric(metrics, "References", String(data.references)); this.metric(metrics, "Issues", String(data.issues));
    const current = this.currentNote();
    const currentCard = root.createDiv({ cls: "footnote-manager-panel" }); currentCard.createEl("h2", { text: "Current note" });
    if (current) { currentCard.createEl("p", { text: current.file.path, cls: "footnote-manager-muted" }); currentCard.createEl("p", { text: `${current.definitions.length} definitions · ${current.references.length} references` }); this.action(currentCard, "Open manager", "edit", () => void this.plugin.openCurrentManager()); }
    else currentCard.createEl("p", { text: "Open a Markdown note to manage its footnotes.", cls: "footnote-manager-muted" });
    const grid = root.createDiv({ cls: "footnote-manager-grid" }); this.renderNotes(grid, data); this.renderLibrary(grid, data);
  }
  private renderNotes(root: HTMLElement, data: DashboardStats): void {
    const panel = root.createDiv({ cls: "footnote-manager-panel" }); panel.createEl("h2", { text: "Recent notes" });
    if (!data.notes.length) { panel.createEl("p", { text: "No footnotes found yet.", cls: "footnote-manager-muted" }); return; }
    for (const note of data.notes.slice(0, 12)) { const row = panel.createDiv({ cls: "footnote-manager-row" }); row.createEl("div", { text: note.file.basename }); row.createEl("span", { text: `${note.definitions.length} notes${note.issues.length ? ` · ${note.issues.length} issue${note.issues.length === 1 ? "" : "s"}` : ""}`, cls: note.issues.length ? "footnote-manager-warning" : "footnote-manager-muted" }); const button = row.createEl("button", { text: "Manage" }); button.onclick = () => void this.plugin.openManagerFor(note); }
  }
  private renderLibrary(root: HTMLElement, data: DashboardStats): void {
    const panel = root.createDiv({ cls: "footnote-manager-panel" }); panel.createEl("h2", { text: "Reusable library" });
    if (!this.plugin.settings.libraryEnabled) { panel.createEl("p", { text: "Library entries are disabled in settings.", cls: "footnote-manager-muted" }); return; }
    if (!data.libraries.length) { panel.createEl("p", { text: "No reusable entries yet.", cls: "footnote-manager-muted" }); return; }
    for (const entry of data.libraries.slice(0, 12)) { const row = panel.createDiv({ cls: "footnote-manager-row" }); row.createEl("div", { text: entry.title }); const button = row.createEl("button", { text: "Open" }); button.onclick = () => void this.plugin.openFile(entry.path); }
  }
  private currentNote(): NoteFootnotes | null { const view = this.app.workspace.getActiveViewOfType(MarkdownView); return view?.file ? this.plugin.cachedNotes.find(note => note.file.path === view.file?.path) ?? null : null; }
  private metric(root: HTMLElement, label: string, value: string): void { const card = root.createDiv({ cls: "footnote-manager-metric" }); card.createEl("strong", { text: value }); card.createEl("span", { text: label }); }
  private action(root: HTMLElement, label: string, icon: string, callback: () => void): void { const button = root.createEl("button", { text: label, cls: "footnote-manager-button" }); button.setAttr("aria-label", label); button.onclick = callback; void icon; }
}
