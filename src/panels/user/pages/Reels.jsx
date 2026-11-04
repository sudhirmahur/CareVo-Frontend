import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, assetUrl, errorMessage } from '../../../lib/api';
import { compactNumber, jobTypeLabel, salaryRange, timeAgo, titleCase } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link, useNavigate, useSearchParams } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Avatar, Badge, Button, DataState, SkeletonList, SkillChips, Tabs } from '../../../components/ui';
import { PremiumProvider, usePremium } from '../premium';
import { CommentsModal } from './Videos';

const TABS = [
  { value: '', label: 'For you' },
  { value: 'job', label: 'Jobs' },
  { value: 'company', label: 'Companies' },
  { value: 'tip', label: 'Tips' },
  { value: 'saved', label: 'Saved' },
];

function embedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}?rel=0`;
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}?rel=0`;
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) return url;
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean).pop()}`;
  } catch { /* not a URL */ }
  return null;
}

function Stage({ video, follows, onFollow, onLike, onSave, onShare, onComments, onPrev, onNext, hasPrev, hasNext, onProfile }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const embed = embedUrl(video.video_url);
  const touch = useRef(null);

  useEffect(() => { setPlaying(true); }, [video.id]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.play?.().catch(() => setPlaying(false));
    else el.pause?.();
  }, [playing, video.id]);

  const company = video.company_id;
  const following = follows.has(company);
  const authorName = video.company_name || video.author?.name || 'Recruiter';

  return (
    <div
      className="rl-stage"
      onTouchStart={(e) => { touch.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dy = e.changedTouches[0].clientY - touch.current;
        touch.current = null;
        if (dy < -70 && hasNext) onNext();
        else if (dy > 70 && hasPrev) onPrev();
      }}
    >
      {embed ? (
        <iframe className="rl-media" src={embed} title={video.title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      ) : (
        <video
          key={video.id}
          ref={ref}
          className="rl-media"
          src={assetUrl(video.video_url)}
          poster={video.thumbnail_url ? assetUrl(video.thumbnail_url) : undefined}
          muted={muted}
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-label={video.title}
          onClick={() => setPlaying((p) => !p)}
          onPlay={() => setPlaying(true)}
        />
      )}
      {!embed && !playing && <button type="button" className="rl-bigplay" onClick={() => setPlaying(true)} aria-label="Play"><Icon name="play" size={34} /></button>}

      <div className="rl-top">
        <button type="button" className="rl-chip" onClick={onProfile} aria-label={`Recruiter ${video.author?.name || authorName}`}>
          <Avatar name={video.author?.name || authorName} src={video.author?.profile_image || video.company_logo} size={34} />
          <span><strong className="truncate">{video.author?.name || authorName}</strong><small className="truncate">{video.company_name || titleCase(video.type)}</small></span>
        </button>
        {company && <button type="button" className={`rl-follow ${following ? 'on' : ''}`} onClick={() => onFollow(video)} aria-pressed={following}>{following ? 'Following' : 'Follow'}</button>}
        {!embed && (
          <button type="button" className="rl-mute" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={!muted}><Icon name={muted ? 'volumeOff' : 'volume'} size={18} /></button>
        )}
      </div>

      <div className="rl-actions" role="group" aria-label="Reel actions">
        <button type="button" className={video.is_liked ? 'on' : ''} onClick={() => onLike(video)} aria-pressed={!!video.is_liked} aria-label="Like"><Icon name="heart" size={24} /><span>{compactNumber(video.likes_count)}</span></button>
        <button type="button" onClick={onComments} aria-label="Comments"><Icon name="message" size={24} /><span>{compactNumber(video.comments_count)}</span></button>
        <button type="button" onClick={() => onShare(video)} aria-label="Share"><Icon name="share" size={24} /><span>Share</span></button>
        <button type="button" className={video.is_saved ? 'on' : ''} onClick={() => onSave(video)} aria-pressed={!!video.is_saved} aria-label="Save"><Icon name="bookmark" size={24} /><span>{video.is_saved ? 'Saved' : 'Save'}</span></button>
      </div>

      <div className="rl-caption">
        <h3>{video.title}</h3>
        {video.description && <p>{video.description}</p>}
        {video.tags?.length > 0 && <p className="rl-tags">{video.tags.slice(0, 4).map((t) => `#${t}`).join(' ')}</p>}
        {video.job && (
          <div className="rl-jobchip"><Icon name="briefcase" size={16} /><span className="truncate"><strong>{video.job.title}</strong> · {video.job.location || 'Remote'}</span></div>
        )}
      </div>

      <div className="rl-nav" aria-hidden={!hasPrev && !hasNext}>
        <button type="button" onClick={onPrev} disabled={!hasPrev} aria-label="Previous reel"><Icon name="chevronUp" size={20} /></button>
        <button type="button" onClick={onNext} disabled={!hasNext} aria-label="Next reel"><Icon name="chevronDown" size={20} /></button>
      </div>
    </div>
  );
}

function JobPanel({ video, onApply, busy, locked }) {
  const jobId = video.job?.id;
  const full = useAsync(() => (jobId ? api.get(`/jobs/${jobId}`) : Promise.resolve(null)), [jobId]);
  if (!video.job) {
    return (
      <section className="rl-card">
        <h3>Job details</h3>
        <p className="muted small">This reel is not linked to a job. Browse open roles from this company instead.</p>
        {video.company_id && <Link className="btn btn-secondary btn-block" to={`/companies/${video.company_id}`}>View company</Link>}
      </section>
    );
  }
  const j = full.data || {};
  const salary = salaryRange(j.salary_min, j.salary_max);
  const open = video.job.is_open;
  return (
    <section className="rl-card" data-testid="reel-job">
      <div className="rl-card-head">
        <Avatar name={video.company_name || video.job.title} src={video.company_logo} size={48} className="u-logo" />
        <div className="grow"><h3 className="truncate"><Link to={`/jobs/${video.job.id}`}>{video.job.title}</Link></h3><p className="muted small truncate">{video.company_name}</p></div>
      </div>
      <ul className="u-meta">
        {video.job.location && <li><Icon name="mapPin" size={14} /> {video.job.location}</li>}
        <li><Icon name="briefcase" size={14} /> {jobTypeLabel(video.job.job_type)}</li>
        {salary && <li><Icon name="dollar" size={14} /> {salary}</li>}
      </ul>
      {j.skills?.length > 0 && <SkillChips skills={j.skills} max={5} />}
      {j.description && <p className="rl-desc">{j.description}</p>}
      {!open ? (
        <Badge tone="neutral">This job is closed</Badge>
      ) : j.has_applied ? (
        <div className="stack-sm">
          <Badge tone="success" dot>Applied</Badge>
          {video.job.apply_type === 'external' && <Button variant="secondary" icon="external" loading={busy} onClick={onApply} className="btn-block">Open company site</Button>}
        </div>
      ) : (
        <>
          <Button size="lg" icon={locked ? 'lock' : video.job.apply_type === 'external' ? 'external' : 'send'} loading={busy} onClick={onApply} className={`btn-block ${locked ? 'rl-locked' : ''}`} aria-label={locked ? 'Apply Now (Premium required)' : 'Apply Now'}>
            Apply Now
          </Button>
          {locked && <p className="rl-lock-note"><Icon name="lock" size={13} /> Premium members can apply directly from Job Reels.</p>}
        </>
      )}
    </section>
  );
}

function RecruiterPanel({ video, locked, onProfile }) {
  const name = video.author?.name || 'Recruiter';
  return (
    <section className={`rl-card ${locked ? 'is-locked' : ''}`} data-testid="reel-recruiter">
      <h3>About the Recruiter</h3>
      <div className="rl-rec">
        <Avatar name={name} src={video.author?.profile_image} size={52} />
        <div className="grow"><strong className="truncate">{name}</strong><p className="muted small truncate">Recruiter{video.company_name ? ` at ${video.company_name}` : ''}</p></div>
      </div>
      {locked ? (
        <p className="rl-lock-note"><Icon name="lock" size={13} /> Recruiter profiles are available to Premium members.</p>
      ) : (
        <p className="muted small">Follow {video.company_name || 'this recruiter'} to see new roles and reels first.</p>
      )}
      <Button variant="secondary" icon={locked ? 'lock' : 'user'} onClick={onProfile} className="btn-block">View Profile</Button>
    </section>
  );
}

function ReelsInner() {
  const toast = useToast();
  const navigate = useNavigate();
  const premium = usePremium();
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') || '';
  const wantId = params.get('v') || '';
  const feed = useAsync(() => (tab === 'saved' ? api.get('/videos/saved') : api.get('/videos', { type: tab, limit: 30 })), [tab]);
  const follows = useAsync(() => api.get('/follow/following'), []);
  const [idx, setIdx] = useState(0);
  const [applyBusy, setApplyBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const items = useMemo(() => feed.data?.items || [], [feed.data]);
  const [followSet, setFollowSet] = useState(new Set());
  useEffect(() => {
    setFollowSet(new Set((follows.data?.items || []).filter((x) => x.type === 'company').map((x) => x.id)));
  }, [follows.data]);

  useEffect(() => {
    if (!items.length) return;
    const at = wantId ? items.findIndex((v) => v.id === wantId) : -1;
    setIdx(at >= 0 ? at : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  useEffect(() => {
    if (idx > items.length - 1) setIdx(Math.max(0, items.length - 1));
  }, [items.length, idx]);

  const cur = items[idx];
  const patch = useCallback((id, p) => feed.setData((d) => (d ? { ...d, items: d.items.map((v) => (v.id === id ? { ...v, ...p } : v)) } : d)), [feed.setData]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (video, kind) => {
    const key = kind === 'like' ? 'is_liked' : 'is_saved';
    const on = !!video[key];
    const p = { [key]: !on };
    if (kind === 'like') p.likes_count = video.likes_count + (on ? -1 : 1);
    patch(video.id, p);
    try {
      if (on) await api.delete(`/videos/${video.id}/${kind}`);
      else await api.post(`/videos/${video.id}/${kind}`);
    } catch (e) {
      patch(video.id, { [key]: on, likes_count: video.likes_count });
      toast.error(errorMessage(e));
    }
  };

  const follow = async (video) => {
    const id = video.company_id;
    const on = followSet.has(id);
    setFollowSet((s) => { const n = new Set(s); if (on) n.delete(id); else n.add(id); return n; });
    try {
      if (on) await api.delete(`/follow/${id}`);
      else await api.post('/follow', { following_id: id, type: 'company' });
      toast.success(on ? `Unfollowed ${video.company_name}` : `Following ${video.company_name}`);
    } catch (e) {
      setFollowSet((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
      toast.error(errorMessage(e));
    }
  };

  const share = async (video) => {
    const url = `${window.location.origin}/videos?v=${video.id}`;
    try {
      if (navigator.share) await navigator.share({ title: video.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast.info(url);
    }
  };

  const apply = async () => {
    if (!cur?.job) return;
    if (premium.locked) return premium.show('apply');
    const external = cur.job.apply_type === 'external';
    const w = external ? window.open('', '_blank') : null;
    if (w) { try { w.opener = null; } catch { /* ignore */ } }
    setApplyBusy(true);
    try {
      const res = await api.post(`/videos/${cur.id}/apply`, {});
      if (res.redirect_url) {
        if (w) w.location.href = res.redirect_url;
        else window.open(res.redirect_url, '_blank', 'noopener');
      } else if (w) w.close();
      toast.success(res.already_applied ? 'Already applied' : external ? 'Application recorded - continue on the company site' : 'Application submitted');
      patch(cur.id, {});
      feedJobApplied();
    } catch (e) {
      if (w) w.close();
      if (e.status === 402) { premium.reload(); premium.show('apply'); } else toast.error(errorMessage(e));
    } finally {
      setApplyBusy(false);
    }
  };
  // force JobPanel to refetch the job (has_applied) by nudging the video object
  const [nonce, setNonce] = useState(0);
  const feedJobApplied = () => setNonce((n) => n + 1);

  const openProfile = () => {
    if (!cur?.author?.id) return;
    if (premium.locked) return premium.show('recruiter');
    navigate(`/recruiters/${cur.author.id}`);
  };

  const go = (d) => setIdx((i) => Math.min(items.length - 1, Math.max(0, i + d)));
  useEffect(() => {
    const onKey = (e) => {
      if (commentsOpen || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); go(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div className="rl-head">
        <div><h1>Job Reels</h1><p className="muted">Watch short videos from recruiters and apply to jobs that fit you.</p></div>
        <Tabs tabs={TABS} value={tab} onChange={(v) => setParams({ t: v, v: '' })} />
      </div>
      <DataState loading={feed.loading} error={feed.error} onRetry={feed.reload} hasData={!!feed.data} skeleton={<SkeletonList count={2} />} isEmpty={items.length === 0}
        empty={{ icon: 'video', title: tab === 'saved' ? 'No saved reels' : 'No reels yet', description: tab === 'saved' ? 'Save a reel to watch it later.' : 'Check back soon for new videos from recruiters.' }}>
        {cur && (
          <div className="rl-layout">
            <ol className="rl-thumbs" aria-label="Reels">
              {items.map((v, i) => (
                <li key={v.id}>
                  <button type="button" className={`rl-thumb ${i === idx ? 'on' : ''}`} onClick={() => setIdx(i)} aria-label={`Play ${v.title}`} aria-current={i === idx ? 'true' : undefined} data-testid="reel-thumb">
                    <span className="rl-thumb-img" style={v.thumbnail_url ? { backgroundImage: `url(${assetUrl(v.thumbnail_url)})` } : undefined}><Icon name="play" size={16} /></span>
                    <span className="rl-thumb-t">{v.title}</span>
                    <small>{timeAgo(v.created_at)}</small>
                  </button>
                </li>
              ))}
            </ol>
            <div className="rl-center">
              <Stage
                video={cur} follows={followSet} onFollow={follow} onLike={(v) => toggle(v, 'like')} onSave={(v) => toggle(v, 'save')} onShare={share}
                onComments={() => setCommentsOpen(true)} onPrev={() => go(-1)} onNext={() => go(1)} hasPrev={idx > 0} hasNext={idx < items.length - 1} onProfile={openProfile}
              />
            </div>
            <aside className="rl-right" aria-label="Reel details">
              <JobPanel key={`${cur.id}-${nonce}`} video={cur} onApply={apply} busy={applyBusy} locked={premium.locked} />
              <RecruiterPanel video={cur} locked={premium.locked} onProfile={openProfile} />
            </aside>
          </div>
        )}
      </DataState>
      {commentsOpen && cur && <CommentsModal video={cur} onClose={() => setCommentsOpen(false)} onPatch={patch} />}
    </>
  );
}

export default function Reels() {
  return <PremiumProvider><ReelsInner /></PremiumProvider>;
}
