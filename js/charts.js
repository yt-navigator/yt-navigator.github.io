/* ====================================================
   YTNavigator – Charts Module
   All Chart.js chart initializations and updates
   ==================================================== */

const Charts = (() => {
  const instances = {};

  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      text: style.getPropertyValue('--text').trim(),
      muted: style.getPropertyValue('--text-muted').trim(),
      grid: style.getPropertyValue('--chart-grid').trim(),
      accent: style.getPropertyValue('--accent').trim(),
      bg: style.getPropertyValue('--bg-card').trim(),
    };
  }

  function defaultOptions(title = '') {
    const c = getThemeColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: Storage.getSetting('chartAnimation') !== false ? 600 : 0 },
      plugins: {
        legend: {
          labels: { color: c.muted, font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 12 },
        },
        title: title ? {
          display: true, text: title, color: c.text,
          font: { family: 'Inter', size: 13, weight: 600 }, padding: { bottom: 8 },
        } : { display: false },
        tooltip: {
          backgroundColor: c.bg, titleColor: c.text, bodyColor: c.muted,
          borderColor: c.grid, borderWidth: 1,
          cornerRadius: 8, padding: 10,
          titleFont: { family: 'Inter', weight: 600 },
          bodyFont: { family: 'Inter' },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          ticks: { color: c.muted, font: { family: 'Inter', size: 10 }, maxRotation: 45 },
          grid: { color: c.grid, drawBorder: false },
        },
        y: {
          ticks: { color: c.muted, font: { family: 'Inter', size: 10 }, callback: val => Utils.formatNumber(val) },
          grid: { color: c.grid, drawBorder: false },
          beginAtZero: true,
        },
      },
    };
  }

  function destroyChart(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function getOrCreate(id, config) {
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    instances[id] = new Chart(ctx, config);
    return instances[id];
  }

  // ========== DASHBOARD: Subscriber Growth ==========

  function renderSubsChart(range = '7d') {
    const channels = Storage.getChannels();
    const labels = Utils.getDateLabels(range);
    const datasets = [];

    channels.forEach((ch, i) => {
      const snapshots = Storage.getChannelSnapshots(ch.id);
      const { data } = Utils.generateGrowthData(snapshots, range);

      // If no snapshots, generate slight variation from current
      const finalData = data.every(d => d === 0) && ch.subscribers
        ? labels.map((_, j) => Math.round(ch.subscribers - (labels.length - j) * (ch.subscribers * 0.001)))
        : data;

      datasets.push({
        label: ch.title,
        data: finalData,
        borderColor: Utils.getColor(i),
        backgroundColor: Utils.getColorAlpha(i, 0.1),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: range === '7d' ? 3 : 0,
        pointHoverRadius: 5,
      });
    });

    if (datasets.length === 0) {
      datasets.push({
        label: 'No Data',
        data: labels.map(() => 0),
        borderColor: '#555',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
      });
    }

    const opts = defaultOptions();
    getOrCreate('chart-subs', { type: 'line', data: { labels, datasets }, options: opts });
  }

  // ========== DASHBOARD: Views Overview ==========

  function renderViewsChart(range = '7d') {
    const channels = Storage.getChannels();
    const labels = Utils.getDateLabels(range);
    const datasets = [];

    channels.forEach((ch, i) => {
      const snapshots = Storage.getChannelSnapshots(ch.id);
      const growthData = Utils.generateGrowthData(snapshots, range);

      const finalData = growthData.data.every(d => d === 0) && ch.views
        ? labels.map((_, j) => Math.round(ch.views - (labels.length - j) * (ch.views * 0.0005)))
        : growthData.data.map((_, j) => {
            const snap = snapshots[j] || snapshots[snapshots.length - 1];
            return snap ? snap.views : 0;
          });

      datasets.push({
        label: ch.title,
        data: finalData,
        borderColor: Utils.getColor(i),
        backgroundColor: Utils.getColorAlpha(i, 0.08),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
      });
    });

    if (datasets.length === 0) {
      datasets.push({
        label: 'No Data',
        data: labels.map(() => 0),
        borderColor: '#555',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
      });
    }

    getOrCreate('chart-views', { type: 'line', data: { labels, datasets }, options: defaultOptions() });
  }

  // ========== DASHBOARD: Engagement Pie ==========

  function renderEngagementChart() {
    const videos = Storage.getVideos();
    const totalLikes = videos.reduce((s, v) => s + (v.likes || 0), 0);
    const totalComments = videos.reduce((s, v) => s + (v.comments || 0), 0);
    const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);

    const c = getThemeColors();
    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: Storage.getSetting('chartAnimation') !== false ? 600 : 0 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.muted, font: { family: 'Inter', size: 11 }, padding: 16 },
        },
        tooltip: {
          backgroundColor: c.bg, titleColor: c.text, bodyColor: c.muted,
          borderColor: c.grid, borderWidth: 1, cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${Utils.formatNumber(ctx.raw)}`,
          },
        },
        datalabels: { display: false },
      },
    };

    getOrCreate('chart-engagement', {
      type: 'doughnut',
      data: {
        labels: ['Views', 'Likes', 'Comments'],
        datasets: [{
          data: [totalViews, totalLikes, totalComments],
          backgroundColor: ['#00b4d8', '#00d68f', '#ffaa00'],
          borderColor: c.bg,
          borderWidth: 3,
        }],
      },
      options: opts,
    });
  }

  // ========== DASHBOARD: Top Videos Bar ==========

  function renderTopVideosChart() {
    const videos = [...Storage.getVideos()]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 8);

    const labels = videos.map(v => Utils.truncate(v.title, 25));
    const data = videos.map(v => v.views || 0);
    const colors = videos.map((_, i) => Utils.getColor(i));

    const opts = defaultOptions();
    opts.indexAxis = 'y';
    opts.plugins.legend.display = false;
    opts.scales.x.ticks.callback = v => Utils.formatNumber(v);

    getOrCreate('chart-top-videos', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + '33'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: opts,
    });
  }

  // ========== COMPARE: Channel Comparison ==========

  function renderCompareChannelsChart(channelData) {
    if (!channelData || channelData.length === 0) {
      destroyChart('chart-compare-channels');
      return;
    }

    const labels = channelData.map(c => c.title);
    const metrics = ['subscribers', 'views', 'videoCount'];
    const metricLabels = ['Subscribers', 'Total Views', 'Videos'];
    const metricColors = ['#ff0050', '#00b4d8', '#00d68f'];

    const datasets = metrics.map((m, i) => ({
      label: metricLabels[i],
      data: channelData.map(c => c[m] || 0),
      backgroundColor: metricColors[i] + '33',
      borderColor: metricColors[i],
      borderWidth: 1,
      borderRadius: 4,
    }));

    const opts = defaultOptions();
    getOrCreate('chart-compare-channels', {
      type: 'bar',
      data: { labels, datasets },
      options: opts,
    });
  }

  // ========== INSIGHTS: Growth Prediction ==========

  function renderGrowthPrediction() {
    const channels = Storage.getChannels();
    if (channels.length === 0) {
      destroyChart('chart-growth-prediction');
      return;
    }

    const labels = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    const datasets = channels.slice(0, 4).map((ch, i) => {
      const base = ch.subscribers || 0;
      const monthlyGrowth = base * 0.02; // estimate 2% monthly growth
      const data = labels.map((_, j) => Math.round(base + monthlyGrowth * j));

      return {
        label: ch.title,
        data,
        borderColor: Utils.getColor(i),
        backgroundColor: Utils.getColorAlpha(i, 0.05),
        borderWidth: 2,
        borderDash: [5, 5],
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      };
    });

    getOrCreate('chart-growth-prediction', {
      type: 'line',
      data: { labels, datasets },
      options: defaultOptions(),
    });
  }

  // ========== INSIGHTS: Upload Times ==========

  function renderUploadTimesChart() {
    const videos = Storage.getVideos();
    const hourCounts = new Array(24).fill(0);

    for (const v of videos) {
      if (!v.publishedAt) continue;
      const h = new Date(v.publishedAt).getHours();
      hourCounts[h]++;
    }

    const labels = hourCounts.map((_, i) => {
      const h = i % 12 || 12;
      return `${h}${i < 12 ? 'AM' : 'PM'}`;
    });

    const maxVal = Math.max(...hourCounts, 1);
    const colors = hourCounts.map(c => {
      const intensity = c / maxVal;
      return `rgba(255, 0, 80, ${0.2 + intensity * 0.8})`;
    });

    const opts = defaultOptions();
    opts.plugins.legend.display = false;

    getOrCreate('chart-upload-times', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: hourCounts,
          backgroundColor: colors,
          borderRadius: 4,
        }],
      },
      options: opts,
    });
  }

  // ========== INSIGHTS: Engagement Trend ==========

  function renderEngagementTrend() {
    const videos = [...Storage.getVideos()]
      .filter(v => v.publishedAt)
      .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

    if (videos.length === 0) {
      destroyChart('chart-engagement-trend');
      return;
    }

    const labels = videos.map(v => Utils.formatDateShort(v.publishedAt));
    const data = videos.map(v => Utils.engagementRate(v));

    const opts = defaultOptions();
    opts.plugins.legend.display = false;
    opts.scales.y.ticks.callback = v => v.toFixed(1) + '%';

    getOrCreate('chart-engagement-trend', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#ff0050',
          backgroundColor: 'rgba(255,0,80,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: videos.length < 20 ? 3 : 0,
        }],
      },
      options: opts,
    });
  }

  // ========== KEYWORDS: Tag Frequency ==========

  function renderTagChart() {
    const videos = Storage.getVideos();
    const tagFreq = Utils.getTagFrequency(videos).slice(0, 15);

    if (tagFreq.length === 0) {
      destroyChart('chart-tags');
      return;
    }

    const labels = tagFreq.map(([t]) => Utils.truncate(t, 20));
    const data = tagFreq.map(([, c]) => c);
    const colors = tagFreq.map((_, i) => Utils.getColor(i));

    const opts = defaultOptions();
    opts.indexAxis = 'y';
    opts.plugins.legend.display = false;

    getOrCreate('chart-tags', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + '33'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: opts,
    });
  }

  // ========== KEYWORDS: Tag Performance ==========

  function renderTagPerformanceChart() {
    const videos = Storage.getVideos();
    const perf = Utils.getTagPerformance(videos).slice(0, 10);

    if (perf.length === 0) {
      destroyChart('chart-tag-performance');
      return;
    }

    const labels = perf.map(p => Utils.truncate(p.tag, 18));

    const opts = defaultOptions();

    getOrCreate('chart-tag-performance', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Avg Views',
            data: perf.map(p => p.avgViews),
            backgroundColor: 'rgba(0,180,216,0.3)',
            borderColor: '#00b4d8',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Avg Likes',
            data: perf.map(p => p.avgLikes),
            backgroundColor: 'rgba(0,214,143,0.3)',
            borderColor: '#00d68f',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: opts,
    });
  }

  // ========== HEATMAP: Day Performance ==========

  function renderDayPerformanceChart() {
    const videos = Storage.getVideos();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayViews = [0, 0, 0, 0, 0, 0, 0];
    const dayCount = [0, 0, 0, 0, 0, 0, 0];

    for (const v of videos) {
      if (!v.publishedAt) continue;
      const day = new Date(v.publishedAt).getDay();
      dayViews[day] += v.views || 0;
      dayCount[day]++;
    }

    const avgViews = dayViews.map((v, i) => dayCount[i] > 0 ? Math.round(v / dayCount[i]) : 0);

    const maxVal = Math.max(...avgViews, 1);
    const colors = avgViews.map(v => {
      const intensity = v / maxVal;
      return `rgba(255, 0, 80, ${0.15 + intensity * 0.85})`;
    });

    const opts = defaultOptions();
    opts.plugins.legend.display = false;

    getOrCreate('chart-day-performance', {
      type: 'bar',
      data: {
        labels: dayNames,
        datasets: [{
          label: 'Avg Views',
          data: avgViews,
          backgroundColor: colors,
          borderRadius: 6,
        }],
      },
      options: opts,
    });
  }

  // ========== REFRESH ALL ==========

  function refreshAll() {
    renderSubsChart();
    renderViewsChart();
    renderEngagementChart();
    renderTopVideosChart();
    renderGrowthPrediction();
    renderUploadTimesChart();
    renderEngagementTrend();
    renderTagChart();
    renderTagPerformanceChart();
    renderDayPerformanceChart();
  }

  // ========== THEME UPDATE ==========

  function updateTheme() {
    // Re-render all charts with new theme colors
    setTimeout(() => refreshAll(), 100);
  }

  return {
    renderSubsChart, renderViewsChart,
    renderEngagementChart, renderTopVideosChart,
    renderCompareChannelsChart,
    renderGrowthPrediction, renderUploadTimesChart,
    renderEngagementTrend,
    renderTagChart, renderTagPerformanceChart,
    renderDayPerformanceChart,
    refreshAll, updateTheme,
    destroyChart,
  };
})();
