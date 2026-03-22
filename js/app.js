/* ====================================================
   YTNavigator – Main Application Module
   Page navigation, event handlers, UI rendering
   ==================================================== */

// ========== GLOBAL STATE ==========
let currentPage = 'dashboard';
let videoViewMode = 'grid';
let selectedReportFormat = 'csv';
let commandPaletteOpen = false;
let refreshTimer = null;

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
  // Loading screen
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';
    initApp();
  }, 1600);
});

function initApp() {
  // Apply saved settings
  applySettings();

  // Initialize dashboard
  updateDashboardStats();
  Charts.refreshAll();
  renderChannelList();
  renderVideoList();
  renderFavorites();
  renderWatchLater();
  renderAlertsList();
  renderAlertHistory();
  renderReportHistory();
  renderNotifications();
  updateApiStatus();
  updateStorageUsed();
  populateChannelSelectors();

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Global search
  const searchInput = document.getElementById('global-search');
  searchInput.addEventListener('input', Utils.debounce(handleGlobalSearch, 300));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchInput.blur();
    }
  });

  // Auto-refresh
  setupAutoRefresh();

  // Hash navigation
  if (window.location.hash) {
    const page = window.location.hash.slice(1);
    navigateTo(page);
  }
}

// ========== SETTINGS ==========

function applySettings() {
  const settings = Storage.getSettings();

  // Theme
  const theme = settings.theme || 'dark';
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  updateThemeIcon();

  const themeSelect = document.getElementById('setting-theme');
  if (themeSelect) themeSelect.value = theme;

  // Accent color
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    const accentInput = document.getElementById('setting-accent');
    if (accentInput) accentInput.value = settings.accentColor;
  }

  // Compact mode
  if (settings.compact) {
    document.body.classList.add('compact');
    const compactToggle = document.getElementById('setting-compact');
    if (compactToggle) compactToggle.checked = true;
  }

  // Chart animation
  const animToggle = document.getElementById('setting-chart-anim');
  if (animToggle) animToggle.checked = settings.chartAnimation !== false;

  // Refresh interval
  const refreshSelect = document.getElementById('setting-refresh');
  if (refreshSelect) refreshSelect.value = settings.refreshInterval || '0';
}

function saveSetting(key, value) {
  Storage.setSetting(key, value);
  showToast('Setting saved', 'success');
}

function applyThemeSetting(theme) {
  Storage.setSetting('theme', theme);
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  updateThemeIcon();
  Charts.updateTheme();
}

function applyAccentColor(color) {
  document.documentElement.style.setProperty('--accent', color);
  Storage.setSetting('accentColor', color);
  Charts.updateTheme();
}

function toggleCompactMode(enabled) {
  document.body.classList.toggle('compact', enabled);
  Storage.setSetting('compact', enabled);
}

function toggleBrowserNotifications(enabled) {
  if (enabled && 'Notification' in window) {
    Notification.requestPermission().then(perm => {
      Storage.setSetting('browserNotifications', perm === 'granted');
      const toggle = document.getElementById('setting-browser-notif');
      if (toggle) toggle.checked = perm === 'granted';
    });
  } else {
    Storage.setSetting('browserNotifications', false);
  }
}

// ========== THEME ==========

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  Storage.setSetting('theme', next);
  updateThemeIcon();
  Charts.updateTheme();
  const themeSelect = document.getElementById('setting-theme');
  if (themeSelect) themeSelect.value = next;
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ========== NAVIGATION ==========

function navigateTo(page, event) {
  if (event) event.preventDefault();

  // Validate page exists
  const pageEl = document.getElementById(`page-${page}`);
  if (!pageEl) return;

  currentPage = page;

  // Update active page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  pageEl.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update hash
  window.location.hash = page;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');

  // Page-specific init
  if (page === 'dashboard') {
    updateDashboardStats();
    Charts.refreshAll();
  } else if (page === 'trending') {
    // Auto-fetch if API key is set
    if (YTApi.hasKey()) fetchTrending();
  } else if (page === 'insights') {
    renderInsights();
  } else if (page === 'keywords') {
    renderKeywords();
  } else if (page === 'heatmap') {
    renderHeatmapPage();
  } else if (page === 'compare') {
    populateCompareSelectors();
  }

  // Scroll to top
  document.querySelector('.page-content').scrollTop = 0;
}

// ========== SIDEBAR ==========

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// ========== MODALS ==========

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// ========== API KEY ==========

function updateApiStatus() {
  const hasKey = YTApi.hasKey();
  const status = document.getElementById('api-status');
  const badge = document.getElementById('api-status-badge');
  if (status) status.textContent = hasKey ? 'API key configured' : 'Not configured';
  if (badge) {
    badge.textContent = hasKey ? 'Active' : 'Inactive';
    badge.className = `badge ${hasKey ? 'badge-success' : 'badge-warning'}`;
  }
}

// ========== DASHBOARD ==========

function updateDashboardStats() {
  const channels = Storage.getChannels();
  const videos = Storage.getVideos();

  const totalSubs = channels.reduce((s, c) => s + (c.subscribers || 0), 0);
  const totalViews = channels.reduce((s, c) => s + (c.views || 0), 0);
  const totalVideos = channels.reduce((s, c) => s + (c.videoCount || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes || 0), 0);
  const totalComments = videos.reduce((s, v) => s + (v.comments || 0), 0);

  document.getElementById('stat-channels').textContent = channels.length;
  document.getElementById('stat-videos').textContent = Utils.formatNumber(totalVideos);
  document.getElementById('stat-views').textContent = Utils.formatNumber(totalViews);
  document.getElementById('stat-subs').textContent = Utils.formatNumber(totalSubs);
  document.getElementById('stat-likes').textContent = Utils.formatNumber(totalLikes);
  document.getElementById('stat-comments').textContent = Utils.formatNumber(totalComments);

  // Render recent activity
  renderRecentActivity(videos);
}

function renderRecentActivity(videos) {
  const container = document.getElementById('recent-activity');
  const recent = [...videos]
    .filter(v => v.publishedAt)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 10);

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No activity yet. Add a channel to get started!</p></div>';
    return;
  }

  container.innerHTML = recent.map(v => `
    <div class="activity-item" onclick="showVideoDetail('${Utils.escapeHtml(v.id)}')">
      <img class="activity-thumb" src="${Utils.escapeHtml(v.thumbnail || '')}" alt="" loading="lazy" />
      <div class="activity-info">
        <div class="activity-title">${Utils.escapeHtml(v.title)}</div>
        <div class="activity-meta">${Utils.escapeHtml(v.channelTitle || '')} · ${Utils.formatNumber(v.views)} views · ${Utils.timeAgo(v.publishedAt)}</div>
      </div>
    </div>
  `).join('');
}

function setChartRange(chart, range, btn) {
  // Update active button
  btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (chart === 'subs') Charts.renderSubsChart(range);
  else if (chart === 'views') Charts.renderViewsChart(range);
}

// ========== CHANNELS ==========

async function searchChannel() {
  const input = document.getElementById('channel-search-input');
  const query = (input.value || '').trim();
  if (!query) {
    showToast('Enter a channel name or URL', 'warning');
    return;
  }

  if (!YTApi.hasKey()) {
    showToast('API key not available. Ensure YOUTUBE_API_KEY is set in GitHub Secrets.', 'error');
    return;
  }

  const resultsContainer = document.getElementById('channel-search-results');
  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = '<div class="empty-state-sm">Searching...</div>';

  try {
    // Check if it's a channel ID
    const channelId = Utils.extractChannelId(query);
    let channels;

    if (channelId) {
      channels = await YTApi.getChannelDetails(channelId);
    } else {
      const searchResults = await YTApi.searchChannels(query, 8);
      if (searchResults.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state-sm">No channels found</div>';
        return;
      }
      const ids = searchResults.map(c => c.id);
      channels = await YTApi.getChannelDetails(ids);
    }

    if (channels.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-state-sm">No channels found</div>';
      return;
    }

    resultsContainer.innerHTML = channels.map(ch => `
      <div class="search-result-card" onclick="addChannelFromSearch('${ch.id}')">
        <img class="search-result-avatar" src="${Utils.escapeHtml(ch.thumbnail || '')}" alt="" loading="lazy" />
        <div class="search-result-info">
          <div class="search-result-name">${Utils.escapeHtml(ch.title)}</div>
          <div class="search-result-meta">
            ${Utils.formatNumber(ch.subscribers)} subscribers · ${Utils.formatNumber(ch.views)} views · ${ch.videoCount} videos
            ${ch.country !== 'N/A' ? ` · ${ch.country}` : ''}
          </div>
        </div>
        <button class="btn btn-primary btn-sm">+ Add</button>
      </div>
    `).join('');
  } catch (err) {
    resultsContainer.innerHTML = `<div class="empty-state-sm text-danger">Error: ${Utils.escapeHtml(err.message)}</div>`;
  }
}

async function addChannelFromSearch(channelId) {
  try {
    const channels = await YTApi.getChannelDetails(channelId);
    if (channels.length === 0) {
      showToast('Channel not found', 'error');
      return;
    }

    const ch = channels[0];
    Storage.addChannel(ch);
    Storage.addSnapshot(ch.id, { subscribers: ch.subscribers, views: ch.views, videos: ch.videoCount });

    showToast(`Added "${ch.title}" to tracked channels!`, 'success');
    addNotification('📺', `Channel "${ch.title}" added to tracking`);

    // Fetch channel videos
    showToast('Fetching channel videos...', 'info');
    const videos = await YTApi.getChannelVideos(channelId, 30);
    if (videos.length > 0) {
      Storage.addVideos(videos);
      showToast(`Loaded ${videos.length} videos from ${ch.title}`, 'success');
    }

    // Refresh UI
    renderChannelList();
    renderVideoList();
    updateDashboardStats();
    Charts.refreshAll();
    populateChannelSelectors();

    // Hide search results
    document.getElementById('channel-search-results').style.display = 'none';
    document.getElementById('channel-search-input').value = '';
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function renderChannelList() {
  const container = document.getElementById('channel-list');
  let channels = [...Storage.getChannels()];

  // Apply filters
  const sortBy = document.getElementById('channel-sort')?.value || 'name';
  const countryFilter = document.getElementById('channel-country-filter')?.value || '';

  if (countryFilter) {
    channels = channels.filter(c => c.country === countryFilter);
  }

  // Sort
  const sorters = {
    name: (a, b) => (a.title || '').localeCompare(b.title || ''),
    subscribers: (a, b) => (b.subscribers || 0) - (a.subscribers || 0),
    views: (a, b) => (b.views || 0) - (a.views || 0),
    videos: (a, b) => (b.videoCount || 0) - (a.videoCount || 0),
    recent: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
  };
  channels.sort(sorters[sortBy] || sorters.name);

  if (channels.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📺</div>
        <h3>No Channels Tracked</h3>
        <p>Search for a channel above to get started</p>
      </div>`;
    return;
  }

  container.innerHTML = channels.map(ch => {
    const isFav = Storage.isFavorite('channels', ch.id);
    return `
    <div class="channel-card" onclick="showChannelDetail('${ch.id}')">
      <div class="channel-actions" onclick="event.stopPropagation()">
        <button class="btn btn-icon btn-xs ${isFav ? 'text-accent' : ''}" onclick="toggleFavChannel('${ch.id}')" title="Favorite">
          ${isFav ? '⭐' : '☆'}
        </button>
        <button class="btn btn-icon btn-xs" onclick="removeTrackedChannel('${ch.id}')" title="Remove">🗑️</button>
      </div>
      <div class="channel-card-header">
        <img class="channel-avatar" src="${Utils.escapeHtml(ch.thumbnail || '')}" alt="" loading="lazy" />
        <div>
          <div class="channel-name">${Utils.escapeHtml(ch.title)}</div>
          <div class="channel-handle">${Utils.escapeHtml(ch.customUrl || ch.id)}</div>
        </div>
      </div>
      <div class="channel-stats">
        <div class="channel-stat-item">
          <span class="channel-stat-value">${Utils.formatNumber(ch.subscribers)}</span>
          <span class="channel-stat-label">Subscribers</span>
        </div>
        <div class="channel-stat-item">
          <span class="channel-stat-value">${Utils.formatNumber(ch.views)}</span>
          <span class="channel-stat-label">Views</span>
        </div>
        <div class="channel-stat-item">
          <span class="channel-stat-value">${Utils.formatNumber(ch.videoCount)}</span>
          <span class="channel-stat-label">Videos</span>
        </div>
      </div>
      <div class="channel-meta">
        <span>📅 ${ch.publishedAt ? Utils.formatDate(ch.publishedAt) : 'N/A'}</span>
        <span>🌍 ${Utils.escapeHtml(ch.country || 'N/A')}</span>
      </div>
    </div>`;
  }).join('');
}

function removeTrackedChannel(id) {
  if (!confirm('Remove this channel and its videos from tracking?')) return;
  const ch = Storage.getChannels().find(c => c.id === id);
  Storage.removeChannel(id);
  showToast(`Removed "${ch?.title || 'channel'}" from tracking`, 'info');
  renderChannelList();
  renderVideoList();
  updateDashboardStats();
  Charts.refreshAll();
  populateChannelSelectors();
}

function toggleFavChannel(id) {
  const added = Storage.toggleFavorite('channels', id);
  showToast(added ? 'Added to favorites' : 'Removed from favorites', 'info');
  renderChannelList();
  renderFavorites();
}

async function showChannelDetail(channelId) {
  const ch = Storage.getChannels().find(c => c.id === channelId);
  if (!ch) return;

  const videos = Storage.getVideos().filter(v => v.channelId === channelId);
  const topVideos = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const recentVideos = [...videos].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 5);

  const avgViews = videos.length > 0 ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0;
  const avgLikes = videos.length > 0 ? Math.round(videos.reduce((s, v) => s + v.likes, 0) / videos.length) : 0;
  const avgEngagement = videos.length > 0 ? (videos.reduce((s, v) => s + Utils.engagementRate(v), 0) / videos.length) : 0;

  document.getElementById('channel-detail-title').textContent = ch.title;
  document.getElementById('channel-detail-body').innerHTML = `
    <div class="channel-card-header" style="margin-bottom:1.5rem;">
      <img class="channel-avatar" src="${Utils.escapeHtml(ch.thumbnail || '')}" alt="" style="width:80px;height:80px;" />
      <div>
        <div class="channel-name" style="font-size:1.3rem;">${Utils.escapeHtml(ch.title)}</div>
        <div class="channel-handle">${Utils.escapeHtml(ch.customUrl || ch.id)}</div>
        <div style="margin-top:0.5rem;">
          <span class="badge badge-info">${Utils.escapeHtml(ch.country || 'N/A')}</span>
          <span class="badge badge-success">Since ${ch.publishedAt ? Utils.formatDate(ch.publishedAt) : 'N/A'}</span>
        </div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumberFull(ch.subscribers)}</span><span class="stat-label">Subscribers</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumberFull(ch.views)}</span><span class="stat-label">Total Views</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumberFull(ch.videoCount)}</span><span class="stat-label">Videos</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumber(avgViews)}</span><span class="stat-label">Avg Views/Video</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumber(avgLikes)}</span><span class="stat-label">Avg Likes/Video</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatPercent(avgEngagement)}</span><span class="stat-label">Avg Engagement</span></div></div>
    </div>

    ${ch.description ? `<div style="margin-bottom:1.5rem;"><h4 style="margin-bottom:0.5rem;">Description</h4><p class="text-muted text-sm">${Utils.escapeHtml(Utils.truncate(ch.description, 400))}</p></div>` : ''}

    ${ch.keywords ? `<div style="margin-bottom:1.5rem;"><h4 style="margin-bottom:0.5rem;">Channel Keywords</h4><div class="tag-cloud">${ch.keywords.split(/[,"\s]+/).filter(Boolean).slice(0, 20).map(k => `<span class="tag-item">${Utils.escapeHtml(k)}</span>`).join('')}</div></div>` : ''}

    <div style="margin-bottom:1.5rem;">
      <h4 style="margin-bottom:0.75rem;">🏆 Top Videos</h4>
      ${topVideos.length > 0 ? topVideos.map(v => `
        <div class="activity-item" onclick="closeModal('channel-detail-modal'); showVideoDetail('${v.id}');">
          <img class="activity-thumb" src="${Utils.escapeHtml(v.thumbnail || '')}" alt="" loading="lazy" />
          <div class="activity-info">
            <div class="activity-title">${Utils.escapeHtml(v.title)}</div>
            <div class="activity-meta">${Utils.formatNumber(v.views)} views · ${Utils.formatNumber(v.likes)} likes</div>
          </div>
        </div>
      `).join('') : '<div class="empty-state-sm">No videos loaded</div>'}
    </div>

    <div>
      <h4 style="margin-bottom:0.75rem;">🕐 Recent Uploads</h4>
      ${recentVideos.length > 0 ? recentVideos.map(v => `
        <div class="activity-item" onclick="closeModal('channel-detail-modal'); showVideoDetail('${v.id}');">
          <img class="activity-thumb" src="${Utils.escapeHtml(v.thumbnail || '')}" alt="" loading="lazy" />
          <div class="activity-info">
            <div class="activity-title">${Utils.escapeHtml(v.title)}</div>
            <div class="activity-meta">${Utils.timeAgo(v.publishedAt)} · ${Utils.formatNumber(v.views)} views</div>
          </div>
        </div>
      `).join('') : '<div class="empty-state-sm">No videos loaded</div>'}
    </div>
  `;

  openModal('channel-detail-modal');
}

function exportChannelsCsv() {
  const channels = Storage.getChannels();
  if (channels.length === 0) { showToast('No channels to export', 'warning'); return; }
  const headers = ['Channel', 'ID', 'Subscribers', 'Views', 'Videos', 'Country', 'Created'];
  const rows = channels.map(c => [c.title, c.id, c.subscribers, c.views, c.videoCount, c.country, c.publishedAt]);
  Utils.downloadCsv('ytnavigator-channels.csv', headers, rows);
  Storage.addReportHistory({ type: 'Channel CSV Export', format: 'csv' });
  renderReportHistory();
  showToast('Channels exported!', 'success');
}

// ========== VIDEOS ==========

function renderVideoList() {
  const container = document.getElementById('video-list');
  let videos = [...Storage.getVideos()];

  // Populate channel filter
  const channelFilter = document.getElementById('video-channel-filter');
  if (channelFilter) {
    const channels = Storage.getChannels();
    const currentVal = channelFilter.value;
    channelFilter.innerHTML = '<option value="">All Channels</option>' +
      channels.map(c => `<option value="${c.id}"${c.id === currentVal ? ' selected' : ''}>${Utils.escapeHtml(c.title)}</option>`).join('');
  }

  // Apply filters
  const chFilter = document.getElementById('video-channel-filter')?.value || '';
  const sortBy = document.getElementById('video-sort')?.value || 'date';
  const period = document.getElementById('video-period-filter')?.value || '';

  if (chFilter) videos = videos.filter(v => v.channelId === chFilter);
  if (period) {
    const cutoff = Date.now() - parseInt(period) * 86400000;
    videos = videos.filter(v => new Date(v.publishedAt).getTime() > cutoff);
  }

  // Sort
  const sorters = {
    date: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    views: (a, b) => (b.views || 0) - (a.views || 0),
    likes: (a, b) => (b.likes || 0) - (a.likes || 0),
    comments: (a, b) => (b.comments || 0) - (a.comments || 0),
    engagement: (a, b) => Utils.engagementRate(b) - Utils.engagementRate(a),
  };
  videos.sort(sorters[sortBy] || sorters.date);

  // View mode
  container.className = `video-grid ${videoViewMode === 'list' ? 'list-view' : ''}`;

  if (videos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎬</div>
        <h3>No Videos Yet</h3>
        <p>Add a channel first, then videos will appear here</p>
      </div>`;
    return;
  }

  container.innerHTML = videos.map(v => renderVideoCard(v)).join('');
}

function renderVideoCard(v) {
  const isFav = Storage.isFavorite('videos', v.id);
  const isWL = Storage.isWatchLater(v.id);

  return `
    <div class="video-card" onclick="showVideoDetail('${v.id}')">
      <div class="video-actions" onclick="event.stopPropagation()">
        <button class="video-action-btn ${isFav ? 'active' : ''}" onclick="toggleFavVideo('${v.id}')" title="Favorite">⭐</button>
        <button class="video-action-btn ${isWL ? 'active' : ''}" onclick="toggleWLVideo('${v.id}')" title="Watch Later">⏰</button>
      </div>
      <div class="video-thumbnail">
        <img src="${Utils.escapeHtml(v.thumbnail || '')}" alt="" loading="lazy" />
        ${v.duration ? `<span class="video-duration">${Utils.parseDuration(v.duration)}</span>` : ''}
      </div>
      <div class="video-info">
        <div class="video-title">${Utils.escapeHtml(v.title)}</div>
        <div class="video-channel-name">${Utils.escapeHtml(v.channelTitle || '')}</div>
        <div class="video-stats">
          <span class="video-stat">👁️ ${Utils.formatNumber(v.views)}</span>
          <span class="video-stat">👍 ${Utils.formatNumber(v.likes)}</span>
          <span class="video-stat">💬 ${Utils.formatNumber(v.comments)}</span>
          <span class="video-stat">📅 ${Utils.timeAgo(v.publishedAt)}</span>
        </div>
      </div>
    </div>`;
}

function setVideoView(mode, btn) {
  videoViewMode = mode;
  btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVideoList();
}

function toggleFavVideo(id) {
  const added = Storage.toggleFavorite('videos', id);
  showToast(added ? 'Added to favorites' : 'Removed from favorites', 'info');
  renderVideoList();
  renderFavorites();
}

function toggleWLVideo(id) {
  const added = Storage.toggleWatchLater(id);
  showToast(added ? 'Added to Watch Later' : 'Removed from Watch Later', 'info');
  renderVideoList();
  renderWatchLater();
}

async function showVideoDetail(videoId) {
  let video = Storage.getVideos().find(v => v.id === videoId);

  if (!video && YTApi.hasKey()) {
    try {
      const videos = await YTApi.getVideoDetails(videoId);
      if (videos.length > 0) {
        video = videos[0];
        Storage.addVideos([video]);
      }
    } catch {
      showToast('Could not load video details', 'error');
      return;
    }
  }

  if (!video) {
    showToast('Video not found', 'error');
    return;
  }

  const engagement = Utils.engagementRate(video);
  const ctr = Utils.estimateCTR(video);

  document.getElementById('video-detail-title').textContent = video.title;
  document.getElementById('video-detail-body').innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <div class="video-thumbnail" style="border-radius:var(--radius);overflow:hidden;max-width:640px;">
        <img src="${Utils.escapeHtml(video.thumbnailHigh || video.thumbnail || '')}" alt="" />
      </div>
    </div>

    <h3 style="font-size:1.2rem;margin-bottom:0.25rem;">${Utils.escapeHtml(video.title)}</h3>
    <p class="text-muted text-sm" style="margin-bottom:1rem;">${Utils.escapeHtml(video.channelTitle || '')} · Published ${video.publishedAt ? Utils.formatDate(video.publishedAt) : 'N/A'}</p>

    <div class="stats-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumberFull(video.views)}</span><span class="stat-label">Views</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumberFull(video.likes)}</span><span class="stat-label">Likes</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatNumberFull(video.comments)}</span><span class="stat-label">Comments</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${Utils.formatPercent(engagement)}</span><span class="stat-label">Engagement Rate</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">${video.duration ? Utils.parseDuration(video.duration) : 'N/A'}</span><span class="stat-label">Duration</span></div></div>
      <div class="stat-card"><div class="stat-info"><span class="stat-value">~${ctr.toFixed(1)}%</span><span class="stat-label">Est. CTR</span></div></div>
    </div>

    ${video.tags && video.tags.length > 0 ? `
      <div style="margin-bottom:1.5rem;">
        <h4 style="margin-bottom:0.5rem;">🏷️ Tags (${video.tags.length})</h4>
        <div class="tag-cloud">${video.tags.slice(0, 30).map(t => `<span class="tag-item">${Utils.escapeHtml(t)}</span>`).join('')}</div>
      </div>
    ` : ''}

    ${video.description ? `
      <div style="margin-bottom:1rem;">
        <h4 style="margin-bottom:0.5rem;">Description</h4>
        <p class="text-muted text-sm" style="white-space:pre-wrap;max-height:200px;overflow-y:auto;">${Utils.escapeHtml(Utils.truncate(video.description, 1000))}</p>
      </div>
    ` : ''}

    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
      <a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">▶ Watch on YouTube</a>
      <button class="btn btn-outline btn-sm" onclick="toggleFavVideo('${video.id}'); closeModal('video-detail-modal');">${Storage.isFavorite('videos', video.id) ? '⭐ Unfavorite' : '☆ Favorite'}</button>
      <button class="btn btn-outline btn-sm" onclick="toggleWLVideo('${video.id}'); closeModal('video-detail-modal');">${Storage.isWatchLater(video.id) ? '⏰ Remove WL' : '⏰ Watch Later'}</button>
    </div>
  `;

  openModal('video-detail-modal');
}

function exportVideosCsv() {
  const videos = Storage.getVideos();
  if (videos.length === 0) { showToast('No videos to export', 'warning'); return; }
  const headers = ['Title', 'Channel', 'Video ID', 'Views', 'Likes', 'Comments', 'Duration', 'Published', 'Tags'];
  const rows = videos.map(v => [v.title, v.channelTitle, v.id, v.views, v.likes, v.comments, Utils.parseDuration(v.duration), v.publishedAt, (v.tags || []).join('; ')]);
  Utils.downloadCsv('ytnavigator-videos.csv', headers, rows);
  Storage.addReportHistory({ type: 'Video CSV Export', format: 'csv' });
  renderReportHistory();
  showToast('Videos exported!', 'success');
}

// ========== TRENDING ==========

async function fetchTrending() {
  if (!YTApi.hasKey()) {
    showToast('API key not available', 'error');
    return;
  }

  const country = document.getElementById('trending-country')?.value || 'US';
  const category = document.getElementById('trending-category')?.value || '0';
  const container = document.getElementById('trending-list');

  container.innerHTML = '<div class="empty-state-sm">Loading trending videos...</div>';

  try {
    const videos = await YTApi.getTrending(country, category, 25);
    if (videos.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔥</div><h3>No Trending Videos</h3><p>Try a different country or category</p></div>';
      return;
    }

    container.innerHTML = videos.map(v => renderVideoCard(v)).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state-sm text-danger">Error: ${Utils.escapeHtml(err.message)}</div>`;
  }
}

// ========== COMPARE ==========

function populateCompareSelectors() {
  const channels = Storage.getChannels();
  const options = '<option value="">Select Channel...</option>' +
    channels.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.title)}</option>`).join('');

  document.querySelectorAll('.compare-select').forEach(select => {
    const currentVal = select.value;
    select.innerHTML = options;
    if (currentVal) select.value = currentVal;
  });
}

function addCompareSlot() {
  const container = document.getElementById('compare-channel-selectors');
  const channels = Storage.getChannels();
  const options = '<option value="">Select Channel...</option>' +
    channels.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.title)}</option>`).join('');

  const select = document.createElement('select');
  select.className = 'input compare-select';
  select.innerHTML = options;
  select.addEventListener('change', updateCompareChart);

  const vs = document.createElement('span');
  vs.className = 'compare-vs';
  vs.textContent = 'VS';

  const addBtn = container.querySelector('.btn');
  container.insertBefore(vs, addBtn);
  container.insertBefore(select, addBtn);
}

function updateCompareChart() {
  const selects = document.querySelectorAll('.compare-select');
  const selectedIds = Array.from(selects).map(s => s.value).filter(Boolean);

  if (selectedIds.length < 2) {
    Charts.renderCompareChannelsChart([]);
    return;
  }

  const channels = Storage.getChannels();
  const channelData = selectedIds.map(id => channels.find(c => c.id === id)).filter(Boolean);
  Charts.renderCompareChannelsChart(channelData);
}

function addVideoCompareSlot() {
  const container = document.getElementById('compare-video-inputs');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input compare-video-input';
  input.placeholder = 'Paste video URL or ID...';
  const addBtn = container.querySelector('.btn');
  container.insertBefore(input, addBtn);
}

async function compareVideos() {
  const inputs = document.querySelectorAll('.compare-video-input');
  const ids = Array.from(inputs)
    .map(i => Utils.extractVideoId(i.value) || i.value.trim())
    .filter(Boolean);

  if (ids.length < 2) {
    showToast('Enter at least 2 video URLs or IDs', 'warning');
    return;
  }

  const resultsContainer = document.getElementById('video-compare-results');
  resultsContainer.innerHTML = '<div class="empty-state-sm">Loading comparison...</div>';

  try {
    // Check local first, then API
    let videos = [];
    const storedVideos = Storage.getVideos();
    const needFetch = [];

    for (const id of ids) {
      const stored = storedVideos.find(v => v.id === id);
      if (stored) {
        videos.push(stored);
      } else {
        needFetch.push(id);
      }
    }

    if (needFetch.length > 0 && YTApi.hasKey()) {
      const fetched = await YTApi.getVideoDetails(needFetch);
      videos = videos.concat(fetched);
      Storage.addVideos(fetched);
    }

    if (videos.length < 2) {
      resultsContainer.innerHTML = '<div class="empty-state-sm">Could not load enough videos for comparison</div>';
      return;
    }

    resultsContainer.innerHTML = `
      <table class="compare-table">
        <thead>
          <tr>
            <th>Metric</th>
            ${videos.map(v => `<th>${Utils.escapeHtml(Utils.truncate(v.title, 30))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr><td>Views</td>${videos.map(v => `<td>${Utils.formatNumberFull(v.views)}</td>`).join('')}</tr>
          <tr><td>Likes</td>${videos.map(v => `<td>${Utils.formatNumberFull(v.likes)}</td>`).join('')}</tr>
          <tr><td>Comments</td>${videos.map(v => `<td>${Utils.formatNumberFull(v.comments)}</td>`).join('')}</tr>
          <tr><td>Duration</td>${videos.map(v => `<td>${Utils.parseDuration(v.duration)}</td>`).join('')}</tr>
          <tr><td>Engagement</td>${videos.map(v => `<td>${Utils.formatPercent(Utils.engagementRate(v))}</td>`).join('')}</tr>
          <tr><td>Est. CTR</td>${videos.map(v => `<td>${Utils.estimateCTR(v).toFixed(1)}%</td>`).join('')}</tr>
          <tr><td>Tags</td>${videos.map(v => `<td>${(v.tags || []).length}</td>`).join('')}</tr>
          <tr><td>Published</td>${videos.map(v => `<td>${v.publishedAt ? Utils.formatDate(v.publishedAt) : 'N/A'}</td>`).join('')}</tr>
        </tbody>
      </table>
    `;
  } catch (err) {
    resultsContainer.innerHTML = `<div class="empty-state-sm text-danger">Error: ${Utils.escapeHtml(err.message)}</div>`;
  }
}

// ========== INSIGHTS ==========

function renderInsights() {
  const channels = Storage.getChannels();
  const videos = Storage.getVideos();

  Charts.renderGrowthPrediction();
  Charts.renderUploadTimesChart();
  Charts.renderEngagementTrend();

  // Best performing content
  const bestContentContainer = document.getElementById('best-content-list');
  const topVideos = [...videos].sort((a, b) => Utils.engagementRate(b) - Utils.engagementRate(a)).slice(0, 5);

  if (topVideos.length > 0) {
    bestContentContainer.innerHTML = topVideos.map(v => `
      <div class="insight-item">
        <img class="activity-thumb" src="${Utils.escapeHtml(v.thumbnail || '')}" alt="" loading="lazy" style="border-radius:6px;" />
        <div style="flex:1;">
          <div style="font-size:0.85rem;font-weight:600;">${Utils.escapeHtml(Utils.truncate(v.title, 50))}</div>
          <div class="text-muted text-sm">${Utils.formatPercent(Utils.engagementRate(v))} engagement · ${Utils.formatNumber(v.views)} views</div>
        </div>
      </div>
    `).join('');
  }

  // Improvement tips
  const tipsContainer = document.getElementById('improvement-tips');
  const tips = Utils.generateInsights(channels, videos);
  tipsContainer.innerHTML = tips.map(t => `
    <div class="tip-item">
      <span class="tip-icon">${t.icon}</span>
      <div class="tip-text">${t.text}</div>
    </div>
  `).join('');

  // CTR Estimates
  const ctrContainer = document.getElementById('ctr-estimates');
  if (videos.length > 0) {
    const ctrData = videos.slice(0, 8).map(v => ({
      ...v,
      ctr: Utils.estimateCTR(v),
    })).sort((a, b) => b.ctr - a.ctr);

    ctrContainer.innerHTML = ctrData.map(v => `
      <div class="insight-item">
        <div style="flex:1;">
          <div style="font-size:0.85rem;font-weight:600;">${Utils.escapeHtml(Utils.truncate(v.title, 50))}</div>
          <div class="text-muted text-sm">Estimated CTR: <strong class="text-accent">${v.ctr.toFixed(1)}%</strong></div>
        </div>
      </div>
    `).join('');
  }
}

// ========== KEYWORDS ==========

function renderKeywords() {
  const videos = Storage.getVideos();

  // Tag cloud
  const tagCloudContainer = document.getElementById('tag-cloud');
  const tagFreq = Utils.getTagFrequency(videos);

  if (tagFreq.length > 0) {
    const maxCount = tagFreq[0][1];
    tagCloudContainer.innerHTML = tagFreq.slice(0, 50).map(([tag, count]) => {
      const size = 0.7 + (count / maxCount) * 1.2;
      return `<span class="tag-item" style="font-size:${size}rem;">${Utils.escapeHtml(tag)} (${count})</span>`;
    }).join('');
  }

  // Charts
  Charts.renderTagChart();
  Charts.renderTagPerformanceChart();

  // Clusters
  const clusterContainer = document.getElementById('keyword-clusters');
  const clusters = Utils.clusterByKeywords(videos);

  if (clusters.length > 0) {
    clusterContainer.innerHTML = clusters.map(cl => `
      <div class="cluster-card">
        <div class="cluster-title">${Utils.escapeHtml(cl.name)}</div>
        <div class="cluster-keywords">
          ${cl.keywords.map(k => `<span class="cluster-keyword">${Utils.escapeHtml(k)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }
}

// ========== HEATMAP ==========

function renderHeatmapPage() {
  // Populate channel filter
  const select = document.getElementById('heatmap-channel');
  if (select) {
    const channels = Storage.getChannels();
    select.innerHTML = '<option value="">All Channels</option>' +
      channels.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.title)}</option>`).join('');
  }
  renderHeatmap();
  Charts.renderDayPerformanceChart();
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-container');
  const channelId = document.getElementById('heatmap-channel')?.value || '';

  let videos = Storage.getVideos();
  if (channelId) videos = videos.filter(v => v.channelId === channelId);

  const grid = Utils.buildHeatmapData(videos);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxVal = Math.max(1, ...grid.flat());

  if (videos.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">Track channels to see activity patterns</div>';
    return;
  }

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  for (let h = 0; h < 24; h++) {
    html += `<th>${h.toString().padStart(2, '0')}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let d = 0; d < 7; d++) {
    html += `<tr><th>${dayNames[d]}</th>`;
    for (let h = 0; h < 24; h++) {
      const val = grid[d][h];
      const intensity = val / maxVal;
      const bg = val === 0
        ? 'var(--bg-input)'
        : `rgba(255, 0, 80, ${0.15 + intensity * 0.85})`;
      html += `<td class="heatmap-cell" style="background:${bg};" title="${dayNames[d]} ${h}:00 - ${val} videos">${val || ''}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ========== FAVORITES ==========

function renderFavorites() {
  const favs = Storage.getFavorites();
  const channels = Storage.getChannels();
  const videos = Storage.getVideos();

  // Fav channels
  const favChannels = channels.filter(c => favs.channels.includes(c.id));
  const chContainer = document.getElementById('fav-channels');
  if (favChannels.length === 0) {
    chContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><h3>No Favorite Channels</h3><p>Click the star icon on any channel to add it to favorites</p></div>';
  } else {
    chContainer.innerHTML = favChannels.map(ch => `
      <div class="channel-card" onclick="showChannelDetail('${ch.id}')">
        <div class="channel-card-header">
          <img class="channel-avatar" src="${Utils.escapeHtml(ch.thumbnail || '')}" alt="" loading="lazy" />
          <div>
            <div class="channel-name">${Utils.escapeHtml(ch.title)}</div>
            <div class="channel-handle">${Utils.formatNumber(ch.subscribers)} subscribers</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Fav videos
  const favVideos = videos.filter(v => favs.videos.includes(v.id));
  const vContainer = document.getElementById('fav-videos');
  if (favVideos.length === 0) {
    vContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><h3>No Favorite Videos</h3><p>Click the star icon on any video to add it to favorites</p></div>';
  } else {
    vContainer.innerHTML = favVideos.map(v => renderVideoCard(v)).join('');
  }
}

function switchFavTab(tab, btn) {
  btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('fav-channels').style.display = tab === 'channels' ? '' : 'none';
  document.getElementById('fav-videos').style.display = tab === 'videos' ? '' : 'none';
}

// ========== WATCH LATER ==========

function renderWatchLater() {
  const wlIds = Storage.getWatchLater();
  const videos = Storage.getVideos();
  const wlVideos = wlIds.map(id => videos.find(v => v.id === id)).filter(Boolean);

  const container = document.getElementById('watchlater-list');
  if (wlVideos.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏰</div><h3>No Videos Saved</h3><p>Click the clock icon on any video to save it for later</p></div>';
  } else {
    container.innerHTML = wlVideos.map(v => renderVideoCard(v)).join('');
  }
}

function clearWatchLater() {
  if (!confirm('Clear all Watch Later videos?')) return;
  Storage.setWatchLater([]);
  renderWatchLater();
  showToast('Watch Later cleared', 'info');
}

// ========== ALERTS ==========

function createAlert() {
  const type = document.getElementById('alert-type').value;
  const channel = document.getElementById('alert-channel').value;
  const threshold = parseInt(document.getElementById('alert-threshold').value || 0);

  const typeLabels = {
    views_spike: 'Views Spike',
    sub_change: 'Subscriber Change',
    new_video: 'New Video Upload',
    comment_spike: 'Comment Spike',
    milestone: 'Milestone Reached',
  };

  const alert = Storage.addAlert({
    type,
    typeLabel: typeLabels[type] || type,
    channelId: channel,
    channelName: channel ? Storage.getChannels().find(c => c.id === channel)?.title : 'Any',
    threshold,
  });

  showToast(`Alert created: ${alert.typeLabel}`, 'success');
  renderAlertsList();
}

function renderAlertsList() {
  const container = document.getElementById('alerts-list');
  const alerts = Storage.getAlerts();

  // Populate channel selector too
  const alertChannel = document.getElementById('alert-channel');
  if (alertChannel) {
    const channels = Storage.getChannels();
    alertChannel.innerHTML = '<option value="">Any Channel</option>' +
      channels.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.title)}</option>`).join('');
  }

  if (alerts.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">No alerts configured</div>';
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="alert-item">
      <div class="alert-item-info">
        <div class="alert-item-type">${Utils.escapeHtml(a.typeLabel)}</div>
        <div class="alert-item-detail">Channel: ${Utils.escapeHtml(a.channelName || 'Any')} · Threshold: ${Utils.formatNumber(a.threshold || 0)}</div>
      </div>
      <button class="btn btn-ghost btn-xs" onclick="Storage.removeAlert('${a.id}'); renderAlertsList(); showToast('Alert removed','info');">🗑️</button>
    </div>
  `).join('');
}

function renderAlertHistory() {
  const container = document.getElementById('alert-history');
  const history = Storage.getAlertHistory();

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">No alerts triggered yet</div>';
    return;
  }

  container.innerHTML = history.slice(0, 20).map(h => `
    <div class="alert-item">
      <div class="alert-item-info">
        <div class="alert-item-type">${Utils.escapeHtml(h.message || h.type)}</div>
        <div class="alert-item-detail">${Utils.formatDateTime(h.triggeredAt)}</div>
      </div>
    </div>
  `).join('');
}

function clearAlerts() {
  if (!confirm('Clear all alerts?')) return;
  Storage.setAlerts([]);
  renderAlertsList();
  showToast('All alerts cleared', 'info');
}

// ========== REPORTS ==========

function selectReportFormat(btn) {
  btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedReportFormat = btn.dataset.format;
}

function openReportWithType(type) {
  openModal('report-modal');
  document.getElementById('report-type').value = type;
}

function generateReport() {
  const type = document.getElementById('report-type').value;

  if (selectedReportFormat === 'csv') {
    if (type === 'channel') exportChannelsCsv();
    else if (type === 'video') exportVideosCsv();
    else exportAllCsv();
  } else if (selectedReportFormat === 'json') {
    exportAllData();
  } else if (selectedReportFormat === 'image') {
    exportDashboardImage();
  }

  closeModal('report-modal');
}

function exportAllCsv() {
  exportChannelsCsv();
  setTimeout(() => exportVideosCsv(), 500);
}

async function exportDashboardImage() {
  showToast('Generating screenshot...', 'info');
  try {
    const page = document.getElementById('page-dashboard');
    if (typeof html2canvas !== 'undefined') {
      const canvas = await html2canvas(page, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = 'ytnavigator-dashboard.png';
      link.href = canvas.toDataURL();
      link.click();
      Storage.addReportHistory({ type: 'Dashboard Screenshot', format: 'png' });
      renderReportHistory();
      showToast('Screenshot saved!', 'success');
    }
  } catch (err) {
    showToast('Failed to generate screenshot', 'error');
  }
}

function exportAllData() {
  const data = Storage.exportAll();
  Utils.downloadJson('ytnavigator-backup.json', data);
  Storage.addReportHistory({ type: 'Full Data Backup', format: 'json' });
  renderReportHistory();
  showToast('Data exported!', 'success');
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      Storage.importAll(data);
      showToast('Data imported successfully! Refreshing...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      showToast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
  if (!confirm('This will remove all channels, videos, favorites, and settings. Continue?')) return;
  Storage.clearAll();
  showToast('All data cleared. Refreshing...', 'info');
  setTimeout(() => window.location.reload(), 1000);
}

function renderReportHistory() {
  const container = document.getElementById('report-history');
  const history = Storage.getReportHistory();

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">No reports generated yet</div>';
    return;
  }

  container.innerHTML = history.map(h => `
    <div class="alert-item">
      <div class="alert-item-info">
        <div class="alert-item-type">${Utils.escapeHtml(h.type)}</div>
        <div class="alert-item-detail">${Utils.formatDateTime(h.generatedAt)} · ${h.format?.toUpperCase() || 'N/A'}</div>
      </div>
    </div>
  `).join('');
}

function updateStorageUsed() {
  const bytes = Storage.getUsedBytes();
  const el = document.getElementById('storage-used');
  if (el) {
    if (bytes > 1048576) el.textContent = (bytes / 1048576).toFixed(2) + ' MB';
    else if (bytes > 1024) el.textContent = (bytes / 1024).toFixed(1) + ' KB';
    else el.textContent = bytes + ' bytes';
  }
}

// ========== NOTIFICATIONS ==========

function toggleNotifications() {
  const panel = document.getElementById('notification-panel');
  const isVisible = panel.style.display !== 'none';
  panel.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    Storage.markNotificationsRead();
    updateNotifBadge();
  }
}

function addNotification(icon, text) {
  Storage.addNotification({ icon, text });
  renderNotifications();
  updateNotifBadge();
}

function renderNotifications() {
  const container = document.getElementById('notif-list');
  const notifs = Storage.getNotifications();

  if (notifs.length === 0) {
    container.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }

  container.innerHTML = notifs.slice(0, 20).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <span class="notif-icon">${n.icon || '🔔'}</span>
      <div class="notif-content">
        <div class="notif-text">${Utils.escapeHtml(n.text)}</div>
        <div class="notif-time">${Utils.timeAgo(n.time)}</div>
      </div>
    </div>
  `).join('');

  updateNotifBadge();
}

function updateNotifBadge() {
  const notifs = Storage.getNotifications();
  const unread = notifs.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.style.display = unread > 0 ? '' : 'none';
    badge.textContent = unread > 9 ? '9+' : unread;
  }
}

function clearNotifications() {
  Storage.clearNotificationsStore();
  renderNotifications();
  showToast('Notifications cleared', 'info');
}

// ========== TOASTS ==========

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${Utils.escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ========== GLOBAL SEARCH ==========

function handleGlobalSearch(e) {
  const query = (e?.target?.value || '').toLowerCase().trim();
  if (!query) return;

  // Search channels and videos
  const channels = Storage.getChannels().filter(c =>
    c.title?.toLowerCase().includes(query) ||
    c.customUrl?.toLowerCase().includes(query)
  );

  const videos = Storage.getVideos().filter(v =>
    v.title?.toLowerCase().includes(query) ||
    v.channelTitle?.toLowerCase().includes(query) ||
    (v.tags || []).some(t => t.toLowerCase().includes(query))
  );

  // Show results in command palette style
  openCommandPalette(query, channels, videos);
}

// ========== COMMAND PALETTE ==========

function openCommandPalette(query = '', channels = [], videos = []) {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('command-input');
  const results = document.getElementById('command-results');
  palette.style.display = 'flex';
  commandPaletteOpen = true;
  input.value = query || '';
  input.focus();

  input.oninput = () => {
    const q = input.value.toLowerCase().trim();
    renderCommandResults(q);
  };

  input.onkeydown = (e) => {
    if (e.key === 'Escape') closeCommandPalette();
    else if (e.key === 'Enter') {
      const active = results.querySelector('.command-item.active');
      if (active) active.click();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = results.querySelectorAll('.command-item');
      let idx = Array.from(items).findIndex(i => i.classList.contains('active'));
      items.forEach(i => i.classList.remove('active'));
      if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
      else idx = Math.max(idx - 1, 0);
      if (items[idx]) items[idx].classList.add('active');
    }
  };

  renderCommandResults(query);
}

function renderCommandResults(query = '') {
  const results = document.getElementById('command-results');
  let html = '';

  // Pages
  const pages = [
    { page: 'dashboard', icon: '📊', label: 'Dashboard' },
    { page: 'channels', icon: '📺', label: 'Channels' },
    { page: 'videos', icon: '🎬', label: 'Videos' },
    { page: 'trending', icon: '🔥', label: 'Trending' },
    { page: 'compare', icon: '⚖️', label: 'Compare' },
    { page: 'insights', icon: '💡', label: 'Insights' },
    { page: 'keywords', icon: '🏷️', label: 'Keywords' },
    { page: 'heatmap', icon: '🗺️', label: 'Heatmap' },
    { page: 'favorites', icon: '⭐', label: 'Favorites' },
    { page: 'watchlater', icon: '⏰', label: 'Watch Later' },
    { page: 'reports', icon: '📄', label: 'Reports' },
    { page: 'alerts', icon: '🔔', label: 'Alerts' },
    { page: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const filteredPages = query
    ? pages.filter(p => p.label.toLowerCase().includes(query))
    : pages;

  if (filteredPages.length > 0) {
    html += filteredPages.map((p, i) => `
      <div class="command-item ${i === 0 ? 'active' : ''}" onclick="navigateTo('${p.page}'); closeCommandPalette();">
        <span class="command-item-icon">${p.icon}</span>
        <span class="command-item-label">${p.label}</span>
        <span class="command-item-hint">Go to page</span>
      </div>
    `).join('');
  }

  // Channels
  if (query) {
    const channels = Storage.getChannels().filter(c =>
      c.title?.toLowerCase().includes(query)
    ).slice(0, 5);

    channels.forEach(ch => {
      html += `
        <div class="command-item" onclick="showChannelDetail('${ch.id}'); closeCommandPalette();">
          <span class="command-item-icon">📺</span>
          <span class="command-item-label">${Utils.escapeHtml(ch.title)}</span>
          <span class="command-item-hint">${Utils.formatNumber(ch.subscribers)} subs</span>
        </div>`;
    });

    // Videos
    const videos = Storage.getVideos().filter(v =>
      v.title?.toLowerCase().includes(query)
    ).slice(0, 5);

    videos.forEach(v => {
      html += `
        <div class="command-item" onclick="showVideoDetail('${v.id}'); closeCommandPalette();">
          <span class="command-item-icon">🎬</span>
          <span class="command-item-label">${Utils.escapeHtml(Utils.truncate(v.title, 40))}</span>
          <span class="command-item-hint">${Utils.formatNumber(v.views)} views</span>
        </div>`;
    });
  }

  // Actions
  html += `
    <div class="command-item" onclick="toggleTheme(); closeCommandPalette();">
      <span class="command-item-icon">🎨</span>
      <span class="command-item-label">Toggle Theme</span>
      <span class="command-item-hint">Dark/Light</span>
    </div>

  `;

  results.innerHTML = html;
}

function closeCommandPalette() {
  document.getElementById('command-palette').style.display = 'none';
  commandPaletteOpen = false;
  document.getElementById('global-search').value = '';
}

// ========== KEYBOARD SHORTCUTS ==========

function handleKeyboard(e) {
  // Cmd/Ctrl+K for command palette
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (commandPaletteOpen) closeCommandPalette();
    else openCommandPalette();
  }

  // Escape to close modals/palettes
  if (e.key === 'Escape') {
    if (commandPaletteOpen) closeCommandPalette();
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById('notification-panel').style.display = 'none';
  }
}

// ========== REFRESH ==========

async function refreshData() {
  if (!YTApi.hasKey()) {
    showToast('API key not available', 'warning');
    return;
  }

  const btn = document.getElementById('refresh-btn');
  btn.style.animation = 'spin 1s linear infinite';

  try {
    const channels = Storage.getChannels();
    for (const ch of channels) {
      const updated = await YTApi.getChannelDetails(ch.id);
      if (updated.length > 0) {
        Storage.addChannel(updated[0]);
        Storage.addSnapshot(ch.id, {
          subscribers: updated[0].subscribers,
          views: updated[0].views,
          videos: updated[0].videoCount,
        });
      }
    }

    showToast(`Refreshed ${channels.length} channels`, 'success');
    addNotification('🔄', `Data refreshed for ${channels.length} channels`);

    updateDashboardStats();
    Charts.refreshAll();
    renderChannelList();
  } catch (err) {
    showToast(`Refresh failed: ${err.message}`, 'error');
  }

  btn.style.animation = '';
}

function setupAutoRefresh() {
  const interval = parseInt(Storage.getSetting('refreshInterval') || 0);
  if (refreshTimer) clearInterval(refreshTimer);
  if (interval > 0) {
    refreshTimer = setInterval(refreshData, interval);
  }
}

// ========== POPULATE SELECTORS ==========

function populateChannelSelectors() {
  const channels = Storage.getChannels();
  const options = channels.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.title)}</option>`).join('');

  // Heatmap
  const heatmapSelect = document.getElementById('heatmap-channel');
  if (heatmapSelect) {
    heatmapSelect.innerHTML = '<option value="">All Channels</option>' + options;
  }

  // Compare
  populateCompareSelectors();
}

// Add spin animation
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);
