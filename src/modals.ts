import { App, ButtonComponent, Modal, Notice, Setting, TFile } from "obsidian";
import type FootnoteManagerPlugin from "./main";
import type { NoteFootnotes } from "./types";

export class FootnoteManagerModal extends Modal {
  constructor(app: App, private plugin: FootnoteManagerPlugin, private note: NoteFootnotes) { super(app); }
  onOpen(): void {
    this.titleEl.setText(`Footnotes · ${this.note.file.basename}`); this.modalEl.addClass("footnote-manager-modal");
    const content = this.contentEl; content.empty(); content.addClass("footnote-manager-modal-scroll");
    const intro = content.createDiv({ cls: "footnote-manager-modal-intro" }); intro.createEl("p", { text: `${this.note.definitions.length} definitions · ${this.note.references.length} references` });
    if (this.note.issues.length) content.createEl("div", { text: `Needs attention: ${this.note.issues.join(", ")}`, cls: "footnote-manager-warning" });
    if (!this.note.definitions.length) content.createEl("p", { text: "No definitions found. Add your first footnote below.", cls: "footnote-manager-muted" });
    this.note.definitions.forEach((definition, index) => this.renderDefinition(content, definition.label, definition.body, index));
    const footer = content.createDiv({ cls: "footnote-manager-modal-footer" });
    new ButtonComponent(footer).setButtonText("Add footnote").setCta().onClick(() => { this.close(); this.plugin.openAddFootnote(this.note.file); });
    new ButtonComponent(footer).setButtonText("Renumber").onClick(async () => { await this.plugin.renumber(this.note.file); this.close(); });
    new ButtonComponent(footer).setButtonText("Use symbols").onClick(async () => { await this.plugin.convertToSymbols(this.note.file); this.close(); });
    new ButtonComponent(footer).setButtonText("Open note").onClick(() => { this.close(); void this.plugin.openFile(this.note.file.path); });
  }
  private renderDefinition(root: HTMLElement, label: string, body: string, index: number): void {
    const card = root.createDiv({ cls: "footnote-manager-definition" }); const heading = card.createDiv({ cls: "footnote-manager-definition-heading" }); heading.createEl("strong", { text: `[${label}]` }); heading.createEl("span", { text: `Footnote ${index + 1}`, cls: "footnote-manager-muted" });
    const textarea = card.createEl("textarea", { cls: "footnote-manager-textarea" }); textarea.value = body; textarea.rows = Math.min(10, Math.max(3, body.split("\n").length + 1));
    const buttons = card.createDiv({ cls: "footnote-manager-row-actions" });
    new ButtonComponent(buttons).setButtonText("Save").setCta().onClick(async () => { await this.plugin.updateDefinition(this.note.file, label, textarea.value); new Notice("Footnote saved."); this.close(); });
    new ButtonComponent(buttons).setButtonText("Copy to library").onClick(async () => { await this.plugin.copyToLibrary(label, textarea.value); });
    new ButtonComponent(buttons).setButtonText("Delete definition").setWarning().onClick(async () => { if (!confirm(`Delete footnote [^${label}]? This only removes the definition.`)) return; await this.plugin.removeDefinition(this.note.file, label); new Notice("Footnote definition removed."); this.close(); });
  }
}

export class AddFootnoteModal extends Modal {
  constructor(app: App, private plugin: FootnoteManagerPlugin, private file?: TFile) { super(app); }
  onOpen(): void {
    this.titleEl.setText("New footnote"); this.modalEl.addClass("footnote-manager-modal"); const content = this.contentEl; content.empty(); content.addClass("footnote-manager-modal-scroll");
    const note = this.file ?? this.app.workspace.getActiveFile(); if (!note) { content.createEl("p", { text: "Open a Markdown note first." }); return; }
    const label = this.plugin.nextLabel(note); const target = content.createEl("p", { text: `This will create [^${label}] in ${note.basename}.`, cls: "footnote-manager-muted" }); void target;
    const text = content.createEl("textarea", { cls: "footnote-manager-textarea" }); text.placeholder = "Write the footnote in Markdown…"; text.rows = 8;
    const footer = content.createDiv({ cls: "footnote-manager-modal-footer" }); new ButtonComponent(footer).setButtonText("Save footnote").setCta().onClick(async () => { if (!text.value.trim()) { new Notice("Footnote text is required."); return; } await this.plugin.addFootnote(note, label, text.value); this.close(); }); new ButtonComponent(footer).setButtonText("Cancel").onClick(() => this.close());
  }
}

export class LibraryEntryModal extends Modal {
  constructor(app: App, private plugin: FootnoteManagerPlugin, private title: string, private body: string) { super(app); }
  onOpen(): void { this.titleEl.setText("Save reusable footnote"); this.modalEl.addClass("footnote-manager-modal"); const content = this.contentEl; content.empty(); content.addClass("footnote-manager-modal-scroll"); let title = this.title; new Setting(content).setName("Title").addText(text => text.setValue(title).onChange(value => title = value)); const preview = content.createEl("textarea", { cls: "footnote-manager-textarea" }); preview.value = this.body; preview.rows = 8; const footer = content.createDiv({ cls: "footnote-manager-modal-footer" }); new ButtonComponent(footer).setButtonText("Save to library").setCta().onClick(async () => { await this.plugin.repository.saveLibraryEntry(title || "Untitled footnote", preview.value, ["footnote"]); new Notice("Reusable footnote saved."); this.close(); }); }
}
