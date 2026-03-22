/* ====================================================
   YTNavigator – YouTube API Module
   Handles all YouTube Data API v3 requests
   ==================================================== */

const YTApi = (() => {
  const BASE = 'https://www.googleapis.com/youtube/v3';

  const API_KEY = 'AIzaSyDM1v9AKVbZyT5iUKYuXGavyEyeFlfOVv4';

  function getKey() {
    return API_KEY;
  }

  function hasKey() {
    return true;
  }

  async function request(endpoint, params = {}) {
    const key = getKey();
    if (!key) throw new Error('API key not configured');

    const url = new URL(`${BASE}/${endpoint}`);
    params.key = key;
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    }

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err?.error?.message || `API Error: ${resp.status}`;
      throw new Error(msg);
    }
    return resp.json();
  }

  // ========== CHANNELS ==========

  async function searchChannels(query, maxResults = 10) {
    const data = await request('search', {
      part: 'snippet',
      type: 'channel',
      q: query,
      maxResults,
    });
    return (data.items || []).map(item => ({
      id: item.snippet.channelId || item.id.channelId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));
  }

  async function getChannelDetails(channelIds) {
    if (!Array.isArray(channelIds)) channelIds = [channelIds];
    const data = await request('channels', {
      part: 'snippet,statistics,brandingSettings,contentDetails',
      id: channelIds.join(','),
    });
    return (data.items || []).map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      customUrl: item.snippet.customUrl || '',
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      banner: item.brandingSettings?.image?.bannerExternalUrl || '',
      country: item.snippet.country || 'N/A',
      publishedAt: item.snippet.publishedAt,
      subscribers: parseInt(item.statistics.subscriberCount || 0),
      views: parseInt(item.statistics.viewCount || 0),
      videoCount: parseInt(item.statistics.videoCount || 0),
      hiddenSubscriberCount: item.statistics.hiddenSubscriberCount || false,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || '',
      keywords: item.brandingSettings?.channel?.keywords || '',
    }));
  }

  async function getChannelVideos(channelId, maxResults = 50) {
    // First get uploads playlist
    const channels = await getChannelDetails(channelId);
    if (!channels.length) return [];
    const playlistId = channels[0].uploadsPlaylistId;
    if (!playlistId) return [];

    const data = await request('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: Math.min(maxResults, 50),
    });

    const videoIds = (data.items || []).map(i => i.contentDetails.videoId);
    if (!videoIds.length) return [];

    return getVideoDetails(videoIds);
  }

  // ========== VIDEOS ==========

  async function getVideoDetails(videoIds) {
    if (!Array.isArray(videoIds)) videoIds = [videoIds];
    // API max 50 per request
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    const results = [];
    for (const chunk of chunks) {
      const data = await request('videos', {
        part: 'snippet,statistics,contentDetails',
        id: chunk.join(','),
      });
      for (const item of (data.items || [])) {
        results.push({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          thumbnailHigh: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
          publishedAt: item.snippet.publishedAt,
          tags: item.snippet.tags || [],
          categoryId: item.snippet.categoryId,
          duration: item.contentDetails?.duration || '',
          views: parseInt(item.statistics?.viewCount || 0),
          likes: parseInt(item.statistics?.likeCount || 0),
          comments: parseInt(item.statistics?.commentCount || 0),
        });
      }
    }
    return results;
  }

  async function searchVideos(query, maxResults = 20, options = {}) {
    const params = {
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults,
      order: options.order || 'relevance',
    };
    if (options.channelId) params.channelId = options.channelId;
    if (options.regionCode) params.regionCode = options.regionCode;
    if (options.categoryId) params.videoCategoryId = options.categoryId;
    if (options.publishedAfter) params.publishedAfter = options.publishedAfter;

    const data = await request('search', params);
    const videoIds = (data.items || []).map(i => i.id.videoId).filter(Boolean);
    if (!videoIds.length) return [];

    return getVideoDetails(videoIds);
  }

  // ========== TRENDING ==========

  async function getTrending(regionCode = 'US', categoryId = '0', maxResults = 25) {
    const params = {
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      regionCode,
      maxResults,
    };
    if (categoryId && categoryId !== '0') {
      params.videoCategoryId = categoryId;
    }

    const data = await request('videos', params);
    return (data.items || []).map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      thumbnailHigh: item.snippet.thumbnails?.high?.url,
      publishedAt: item.snippet.publishedAt,
      tags: item.snippet.tags || [],
      categoryId: item.snippet.categoryId,
      duration: item.contentDetails?.duration || '',
      views: parseInt(item.statistics?.viewCount || 0),
      likes: parseInt(item.statistics?.likeCount || 0),
      comments: parseInt(item.statistics?.commentCount || 0),
    }));
  }

  // ========== COMMENTS ==========

  async function getVideoComments(videoId, maxResults = 20) {
    const data = await request('commentThreads', {
      part: 'snippet',
      videoId,
      maxResults,
      order: 'relevance',
    });
    return (data.items || []).map(item => {
      const c = item.snippet.topLevelComment.snippet;
      return {
        id: item.id,
        author: c.authorDisplayName,
        authorAvatar: c.authorProfileImageUrl,
        text: c.textDisplay,
        likes: c.likeCount || 0,
        publishedAt: c.publishedAt,
        totalReplies: item.snippet.totalReplyCount || 0,
      };
    });
  }

  // ========== CATEGORIES ==========

  async function getVideoCategories(regionCode = 'US') {
    const data = await request('videoCategories', {
      part: 'snippet',
      regionCode,
    });
    return (data.items || []).map(item => ({
      id: item.id,
      title: item.snippet.title,
    }));
  }

  return {
    hasKey,
    searchChannels,
    getChannelDetails,
    getChannelVideos,
    getVideoDetails,
    searchVideos,
    getTrending,
    getVideoComments,
    getVideoCategories,
  };
})();
