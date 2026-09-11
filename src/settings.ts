import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type FootnoteManagerPlugin from "./main";
import { normalizeFolder } from "./utils-settings";

export class FootnoteManagerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: FootnoteManagerPlugin) { super(app, plugin); }
  display(): void {
    const { containerEl } = this; containerEl.empty();
    new Setting(containerEl).setName("Storage").setHeading(); containerEl.createEl("p", { cls: "setting-item-description", text: "Folders are vault-relative. Changing a folder never moves existing notes automatically." });
    this.text(containerEl, "Library root", "Root folder for optional reusable entries.", this.plugin.settings.libraryRoot, async value => { this.plugin.settings.libraryRoot = normalizeFolder(value); await this.plugin.saveSettings(); });
    this.text(containerEl, "Library folder", "Subfolder beneath the library root.", this.plugin.settings.libraryFolder, async value => { this.plugin.settings.libraryFolder = normalizeFolder(value); await this.plugin.saveSettings(); });
    this.text(containerEl, "Dashboard path", "Note path used by the optional dashboard shortcut.", this.plugin.settings.dashboardPath, async value => { this.plugin.settings.dashboardPath = value.trim() || "Footnote Manager Dashboard.md"; await this.plugin.saveSettings(); });
    this.text(containerEl, "Footnote section heading", "Heading used when a note does not yet have a footnote section.", this.plugin.settings.sectionHeading, async value => { this.plugin.settings.sectionHeading = value.trim() || "Footnotes"; await this.plugin.saveSettings(); });
    new Setting(containerEl).setName("Markers and appearance").setHeading();
    new Setting(containerEl).setName("Default marker mode").setDesc("New notes use this mode; native labels remain compatible.").addDropdown(dropdown => dropdown.addOption("number", "Numbers").addOption("symbol", "Symbols").setValue(this.plugin.settings.markerMode).onChange(async value => { this.plugin.settings.markerMode = value === "symbol" ? "symbol" : "number"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Automatic numeric renumbering").setDesc("Renumber numeric references when you use the manager or save a new footnote.").addToggle(toggle => toggle.setValue(this.plugin.settings.autoRenumber).onChange(async value => { this.plugin.settings.autoRenumber = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Visual dash styling").setDesc("Use a subtle dash divider and compact layout in Reading view.").addToggle(toggle => toggle.setValue(this.plugin.settings.dashStyling).onChange(async value => { this.plugin.settings.dashStyling = value; await this.plugin.saveSettings(); }));
    this.number(containerEl, "Reading footnote size", "Relative font size for rendered footnotes.", this.plugin.settings.readingFontSize, 0.6, 1, async value => { this.plugin.settings.readingFontSize = value; await this.plugin.saveSettings(); });
    this.number(containerEl, "Footnote gap", "Vertical spacing between rendered footnotes.", this.plugin.settings.footnoteGap, 0, 2, async value => { this.plugin.settings.footnoteGap = value; await this.plugin.saveSettings(); });
    new Setting(containerEl).setName("Library and dashboard").setHeading();
    new Setting(containerEl).setName("Enable reusable library").addToggle(toggle => toggle.setValue(this.plugin.settings.libraryEnabled).onChange(async value => { this.plugin.settings.libraryEnabled = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Show issue reports").setDesc("Show orphaned, unused, duplicate, and malformed footnote warnings.").addToggle(toggle => toggle.setValue(this.plugin.settings.showIssues).onChange(async value => { this.plugin.settings.showIssues = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Refresh on note changes").addToggle(toggle => toggle.setValue(this.plugin.settings.refreshOnModify).onChange(async value => { this.plugin.settings.refreshOnModify = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Existing footnote tools").setDesc("Footnote Shortcut and Linter rules can conflict with automatic numbering. Disable them after verifying this plugin; Linter's other rules can remain enabled.").addButton(button => button.setButtonText("Disable Footnote Shortcut").onClick(() => void this.plugin.disableFootnoteShortcut())).addButton(button => button.setButtonText("Show checklist").onClick(() => { new Notice("Review Linter settings and disable only its footnote re-indexing/move rules if they conflict with your chosen workflow."); }));
  }
  private text(root: HTMLElement, name: string, desc: string, value: string, change: (value: string) => Promise<void>): void { new Setting(root).setName(name).setDesc(desc).addText(text => text.setValue(value).onChange(value => void change(value))); }
  private number(root: HTMLElement, name: string, desc: string, value: number, min: number, max: number, change: (value: number) => Promise<void>): void { new Setting(root).setName(name).setDesc(desc).addText(text => text.setValue(String(value)).onChange(value => { const parsed = Number(value); if (Number.isFinite(parsed)) void change(Math.min(max, Math.max(min, parsed))); })); }
}
