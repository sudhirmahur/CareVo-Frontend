import { assetUrl } from './api';

/** The URL a <video> should load: the browser-safe (H.264 mp4) version when the server provides one. */
export const playbackSrc = (v) => assetUrl(v.playback_url || v.video_url);
