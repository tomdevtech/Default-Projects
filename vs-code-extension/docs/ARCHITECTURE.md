# Architecture

The extension is small on purpose. Logic that does not need VS Code is kept in two files without a `vscode` import, so it can be unit-tested with plain Node.

```
src/
  scaffolder.ts    Pure: validates names/paths and writes the project to disk.      (no vscode)
  templates.ts     Pure: data model, normalize + validate, TemplateStore.           (no vscode)
  templateTree.ts  Sidebar list (native TreeView) built on TemplateStore.
  editorPanel.ts   Webview panel with the template editor.
  extension.ts     activate(): registers commands and the sidebar, wires the rest.
media/
  editor.html      The editor UI. One file: HTML + CSS + JS, no external resources.
src/test/          Unit tests for the two pure modules (mocha, no VS Code needed).
```

## Data model

```ts
interface ProjectTemplate { id: string; name: string; entries: TemplateEntry[] }
interface TemplateEntry   { path: string; content: string }   // path ending in "/" = empty folder
```

A single flat list of entries is used for files and folders. This keeps the editor, the storage and the scaffolder simple.

## Flows

**Create a template / edit a template**

```
sidebar "+" or command  ->  openTemplateEditor()  ->  media/editor.html (initial data embedded)
user clicks Save        ->  webview.postMessage({command:'save', template})
extension               ->  normalizeTemplate()  ->  validateTemplate()  ->  store.save()
store.save()            ->  listeners fire  ->  sidebar list refreshes
```

**Create a project**

```
sidebar button / "Create Project from Template..."  ->  createProject(template)
  1. input box:  project name (default: template title)
  2. target:     first workspace folder, or a folder dialog if none is open
  3. scaffoldProject(entries, root, name)
       - check name, resolve ALL paths first (nothing is written if one is unsafe)
       - refuse if the folder already exists
       - write folders and files, replace {{name}}
```

## Design decisions

- **Storage: `context.globalState`**, not a file in the extension folder. The extension folder is replaced on every update, so data stored there would be lost.
- **Sidebar: native TreeView**, not a webview. It needs no HTML, follows the theme, and the buttons are declared in `package.json`.
- **One flat entries list** instead of separate `files` and `directories`.
- **Template titles are not commands.** VS Code cannot add Command Palette entries at runtime, so one command (`CreateFromTemplate`) lists all templates in a Quick Pick.
- **Webview security:** a Content Security Policy allows only the file's own inline script/style (via nonce). The editor's data is embedded as JSON with `<` escaped, and every message from the webview is normalized and validated again in the extension.
