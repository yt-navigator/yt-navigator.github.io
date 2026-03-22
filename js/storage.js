/* ====================================================
   YTNavigator – Storage Module
   Local Storage management for all app data
   ==================================================== */

const Storage = (() => {
  const KEYS = {
    API_KEY: 'ytnav_api_key',
    CHANNELS: 'ytnav_channels',
    VIDEOS: 'ytnav_videos',
    FAVORITES: 'ytnav_favorites',
    WATCH_LATER: 'ytnav_watch_later',
    ALERTS: 'ytnav_alerts',
    ALERT_HISTORY: 'ytnav_alert_history',
    NOTIFICATIONS: 'ytnav_notifications',
    SETTINGS: 'ytnav_settings',
    REPORT_HISTORY: 'ytnav_report_history',
    HISTORY: 'ytnav_history',
    SNAPSHOTS: 'ytnav_snapshots',
  };

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage full or unavailable:', e);
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  // API Key
  function getApiKey() { return get(KEYS.API_KEY, ''); }
  function setApiKey(key) { set(KEYS.API_KEY, key); }

  // Channels
  function getChannels() { return get(KEYS.CHANNELS, []); }
  function setChannels(channels) { set(KEYS.CHANNELS, channels); }
  function addChannel(channel) {
    const channels = getChannels();
    const exists = channels.find(c => c.id === channel.id);
    if (exists) {
      Object.assign(exists, channel);
    } else {
      channel.addedAt = Date.now();
      channels.push(channel);
    }
    setChannels(channels);
    return channel;
  }
  function removeChannel(id) {
    setChannels(getChannels().filter(c => c.id !== id));
    // Also remove channel's videos
    setVideos(getVideos().filter(v => v.channelId !== id));
  }

  // Videos
  function getVideos() { return get(KEYS.VIDEOS, []); }
  function setVideos(videos) { set(KEYS.VIDEOS, videos); }
  function addVideos(newVideos) {
    const videos = getVideos();
    const existingIds = new Set(videos.map(v => v.id));
    for (const v of newVideos) {
      if (existingIds.has(v.id)) {
        const idx = videos.findIndex(x => x.id === v.id);
        if (idx >= 0) Object.assign(videos[idx], v);
      } else {
        videos.push(v);
      }
    }
    setVideos(videos);
  }

  // Favorites
  function getFavorites() { return get(KEYS.FAVORITES, { channels: [], videos: [] }); }
  function setFavorites(favs) { set(KEYS.FAVORITES, favs); }
  function toggleFavorite(type, id) {
    const favs = getFavorites();
    const list = favs[type] || [];
    const idx = list.indexOf(id);
    if (idx >= 0) { list.splice(idx, 1); } else { list.push(id); }
    favs[type] = list;
    setFavorites(favs);
    return idx < 0; // returns true if now favorited
  }
  function isFavorite(type, id) {
    return (getFavorites()[type] || []).includes(id);
  }

  // Watch Later
  function getWatchLater() { return get(KEYS.WATCH_LATER, []); }
  function setWatchLater(list) { set(KEYS.WATCH_LATER, list); }
  function toggleWatchLater(videoId) {
    const list = getWatchLater();
    const idx = list.indexOf(videoId);
    if (idx >= 0) { list.splice(idx, 1); } else { list.push(videoId); }
    setWatchLater(list);
    return idx < 0;
  }
  function isWatchLater(videoId) {
    return getWatchLater().includes(videoId);
  }

  // Alerts
  function getAlerts() { return get(KEYS.ALERTS, []); }
  function setAlerts(alerts) { set(KEYS.ALERTS, alerts); }
  function addAlert(alert) {
    const alerts = getAlerts();
    alert.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    alert.createdAt = Date.now();
    alerts.push(alert);
    setAlerts(alerts);
    return alert;
  }
  function removeAlert(id) {
    setAlerts(getAlerts().filter(a => a.id !== id));
  }

  // Alert History
  function getAlertHistory() { return get(KEYS.ALERT_HISTORY, []); }
  function addAlertHistoryEntry(entry) {
    const history = getAlertHistory();
    entry.triggeredAt = Date.now();
    history.unshift(entry);
    if (history.length > 100) history.length = 100;
    set(KEYS.ALERT_HISTORY, history);
  }

  // Notifications
  function getNotifications() { return get(KEYS.NOTIFICATIONS, []); }
  function addNotification(notif) {
    const notifs = getNotifications();
    notif.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    notif.time = Date.now();
    notif.read = false;
    notifs.unshift(notif);
    if (notifs.length > 50) notifs.length = 50;
    set(KEYS.NOTIFICATIONS, notifs);
    return notif;
  }
  function markNotificationsRead() {
    const notifs = getNotifications();
    notifs.forEach(n => n.read = true);
    set(KEYS.NOTIFICATIONS, notifs);
  }
  function clearNotificationsStore() { set(KEYS.NOTIFICATIONS, []); }

  // Settings
  function getSettings() {
    return get(KEYS.SETTINGS, {
      theme: 'dark',
      accentColor: '#ff0050',
      chartAnimation: true,
      compact: false,
      refreshInterval: 0,
      browserNotifications: false,
      dailySummary: false,
    });
  }
  function setSettings(settings) { set(KEYS.SETTINGS, settings); }
  function getSetting(key) { return getSettings()[key]; }
  function setSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    setSettings(settings);
  }

  // Report History
  function getReportHistory() { return get(KEYS.REPORT_HISTORY, []); }
  function addReportHistory(entry) {
    const history = getReportHistory();
    entry.generatedAt = Date.now();
    history.unshift(entry);
    if (history.length > 20) history.length = 20;
    set(KEYS.REPORT_HISTORY, history);
  }

  // Snapshots (for growth tracking)
  function getSnapshots() { return get(KEYS.SNAPSHOTS, {}); }
  function addSnapshot(channelId, data) {
    const snapshots = getSnapshots();
    if (!snapshots[channelId]) snapshots[channelId] = [];
    snapshots[channelId].push({
      timestamp: Date.now(),
      subscribers: data.subscribers,
      views: data.views,
      videos: data.videos,
    });
    // Keep last 365 snapshots per channel
    if (snapshots[channelId].length > 365) {
      snapshots[channelId] = snapshots[channelId].slice(-365);
    }
    set(KEYS.SNAPSHOTS, snapshots);
  }
  function getChannelSnapshots(channelId) {
    return (getSnapshots()[channelId] || []);
  }

  // Export / Import
  function exportAll() {
    const data = {};
    for (const [name, key] of Object.entries(KEYS)) {
      data[name] = get(key);
    }
    return data;
  }
  function importAll(data) {
    for (const [name, key] of Object.entries(KEYS)) {
      if (data[name] !== undefined) {
        set(key, data[name]);
      }
    }
  }
  function clearAll() {
    for (const key of Object.values(KEYS)) {
      remove(key);
    }
  }

  function getUsedBytes() {
    let total = 0;
    for (const key of Object.values(KEYS)) {
      const item = localStorage.getItem(key);
      if (item) total += item.length * 2; // UTF-16
    }
    return total;
  }

  return {
    getApiKey, setApiKey,
    getChannels, setChannels, addChannel, removeChannel,
    getVideos, setVideos, addVideos,
    getFavorites, setFavorites, toggleFavorite, isFavorite,
    getWatchLater, setWatchLater, toggleWatchLater, isWatchLater,
    getAlerts, setAlerts, addAlert, removeAlert,
    getAlertHistory, addAlertHistoryEntry,
    getNotifications, addNotification, markNotificationsRead, clearNotificationsStore,
    getSettings, setSettings, getSetting, setSetting,
    getReportHistory, addReportHistory,
    getSnapshots, addSnapshot, getChannelSnapshots,
    exportAll, importAll, clearAll, getUsedBytes,
  };
})();
