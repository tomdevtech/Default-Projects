import * as assert from 'assert';
import { KeyValueStore, PYTHON_TEMPLATE, ProjectTemplate, TemplateStore, normalizeTemplate, validateTemplate } from '../templates';

/** In-memory replacement for VS Code's globalState. */
class FakeStorage implements KeyValueStore {
    data = new Map<string, unknown>();
    get<T>(key: string, defaultValue: T): T {
        return (this.data.has(key) ? this.data.get(key) : defaultValue) as T;
    }
    async update(key: string, value: unknown): Promise<void> {
        this.data.set(key, value);
    }
}

const make = (id: string, name: string): ProjectTemplate => ({ id, name, entries: [{ path: 'a.txt', content: '' }] });

suite('templates', () => {
    suite('normalizeTemplate', () => {
        test('cleans untrusted input', () => {
            const result = normalizeTemplate({
                id: '',
                name: '  My Tpl  ',
                entries: [
                    { path: ' src\\main.py ', content: 'x' },
                    { path: '   ', content: 'dropped (blank path)' },
                    { path: 'docs/', content: 'folder content is removed' },
                    { content: 'dropped (no path)' },
                ],
            });
            assert.strictEqual(result.name, 'My Tpl');
            assert.ok(result.id.length > 0, 'an ID is generated');
            assert.deepStrictEqual(result.entries, [
                { path: 'src/main.py', content: 'x' },
                { path: 'docs/', content: '' },
            ]);
        });

        test('survives garbage', () => {
            for (const garbage of [undefined, null, 42, 'text', { entries: 'nope' }]) {
                const result = normalizeTemplate(garbage);
                assert.deepStrictEqual(result.entries, []);
            }
        });

        test('keeps an existing ID', () => {
            assert.strictEqual(normalizeTemplate({ id: 'abc', name: 'x', entries: [] }).id, 'abc');
        });
    });

    suite('validateTemplate', () => {
        test('accepts a good template, including the built-in Python one', () => {
            assert.strictEqual(validateTemplate(make('1', 'Good'), []), undefined);
            assert.strictEqual(validateTemplate(PYTHON_TEMPLATE, []), undefined);
        });

        test('rejects empty title, no entries and unsafe paths', () => {
            assert.ok(validateTemplate(make('1', ''), []));
            assert.ok(validateTemplate({ id: '1', name: 'x', entries: [] }, []));
            assert.ok(validateTemplate({ id: '1', name: 'x', entries: [{ path: '../x', content: '' }] }, []));
            assert.ok(validateTemplate({ id: '1', name: 'x', entries: [{ path: '/abs', content: '' }] }, []));
        });

        test('titles are unique (case-insensitive), but a template may keep its own title', () => {
            const existing = [make('1', 'Alpha')];
            assert.ok(validateTemplate(make('2', 'alpha'), existing));
            assert.strictEqual(validateTemplate(make('1', 'Alpha'), existing), undefined);
        });
    });

    suite('TemplateStore', () => {
        test('save inserts and replaces by ID; list is sorted by title', async () => {
            const store = new TemplateStore(new FakeStorage());
            await store.save(make('2', 'Beta'));
            await store.save(make('1', 'Alpha'));
            await store.save(make('2', 'Beta renamed'));

            assert.deepStrictEqual(store.list().map((t) => t.name), ['Alpha', 'Beta renamed']);
        });

        test('remove deletes by ID and ignores unknown IDs', async () => {
            const store = new TemplateStore(new FakeStorage());
            await store.save(make('1', 'Alpha'));
            await store.remove('does-not-exist');
            assert.strictEqual(store.list().length, 1);
            await store.remove('1');
            assert.strictEqual(store.list().length, 0);
        });

        test('notifies listeners after every change', async () => {
            const store = new TemplateStore(new FakeStorage());
            let calls = 0;
            store.onChange(() => calls++);
            await store.save(make('1', 'Alpha'));
            await store.remove('1');
            assert.strictEqual(calls, 2);
        });
    });
});
