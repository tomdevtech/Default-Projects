# Publishing checklist

## 1. Fill in the placeholders (once)

| File | Field | Change to |
| --- | --- | --- |
| `package.json` | `publisher` | your Marketplace publisher ID |
| `package.json` | `repository.url` | your repository (or remove the field) |
| `LICENSE` | `YOUR NAME` | your name (or replace the license, and adjust `license` in `package.json`) |

## 2. Check the build

```bash
npm install
npm test                     # compile + unit tests
```

## 3. Manual test in VS Code (F5)

Unit tests cover the logic, but not the VS Code UI. Press **F5** and go through this list in the Extension Development Host:

- [ ] The *Default Projects* icon appears in the Activity Bar; the empty list shows the welcome text with two links.
- [ ] `+` opens the editor. Saving with an empty title shows an error and keeps the editor open.
- [ ] Save a template with a file, a nested file (`src/app/x.py`) and a folder (`docs/`). The sidebar list updates.
- [ ] Saving a second template with the same title (different case) is rejected.
- [ ] Create-project button: name prompt -> project appears in the workspace with the right structure; `{{name}}` is replaced.
- [ ] Creating the same project name again shows "already exists" and changes nothing.
- [ ] A template with the path `../x.txt` is rejected when saving.
- [ ] Edit button opens the editor with the saved data; renaming works.
- [ ] Delete button asks for confirmation, then the entry disappears.
- [ ] Command Palette: all five commands under *Default Projects* work; `Create Project from Template...` shows the Quick Pick.
- [ ] Without an open folder: the folder dialog appears.
- [ ] `Create Python Project` still works.
- [ ] Restart the window: templates are still there.

## 4. Package and try the real install

```bash
npx vsce package             # creates default-projects-0.1.0.vsix
code --install-extension default-projects-0.1.0.vsix
```

## 5. Publish

One-time setup (see the [official guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)):

1. Create a publisher at <https://marketplace.visualstudio.com/manage> (log in with a Microsoft account).
2. Create a Personal Access Token in Azure DevOps: *New Token*, scope **Marketplace -> Manage**.
3. `npx vsce login <publisher id>` and paste the token.

Then:

```bash
npx vsce publish             # publishes the version from package.json
```

For later releases: update `CHANGELOG.md`, then `npx vsce publish patch` (or `minor` / `major`), which also bumps the version.

## Common problems

- **Publish is rejected / "not authorized"** - `publisher` in `package.json` is still the placeholder `your-publisher-id`; it must match your Marketplace publisher ID exactly.
- **"Make sure to edit the README.md"** - `vsce` rejects the unchanged template README; this project already has a real one.
- **Warning about `repository`** - add the `repository` field, or answer the prompt to continue.
- **`@types/vscode` newer than `engines.vscode`** - keep `@types/vscode` pinned to the minimum version in `engines.vscode`.
- **Extension does not show up after publishing** - the Marketplace verifies new extensions; this can take a few minutes.
