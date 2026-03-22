/* ====================================================
   YTNavigator – Utilities Module
   Formatting, helpers, and common functions
   ==================================================== */

const Utils = (() => {

  // ========== NUMBER FORMATTING ==========

  function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    n = Number(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  }

  function formatNumberFull(n) {
    return Number(n || 0).toLocaleString();
  }

  function formatPercent(n, decimals = 1) {
    return (Number(n) || 0).toFixed(decimals) + '%';
  }

  // ========== DATE FORMATTING ==========

  function timeAgo(dateStr) {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}y ago`;
    if (months > 0) return `${months}mo ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });
  }

  function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ========== DURATION PARSING ==========

  function parseDuration(iso) {
    if (!iso) return '0:00';
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    const h = parseInt(match[1] || 0);
    const m = parseInt(match[2] || 0);
    const s = parseInt(match[3] || 0);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ========== ENGAGEMENT ==========

  function engagementRate(video) {
    if (!video.views || video.views === 0) return 0;
    return ((video.likes + video.comments) / video.views) * 100;
  }

  // ========== TEXT ==========

  function truncate(str, len = 100) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== URL PARSING ==========

  function extractVideoId(input) {
    if (!input) return null;
    input = input.trim();
    // Direct ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    // URL patterns
    try {
      const url = new URL(input);
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
      if (url.hostname.includes('youtube.com')) {
        return url.searchParams.get('v') || null;
      }
    } catch {
      // Not a URL
    }
    return null;
  }

  function extractChannelId(input) {
    if (!input) return null;
    input = input.trim();
    // Direct channel ID
    if (/^UC[a-zA-Z0-9_-]{22}$/.test(input)) return input;
    // URL patterns
    try {
      const url = new URL(input);
      const path = url.pathname;
      const match = path.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
      if (match) return match[1];
    } catch {
      // Not a URL, treat as search query
    }
    return null;
  }

  // ========== CSV GENERATION ==========

  function toCsv(headers, rows) {
    const escape = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
      lines.push(row.map(escape).join(','));
    }
    return lines.join('\n');
  }

  function downloadCsv(filename, headers, rows) {
    const csv = toCsv(headers, rows);
    downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
  }

  function downloadJson(filename, data) {
    const json = JSON.stringify(data, null, 2);
    downloadBlob(json, filename, 'application/json');
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== CHART COLORS ==========

  const COLORS = [
    '#ff0050', '#00b4d8', '#00d68f', '#ffaa00',
    '#9c27b0', '#ff6b9d', '#4ecdc4', '#45b7d1',
    '#96e6a1', '#f093fb', '#4facfe', '#43e97b',
    '#fa709a', '#fee140', '#a18cd1', '#fbc2eb',
  ];

  function getColor(index) {
    return COLORS[index % COLORS.length];
  }

  function getColorAlpha(index, alpha = 0.2) {
    const hex = COLORS[index % COLORS.length];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ========== DEBOUNCE ==========

  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ========== DATE RANGES ==========

  function getDateLabels(range) {
    const labels = [];
    const now = new Date();
    let days;
    if (range === '7d') days = 7;
    else if (range === '30d') days = 30;
    else days = 90;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return labels;
  }

  // ========== GROWTH DATA GENERATION ==========
  // Generate simulated growth data from snapshots for chart display

  function generateGrowthData(snapshots, range) {
    let days;
    if (range === '7d') days = 7;
    else if (range === '30d') days = 30;
    else days = 90;

    const labels = getDateLabels(range);

    if (!snapshots || snapshots.length === 0) {
      // Return empty/zero data
      return { labels, data: new Array(days).fill(0) };
    }

    // If we have real snapshots, interpolate
    const sortedSnaps = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
    const now = Date.now();
    const startTime = now - days * 86400000;

    const data = [];
    for (let i = 0; i < days; i++) {
      const dayTime = startTime + i * 86400000;
      // Find closest snapshot
      let closest = sortedSnaps[0];
      for (const s of sortedSnaps) {
        if (Math.abs(s.timestamp - dayTime) < Math.abs(closest.timestamp - dayTime)) {
          closest = s;
        }
      }
      data.push(closest.subscribers || 0);
    }

    return { labels, data };
  }

  // ========== SIMILAR TAG ANALYSIS ==========

  function getTagFrequency(videos) {
    const freq = {};
    for (const v of videos) {
      for (const tag of (v.tags || [])) {
        const t = tag.toLowerCase().trim();
        if (t) {
          freq[t] = (freq[t] || 0) + 1;
        }
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1]);
  }

  function getTagPerformance(videos) {
    const tagStats = {};
    for (const v of videos) {
      for (const tag of (v.tags || [])) {
        const t = tag.toLowerCase().trim();
        if (!t) continue;
        if (!tagStats[t]) tagStats[t] = { views: 0, likes: 0, count: 0 };
        tagStats[t].views += v.views || 0;
        tagStats[t].likes += v.likes || 0;
        tagStats[t].count++;
      }
    }
    return Object.entries(tagStats)
      .map(([tag, stats]) => ({
        tag,
        avgViews: Math.round(stats.views / stats.count),
        avgLikes: Math.round(stats.likes / stats.count),
        count: stats.count,
      }))
      .sort((a, b) => b.avgViews - a.avgViews);
  }

  function clusterByKeywords(videos, numClusters = 6) {
    const tagFreq = getTagFrequency(videos);
    if (tagFreq.length < 3) return [];

    // Simple clustering by top tag groups
    const clusters = [];
    const used = new Set();

    for (const [tag] of tagFreq.slice(0, numClusters)) {
      if (used.has(tag)) continue;
      used.add(tag);

      const related = [];
      for (const v of videos) {
        const vTags = (v.tags || []).map(t => t.toLowerCase().trim());
        if (vTags.includes(tag)) {
          for (const t of vTags) {
            if (t !== tag && !used.has(t) && !related.includes(t)) {
              related.push(t);
            }
          }
        }
      }

      clusters.push({
        name: tag.charAt(0).toUpperCase() + tag.slice(1),
        keywords: [tag, ...related.slice(0, 8)],
      });
    }

    return clusters;
  }

  // ========== HEATMAP DATA ==========

  function buildHeatmapData(videos) {
    // 7 days x 24 hours
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));

    for (const v of videos) {
      if (!v.publishedAt) continue;
      const d = new Date(v.publishedAt);
      const day = d.getDay(); // 0=Sun, 6=Sat
      const hour = d.getHours();
      grid[day][hour]++;
    }
    return grid;
  }

  // ========== INSIGHTS ==========

  function generateInsights(channels, videos) {
    const tips = [];

    if (channels.length === 0) {
      tips.push({ icon: '📺', text: 'Start by <strong>adding a channel</strong> to track its growth and performance.' });
      return tips;
    }

    // Analyze upload frequency
    if (videos.length > 0) {
      const recentVideos = videos.filter(v => {
        const d = new Date(v.publishedAt);
        return Date.now() - d.getTime() < 30 * 86400000;
      });

      if (recentVideos.length === 0) {
        tips.push({ icon: '⚠️', text: 'No videos uploaded in the last month. <strong>Consistent uploads</strong> help grow your audience.' });
      } else if (recentVideos.length < 4) {
        tips.push({ icon: '📅', text: `Only ${recentVideos.length} videos in the last month. Consider uploading <strong>at least once a week</strong>.` });
      } else {
        tips.push({ icon: '✅', text: `Great upload frequency! ${recentVideos.length} videos in the last 30 days. <strong>Keep it up!</strong>` });
      }

      // Engagement analysis
      const avgEngagement = videos.reduce((sum, v) => sum + engagementRate(v), 0) / videos.length;
      if (avgEngagement < 1) {
        tips.push({ icon: '💬', text: 'Low engagement rate. Try adding <strong>calls to action</strong> in videos and respond to comments.' });
      } else if (avgEngagement > 5) {
        tips.push({ icon: '🔥', text: `Amazing ${formatPercent(avgEngagement)} engagement rate! Your audience is highly engaged. <strong>Leverage this</strong> for growth.` });
      }

      // Tag analysis
      const videosWithTags = videos.filter(v => v.tags && v.tags.length > 0);
      if (videosWithTags.length < videos.length * 0.5) {
        tips.push({ icon: '🏷️', text: 'Many videos lack tags. <strong>Adding relevant tags</strong> improves discoverability.' });
      }

      // Title length
      const avgTitleLen = videos.reduce((s, v) => s + (v.title || '').length, 0) / videos.length;
      if (avgTitleLen < 30) {
        tips.push({ icon: '📝', text: 'Average title length is short. Titles with <strong>40-60 characters</strong> tend to perform better.' });
      } else if (avgTitleLen > 70) {
        tips.push({ icon: '📝', text: 'Titles are quite long and may be truncated. Aim for <strong>40-60 characters</strong>.' });
      }

      // Best performing day
      const dayCount = [0, 0, 0, 0, 0, 0, 0];
      const dayViews = [0, 0, 0, 0, 0, 0, 0];
      for (const v of videos) {
        if (!v.publishedAt) continue;
        const day = new Date(v.publishedAt).getDay();
        dayCount[day]++;
        dayViews[day] += v.views || 0;
      }
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const bestDay = dayViews.indexOf(Math.max(...dayViews));
      if (dayCount[bestDay] > 0) {
        const avgDayViews = Math.round(dayViews[bestDay] / dayCount[bestDay]);
        tips.push({ icon: '📊', text: `Videos uploaded on <strong>${dayNames[bestDay]}</strong> get the most views (avg ${formatNumber(avgDayViews)} views).` });
      }
    }

    // Channel-level tips
    for (const ch of channels) {
      if (ch.subscribers > 0 && ch.videoCount > 0) {
        const viewsPerVideo = Math.round(ch.views / ch.videoCount);
        const subsPerVideo = Math.round(ch.subscribers / ch.videoCount);
        tips.push({ icon: '📈', text: `<strong>${escapeHtml(ch.title)}</strong> averages ${formatNumber(viewsPerVideo)} views and ${formatNumber(subsPerVideo)} subs per video.` });
      }
    }

    return tips;
  }

  // ========== CTR ESTIMATION ==========

  function estimateCTR(video) {
    let score = 3.0; // base CTR estimate %

    // Title analysis
    const title = (video.title || '').toLowerCase();
    if (title.includes('!')) score += 0.3;
    if (title.includes('?')) score += 0.2;
    if (/\d/.test(title)) score += 0.4; // numbers in title
    if (title.length >= 40 && title.length <= 60) score += 0.3;
    if (title.includes('how to') || title.includes('tutorial')) score += 0.5;
    if (title.includes('best') || title.includes('top')) score += 0.3;
    if (title.includes('vs') || title.includes('versus')) score += 0.2;
    if (title.toUpperCase() === title && title.length > 5) score -= 0.5; // all caps

    // Has tags (proxy for optimization)
    if (video.tags && video.tags.length > 5) score += 0.3;
    if (video.tags && video.tags.length > 15) score += 0.2;

    // Engagement as proxy
    if (video.views > 0) {
      const engagement = engagementRate(video);
      if (engagement > 5) score += 0.5;
      else if (engagement > 2) score += 0.2;
    }

    return Math.max(1, Math.min(15, score));
  }

  return {
    formatNumber, formatNumberFull, formatPercent,
    timeAgo, formatDate, formatDateShort, formatDateTime,
    parseDuration, engagementRate,
    truncate, escapeHtml,
    extractVideoId, extractChannelId,
    toCsv, downloadCsv, downloadJson, downloadBlob,
    COLORS, getColor, getColorAlpha,
    debounce, getDateLabels, generateGrowthData,
    getTagFrequency, getTagPerformance, clusterByKeywords,
    buildHeatmapData,
    generateInsights, estimateCTR,
  };
})();
