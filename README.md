# YTNavigator

> A comprehensive YouTube channel & video analytics dashboard — fully client-side, no backend required.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![GitHub Pages](https://img.shields.io/badge/hosted%20on-GitHub%20Pages-222?logo=github)
![YouTube API](https://img.shields.io/badge/YouTube%20Data%20API-v3-red?logo=youtube)

---

## ✨ Features

### 📺 Channel Management
- Search & register YouTube channels
- Channel stats dashboard (subscribers, views, videos)
- Channel detail view with branding & description
- Growth tracking with historical snapshots
- Multi-channel comparison (side-by-side)

### 🎬 Video Management
- Auto-fetch latest videos for registered channels
- Detailed video stats (views, likes, comments, engagement)
- Sort & filter by multiple criteria
- Duration parsing & category display
- Favorites & Watch Later lists

### 📈 Data Visualization
- Subscriber & view trend charts (Chart.js)
- Engagement rate doughnut charts
- Top videos bar charts
- Upload time heatmaps
- Growth prediction with trend analysis
- Tag frequency & performance charts
- Day-of-week performance analysis

### 🔔 Alerts & Monitoring
- Custom alerts for subscriber/view milestones
- Notification panel with history
- Alert status tracking (active/triggered)

### 🔍 Search & Filtering
- Global search (Cmd/Ctrl + K command palette)
- Filter videos by date range, view count, engagement
- Sort by views, likes, date, engagement rate
- Keyword clustering & tag cloud

### 📊 Reports & Export
- Generate CSV reports for channels & videos
- JSON data export/import
- Dashboard screenshot export (html2canvas)
- Report history tracking

### 🧠 Integrated Analysis
- AI-style insights (upload frequency, engagement, tags, titles)
- CTR estimation algorithm
- Best posting day analysis
- Keyword trend tracking

### ⚡ Advanced Features
- Dark / Light theme with auto-detection
- Compact mode for dense data views
- Drag & drop dashboard cards (Sortable.js)
- Keyboard shortcuts throughout
- Auto-refresh at configurable intervals
- Hash-based routing (13 pages in one SPA)
- Full data import/export/clear

### 🎨 UX / UI
- Modern glassmorphism-inspired design
- Responsive layout (desktop, tablet, mobile)
- Collapsible sidebar navigation
- Animated loading states & skeleton screens
- Toast notifications
- Print-friendly styles

---

## 🚀 Getting Started

### Prerequisites

1. **YouTube Data API v3 Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select existing)
   - Enable **YouTube Data API v3**
   - Create an **API Key** under Credentials
   - (Recommended) Restrict the key to YouTube Data API v3 only

### Usage

1. Open the app in your browser
2. Click the **🔑 API Key** button in the top bar
3. Paste your YouTube API key and save
4. Start searching for channels and exploring analytics!

### Run Locally

Fork or clone this repository:
   ```bash
   git clone https://github.com/yt-navigator/yt-navigator.github.io.git
   ```

Simply open `index.html` in a modern web browser. No build step or server required!

```bash
# Or use any simple HTTP server:
npx serve .
# or
python3 -m http.server 8000
```

---

## 🗂 Project Structure

```
YT-Navigator/
├── index.html          # Main SPA application
├── privacy.html        # Privacy Policy
├── terms.html          # Terms of Service
├── LICENSE             # MIT License
├── README.md           # This file
├── .nojekyll           # Bypass Jekyll on GitHub Pages
├── css/
│   └── style.css       # Complete design system (dark/light themes)
└── js/
    ├── storage.js      # Local Storage abstraction layer
    ├── api.js          # YouTube Data API v3 wrapper
    ├── utils.js        # Formatting, helpers, analysis functions
    ├── charts.js       # Chart.js configurations & rendering
    └── app.js          # Main application logic & navigation
```

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5 / CSS3 / JavaScript** | Core application (no framework) |
| **Chart.js 4.4.1** | Data visualization & charts |
| **chartjs-plugin-datalabels 2.2.0** | Chart annotations |
| **html2canvas 1.4.1** | Dashboard screenshot export |
| **Sortable.js 1.15.0** | Drag & drop card reordering |
| **YouTube Data API v3** | Channel & video data |
| **Local Storage** | Client-side data persistence |
| **Google Fonts (Inter)** | Typography |
| **GitHub Pages** | Hosting |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + /` | Toggle sidebar |
| `Escape` | Close modals / command palette |
| `1-9` | Quick navigate to pages (in command palette) |

---

## 🔒 Privacy & Security

- **No backend** — everything runs in your browser
- **No accounts** — no registration or login required
- **No tracking** — no analytics, cookies, or third-party trackers
- **Local data** — all data stored in your browser's Local Storage
- **Your API key** — stored locally, never transmitted to any server except Google's API
- **Open source** — full transparency, audit the code yourself

Read our full [Privacy Policy](privacy.html) and [Terms of Service](terms.html).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

YTNavigator is **not affiliated with, endorsed by, or sponsored by** Google or YouTube. All YouTube-related trademarks belong to Google LLC. Data displayed by this application is sourced from YouTube's public API.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Made with ❤️ for the YouTube creator community
</p>
