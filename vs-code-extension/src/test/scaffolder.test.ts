import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { resolveInside, scaffoldProject, toFolderName, validateProjectName } from '../scaffolder';

/** Creates an empty temporary folder for one test. */
async function makeTempDir(): Promise<string> {
    return fs.mkdtemp(path.join(os.tmpdir(), 'default-projects-'));
}

suite('scaffolder', () => {
    suite('resolveInside', () => {
        const root = path.resolve('project-root');

        test('accepts nested paths and normalizes backslashes', () => {
            assert.strictEqual(resolveInside(root, 'src/main.py'), path.join(root, 'src', 'main.py'));
            assert.strictEqual(resolveInside(root, 'src\\main.py'), path.join(root, 'src', 'main.py'));
            assert.strictEqual(resolveInside(root, 'tests/'), path.join(root, 'tests'));
        });

        test('rejects paths that leave the project folder', () => {
            for (const bad of ['../evil.txt', 'a/../../evil.txt', '/etc/passwd', '..', '.', '']) {
                assert.throws(() => resolveInside(root, bad), `should reject "${bad}"`);
            }
        });

        test('allows ".." as long as the result stays inside', () => {
            assert.strictEqual(resolveInside(root, 'a/../b.txt'), path.join(root, 'b.txt'));
        });
    });

    suite('names', () => {
        test('validateProjectName', () => {
            assert.strictEqual(validateProjectName('my-project'), undefined);
            assert.strictEqual(validateProjectName('My Project 2'), undefined);
            for (const bad of ['', '   ', '.', '..', 'a/b', 'a\\b', 'a:b', 'a*b']) {
                assert.ok(validateProjectName(bad), `should reject "${bad}"`);
            }
        });

        test('toFolderName produces valid names', () => {
            assert.strictEqual(toFolderName('My API / v2'), 'My-API-v2');
            assert.strictEqual(toFolderName('   '), 'new-project');
            assert.strictEqual(validateProjectName(toFolderName('a/b:c*d')), undefined);
        });
    });

    suite('scaffoldProject', () => {
        test('creates files, nested folders and empty folders; replaces {{name}}', async () => {
            const root = await makeTempDir();
            const projectPath = await scaffoldProject(
                [
                    { path: 'README.md', content: '# {{name}} / {{name}}' },
                    { path: 'src/app/main.py', content: 'print(1)' },
                    { path: 'tests/', content: 'ignored' },
                ],
                root,
                'demo'
            );

            assert.strictEqual(projectPath, path.join(root, 'demo'));
            assert.strictEqual(await fs.readFile(path.join(projectPath, 'README.md'), 'utf8'), '# demo / demo');
            assert.strictEqual(await fs.readFile(path.join(projectPath, 'src', 'app', 'main.py'), 'utf8'), 'print(1)');
            assert.ok((await fs.stat(path.join(projectPath, 'tests'))).isDirectory());
        });

        test('refuses an existing folder and leaves it untouched', async () => {
            const root = await makeTempDir();
            await fs.mkdir(path.join(root, 'demo'));
            await fs.writeFile(path.join(root, 'demo', 'keep.txt'), 'keep');

            await assert.rejects(scaffoldProject([{ path: 'a.txt', content: 'x' }], root, 'demo'), /already exists/);
            assert.strictEqual(await fs.readFile(path.join(root, 'demo', 'keep.txt'), 'utf8'), 'keep');
        });

        test('an unsafe path aborts BEFORE anything is written', async () => {
            const root = await makeTempDir();
            await assert.rejects(
                scaffoldProject([{ path: 'ok.txt', content: 'x' }, { path: '../escape.txt', content: 'x' }], root, 'demo'),
                /inside the project folder/
            );
            assert.deepStrictEqual(await fs.readdir(root), []); // not even the project folder exists
        });

        test('rejects an invalid project name', async () => {
            const root = await makeTempDir();
            await assert.rejects(scaffoldProject([], root, '../x'), /must not contain/);
        });
    });
});
