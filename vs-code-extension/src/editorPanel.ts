/**
 * @module editorPanel
 * @description The template editor: a webview panel in which the user enters a
 * title and the project structure, and saves it.
 *
 * Data flow:
 *  1. The initial template is embedded into `media/editor.html`.
 *  2. The webview sends `{ command: 'save', template }` when the user clicks "Save".
 *  3. The extension normalizes and validates the data, stores it and closes the panel.
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { NEW_TEMPLATE, ProjectTemplate, TemplateStore, normalizeTemplate, validateTemplate } from './templates';

/**
 * Builds the HTML of the editor from `media/editor.html`.
 * Inline script/style are allowed through a one-time nonce (Content Security Policy).
 */
async function buildHtml(extensionPath: string, webview: vscode.Webview, initial: ProjectTemplate): Promise<string> {
    const html = await fs.readFile(path.join(extensionPath, 'media', 'editor.html'), 'utf8');
    const nonce = crypto.randomBytes(16).toString('hex');

    // "<" is escaped so that file contents like "</script>" cannot break out of the script tag.
    const initialJson = JSON.stringify(initial).replace(/</g, '\\u003c');

    // The replacement is a function on purpose: a plain string would interpret "$&" and similar in the user's data.
    return html
        .replace(/%%NONCE%%/g, () => nonce)
        .replace(/%%CSP_SOURCE%%/g, () => webview.cspSource)
        .replace('%%INITIAL%%', () => initialJson);
}

/**
 * Opens the editor in a new tab.
 *
 * @param extensionPath Install folder of the extension (where `media/` lives).
 * @param store Where the template is saved.
 * @param template The template to edit; omit it to start a new one.
 */
export async function openTemplateEditor(extensionPath: string, store: TemplateStore, template?: ProjectTemplate): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
        'defaultProjectsEditor',
        template ? `Edit: ${template.name}` : 'New Template',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );
    panel.webview.html = await buildHtml(extensionPath, panel.webview, template ?? NEW_TEMPLATE);

    const subscription = panel.webview.onDidReceiveMessage(async (message: { command?: string; template?: unknown }) => {
        if (message?.command !== 'save') {
            return;
        }
        const saved = normalizeTemplate(message.template);
        const error = validateTemplate(saved, store.list());
        if (error) {
            // Keep the panel open so the user can fix the problem.
            vscode.window.showErrorMessage(error);
            return;
        }
        await store.save(saved);
        vscode.window.showInformationMessage(`Template "${saved.name}" saved. Use "Default Projects: Create Project from Template" to create a project.`);
        panel.dispose();
    });
    panel.onDidDispose(() => subscription.dispose());
}
