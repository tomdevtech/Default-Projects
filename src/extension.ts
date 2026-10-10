/**
 * @module extension
 * @description Entry point of the "Default Projects" extension. It only wires
 * things together:
 *
 *  - `scaffolder.ts`    creates the files on disk
 *  - `templates.ts`     data model, validation and storage of the user templates
 *  - `templateTree.ts`  the sidebar list
 *  - `editorPanel.ts`   the editor UI for a template
 */

import * as vscode from 'vscode';
import { openTemplateEditor } from './editorPanel';
import { scaffoldProject, toFolderName, validateProjectName } from './scaffolder';
import { PYTHON_TEMPLATE, ProjectTemplate, TemplateStore } from './templates';
import { TemplateTreeProvider } from './templateTree';

/**
 * Lets the user choose one of the saved templates.
 * @returns The chosen template, or `undefined` if there are none or the user cancelled.
 */
async function pickTemplate(store: TemplateStore, placeHolder: string): Promise<ProjectTemplate | undefined> {
    const templates = store.list();
    if (templates.length === 0) {
        const action = await vscode.window.showInformationMessage('You have no templates yet.', 'New Template');
        if (action) {
            await vscode.commands.executeCommand('default-projects.CreateCustomProject');
        }
        return undefined;
    }
    const picked = await vscode.window.showQuickPick(
        templates.map((template) => ({ label: template.name, description: `${template.entries.length} entries`, template })),
        { placeHolder }
    );
    return picked?.template;
}

/**
 * Returns the folder in which new projects are created: the first workspace
 * folder, or - if no folder is open - a folder the user picks in a dialog.
 */
async function pickTargetFolder(): Promise<string | undefined> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        return workspaceFolder.uri.fsPath;
    }
    const picked = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Create project here',
    });
    return picked?.[0].fsPath;
}

/**
 * Asks for a project name and a target folder, then creates the project.
 * This one flow is used by the built-in Python command AND by all user templates.
 */
async function createProject(template: ProjectTemplate): Promise<void> {
    const name = await vscode.window.showInputBox({
        prompt: `Project name (folder to create from "${template.name}")`,
        value: toFolderName(template.name),
        validateInput: validateProjectName,
    });
    if (name === undefined) {
        return; // cancelled
    }
    const rootPath = await pickTargetFolder();
    if (rootPath === undefined) {
        return; // cancelled
    }

    try {
        const projectPath = await scaffoldProject(template.entries, rootPath, name);
        const action = await vscode.window.showInformationMessage(`Created project at ${projectPath}`, 'Open Folder');
        if (action) {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), { forceNewWindow: true });
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Could not create the project: ${(error as Error).message}`);
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const store = new TemplateStore(context.globalState);
    const tree = new TemplateTreeProvider(store);

    // When a command is started from a button in the sidebar, VS Code passes the
    // clicked template as argument. From the Command Palette there is no argument,
    // so we ask with a Quick Pick instead.
    const templateFrom = (argument: ProjectTemplate | undefined, placeHolder: string) =>
        argument ?? pickTemplate(store, placeHolder);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('defaultProjectsView', tree),

        // Step 1: built-in Python project.
        vscode.commands.registerCommand('default-projects.CreatePredefinedPythonProject', () => createProject(PYTHON_TEMPLATE)),

        // Step 2: custom templates.
        vscode.commands.registerCommand('default-projects.CreateCustomProject', () =>
            openTemplateEditor(context.extensionPath, store)
        ),

        vscode.commands.registerCommand('default-projects.CreateFromTemplate', async (argument?: ProjectTemplate) => {
            const template = await templateFrom(argument, 'Choose a template');
            if (template) {
                await createProject(template);
            }
        }),

        vscode.commands.registerCommand('default-projects.EditTemplate', async (argument?: ProjectTemplate) => {
            const template = await templateFrom(argument, 'Choose a template to edit');
            if (template) {
                await openTemplateEditor(context.extensionPath, store, template);
            }
        }),

        vscode.commands.registerCommand('default-projects.DeleteTemplate', async (argument?: ProjectTemplate) => {
            const template = await templateFrom(argument, 'Choose a template to delete');
            if (!template) {
                return;
            }
            const confirmed = await vscode.window.showWarningMessage(
                `Delete the template "${template.name}"?`,
                { modal: true },
                'Delete'
            );
            if (confirmed) {
                await store.remove(template.id);
            }
        })
    );
}

export function deactivate(): void {}
