// Run with NODE_PATH pointing to a local jsdom installation, then node --test this file.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const root = join(__dirname, '../cenima/src/main/resources/static');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate); };

async function scene({ guest = false, conflict = false, noShowtimes = false } = {}) {
  const dom = new JSDOM(readFileSync(join(root, 'index.html'), 'utf8'), {
    url: 'http://localhost/#my-tickets', runScripts: 'outside-only',
  });
  const w = dom.window;
  const calls = [];
  let booked = false, taken = false;
  const movie = { id: 4, title: 'Local movie', duration: 120, status: 1, releaseDate: '2099-01-01' };
  const show = { id: 12, startTime: '2099-01-02T19:30:00', roomName: 'Room 1', price: 100000 };
  const ticket = { ticketId: 91, ticketCode: 'ticket-code', movieTitle: movie.title,
    startTime: show.startTime, roomName: show.roomName, seatCode: 'A1', status: 'UNUSED' };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function (value) {
    if (value !== undefined) this.returnValue = value;
    this.open = false;
    this.dispatchEvent(new w.Event('close'));
  };
  w.requestAnimationFrame = (fn) => { fn(); return 0; };
  w.fetch = async () => ({ ok: true, json: async () => ({ movies: [
    { ...movie, id: 'ncc-44', title: 'NCC reference', sourceId: 44 },
  ] }) });
  w.Space = {
    ready: Promise.resolve(), me: guest ? null : { role: 'USER' },
    escape: (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    money: (n) => `${n} VND`, date: (s) => s.slice(0, 10), poster: () => '/assets/poster-1.jpg', toast: () => {},
    api: async (path, options = {}) => {
      calls.push({ path, options });
      if (path === '/api/movies?status=1') return [movie];
      if (path === '/api/movies?status=2') return [];
      if (path === '/api/movies/4/showtimes') return noShowtimes ? [] : [show];
      if (path === '/api/showtimes/12/seats') return [
        { seatId: 8, rowName: 'A', seatNumber: 1, seatType: 'STANDARD', status: taken ? 'BOOKED' : 'AVAILABLE' },
        { seatId: 9, rowName: 'A', seatNumber: 2, seatType: 'VIP', status: 'AVAILABLE' },
      ];
      if (path === '/api/account/tickets') return booked ? [ticket] : [];
      if (path === '/api/bookings') {
        if (conflict) { taken = true; throw Object.assign(new Error('Seat conflict'), { status: 409 }); }
        booked = true; return { totalPrice: 100000, tickets: [ticket] };
      }
      if (path === '/api/tickets/91') return ticket;
      if (path === '/api/tickets/algorithms') return ['RS256', 'ES256', 'EdDSA', 'ML-DSA-44']
        .map((algorithm) => ({ algorithm, available: true }));
      if (path === '/api/tickets/91/token') return { ticket, algorithm: options.body.algorithm,
        token: 'signed.ticket.token', expiresAt: '2099-01-02T14:30:00Z',
        qr: { mode: 'JWT', pngBase64: 'aW1hZ2U=' } };
      throw new Error(`Unexpected request: ${path}`);
    },
  };
  w.eval(readFileSync(join(root, 'assets/ticket-qr.js'), 'utf8'));
  await w.eval(readFileSync(join(root, 'assets/home.js'), 'utf8'));
  await flush();
  const el = (id) => w.document.getElementById(id);
  async function chooseSeat() {
    el('booking-movie').value = '4';
    el('booking-movie').dispatchEvent(new w.Event('change'));
    el('ticket-booking-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await flush();
    w.document.querySelector('[data-showtime="12"]').click();
    await flush();
    w.document.querySelector('[data-seat="8"]').click();
    el('book').click();
    await flush();
  }
  return { w, el, calls, chooseSeat, close: () => dom.window.close() };
}

test('My tickets books a local film only after confirmation, refreshes on the same hash, then opens signed QR', async () => {
  const s = await scene();
  try {
    assert.equal(s.el('ticket-booking').hidden, false);
    assert.equal(s.el('booking-movie').options.length, 2);
    assert.match(s.el('booking-movie').textContent, /Local movie/);
    assert.doesNotMatch(s.el('booking-movie').textContent, /NCC/);
    await s.chooseSeat();
    assert.equal(s.el('booking-confirm-dialog').open, true);
    assert.match(s.el('booking-confirm-summary').textContent, /A1/);
    s.el('booking-confirm-dialog').close('cancel');
    await flush();
    assert.equal(s.calls.filter((c) => c.path === '/api/bookings').length, 0);
    s.el('book').click(); await flush();
    s.el('booking-confirm-dialog').close('confirm'); await flush();
    const booking = s.calls.find((c) => c.path === '/api/bookings');
    assert.equal(booking.options.method, 'POST');
    assert.equal(JSON.stringify(booking.options.body), JSON.stringify({ showtimeId: 12, seatIds: [8] }));
    assert.equal(s.w.location.hash, '#my-tickets');
    assert.match(s.el('tickets-grid').textContent, /Local movie/);
    assert.ok(s.calls.filter((c) => c.path === '/api/account/tickets').length >= 2);
    s.w.document.querySelector('[data-qr="91"]').click(); await flush();
    assert.equal(s.el('qr-dialog').open, true);
    assert.ok(!s.calls.some((c) => c.path === '/api/tickets/91/token'));
    s.el('qr-algorithm').value = 'ES256';
    s.el('qr-algorithm').dispatchEvent(new s.w.Event('change'));
    s.el('qr-issue').click(); await flush();
    assert.match(s.el('qr-result').textContent, /ES256/);
    assert.equal(s.w.document.querySelector('#qr-content a').download, 'star-cinema-ticket-91.png');
    assert.equal(s.calls.find((c) => c.path === '/api/tickets/91/token').options.body.algorithm, 'ES256');
  } finally { s.close(); }
});

test('A seat conflict refreshes availability and requires the user to select seats again', async () => {
  const s = await scene({ conflict: true });
  try {
    await s.chooseSeat();
    s.el('booking-confirm-dialog').close('confirm'); await flush();
    assert.equal(s.w.document.querySelector('[data-seat="8"]').disabled, true);
    assert.equal(s.el('book').disabled, true);
    assert.equal(s.el('booking-message').hidden, false);
    assert.equal(s.calls.filter((c) => c.path === '/api/bookings').length, 1);
  } finally { s.close(); }
});

test('An unauthenticated visitor sees login instead of booking controls or private tickets', async () => {
  const s = await scene({ guest: true });
  try {
    assert.equal(s.el('tickets-auth').hidden, false);
    assert.equal(s.el('ticket-booking').hidden, true);
    assert.ok(!s.calls.some((c) => c.path === '/api/account/tickets'));
  } finally { s.close(); }
});

test('A film without future showtimes offers no seat selection or confirmation', async () => {
  const s = await scene({ noShowtimes: true });
  try {
    s.el('booking-movie').value = '4';
    s.el('ticket-booking-form').dispatchEvent(new s.w.Event('submit', { cancelable: true }));
    await flush();
    assert.equal(s.w.document.querySelectorAll('[data-showtime]').length, 0);
    assert.equal(s.el('book'), null);
    assert.match(s.el('showtimes').textContent, /Star Cinema/);
    assert.equal(s.el('booking-confirm-dialog').open, false);
    assert.ok(!s.calls.some((c) => c.path === '/api/bookings'));
  } finally { s.close(); }
});
