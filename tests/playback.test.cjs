const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

// Run the shipped script through its DOM events with deterministic browser timers.
function player() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const frames = new Map();
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set(id === 'editor-view' ? ['active'] :
        id === 'countdown-overlay' ? ['hidden'] : []);
      const events = new Map();
      elements.set(id, {
        value: '', textContent: '', scrollTop: 0, scrollHeight: 10000, clientHeight: 600,
        style: { setProperty() {} },
        classList: {
          add: (...values) => values.forEach(value => classes.add(value)),
          remove: (...values) => values.forEach(value => classes.delete(value)),
          contains: value => classes.has(value),
          toggle(value, force = !classes.has(value)) {
            if (force) classes.add(value);
            else classes.delete(value);
          },
        },
        addEventListener(type, callback) { events.set(type, callback); },
        emit(type, event = {}) { events.get(type)?.(event); },
        focus() {},
      });
    }
    return elements.get(id);
  }
  function timer(callback, delay, repeat) {
    const id = nextId++;
    timers.set(id, { callback, delay, at: now + delay, repeat });
    return id;
  }
  const doc = element('document');
  runInNewContext(readFileSync(join(__dirname, '../app.js'), 'utf8'), {
    document: Object.assign(doc, {
      getElementById: element,
      querySelectorAll: () => [],
      querySelector: () => null,
      documentElement: element('html'),
    }),
    navigator: {},
    localStorage: { getItem: () => null, setItem() {} },
    setInterval: (callback, delay) => timer(callback, delay, true),
    clearInterval: id => timers.delete(id),
    setTimeout: (callback, delay) => timer(callback, delay, false),
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame(callback) {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: id => frames.delete(id),
  }, { filename: 'app.js' });
  element('script-input').value = 'Synthetic rehearsal\n'.repeat(100);
  return {
    element,
    frames,
    click: id => element(id).emit('click'),
    escape: () => doc.emit('keydown', { key: 'Escape', preventDefault() {} }),
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const due = [...timers].filter(([, value]) => value.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, value] = due;
        now = value.at;
        if (value.repeat) value.at += value.delay;
        else timers.delete(id);
        value.callback();
      }
      now = end;
    },
    frame(timestamp) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(timestamp));
    },
  };
}

test('a full countdown starts one scrolling loop and stop cancels it', () => {
  const app = player();
  app.click('btn-play');
  assert.equal(app.element('countdown-number').textContent, 3);
  app.advance(2000);
  assert.equal(app.element('countdown-number').textContent, 1);
  assert.equal(app.frames.size, 0);
  app.advance(1000);
  assert.ok(app.element('countdown-overlay').classList.contains('hidden'));
  assert.equal(app.frames.size, 1);
  app.frame(100);
  app.frame(1100);
  assert.ok(app.element('scroll-container').scrollTop > 0);
  app.click('btn-stop');
  assert.equal(app.frames.size, 0);
  assert.ok(app.element('editor-view').classList.contains('active'));
});

for (const action of ['Escape', 'stop button']) {
  test(`${action} during countdown leaves no delayed playback`, () => {
    const app = player();
    app.click('btn-play');
    app.advance(1000);
    if (action === 'Escape') app.escape();
    else app.click('btn-stop');
    assert.ok(app.element('countdown-overlay').classList.contains('hidden'));
    app.advance(5000);
    assert.equal(app.frames.size, 0);
    assert.ok(app.element('editor-view').classList.contains('active'));
    assert.equal(app.element('scroll-container').scrollTop, 0);
  });
}

test('restarting after cancellation waits for the new three-second countdown', () => {
  const app = player();
  app.click('btn-play');
  app.advance(1300);
  app.escape();
  app.click('btn-play');
  app.advance(1700); // The cancelled countdown would have fired here.
  assert.equal(app.frames.size, 0);
  assert.equal(app.element('countdown-overlay').classList.contains('hidden'), false);
  app.advance(1300);
  assert.ok(app.element('countdown-overlay').classList.contains('hidden'));
  assert.equal(app.frames.size, 1);
  app.advance(5000);
  assert.equal(app.frames.size, 1);
});

test('a replacement countdown cannot leave a second scrolling loop', () => {
  const app = player();
  app.click('btn-play');
  app.advance(1000);
  app.click('btn-play');
  app.advance(2000);
  assert.equal(app.frames.size, 0);
  app.advance(1000);
  assert.equal(app.frames.size, 1);
  app.advance(5000);
  assert.equal(app.frames.size, 1);
});
