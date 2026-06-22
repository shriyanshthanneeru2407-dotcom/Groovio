# Groovio - Social Music Profile Card 🎵

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-supported-orange.svg)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-supported-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JS](https://img.shields.io/badge/JavaScript-ES6-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![YouTube API](https://img.shields.io/badge/YouTube%20API-v3-red.svg)](https://developers.google.com/youtube/v3)

A premium, interactive Social Music Profile Card application. Sign in securely with your Google account, personalize your music bio, and curate your Top 10 Soundtrack slots by searching and pinning tracks directly from YouTube Music. Listen to your pinned tracks in real-time on a skeuomorphic vinyl record turntable.

---

## 🚀 Live Demo

You can access the live web deployment here:
**👉 [https://groovio-five.vercel.app](https://groovio-five.vercel.app)**

---

## ✨ Features

- **💿 Skeuomorphic Turntable Deck**: A visually stunning vinyl player that spins, raises/lowers the tonearm, and updates playback state in real-time.
- **🔐 Google OAuth 2.0 Integration**: Secure Google authentication using Implicit Grant Flow, pulling user names, profile avatars, and emails to dynamically key stored profiles.
- **📝 Personal Music Bio**: Custom text area editor (up to 200 characters) to tell the world about your music taste, persisted locally under keys unique to each logged-in account.
- **🏆 Top 10 Soundtrack Slots**: Curate exactly 10 songs on your social music card. Click empty slots to search and pin tracks directly to your profile.
- **🔍 YouTube Data API v3 Search**: Clean search drawer querying the official YouTube database in real-time with automated token expiration check and refresh.
- **🎨 Instagram Visual Identity**: Premium dark-mode layout styled with Instagram brand gradients, subtle glows, micro-interactions, and glassmorphic panels.
- **📱 Responsive Layout**: Adapts layout to viewports below 900px, wrapping side-by-side grids into clean vertical stacks.

---

## 🛠️ Tech Stack

- **Markup**: Semantic HTML5 & Inline SVGs
- **Styles**: Vanilla CSS3 (Custom design system, Instagram gradients, skeuomorphic turntable, keyframe animations)
- **Engine**: Client-side JavaScript (OAuth Implicit Flow, local profile data managers, YouTube Iframe API player integrations)

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/shriyanshthanneeru2407-dotcom/Groovio.git
cd Groovio
```

### 2. Configure Google Cloud Console
To enable search, you need your own Google OAuth Client ID:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **YouTube Data API v3**.
3. Configure your **OAuth Consent Screen** (user type: External, status: Testing) and add your email under **Test Users**.
4. Go to **Credentials**, click **Create Credentials > OAuth Client ID** (Web application).
5. Add Authorized Redirect URIs:
   - For local development: `http://localhost:3000/`
   - For Vercel hosting: `https://groovio-five.vercel.app/`

### 3. Run the local web server
Start the lightweight Node.js server:
```bash
node local-server.js
```

### 4. Open in Browser
Visit [http://localhost:3000](http://localhost:3000) to run the application locally!

---

## 📂 File Structure

```
groovio/
│
├── index.html          # Split-screen structure, bio forms, and Google Login setup
├── styles.css          # Design system, skeuomorphic turntable, and Instagram layout rules
├── app.js              # Google OAuth flow, search handler, bio & pin data managers
├── local-server.js     # Static Node.js web server
├── logo.png            # Instagram-themed brand logo icon
├── vercel.json         # Vercel static asset routing
└── .gitignore          # Git exclusion rules
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
