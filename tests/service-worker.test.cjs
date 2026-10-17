const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

function worker(cacheNames = []) {
  const stores = new Map(cacheNames.map(name => [name, new Map()]));
  const handlers = new Map();
  const deleted = [];
  let networkRequests = 0;
  runInNewContext(readFileSync(join(__dirname, '../sw.js'), 'utf8'), {
    self: {
      addEventListener: (type, callback) => handlers.set(type, callback),
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      async keys() { return [...stores.keys()]; },
      async delete(name) { deleted.push(name); return stores.delete(name); },
      async open(name) {
        if (!stores.has(name)) stores.set(name, new Map());
        return {
          async addAll(assets) {
            for (const asset of assets) stores.get(name).set(asset, `cached:${asset}`);
          },
        };
      },
      async match(request) {
        for (const cache of stores.values()) {
          if (cache.has(request)) return cache.get(request);
        }
      },
    },
    async fetch() { networkRequests++; throw new Error('offline'); },
  }, { filename: 'sw.js' });
  return {
    stores,
    deleted,
    networkRequests: () => networkRequests,
    dispatch(type, properties = {}) {
      let completion;
      handlers.get(type)({
        ...properties,
        waitUntil(promise) { completion = promise; },
        respondWith(promise) { completion = promise; },
      });
      return completion;
    },
  };
}

test('activation removes only old strictly versioned teleprompter caches', async () => {
  const preserved = [
    'teleprompter-v3',
    'unrelated-synthetic-cache',
    'synthetic-other-app-v7',
    'teleprompter-v2-assets',
    'teleprompter-vthree',
    'teleprompter-v',
    'prefix-teleprompter-v2',
    'teleprompter-v2\n',
  ];
  const app = worker(['teleprompter-v1', 'teleprompter-v2', ...preserved]);
  await app.dispatch('activate');
  assert.deepEqual(app.deleted.sort(), ['teleprompter-v1', 'teleprompter-v2']);
  assert.deepEqual([...app.stores.keys()].sort(), [...preserved].sort());
});

test('current cached assets remain available offline after install and activation', async () => {
  const app = worker(['teleprompter-v2', 'unrelated-synthetic-cache']);
  await app.dispatch('install');
  await app.dispatch('activate');
  assert.equal(app.stores.has('teleprompter-v2'), false);
  for (const request of ['./', './index.html', './app.js', './manifest.json']) {
    assert.equal(await app.dispatch('fetch', { request }), `cached:${request}`);
  }
  assert.equal(app.networkRequests(), 0);
});
