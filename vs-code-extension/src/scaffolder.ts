/**
 * @module scaffolder
 * @description Pure file-system logic for creating a project from a list of
 * template entries. This module deliberately does NOT import `vscode`, so it
 * can be unit-tested with plain Node.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * One line of a template.
 * - A normal path (`src/main.py`) is a file and uses `content`.
 * - A path ending with `/` (`tests/`) is an empty folder; `content` is ignored.
 */
export interface TemplateEntry {
    path: string;
    content: string;
}

/** Characters that are not allowed in a project folder name (Windows is the strictest OS). */
const INVALID_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/;

/** Placeholder that is replaced by the project name inside file contents. */
const NAME_PLACEHOLDER = '{{name}}';

/** Returns true if the entry path describes a folder (it ends with `/` or `\`). */
export function isFolderEntry(entryPath: string): boolean {
    return /[\\/]$/.test(entryPath.trim());
}

/**
 * Resolves `relativePath` against `root` and makes sure the result stays
 * inside `root`. This blocks `../` tricks and absolute paths.
 *
 * @param root Absolute path of the project folder.
 * @param relativePath Path from a template entry.
 * @returns The absolute target path.
 * @throws If the path is empty, absolute, or points outside `root`.
 */
export function resolveInside(root: string, relativePath: string): string {
    const cleaned = relativePath.trim().replace(/\\/g, '/');
    if (cleaned === '') {
        throw new Error('A path must not be empty.');
    }
    const target = path.resolve(root, cleaned);
    const relative = path.relative(root, target);
    const escapes = relative === '' || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative);
    if (escapes) {
        throw new Error(`The path "${relativePath}" must be a relative path inside the project folder.`);
    }
    return target;
}

/**
 * Checks a project folder name.
 * @returns An error message, or `undefined` if the name is fine.
 */
export function validateProjectName(name: string): string | undefined {
    const trimmed = name.trim();
    if (trimmed === '') {
        return 'Please enter a project name.';
    }
    if (trimmed === '.' || trimmed === '..' || INVALID_NAME_CHARS.test(trimmed)) {
        return 'The name must not contain / \\ : * ? " < > | and must not be "." or "..".';
    }
    return undefined;
}

/**
 * Turns a template title into a valid default folder name
 * ("My API / v2" becomes "My-API-v2").
 */
export function toFolderName(title: string): string {
    const cleaned = title
        .replace(/[<>:"/\\|?*\u0000-\u001f\s]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned === '' ? 'new-project' : cleaned;
}

/** Returns true if something already exists at `target`. */
async function exists(target: string): Promise<boolean> {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

/**
 * Creates `<rootPath>/<projectName>` and fills it with the template entries.
 *
 * Safety rules:
 * - All paths are checked BEFORE anything is written, so a bad entry never
 *   leaves a half-created project behind.
 * - An existing folder is never overwritten.
 *
 * Every `{{name}}` inside a file's content is replaced by the project name.
 *
 * @param entries The template entries (files and folders).
 * @param rootPath Absolute path of the folder in which the project is created.
 * @param projectName Name of the new project folder.
 * @returns The absolute path of the new project.
 */
export async function scaffoldProject(entries: TemplateEntry[], rootPath: string, projectName: string): Promise<string> {
    const nameError = validateProjectName(projectName);
    if (nameError) {
        throw new Error(nameError);
    }
    const name = projectName.trim();
    const projectPath = path.join(rootPath, name);

    // Step 1: resolve and check every target up front.
    const targets = entries.map((entry) => ({
        target: resolveInside(projectPath, entry.path),
        isFolder: isFolderEntry(entry.path),
        content: entry.content,
    }));

    // Step 2: never touch an existing folder.
    if (await exists(projectPath)) {
        throw new Error(`The folder "${name}" already exists in ${rootPath}.`);
    }

    // Step 3: write.
    await fs.mkdir(projectPath, { recursive: true });
    for (const { target, isFolder, content } of targets) {
        if (isFolder) {
            await fs.mkdir(target, { recursive: true });
        } else {
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, content.split(NAME_PLACEHOLDER).join(name), 'utf8');
        }
    }
    return projectPath;
}
