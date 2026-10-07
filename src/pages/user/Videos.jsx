import { useCallback, useMemo, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { getErrorMessage, isNotAvailable } from '../../api/errors';
import { videoApi } from '../../api/video.api';
import DataState from '../../components/common/DataState';
import ReportModal from '../../components/common/ReportModal';
import VideoCard from '../../components/videos/VideoCard';
import VideoComments from '../../components/videos/VideoComments';
import Skeleton from '../../components/ui/Skeleton';
import useApi from '../../hooks/useApi';
import useToast from '../../hooks/useToast';
import { unwrapList } from '../../utils/helpers';
import { normalizeVideo } from '../../utils/normalizers';

export default function Videos() {
  const toast = useToast();
  const request = useCallback(() => videoApi.feed(), []);
  const { data, loading, error, notAvailable, reload } = useApi(request);
  const videos = useMemo(() => unwrapList(data).map(normalizeVideo), [data]);

  // Browsers only autoplay muted video, so the feed starts muted.
  const [muted, setMuted] = useState(true);
  // Interaction results confirmed by the server, keyed by video id.
  const [overrides, setOverrides] = useState({});
  const [commentsFor, setCommentsFor] = useState(null);
  const [reporting, setReporting] = useState(null);

  const withOverrides = (video) => ({ ...video, ...overrides[video.id] });

  const toggle = async (video, { flag, count, on, off, successOn, successOff }) => {
    const current = withOverrides(video);
    const next = !current[flag];
    try {
      await (next ? on(video.id) : off(video.id));
      setOverrides((state) => ({
        ...state,
        [video.id]: { ...state[video.id], [flag]: next, ...(count ? { [count]: Math.max(0, current[count] + (next ? 1 : -1)) } : {}) },
      }));
      toast.success(next ? successOn : successOff);
    } catch (err) {
      toast.error(isNotAvailable(err) ? 'This feature is coming soon.' : getErrorMessage(err));
    }
  };

  const handleLike = (video) =>
    toggle(video, { flag: 'isLiked', count: 'likes', on: videoApi.like, off: videoApi.unlike, successOn: 'Liked', successOff: 'Like removed' });
  const handleSave = (video) =>
    toggle(video, { flag: 'isSaved', on: videoApi.save, off: videoApi.unsave, successOn: 'Saved to your collection', successOff: 'Removed from saved' });

  const handleShare = async (video) => {
    const shareData = { title: video.title || 'Carevo career video', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  // TODO: implement once the backend defines follow endpoints for creators/companies.
  const handleFollow = () => toast.info('Following creators is coming soon.');

  return (
    <div className="mx-auto w-full max-w-md">
      <DataState
        loading={loading}
        error={error}
        notAvailable={notAvailable}
        onRetry={reload}
        skeleton={<Skeleton className="h-[calc(100dvh-10rem)] min-h-[28rem] w-full rounded-2xl" />}
        comingSoon={{
          icon: PlayCircle,
          title: 'Career videos are coming soon.',
          description: 'Short videos from professionals and companies will appear in this feed.',
        }}
        isEmpty={videos.length === 0}
        empty={{ icon: PlayCircle, title: 'No videos yet', description: 'New career content will show up here.' }}
      >
        <div
          className="h-[calc(100dvh-10rem)] min-h-[28rem] snap-y snap-mandatory overflow-y-scroll rounded-2xl bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Career video feed"
        >
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={withOverrides(video)}
              muted={muted}
              onToggleMute={() => setMuted((value) => !value)}
              onLike={handleLike}
              onSave={handleSave}
              onComment={setCommentsFor}
              onShare={handleShare}
              onFollow={handleFollow}
              onReport={setReporting}
            />
          ))}
        </div>
      </DataState>

      {commentsFor && <VideoComments video={commentsFor} onClose={() => setCommentsFor(null)} />}
      <ReportModal open={Boolean(reporting)} onClose={() => setReporting(null)} contentType="video" contentId={reporting?.id} />
    </div>
  );
}
