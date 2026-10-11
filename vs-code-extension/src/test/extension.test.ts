import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface Manifest {
    publisher: string;
    name: string;
    contributes?: {
        commands?: { command: string; title: string }[];
        viewsContainers?: { activitybar?: { id: string }[] };
        views?: Record<string, { id: string }[]>;
    };
}

// The compiled file lives in out/test/, the manifest is two levels up.
const manifest: Manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')
);
const extensionId = `${manifest.publisher}.${manifest.name}`;

suite('Extension (runs inside VS Code)', () => {
    let extension: vscode.Extension<unknown>;

    suiteSetup(async function () {
        this.timeout(30000);
        const found = vscode.extensions.getExtension(extensionId);
        assert.ok(found, `extension "${extensionId}" should be loaded in the test host`);
        extension = found;
        await extension.activate();
    });

    test('activates without errors', () => {
        assert.strictEqual(extension.isActive, true);
    });

    test('manifest declares commands with titles', () => {
        const commands = manifest.contributes?.commands ?? [];
        assert.ok(commands.length > 0, 'package.json should declare at least one command');
        for (const cmd of commands) {
            assert.ok(cmd.title && cmd.title.trim().length > 0, `command "${cmd.command}" needs a title`);
        }
    });

    test('registers every command declared in package.json', async () => {
        const declared = (manifest.contributes?.commands ?? []).map((c) => c.command);
        const registered = new Set(await vscode.commands.getCommands(true));
        for (const id of declared) {
            assert.ok(registered.has(id), `command "${id}" is declared but not registered`);
        }
    });

    test('manifest declares the Activity Bar container and a view', () => {
        const containers = manifest.contributes?.viewsContainers?.activitybar ?? [];
        assert.ok(containers.length > 0, 'an Activity Bar container should be declared');

        const views = manifest.contributes?.views ?? {};
        const containerIds = new Set(containers.map((c) => c.id));
        const hasViewInContainer = Object.entries(views).some(
            ([containerId, list]) => containerIds.has(containerId) && list.length > 0
        );
        assert.ok(hasViewInContainer, 'the Activity Bar container should contain at least one view');
    });
});