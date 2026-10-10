# Default Projects

Create new projects from **your own templates**: define folders, files and file contents once, then create a fresh project from them with two clicks - from the sidebar, a Quick Pick or the Command Palette.

## Features

- **Template editor** - give a template a title and describe its structure (files, folders, content).
- **Sidebar overview** - the *Default Projects* icon in the Activity Bar lists all your templates. Create a project, edit or delete a template with the buttons next to each entry.
- **Command Palette** - everything is also available as a command (see below).
- **Built-in Python starter** - `Default Projects: Create Python Project` creates a small Python project (`requirements.txt`, `pyproject.toml`, `src/main.py`, `README.md`, workspace file).
- **Safe by design** - an existing folder is never overwritten, and a template can never write outside of the new project folder.

## Quick start

1. Click the **Default Projects** icon in the Activity Bar.
2. Click **+** (or run `Default Projects: New Template...`).
3. Enter a title, add your files and folders, and click **Save template**.
4. Create a project: click the **new-folder button** next to the template in the sidebar, or run `Default Projects: Create Project from Template...` and pick the template by its title.
5. Enter a project name. The project is created inside your open workspace folder (or in a folder you choose if none is open).

## Commands

All commands are available in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) under the category **Default Projects**:

| Command | What it does |
| --- | --- |
| `Create Python Project` | Creates the built-in Python starter project. |
| `New Template...` | Opens the template editor to define a new template. |
| `Create Project from Template...` | Lists your templates by title; creates a project from the one you pick. |
| `Edit Template...` | Opens a template in the editor. |
| `Delete Template...` | Deletes a template after confirmation. |

> **Why isn't there one palette entry per template?** VS Code only shows commands that are declared in an extension's manifest, so an extension cannot add new Command Palette entries at runtime. `Create Project from Template...` is the single entry point that lists every template by its title. You can bind a keyboard shortcut to it (*File > Preferences > Keyboard Shortcuts*).

## The template editor

A template is a list of **entries**. Each entry is one row:

| Path | Result |
| --- | --- |
| `src/main.py` | A file with the content you type below the path. Missing parent folders are created automatically. |
| `tests/` | An **empty folder** (a path that ends with `/`). |

Rules:

- Paths are relative to the project folder. Absolute paths and paths that leave the project (`../x`) are rejected.
- Titles are unique (not case-sensitive).
- Write `{{name}}` anywhere in a file's content: it is replaced by the project name you enter when creating the project.

**Example** - a template called "Notes":

| Path | Content |
| --- | --- |
| `README.md` | `# {{name}}` |
| `notes/` | |
| `notes/todo.md` | `- [ ] first task` |

Creating a project named `holiday` produces `holiday/README.md` (containing `# holiday`), `holiday/notes/` and `holiday/notes/todo.md`.

## Where are my templates stored?

In VS Code's global extension storage on your machine. They survive extension updates and are available in every window and workspace. They are not synchronized between computers.

## Development

```bash
npm install
npm run compile     # build once   (npm run watch: build on change)
npm test            # unit tests (no VS Code needed)
```

Press **F5** in VS Code to start an Extension Development Host with the extension loaded.

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (how the code is organized) and [docs/PUBLISHING.md](docs/PUBLISHING.md) (how to release).

## License

GENERAL PUBLIC LICENSE - see [LICENSE](LICENSE).
