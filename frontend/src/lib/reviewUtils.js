const VIDEO_FILE_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

const safeTrim = (value) => String(value || '').trim();

const tryParseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const normalizeVideoUrl = (value) => {
  const raw = safeTrim(value);
  if (!raw) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = tryParseUrl(withProtocol);

  if (!parsed) return '';
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';

  return parsed.toString();
};

export const extractPhotoUrls = (review) => {
  const csv = safeTrim(review?.photoUrl)
    .split(',')
    .map((value) => safeTrim(value))
    .filter(Boolean);

  const list = Array.isArray(review?.photoUrls)
    ? review.photoUrls.map((value) => safeTrim(value)).filter(Boolean)
    : [];

  return Array.from(new Set([...csv, ...list]));
};

const toYouTubeEmbed = (urlString) => {
  const parsed = tryParseUrl(urlString);
  if (!parsed) return '';

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  let videoId = '';

  if (host === 'youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    videoId = parsed.searchParams.get('v') || '';

    if (!videoId && parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    }

    if (!videoId && parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    }
  }

  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}`;
};

const toDriveEmbed = (urlString) => {
  const parsed = tryParseUrl(urlString);
  if (!parsed) return '';

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'drive.google.com') return '';

  const directId = parsed.searchParams.get('id');
  if (directId) return `https://drive.google.com/file/d/${directId}/preview`;

  const parts = parsed.pathname.split('/').filter(Boolean);
  const fileIndex = parts.indexOf('d');
  if (fileIndex >= 0 && parts[fileIndex + 1]) {
    return `https://drive.google.com/file/d/${parts[fileIndex + 1]}/preview`;
  }

  return '';
};

export const getVideoEmbedInfo = (value) => {
  const videoUrl = normalizeVideoUrl(value);
  if (!videoUrl) return null;

  const youtube = toYouTubeEmbed(videoUrl);
  if (youtube) {
    return {
      type: 'iframe',
      src: youtube,
      sourceUrl: videoUrl,
      label: 'YouTube Video Review',
    };
  }

  const drive = toDriveEmbed(videoUrl);
  if (drive) {
    return {
      type: 'iframe',
      src: drive,
      sourceUrl: videoUrl,
      label: 'Google Drive Video Review',
    };
  }

  if (VIDEO_FILE_RE.test(videoUrl)) {
    return {
      type: 'video',
      src: videoUrl,
      sourceUrl: videoUrl,
      label: 'Video Review',
    };
  }

  return {
    type: 'link',
    src: videoUrl,
    sourceUrl: videoUrl,
    label: 'Video Review Link',
  };
};

export const hasVideoReview = (review) => {
  return Boolean(getVideoEmbedInfo(review?.videoUrl || review?.driveLink || ''));
};

const toTimestamp = (value) => {
  const ts = Date.parse(String(value || ''));
  return Number.isNaN(ts) ? 0 : ts;
};

const getReviewKey = (review) => {
  const id = safeTrim(review?.id);
  if (id) return `id:${id}`;

  const videoUrl = safeTrim(review?.videoUrl || review?.driveLink);
  if (videoUrl) return `video:${videoUrl}`;

  const name = safeTrim(review?.customerName).toLowerCase();
  const text = safeTrim(review?.reviewText).toLowerCase();
  const createdAt = safeTrim(review?.createdAt || review?.updatedAt);
  if (name || text || createdAt) return `fallback:${name}|${text}|${createdAt}`;

  return '';
};

export const mergeUniqueReviews = (...reviewLists) => {
  const map = new Map();

  reviewLists.forEach((list) => {
    if (!Array.isArray(list)) return;

    list.forEach((review) => {
      const key = getReviewKey(review);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, review);
      }
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => toTimestamp(b?.createdAt || b?.updatedAt) - toTimestamp(a?.createdAt || a?.updatedAt)
  );
};
