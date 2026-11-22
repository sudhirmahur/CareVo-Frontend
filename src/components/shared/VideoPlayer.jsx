import { useState } from 'react';
import { assetUrl } from '../../lib/api';

function embedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) return url;
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean).pop()}`;
  } catch { /* not a URL */ }
  return null;
}

export default function VideoPlayer({ url, playbackUrl, poster, title }) {
  const embed = embedUrl(url);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="video-frame">
      {embed ? (
        <iframe src={embed} title={title || 'Video'} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      ) : failed ? (
        <div className="video-error" role="alert" data-testid="video-error">
          <p>This video could not be played.</p>
          <button type="button" className="btn btn-secondary" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>Try again</button>
        </div>
      ) : (
        <video key={attempt} src={assetUrl(playbackUrl || url)} poster={poster ? assetUrl(poster) : undefined} controls preload="metadata" playsInline aria-label={title} onError={() => setFailed(true)} />
      )}
    </div>
  );
}
