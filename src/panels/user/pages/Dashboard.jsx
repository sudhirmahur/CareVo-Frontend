import { useState } from 'react';
import { api, assetUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { compactNumber, jobTypeLabel, salaryRange, timeAgo } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link, useNavigate } from '../../../lib/router';
import Icon from '../../../components/Icon';
import { Avatar, Button, ErrorState, Skeleton, SkillChips } from '../../../components/ui';
import { useApply, usePatchJobs, useSaveToggle } from '../parts';

const STAT_META = [
  ['new_jobs', 'New Jobs', 'briefcase', '#2563eb'],
  ['top_companies', 'Top Companies', 'building', '#10b981'],
  ['active_recruiters', 'Active Recruiters', 'users', '#8b5cf6'],
  ['applications', 'Applications', 'send', '#f97316'],
];

function Change({ pct }) {
  if (pct === null || pct === undefined) return <small className="u-stat-chg flat">Live total</small>;
  const up = pct >= 0;
  return <small className={`u-stat-chg ${up ? 'up' : 'down'}`}><Icon name="trendUp" size={13} style={up ? undefined : { transform: 'scaleY(-1)' }} /> {up ? '+' : ''}{pct}% this week</small>;
}

function Ring({ percent }) {
  return (
    <div className="u-pring" style={{ '--p': percent }} role="img" aria-label={`Profile ${percent}% complete`}>
      <span>{percent}%</span>
    </div>
  );
}

const ACT_ICON = { applied: 'send', saved: 'bookmark', followed: 'heart', shortlisted: 'check', rejected: 'x', hired: 'award', interview: 'calendar' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dash = useAsync(() => api.get('/users/me/dashboard'), []);
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const patch = usePatchJobs(dash.setData, 'recommended_jobs');
  const toggleSave = useSaveToggle(patch);
  const { apply, busyId, node } = useApply({ onApplied: (job) => { patch(job.id, { has_applied: true, application_status: 'applied' }); dash.reload(); } });
  const d = dash.data;
  const first = (user?.name || '').split(' ')[0] || 'there';

  const search = (e) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (loc.trim()) sp.set('location', loc.trim());
    navigate(`/jobs${sp.toString() ? `?${sp}` : ''}`);
  };

  return (
    <>
      <section className="u-welcome">
        <div className="u-welcome-copy">
          <h1>Welcome back, {first}! <span aria-hidden="true">👋</span></h1>
          <p>Find your dream job and take the next step in your career.</p>
          <form className="u-wsearch" onSubmit={search} role="search">
            <label><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skills or keyword" aria-label="Job title, skills or keyword" maxLength={100} /></label>
            <label><Icon name="mapPin" size={18} /><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location" aria-label="Location" maxLength={100} /></label>
            <button type="submit" className="btn btn-primary">Search Jobs</button>
          </form>
        </div>
        <img className="u-welcome-art" src="/landing/hero.webp" alt="" loading="lazy" />
      </section>

      {dash.error && !d ? <ErrorState message={dash.error} onRetry={dash.reload} /> : (
        <>
          <section className="u-stat4" aria-label="Overview">
            {STAT_META.map(([key, label, icon, color]) => (
              <div className="u-stat" key={key} style={{ '--c': color }} data-testid={`stat-${key}`}>
                <span className="u-stat-ico"><Icon name={icon} size={22} /></span>
                <div>
                  <small>{label}</small>
                  {d ? <strong>{compactNumber(d.stats[key].value)}</strong> : <strong>–</strong>}
                  {d && <Change pct={d.stats[key].change_pct} />}
                </div>
              </div>
            ))}
          </section>

          <div className="u-dash-grid">
            <section className="u-card" aria-labelledby="rec-h">
              <div className="u-card-head"><h2 id="rec-h">Recommended Jobs</h2><Link to="/jobs" className="u-link-sm">View all</Link></div>
              {!d ? <Skeleton lines={6} /> : d.recommended_jobs.length === 0 ? (
                <p className="muted u-empty-sm">No recommendations yet. Add skills to your profile to get matches.</p>
              ) : (
                <ul className="u-rec">
                  {d.recommended_jobs.map((j) => {
                    const salary = salaryRange(j.salary_min, j.salary_max);
                    return (
                      <li key={j.id} className="u-rec-item" data-testid="rec-job">
                        <Avatar name={j.company_name || j.title} src={j.company_logo} size={48} className="u-logo" />
                        <div className="u-rec-main">
                          <h3><Link to={`/jobs/${j.id}`}>{j.title}</Link></h3>
                          <p className="muted small truncate">{j.company_name}{j.location ? ` · ${j.location}` : ''} · {jobTypeLabel(j.job_type)}</p>
                          <SkillChips skills={j.skills} max={4} />
                        </div>
                        <div className="u-rec-side">
                          {salary && <span className="u-sal">{salary}</span>}
                          <small className="muted">{timeAgo(j.created_at)}</small>
                          <div className="u-rec-actions">
                            {j.has_applied ? <span className="u-applied-tag"><Icon name="check" size={14} /> Applied</span> : j.is_expired ? <span className="muted small">Closed</span> : (
                              <Button size="sm" loading={busyId === j.id} onClick={() => apply(j)} aria-label={`Apply to ${j.title}`}>Apply Now</Button>
                            )}
                            <button type="button" className={`u-heart ${j.is_saved ? 'on' : ''}`} onClick={() => toggleSave(j)} aria-pressed={!!j.is_saved} aria-label={j.is_saved ? `Unsave ${j.title}` : `Save ${j.title}`}><Icon name="bookmark" size={18} /></button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="u-dash-side">
              <section className="u-card" aria-labelledby="pc-h">
                <h2 id="pc-h">Profile Completion</h2>
                {!d ? <Skeleton lines={4} /> : (
                  <>
                    <div className="u-pc">
                      <Ring percent={d.completion.percent} />
                      <p className="muted small">{d.completion.percent >= 100 ? 'Your profile is complete. Great job!' : 'Complete your profile to get better job matches.'}</p>
                    </div>
                    {d.completion.next && <Link to={d.completion.next.link} className="btn btn-primary btn-block" style={{ marginTop: 12 }}>{d.completion.percent >= 100 ? 'View Profile' : 'Complete Profile'}</Link>}
                    {d.completion.percent < 100 && (
                      <ul className="u-todo">
                        {d.completion.items.filter((i) => !i.done).slice(0, 3).map((i) => <li key={i.key}><Link to={i.link}><Icon name="plus" size={14} /> {i.label}</Link></li>)}
                      </ul>
                    )}
                  </>
                )}
              </section>

              <section className="u-card" aria-labelledby="ra-h">
                <div className="u-card-head"><h2 id="ra-h">Recent Activity</h2></div>
                {!d ? <Skeleton lines={3} /> : d.recent_activity.length === 0 ? <p className="muted u-empty-sm">Your activity will show up here.</p> : (
                  <ul className="u-act">
                    {d.recent_activity.map((a, i) => (
                      <li key={i}>
                        <span className={`u-act-ico t-${a.type}`}><Icon name={ACT_ICON[a.type] || 'info'} size={15} /></span>
                        <div className="grow"><Link to={a.link}>{a.title}</Link>{a.subtitle && <p className="muted small truncate">{a.subtitle}</p>}</div>
                        <small className="muted">{timeAgo(a.at)}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="u-card" aria-labelledby="tc-h">
                <div className="u-card-head"><h2 id="tc-h">Top Companies Hiring</h2><Link to="/companies" className="u-link-sm">View all</Link></div>
                {!d ? <Skeleton lines={3} /> : d.top_companies.length === 0 ? <p className="muted u-empty-sm">No companies are hiring right now.</p> : (
                  <ul className="u-topco">
                    {d.top_companies.slice(0, 5).map((c) => (
                      <li key={c.id}>
                        <Link to={`/companies/${c.id}`}>
                          <Avatar name={c.name} src={c.logo_url ? assetUrl(c.logo_url) : null} size={36} className="u-logo" />
                          <span className="grow truncate">{c.name}</span>
                          <small className="muted">{c.jobs_count} job{c.jobs_count === 1 ? '' : 's'}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
      {node}
    </>
  );
}
