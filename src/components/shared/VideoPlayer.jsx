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

export default function VideoPlayer({ url, poster, title }) {
  const embed = embedUrl(url);
  return (
    <div className="video-frame">
      {embed ? (
        <iframe src={embed} title={title || 'Video'} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      ) : (
        <video src={assetUrl(url)} poster={poster ? assetUrl(poster) : undefined} controls preload="metadata" playsInline aria-label={title} />
      )}
    </div>
  );
}
