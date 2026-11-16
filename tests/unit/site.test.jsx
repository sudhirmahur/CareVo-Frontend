import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { safeHref, assetUrl, tokenStore } from '../../src/lib/api.js';
import { Highlighted, liveValue } from '../../src/lib/site.jsx';

test('safeHref allows http(s), mailto, tel, in-site paths and anchors only', () => {
  assert.equal(safeHref('https://x.com/a'), 'https://x.com/a');
  assert.equal(safeHref('mailto:a@b.co'), 'mailto:a@b.co');
  assert.equal(safeHref('/jobs'), '/jobs');
  assert.equal(safeHref('#top'), '#top');
  assert.equal(safeHref('javascript:alert(1)'), '');
  assert.equal(safeHref(' JavaScript:alert(1)'), '');
  assert.equal(safeHref('//evil.com'), '');
  assert.equal(safeHref('data:text/html,x'), '');
  assert.equal(safeHref(null), '');
});

test('assetUrl: only /uploads/ is routed to the API origin; CDN and in-site paths untouched', () => {
  assert.equal(assetUrl('/logo.png'), '/logo.png');
  assert.equal(assetUrl('/uploads/media/image/a.png'), 'http://api.test/uploads/media/image/a.png');
  assert.equal(assetUrl('https://res.cloudinary.com/x/a.mp4'), 'https://res.cloudinary.com/x/a.mp4');
  assert.equal(assetUrl(''), '');
});

test('tokenStore falls back to memory when browser storage is unavailable and clears', () => {
  tokenStore.set('abc', true);
  assert.equal(tokenStore.get(), 'abc');
  tokenStore.clear();
  assert.ok(!tokenStore.get());
});

test('Highlighted wraps only the highlight word and escapes markup', () => {
  const html = renderToStaticMarkup(<Highlighted text="Find your dream job" highlight="dream" />);
  assert.match(html, /<span class="lp-hl">dream<\/span>/);
  const x = renderToStaticMarkup(<Highlighted text="<b>hi</b> there" highlight="nothing" />);
  assert.ok(!x.includes('<b>'));
});

test('liveValue uses the live count for live sources and the typed value for manual', () => {
  assert.equal(liveValue({ source: 'manual', value: '5K+' }, { jobs: 12 }), '5K+');
  assert.notEqual(liveValue({ source: 'jobs', value: '1' }, { jobs: 12 }), '1');
});
