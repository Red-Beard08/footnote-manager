import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { DASHBOARD_VIEW, FootnoteDashboardView } from "./dashboard";
import { AddFootnoteModal, FootnoteManagerModal, LibraryEntryModal } from "./modals";
import { FootnoteRepository } from "./repository";
import { FootnoteManagerSettingTab } from "./settings";
import { DEFAULT_SETTINGS, FootnoteManagerSettings, NoteFootnotes } from "./types";
import { nextNumericLabel } from "./utils";
import { registerDashboardWidget } from "./widget-bridge";

export default class FootnoteManagerPlugin extends Plugin {
  settings: FootnoteManagerSettings = DEFAULT_SETTINGS;
  repository!: FootnoteRepository;
  cachedNotes: NoteFootnotes[] = [];
  private refreshTimer = 0;
  private autoRenumbering = false;
  private widgetDisposals: Array<() => void> = [];

  async onload(): Promise<void> {
    await this.loadSettings();
    this.repository = new FootnoteRepository(this.app, this.settings);
    this.registerView(DASHBOARD_VIEW, leaf => new FootnoteDashboardView(leaf, this));
    this.addRibbonIcon("footprints", "Open Footnote Manager", () => void this.openDashboard());
    this.addCommand({ id: "open-dashboard", name: "Open dashboard", callback: () => void this.openDashboard() });
    this.addCommand({ id: "manage-current-note", name: "Manage footnotes in current note", checkCallback: checking => this.currentFile() ? (checking || void this.openCurrentManager(), true) : false });
    this.addCommand({ id: "add-footnote", name: "Add footnote", checkCallback: checking => this.currentFile() ? (checking || void this.openAddFootnote(), true) : false });
    this.addCommand({ id: "insert-library-footnote", name: "Insert reusable library footnote", callback: () => void this.openAddFootnote() });
    this.addCommand({ id: "renumber-current-note", name: "Renumber current note", checkCallback: checking => this.currentFile() ? (checking || void this.renumber(this.currentFile()!), true) : false });
    this.addCommand({ id: "convert-to-numbered", name: "Convert current note to numbered markers", checkCallback: checking => this.currentFile() ? (checking || void this.renumber(this.currentFile()!), true) : false });
    this.addCommand({ id: "convert-to-symbols", name: "Convert current note to symbol markers", checkCallback: checking => this.currentFile() ? (checking || void this.convertToSymbols(this.currentFile()!), true) : false });
    this.addCommand({ id: "scan-vault", name: "Scan vault for footnote issues", callback: () => void this.scanVault() });
    this.addCommand({ id: "refresh", name: "Refresh dashboard", callback: () => void this.refresh() });
    this.addCommand({ id: "open-settings", name: "Open Footnote Manager settings", callback: () => this.openSettings() });
    this.addCommand({ id: "disable-footnote-shortcut", name: "Disable Footnote Shortcut", callback: () => void this.disableFootnoteShortcut() });
    this.addSettingTab(new FootnoteManagerSettingTab(this.app, this));
    this.registerEvent(this.app.vault.on("modify", file => this.handleModify(file.path)));
    this.registerEvent(this.app.vault.on("rename", file => this.handleModify(file.path)));
    this.widgetDisposals.push(registerDashboardWidget(this.app, { id: "footnote-manager/overview", name: "Footnote overview", icon: "footprints", description: "Footnote counts and review issues.", defaultLayout: { w: 4, mobileW: 12, h: 2, order: 80 }, mobile: "responsive", render: async (_ctx, container) => { const data = await this.repository.scan(); container.empty(); container.createEl("h3", { text: "Footnotes" }); container.createEl("p", { text: `${data.definitions} definitions · ${data.notes.length} notes` }); if (data.issues) container.createEl("p", { text: `${data.issues} issue${data.issues === 1 ? "" : "s"}`, cls: "footnote-manager-warning" }); } }));
    await this.refresh();
  }

  onunload(): void { window.clearTimeout(this.refreshTimer); this.widgetDisposals.forEach(dispose => dispose()); this.widgetDisposals = []; this.app.workspace.detachLeavesOfType(DASHBOARD_VIEW); }
  async loadSettings(): Promise<void> { this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData() ?? {}) }; }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); this.repository?.updateSettings(this.settings); this.app.workspace.getLeavesOfType(DASHBOARD_VIEW).forEach(leaf => { if (leaf.view instanceof FootnoteDashboardView) void leaf.view.render(); }); }

  async openDashboard(): Promise<void> { let leaf = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW)[0]; if (!leaf) { leaf = this.app.workspace.getLeaf("tab"); await leaf.setViewState({ type: DASHBOARD_VIEW, active: true }); } this.app.workspace.revealLeaf(leaf); await this.refresh(); }
  async openFile(path: string): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) { new Notice("That footnote note could not be found."); return; } await this.app.workspace.getLeaf("tab").openFile(file); }
  openCurrentManager(): void { const file = this.currentFile(); if (!file) { new Notice("Open a Markdown note first."); return; } void this.openManagerForFile(file); }
  openManagerFor(note: NoteFootnotes): void { new FootnoteManagerModal(this.app, this, note).open(); }
  openAddFootnote(file?: TFile): void { new AddFootnoteModal(this.app, this, file).open(); }
  openSettings(): void { const setting = (this.app as typeof this.app & { setting?: { open(): void; openTabById(id: string): void } }).setting; if (!setting) { new Notice("Open Obsidian Settings, then choose Footnote Manager."); return; } setting.open(); setting.openTabById(this.manifest.id); }
  nextLabel(file: TFile): string { const cached = this.cachedNotes.find(note => note.file.path === file.path); return cached ? nextNumericLabel(cached) : "1"; }
  async addFootnote(file: TFile, label: string, body: string): Promise<void> { await this.repository.appendDefinition(file, label, body); const view = this.app.workspace.getActiveViewOfType(MarkdownView); if (view?.file?.path === file.path) view.editor.replaceSelection(`[^${label}]`); if (this.settings.autoRenumber) await this.renumber(file); await this.refresh(); new Notice(`Footnote [^${label}] added.`); }
  async updateDefinition(file: TFile, label: string, body: string): Promise<void> { await this.repository.updateDefinition(file, label, body); await this.refresh(); }
  async removeDefinition(file: TFile, label: string): Promise<void> { await this.repository.removeDefinition(file, label); await this.refresh(); }
  async renumber(file: TFile): Promise<void> { await this.repository.renumber(file); await this.refresh(); new Notice("Numeric footnotes renumbered."); }
  async convertToSymbols(file: TFile): Promise<void> { await this.repository.convertToSymbols(file); await this.refresh(); new Notice("Numeric footnotes converted to symbols."); }
  async copyToLibrary(label: string, body: string): Promise<void> { new LibraryEntryModal(this.app, this, `Footnote ${label}`, body).open(); }
  async disableFootnoteShortcut(): Promise<void> {
    const manager = (this.app as unknown as { plugins?: { disablePlugin?: (id: string) => Promise<void> } }).plugins;
    if (!manager || typeof manager.disablePlugin !== "function") { new Notice("Obsidian does not expose plugin disabling here; disable Footnote Shortcut from Community Plugins."); return; }
    try { await manager.disablePlugin("obsidian-footnotes"); this.settings.disableCompetingToolsPrompted = true; await this.saveSettings(); new Notice("Footnote Shortcut disabled. Review Linter footnote rules separately."); } catch { new Notice("Could not disable Footnote Shortcut automatically. Use Community Plugins settings."); }
  }
  async scanVault(): Promise<void> { const data = await this.repository.scan(); this.cachedNotes = data.notes; new Notice(data.issues ? `${data.issues} footnote issue${data.issues === 1 ? "" : "s"} found.` : "No footnote issues found."); await this.refresh(); }
  async refresh(): Promise<void> { try { const data = await this.repository.scan(); this.cachedNotes = data.notes; for (const leaf of this.app.workspace.getLeavesOfType(DASHBOARD_VIEW)) if (leaf.view instanceof FootnoteDashboardView) await leaf.view.render(); } catch (error) { console.error("Footnote Manager refresh failed", error); } }
  private currentFile(): TFile | null { return this.app.workspace.getActiveViewOfType(MarkdownView)?.file ?? this.app.workspace.getActiveFile(); }
  private async openManagerForFile(file: TFile): Promise<void> { const note = this.cachedNotes.find(item => item.file.path === file.path) ?? await this.repository.read(file); new FootnoteManagerModal(this.app, this, note).open(); }
  private handleModify(path: string): void {
    if (path.startsWith(".obsidian/")) return;
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => void this.refreshAfterModify(path), 300);
  }
  private async refreshAfterModify(path: string): Promise<void> {
    if (this.settings.autoRenumber && !this.autoRenumbering) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        this.autoRenumbering = true;
        try { await this.repository.renumber(file); } catch (error) { console.warn("Footnote Manager could not auto-renumber the modified note.", error); } finally { this.autoRenumbering = false; }
      }
    }
    if (this.settings.refreshOnModify) await this.refresh();
  }
}

export { DASHBOARD_VIEW };
