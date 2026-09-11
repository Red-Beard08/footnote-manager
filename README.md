# Footnote Manager

Footnote Manager is a Red‑Beard Obsidian add-on for native Markdown footnotes. It provides a current-note editor, vault dashboard, optional reusable library, numeric renumbering, symbol-aware workflows, and compact Reading-view styling.

## Installation

Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/footnote-manager/`, enable the plugin, and reload Obsidian. The add-on works offline and on iOS; it has no Dataview, network, or desktop-only dependency.

## Workflow

- Open a Markdown note and run **Manage footnotes in current note**.
- Use **Add footnote** to create a native `[^1]` reference and definition.
- Edit full Markdown, including multiline text and links.
- Run **Renumber current note** when you want numeric labels normalized.
- Use the dashboard to find orphaned references, unused definitions, duplicate labels, and recently edited notes.
- Optionally save reusable entries under the configured library folder. They are copied into notes as native definitions, so notes remain portable.

## Compatibility

Existing native footnotes are indexed without migration or automatic rewriting. Footnote Shortcut and Linter may overlap with automatic numbering; verify this plugin first, then disable their competing footnote features if desired. Existing files are never deleted.

## Settings

All folders and dashboard paths are vault-relative. Configure marker mode, automatic renumbering, dash styling, Reading-view size, issue visibility, refresh behavior, and reusable-library storage in Footnote Manager settings. Folder changes do not move existing notes.

## Limitations

The first release does not migrate existing labels or provide a separate central-reference syntax. Numeric renumbering only changes numeric labels; it can run automatically after edits when enabled, or explicitly through the manager/command. Reading-view styling does not change source or Live Preview text.

## Development

```bash
npm ci
npm run typecheck
npm run build
npm test
```

MIT licensed; authored by Red‑Beard.
