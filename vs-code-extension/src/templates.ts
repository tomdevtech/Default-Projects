/**
 * @module templates
 * @description Template data model, validation and persistence. Like
 * `scaffolder`, this module does not import `vscode` (the storage is injected),
 * so it can be tested with plain Node.
 */

import * as path from 'path';
import { TemplateEntry, isFolderEntry, resolveInside } from './scaffolder';

/** A reusable project skeleton that the user defined in the editor. */
export interface ProjectTemplate {
    /** Stable internal ID; stays the same when the template is renamed. */
    id: string;
    /** Title shown in lists and in the Quick Pick. Unique (case-insensitive). */
    name: string;
    /** Files and folders of the project, see {@link TemplateEntry}. */
    entries: TemplateEntry[];
}

/** The built-in template behind the "Create Python Project" command. */
export const PYTHON_TEMPLATE: ProjectTemplate = {
    id: 'builtin-python',
    name: 'python-project',
    entries: [
        { path: 'requirements.txt', content: 'fastapi' },
        { path: 'pyproject.toml', content: '[tool.poetry]\nname = "my-project"\nversion = "0.1.0"\ndescription = "My Awesome Project"' },
        { path: 'src/main.py', content: 'print("Hello, Python Project!")' },
        { path: 'code-workspace.code-workspace', content: '{"folders": [{"path": "."}],"settings": {}}' },
        { path: 'README.md', content: '# Title of the Project\n\nThis project is about...\n\n## Installation\n\nInstructions to install the project.\n\n## Usage\n\nHow to use the project.' },
    ],
};

/** Content of the editor when the user starts a new template. */
export const NEW_TEMPLATE: ProjectTemplate = {
    id: '',
    name: '',
    entries: [
        { path: 'README.md', content: '# {{name}}\n' },
        { path: 'src/', content: '' },
    ],
};

/** Creates a short unique ID. */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Turns untrusted input (the message from the webview) into a clean template:
 * types are coerced, blank rows are dropped, backslashes become slashes and
 * folder entries lose their content. Missing IDs are generated.
 */
export function normalizeTemplate(raw: unknown): ProjectTemplate {
    const input = (raw ?? {}) as { id?: unknown; name?: unknown; entries?: unknown };
    const rawEntries = Array.isArray(input.entries) ? input.entries : [];

    const entries: TemplateEntry[] = rawEntries
        .map((entry: { path?: unknown; content?: unknown }) => ({
            path: String(entry?.path ?? '').trim().replace(/\\/g, '/'),
            content: String(entry?.content ?? ''),
        }))
        .filter((entry) => entry.path !== '')
        .map((entry) => (isFolderEntry(entry.path) ? { path: entry.path, content: '' } : entry));

    return {
        id: typeof input.id === 'string' && input.id !== '' ? input.id : generateId(),
        name: String(input.name ?? '').trim(),
        entries,
    };
}

/**
 * Validates a template before it is saved.
 *
 * @param template The (normalized) template.
 * @param existing All templates that are currently stored.
 * @returns An error message for the user, or `undefined` if everything is fine.
 */
export function validateTemplate(template: ProjectTemplate, existing: ProjectTemplate[]): string | undefined {
    if (template.name === '') {
        return 'Please enter a title for the template.';
    }
    const taken = existing.some((other) => other.id !== template.id && other.name.toLowerCase() === template.name.toLowerCase());
    if (taken) {
        return `A template named "${template.name}" already exists.`;
    }
    if (template.entries.length === 0) {
        return 'Add at least one file or folder.';
    }
    // Same safety check as when the project is created, but early, so the user gets feedback while editing.
    const dummyRoot = path.resolve('template-root');
    for (const entry of template.entries) {
        try {
            resolveInside(dummyRoot, entry.path);
        } catch (error) {
            return (error as Error).message;
        }
    }
    return undefined;
}

/**
 * Minimal key/value storage. `vscode.ExtensionContext.globalState` fits this
 * shape, and tests can pass a plain fake.
 */
export interface KeyValueStore {
    get<T>(key: string, defaultValue: T): T;
    update(key: string, value: unknown): PromiseLike<void>;
}

const STORAGE_KEY = 'templates';

/**
 * Stores all user templates.
 *
 * With `globalState` the data lives in VS Code's own storage: it survives
 * extension updates and is available in every window and workspace.
 */
export class TemplateStore {
    private readonly listeners: Array<() => void> = [];

    constructor(private readonly storage: KeyValueStore) {}

    /** All templates, sorted by title. */
    list(): ProjectTemplate[] {
        const all = this.storage.get<ProjectTemplate[]>(STORAGE_KEY, []);
        return [...all].sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Inserts a new template or replaces the one with the same ID. */
    async save(template: ProjectTemplate): Promise<void> {
        const others = this.list().filter((t) => t.id !== template.id);
        await this.storage.update(STORAGE_KEY, [...others, template]);
        this.notify();
    }

    /** Deletes the template with the given ID (no error if it does not exist). */
    async remove(id: string): Promise<void> {
        await this.storage.update(STORAGE_KEY, this.list().filter((t) => t.id !== id));
        this.notify();
    }

    /** Registers a callback that runs after every change (used to refresh the sidebar). */
    onChange(listener: () => void): void {
        this.listeners.push(listener);
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener());
    }
}
