/**
 * @module templateTree
 * @description The sidebar list ("central overview") of all saved templates.
 *
 * A native tree view is used instead of a webview: it needs no HTML, follows
 * the VS Code theme automatically, and the buttons (create / edit / delete)
 * are declared in `package.json` under `menus`.
 */

import * as vscode from 'vscode';
import { ProjectTemplate, TemplateStore } from './templates';

/** Maximum number of paths shown in a tooltip. */
const TOOLTIP_LIMIT = 15;

export class TemplateTreeProvider implements vscode.TreeDataProvider<ProjectTemplate> {
    private readonly changeEmitter = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.changeEmitter.event;

    constructor(private readonly store: TemplateStore) {
        // Redraw the list whenever a template is saved or deleted.
        store.onChange(() => this.changeEmitter.fire());
    }

    getTreeItem(template: ProjectTemplate): vscode.TreeItem {
        const item = new vscode.TreeItem(template.name, vscode.TreeItemCollapsibleState.None);
        item.id = template.id;
        item.iconPath = new vscode.ThemeIcon('folder');
        item.description = `${template.entries.length} ${template.entries.length === 1 ? 'entry' : 'entries'}`;

        const paths = template.entries.slice(0, TOOLTIP_LIMIT).map((entry) => entry.path);
        const more = template.entries.length - paths.length;
        item.tooltip = paths.join('\n') + (more > 0 ? `\n… and ${more} more` : '');

        // The menus in package.json match on this value ("viewItem == template").
        item.contextValue = 'template';
        return item;
    }

    /** The list is flat, so only the (invisible) root has children. */
    getChildren(element?: ProjectTemplate): ProjectTemplate[] {
        return element ? [] : this.store.list();
    }
}
