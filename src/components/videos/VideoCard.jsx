import { forwardRef, useEffect, useRef, useState } from 'react';
import { Bookmark, Flag, Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../utils/helpers';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

function ActionButton({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 text-white"
    >
      <span className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur transition-colors hover:bg-black/60', active && 'text-brand')}>
        <Icon className={cn('h-5 w-5', active && 'fill-current')} />
      </span>
      {count !== undefined && <span className="text-xs font-medium">{count}</span>}
    </button>
  );
}

/**
 * One full-height slide of the vertical feed. Plays only while it is the
 * most visible slide (IntersectionObserver). `muted` is shared across slides.
 * Action callbacks are optional; the feed wires them to the planned endpoints.
 */
const VideoCard = forwardRef(function VideoCard(
  { video, muted, onToggleMute, onLike, onSave, onComment, onShare, onFollow, onReport },
  ref,
) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) element.play().catch(() => {});
        else element.pause();
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <article ref={ref} className="relative flex h-full w-full snap-start items-center justify-center overflow-hidden bg-black sm:rounded-2xl">
      {video.url && !failed ? (
        <video
          ref={videoRef}
          src={video.url}
          poster={video.poster ?? undefined}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <p className="px-6 text-center text-sm text-white/70">This video could not be played.</p>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1 text-white">
          <div className="flex items-center gap-2.5">
            <Avatar src={video.creatorImage} name={video.creatorName} size="md" />
            <p className="truncate text-sm font-semibold">{video.creatorName}</p>
            <Button size="sm" variant={video.isFollowing ? 'secondary' : 'primary'} onClick={() => onFollow?.(video)} className="h-7 px-3 text-xs">
              {video.isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
          {video.title && <p className="mt-3 text-sm font-semibold">{video.title}</p>}
          {video.caption && <p className="mt-1 line-clamp-2 text-sm text-white/80">{video.caption}</p>}
        </div>

        <div className="flex flex-col items-center gap-3">
          <ActionButton icon={Heart} label="Like" count={video.likes} active={video.isLiked} onClick={() => onLike?.(video)} />
          <ActionButton icon={MessageCircle} label="Comments" count={video.comments} onClick={() => onComment?.(video)} />
          <ActionButton icon={Bookmark} label="Save" active={video.isSaved} onClick={() => onSave?.(video)} />
          <ActionButton icon={Share2} label="Share" onClick={() => onShare?.(video)} />
          <ActionButton icon={Flag} label="Report video" onClick={() => onReport?.(video)} />
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </article>
  );
});

export default VideoCard;
