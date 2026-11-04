import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Avatar, Badge, EmptyState, Pagination, StatusBadge } from '../../src/components/ui.jsx';

const html = (el) => renderToStaticMarkup(el);

test('Badge renders tone class and content', () => {
  const h = html(<Badge tone="success">Live</Badge>);
  assert.match(h, /badge-success/);
  assert.match(h, />Live</);
});
test('StatusBadge maps statuses to tones and title-cases them', () => {
  assert.match(html(<StatusBadge status="shortlisted" />), /badge-warning.*Shortlisted/s);
  assert.match(html(<StatusBadge status="accepted" />), /badge-success/);
  assert.match(html(<StatusBadge status="rejected" />), /badge-danger/);
  assert.equal(html(<StatusBadge status="" />), '');
});
test('Avatar falls back to initials', () => {
  assert.match(html(<Avatar name="Priya Sharma" />), />PS</);
});
test('EmptyState renders title, description and action', () => {
  const h = html(<EmptyState title="No jobs found" description="Try again" action={<button>Reset</button>} />);
  assert.match(h, /No jobs found/);
  assert.match(h, /Try again/);
  assert.match(h, /<button>Reset<\/button>/);
});
test('Pagination hides for one page, shows ellipsis for many', () => {
  assert.equal(html(<Pagination page={1} pages={1} onChange={() => {}} />), '');
  const h = html(<Pagination page={5} pages={20} onChange={() => {}} />);
  assert.match(h, /…/);
  assert.match(h, />20</);
});
