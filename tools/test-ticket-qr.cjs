const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const root = join(__dirname, '../cenima/src/main/resources/static');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate); };
const algorithms = ['RS256', 'ES256', 'EdDSA', 'ML-DSA-44'];

function scene({ unavailable = [], none = false, loadError = false, issueError = false, deferred = false,
  responseAlgorithm, status = 'UNUSED' } = {}) {
  const dom = new JSDOM(readFileSync(join(root, 'index.html'), 'utf8'), {
    url: 'http://localhost/#my-tickets', runScripts: 'outside-only',
  });
  const w = dom.window, calls = [], pending = [];
  let failLoad = loadError;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false; this.dispatchEvent(new w.Event('close'));
  };
  const ticket = (id) => ({ ticketId: Number(id), ticketCode: `ticket-${id}`, movieTitle: '<Movie title>',
    startTime: '2099-01-02T19:30:00', roomName: 'Room 1', seatCode: 'A1', status });
  const response = (id, algorithm) => ({ ticket: ticket(id), algorithm: responseAlgorithm || algorithm,
    token: `header.${algorithm}.signature`, expiresAt: '2099-01-02T14:30:00Z',
    qr: { mode: algorithm === 'ML-DSA-44' ? 'REFERENCE' : 'JWT', pngBase64: 'aW1hZ2U=' } });
  w.Space = { date: (v) => v.slice(0, 10), api: async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/tickets/algorithms') {
      if (failLoad) { failLoad = false; throw new Error('Load failed'); }
      return algorithms.map((algorithm) => ({ algorithm, available: !none && !unavailable.includes(algorithm) }));
    }
    const match = url.match(/^\/api\/tickets\/(\d+)(\/token)?$/);
    if (!match) throw Error(`Unexpected request: ${url}`);
    if (!match[2]) return ticket(match[1]);
    if (issueError) throw Object.assign(new Error('Provider unavailable'), { status: 503 });
    if (deferred) return new Promise((resolve, reject) => pending.push({
      resolve: () => resolve(response(match[1], options.body.algorithm)), reject,
    }));
    return response(match[1], options.body.algorithm);
  }};
  w.eval(readFileSync(join(root, 'assets/ticket-qr.js'), 'utf8'));
  const el = (id) => w.document.getElementById(id);
  const choose = (algorithm) => { el('qr-algorithm').value = algorithm; el('qr-algorithm').dispatchEvent(new w.Event('change')); };
  const issue = () => el('qr-issue').click();
  const posts = () => calls.filter((c) => c.url.endsWith('/token'));
  return { w, calls, pending, el, choose, issue, posts, open: (id = 91) => w.TicketQr.open(id), close: () => dom.window.close() };
}

test('Opening shows API availability without issuing; each explicit choice renders exactly one matching QR', async () => {
  const s = scene();
  try {
    await s.open();
    assert.equal(s.posts().length, 0);
    assert.equal(s.el('qr-algorithm').options.length, 4);
    for (const algorithm of algorithms) {
      s.choose(algorithm);
      assert.equal(s.el('qr-result').hidden, true);
      assert.equal(s.w.document.querySelectorAll('#qr-content img').length, 0);
      s.issue(); await flush();
      assert.equal(s.posts().at(-1).options.body.algorithm, algorithm);
      assert.equal(s.w.document.querySelectorAll('#qr-content img').length, 1);
      assert.match(s.el('qr-result').textContent, new RegExp(algorithm));
      assert.equal(s.w.document.querySelector('#qr-result textarea').value, `header.${algorithm}.signature`);
      assert.ok(!s.w.document.querySelector('#qr-result movie'));
      assert.ok(s.el('qr-result').textContent.includes('<Movie title>'));
    }
    assert.match(s.el('qr-result').textContent, /mã tham chiếu/);
    assert.equal(s.posts().length, 4);
    s.el('qr-dialog').close();
    assert.equal(s.el('qr-content').children.length, 0);
    await s.open();
    assert.equal(s.el('qr-result').hidden, true);
    assert.equal(s.posts().length, 4);
  } finally { s.close(); }
});

test('Unavailable algorithms are disabled; first available is selected without RS256 fallback', async () => {
  const s = scene({ unavailable: ['RS256', 'ML-DSA-44'] });
  try {
    await s.open();
    assert.equal(s.el('qr-algorithm').options[0].disabled, true);
    assert.equal(s.el('qr-algorithm').options[3].disabled, true);
    assert.equal(s.el('qr-algorithm').value, 'ES256');
    s.issue(); await flush();
    assert.equal(s.posts()[0].options.body.algorithm, 'ES256');
  } finally { s.close(); }
});

test('No available providers or an unusable ticket prevents issuing', async () => {
  for (const config of [{ none: true }, { status: 'USED' }, { status: 'CANCELLED' }]) {
    const s = scene(config);
    try {
      await s.open();
      assert.equal(s.el('qr-issue').disabled, true);
      assert.equal(s.el('qr-algorithm').disabled, true);
      s.issue(); assert.equal(s.posts().length, 0);
    } finally { s.close(); }
  }
});

test('A load error requires retry and does not issue automatically', async () => {
  const s = scene({ loadError: true });
  try {
    await s.open();
    assert.match(s.el('qr-message').textContent, /Load failed/);
    assert.equal(s.el('qr-issue').disabled, true);
    assert.equal(s.el('qr-retry').hidden, false);
    s.el('qr-retry').click(); await flush();
    assert.equal(s.el('qr-issue').disabled, false);
    assert.equal(s.posts().length, 0);
  } finally { s.close(); }
});

test('A provider error or mismatched response shows no QR and never silently retries RS256', async () => {
  for (const config of [{ issueError: true }, { responseAlgorithm: 'RS256' }]) {
    const s = scene(config);
    try {
      await s.open(); s.choose('ML-DSA-44'); s.issue(); await flush();
      assert.equal(s.posts().length, 1);
      assert.equal(s.el('qr-result').hidden, true);
      assert.equal(s.el('qr-issue').disabled, false);
      assert.equal(s.w.document.querySelectorAll('#qr-content img').length, 0);
    } finally { s.close(); }
  }
});

test('Duplicate clicks are blocked and an old algorithm response cannot overwrite the new QR', async () => {
  const s = scene({ deferred: true });
  try {
    await s.open(); s.issue(); s.issue();
    assert.equal(s.posts().length, 1);
    s.choose('EdDSA'); s.issue();
    assert.equal(s.posts().length, 2);
    s.pending[1].resolve(); await flush();
    assert.match(s.el('qr-result').textContent, /EdDSA/);
    s.pending[0].resolve(); await flush();
    assert.match(s.el('qr-result').textContent, /EdDSA/);
    assert.equal(s.w.document.querySelectorAll('#qr-content img').length, 1);
  } finally { s.close(); }
});

test('Closing or switching tickets discards late issuance responses', async () => {
  const s = scene({ deferred: true });
  try {
    await s.open(); s.issue(); s.el('qr-dialog').close();
    s.pending[0].resolve(); await flush();
    assert.equal(s.el('qr-content').children.length, 0);
    await s.open(); s.issue();
    await s.open(92); s.choose('ML-DSA-44'); s.issue();
    s.pending[2].resolve(); await flush();
    s.pending[1].resolve(); await flush();
    assert.match(s.el('qr-result').textContent, /ticket-92/);
    assert.doesNotMatch(s.el('qr-result').textContent, /ticket-91/);
  } finally { s.close(); }
});
