// State variables
let isPlaying = false;
let progressMs = 0;
let durationMs = 0;
let currentTab = 'playlists'; // or 'top-tracks'

// YouTube Player Variables
let ytPlayer = null;
let invidiousHost = '';
let youtubeTracks = [];
let youtubeCurrentIndex = 0;
let ytProgressInterval = null;
let currentTrackUri = null;

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const clientIdInput = document.getElementById('client-id-input');
const googleConnectBtn = document.getElementById('google-connect-btn');

const userProfile = document.getElementById('user-profile');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

const turntableDeck = document.getElementById('turntable-deck');
const vinylRecord = document.getElementById('vinyl-record');
const vinylLabel = document.getElementById('vinyl-label');
const tonearm = document.getElementById('tonearm');

const trackTitle = document.getElementById('track-title');
const trackArtists = document.getElementById('track-artists');

const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const progressBar = document.getElementById('progress-bar');
const progressWrapper = document.getElementById('progress-wrapper');

const shuffleBtn = document.getElementById('shuffle-btn');
const prevBtn = document.getElementById('prev-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const nextBtn = document.getElementById('next-btn');
const repeatBtn = document.getElementById('repeat-btn');

const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchDrawer = document.getElementById('search-drawer');
const searchCloseBtn = document.getElementById('search-close-btn');
const searchInput = document.getElementById('search-input');
const searchResultsList = document.getElementById('search-results-list');

const volumeToggleBtn = document.getElementById('volume-toggle-btn');
const volumeSliderContainer = document.getElementById('volume-slider-container');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const volumeIcon = document.getElementById('volume-icon');

const bioTextDisplay = document.getElementById('bio-text-display');
const bioEditBtn = document.getElementById('bio-edit-btn');
const bioEditWrapper = document.getElementById('bio-edit-wrapper');
const bioInput = document.getElementById('bio-input');
const bioSaveBtn = document.getElementById('bio-save-btn');
const soundtrackList = document.getElementById('soundtrack-list');

const ambientBg = document.getElementById('ambient-bg');
const logoRefresh = document.getElementById('logo-refresh');
const toast = document.getElementById('toast');

// --- Google OAuth & Session Variables ---
let googleAccessToken = null;
let loggedInEmail = '';
let userBio = '';
let pinnedTracks = []; // Max 10 items

// --- Initialization ---

async function init() {
  // Populate redirect URI copier dynamically
  const copierEl = document.getElementById('uri-copier');
  if (copierEl) {
    copierEl.textContent = window.location.origin + '/';
  }

  // Pre-fill saved Client ID if any
  const savedClientId = localStorage.getItem('groovio_google_client_id');
  if (savedClientId && clientIdInput) {
    clientIdInput.value = savedClientId;
  }

  // Clear legacy credentials from localStorage
  const keysToKeep = ['groovio_google_client_id', 'groovio_google_access_token', 'groovio_google_token_expiry'];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('groovio_') && !keysToKeep.includes(key) && !key.startsWith('groovio_bio_') && !key.startsWith('groovio_tracks_')) {
      localStorage.removeItem(key);
    }
  }

  // Check if returning from OAuth redirect
  handleOAuthRedirect();

  // Load YouTube Player API
  loadYouTubePlayerAPI();

  // Validate active login session
  const token = getValidAccessToken();
  if (token) {
    await loginToYouTubeMusic(token);
  } else {
    showSetupScreen();
  }
}

function showSetupScreen() {
  setupScreen.classList.remove('hidden');
  userProfile.classList.add('hidden');
}

function handleOAuthRedirect() {
  const hash = window.location.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');

  if (accessToken && state === 'groovio_google_auth') {
    const expiryTime = Date.now() + parseInt(expiresIn, 10) * 1000;
    localStorage.setItem('groovio_google_access_token', accessToken);
    localStorage.setItem('groovio_google_token_expiry', expiryTime.toString());
    
    // Clean up address bar
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  return false;
}

function getValidAccessToken() {
  const token = localStorage.getItem('groovio_google_access_token');
  const expiry = localStorage.getItem('groovio_google_token_expiry');
  if (!token || !expiry) return null;
  
  if (Date.now() > parseInt(expiry, 10)) {
    // Expired! Clear token
    localStorage.removeItem('groovio_google_access_token');
    localStorage.removeItem('groovio_google_token_expiry');
    return null;
  }
  return token;
}

function loadYouTubePlayerAPI() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: '',
      playerVars: {
        'playsinline': 1,
        'controls': 0,
        'disablekb': 1,
        'fs': 0,
        'rel': 0
      },
      events: {
        'onStateChange': onYouTubePlayerStateChange
      }
    });
  };
}

function onYouTubePlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    
    // Dynamically update track duration from player once it begins streaming
    if (ytPlayer && ytPlayer.getDuration) {
      const durationSec = ytPlayer.getDuration();
      if (durationSec > 0) {
        durationMs = durationSec * 1000;
      }
    }
    
    updatePlaybackControls(true, false, 0);
    vinylRecord.classList.add('playing');
    tonearm.classList.add('active');
    startYouTubeProgressTimer();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlaybackControls(false, false, 0);
    vinylRecord.classList.remove('playing');
    tonearm.classList.remove('active');
    stopYouTubeProgressTimer();
  } else if (event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    stopYouTubeProgressTimer();
    playYouTubeNext();
  }
}

function startYouTubeProgressTimer() {
  if (ytProgressInterval) clearInterval(ytProgressInterval);
  ytProgressInterval = setInterval(() => {
    if (ytPlayer && isPlaying) {
      progressMs = ytPlayer.getCurrentTime() * 1000;
      updateProgressBar();
    }
  }, 500);
}

function stopYouTubeProgressTimer() {
  if (ytProgressInterval) {
    clearInterval(ytProgressInterval);
    ytProgressInterval = null;
  }
}

// --- Google Connect Trigger ---

googleConnectBtn.addEventListener('click', () => {
  const clientId = clientIdInput.value.trim();
  if (!clientId) {
    showToast('Please enter a Google Client ID', true);
    return;
  }
  
  localStorage.setItem('groovio_google_client_id', clientId);
  
  const redirectUri = window.location.origin + '/';
  const scope = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=groovio_google_auth`;
  
  showToast('Redirecting to Google Sign-In...');
  setTimeout(() => {
    window.location.href = authUrl;
  }, 1000);
});

async function loginToYouTubeMusic(token) {
  googleAccessToken = token;
  setupScreen.classList.add('hidden');
  userProfile.classList.remove('hidden');

  // Load profile details
  await fetchUserProfile();
  invidiousHost = await getInvidiousHost();
  
  // Load local profile bio and pinned soundtrack
  loadProfileData();

  // If there are pinned songs, cue the first one!
  if (pinnedTracks.length > 0) {
    youtubeTracks = [...pinnedTracks];
    loadYouTubeSong(0);
  } else {
    // If empty, cue some default songs
    await loadYouTubeDefaults();
  }
}

async function fetchUserProfile() {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`
      }
    });
    if (res.status === 401) {
      handleApiExpiry();
      return;
    }
    if (!res.ok) throw new Error();
    const userinfo = await res.json();
    
    loggedInEmail = userinfo.email || 'guest_user';
    userName.textContent = userinfo.name || 'Google User';
    if (userinfo.picture) {
      userAvatar.src = userinfo.picture;
      userAvatar.style.display = 'inline-block';
    } else {
      userAvatar.style.display = 'none';
    }
  } catch (err) {
    console.warn('Failed to load Google profile info:', err);
    userName.textContent = 'Google User';
    loggedInEmail = 'guest_user';
  }
}

async function getInvidiousHost() {
  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=type,health');
    const json = await res.json();
    const instances = json.filter(inst => {
      const details = inst[1];
      return details.type === 'https' && details.monitor && details.monitor.dailyRatios[0].ratio > 92;
    });
    return instances.length > 0 ? instances[Math.floor(Math.random() * Math.min(instances.length, 3))][0] : 'https://yewtu.be';
  } catch (err) {
    console.warn('Failed to resolve Invidious API instance, using fallback:', err);
    return 'https://yewtu.be';
  }
}

function handleApiExpiry() {
  showToast('Google session expired. Please sign in again.', true);
  localStorage.removeItem('groovio_google_access_token');
  localStorage.removeItem('groovio_google_token_expiry');
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

async function loadYouTubeDefaults() {
  try {
    const res = await fetch(`${invidiousHost}/api/v1/search?q=lofi%20hip%20hop&type=video`);
    const json = await res.json();
    youtubeTracks = json || [];
    
    if (youtubeTracks.length > 0) {
      loadYouTubeSong(0);
    }
  } catch (err) {
    showToast('Failed to load default songs. Use search to find tracks!', true);
  }
}

function loadYouTubeSong(index) {
  youtubeCurrentIndex = index;
  const track = youtubeTracks[index];
  if (!track) return;

  const videoId = track.videoId;
  const coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const songData = {
    uri: `youtube:track:${videoId}`,
    name: track.title,
    artists: [{ name: track.author }],
    album: {
      name: 'YouTube Music Stream',
      images: [{ url: coverUrl }]
    },
    lengthSeconds: track.lengthSeconds
  };

  isPlaying = false;
  if (ytPlayer && ytPlayer.cueVideoById) {
    ytPlayer.cueVideoById(videoId);
  }

  progressMs = 0;
  durationMs = track.lengthSeconds * 1000;

  updateTrackUI(songData);
  updatePlaybackControls(false, false, 0);
  updateProgressBar();
}

function toggleYouTubePlayback() {
  if (!ytPlayer || !ytPlayer.playVideo) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
}

function playYouTubeNext() {
  let nextIdx = youtubeCurrentIndex + 1;
  if (nextIdx >= youtubeTracks.length) nextIdx = 0;
  loadYouTubeSong(nextIdx);
  setTimeout(() => { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }, 400);
}

function playYouTubePrev() {
  let prevIdx = youtubeCurrentIndex - 1;
  if (prevIdx < 0) prevIdx = youtubeTracks.length - 1;
  loadYouTubeSong(prevIdx);
  setTimeout(() => { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }, 400);
}

// --- UI Updates ---

function updateTrackUI(track) {
  if (!track) return;

  const titleText = track.name;
  const artistsText = track.artists.map(a => a.name).join(', ');
  const albumArtUrl = track.album.images && track.album.images.length > 0 ? track.album.images[0].url : '';

  if (currentTrackUri !== track.uri) {
    currentTrackUri = track.uri;

    trackTitle.innerHTML = `<span>${titleText}</span>`;
    const spanWidth = trackTitle.querySelector('span').offsetWidth;
    const containerWidth = trackTitle.offsetWidth;

    if (spanWidth > containerWidth) {
      trackTitle.innerHTML = `<span>${titleText} &nbsp;&nbsp;&nbsp;&nbsp; ${titleText} &nbsp;&nbsp;&nbsp;&nbsp;</span>`;
      trackTitle.classList.add('scroll');
    } else {
      trackTitle.classList.remove('scroll');
    }

    trackArtists.textContent = artistsText;

    if (albumArtUrl) {
      vinylLabel.style.backgroundImage = `url('${albumArtUrl}')`;
      vinylLabel.classList.remove('empty');
      ambientBg.style.backgroundImage = `url('${albumArtUrl}')`;
    } else {
      vinylLabel.style.backgroundImage = 'none';
      vinylLabel.classList.add('empty');
      ambientBg.style.backgroundImage = 'none';
    }
  }

  if (isPlaying) {
    vinylRecord.classList.add('playing');
    tonearm.classList.add('active');
  } else {
    vinylRecord.classList.remove('playing');
    tonearm.classList.remove('active');
  }
}

function updatePlaybackControls(playing, shuffle, repeatMode) {
  if (playing) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    playPauseBtn.title = 'Pause';
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    playPauseBtn.title = 'Play';
  }

  if (shuffle) {
    shuffleBtn.classList.add('active');
  } else {
    shuffleBtn.classList.remove('active');
  }

  if (repeatMode > 0) {
    repeatBtn.classList.add('active');
    repeatBtn.title = repeatMode === 2 ? 'Repeat One' : 'Repeat All';
  } else {
    repeatBtn.classList.remove('active');
    repeatBtn.title = 'Repeat Off';
  }
}

function updateProgressBar() {
  timeCurrent.textContent = formatTime(progressMs);
  timeTotal.textContent = formatTime(durationMs);

  const percent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
  progressBar.style.width = `${percent}%`;
}

function formatTime(ms) {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// --- Scrubber Seeking ---

progressWrapper.addEventListener('click', (e) => {
  if (durationMs === 0) return;

  const rect = progressWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const seekPercent = Math.min(Math.max(clickX / width, 0), 1);
  const seekPosMs = Math.floor(seekPercent * durationMs);

  progressMs = seekPosMs;
  updateProgressBar();

  if (ytPlayer && ytPlayer.seekTo) {
    ytPlayer.seekTo(seekPosMs / 1000, true);
  }
});

// --- Core Controls Click Events ---

playPauseBtn.addEventListener('click', () => {
  toggleYouTubePlayback();
});

prevBtn.addEventListener('click', () => {
  playYouTubePrev();
});

nextBtn.addEventListener('click', () => {
  playYouTubeNext();
});

shuffleBtn.addEventListener('click', () => {
  shuffleBtn.classList.toggle('active');
  showToast(`Shuffle toggled!`);
});

repeatBtn.addEventListener('click', () => {
  const isAct = repeatBtn.classList.toggle('active');
  repeatBtn.title = isAct ? 'Repeat All' : 'Repeat Off';
  showToast(`Repeat toggled!`);
});

// --- Search Drawer & Input Events ---

searchToggleBtn.addEventListener('click', () => {
  searchDrawer.classList.add('open');
  searchInput.focus();
});

searchCloseBtn.addEventListener('click', () => {
  searchDrawer.classList.remove('open');
});

let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  
  if (!q) {
    searchResultsList.innerHTML = '<p class="track-artists" style="text-align: center; margin-top: 2rem;">Type to search YouTube Music...</p>';
    return;
  }

  searchDebounce = setTimeout(async () => {
    renderYouTubeSearchResults(q);
  }, 400);
});

async function renderYouTubeSearchResults(query) {
  searchResultsList.innerHTML = '<p class="track-artists" style="text-align: center; margin-top: 2rem;">Searching YouTube Music...</p>';
  try {
    const searchQuery = query.toLowerCase().includes('music') ? query : `${query} music`;
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=15`, {
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`
      }
    });
    if (res.status === 401) {
      handleApiExpiry();
      return;
    }
    if (!res.ok) throw new Error('API failed');
    const json = await res.json();
    const items = json.items || [];

    searchResultsList.innerHTML = '';
    if (items.length === 0) {
      searchResultsList.innerHTML = '<p class="track-artists" style="text-align: center; margin-top: 2rem;">No results found.</p>';
      return;
    }

    items.forEach(item => {
      const videoId = item.id?.videoId;
      if (!videoId) return;

      const track = {
        videoId: videoId,
        title: item.snippet?.title || 'Unknown Title',
        author: item.snippet?.channelTitle || 'YouTube Music',
        lengthSeconds: 240
      };

      const listItem = document.createElement('div');
      listItem.className = 'list-item';
      const coverUrl = item.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/default.jpg`;

      listItem.innerHTML = `
        <img src="${coverUrl}" class="list-item-img" alt="Art">
        <div class="list-item-details">
          <div class="list-item-title">${track.title}</div>
          <div class="list-item-subtitle">${track.author}</div>
        </div>
        <button class="small-btn save pin-action-btn" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 6px;">+ Pin</button>
      `;

      // Click cover art or details to preview song immediately
      const playPreview = () => {
        const existingIdx = youtubeTracks.findIndex(s => s.videoId === track.videoId);
        if (existingIdx !== -1) {
          loadYouTubeSong(existingIdx);
        } else {
          youtubeTracks.splice(youtubeCurrentIndex + 1, 0, track);
          loadYouTubeSong(youtubeCurrentIndex + 1);
        }
        setTimeout(() => { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }, 400);
        searchDrawer.classList.remove('open');
        showToast(`Playing "${track.title}"`);
      };

      listItem.querySelector('.list-item-details').addEventListener('click', playPreview);
      listItem.querySelector('.list-item-img').addEventListener('click', playPreview);

      // Click + Pin button to add to Top 10 Pinned Soundtrack
      listItem.querySelector('.pin-action-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        pinTrack(track);
      });

      searchResultsList.appendChild(listItem);
    });
  } catch (err) {
    console.error('YouTube search failed:', err);
    searchResultsList.innerHTML = '<p class="track-artists" style="text-align: center; margin-top: 2rem; color: var(--danger-color);">Search failed. Try again.</p>';
  }
}

// --- Profile Data Managers ---

function loadProfileData() {
  const emailKey = loggedInEmail.replace(/[@.]/g, '_');
  
  // Load Bio
  const savedBio = localStorage.getItem(`groovio_bio_${emailKey}`);
  userBio = savedBio || "Welcome to my music profile! Search and pin your favorite songs here.";
  bioTextDisplay.textContent = userBio;
  bioInput.value = userBio;
  
  // Load Pinned Tracks
  const savedTracks = localStorage.getItem(`groovio_tracks_${emailKey}`);
  try {
    pinnedTracks = savedTracks ? JSON.parse(savedTracks) : [];
  } catch(e) {
    pinnedTracks = [];
  }
  
  renderPinnedSoundtrack();
}

function saveProfileData() {
  const emailKey = loggedInEmail.replace(/[@.]/g, '_');
  localStorage.setItem(`groovio_bio_${emailKey}`, userBio);
  localStorage.setItem(`groovio_tracks_${emailKey}`, JSON.stringify(pinnedTracks));
}

function renderPinnedSoundtrack() {
  soundtrackList.innerHTML = '';
  
  // Generate 10 slots
  for (let i = 0; i < 10; i++) {
    const track = pinnedTracks[i];
    const slotItem = document.createElement('div');
    
    if (track) {
      slotItem.className = 'soundtrack-item';
      const coverUrl = `https://img.youtube.com/vi/${track.videoId}/default.jpg`;
      
      slotItem.innerHTML = `
        <span class="soundtrack-rank">${i + 1}</span>
        <img src="${coverUrl}" class="soundtrack-img" alt="Cover">
        <div class="soundtrack-details" style="cursor: pointer;">
          <div class="soundtrack-title" title="${track.title}">${track.title}</div>
          <div class="soundtrack-artist" title="${track.author}">${track.author}</div>
        </div>
        <div class="soundtrack-actions">
          <button class="action-icon-btn play" title="Play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="action-icon-btn delete" title="Remove Pin">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      
      const playSong = () => {
        youtubeTracks = [...pinnedTracks];
        loadYouTubeSong(i);
        setTimeout(() => { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }, 400);
      };
      
      slotItem.querySelector('.soundtrack-details').addEventListener('click', playSong);
      slotItem.querySelector('.action-icon-btn.play').addEventListener('click', (e) => {
        e.stopPropagation();
        playSong();
      });
      
      slotItem.querySelector('.action-icon-btn.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        unpinTrack(i);
      });
      
    } else {
      slotItem.className = 'soundtrack-item empty';
      slotItem.innerHTML = `
        <span class="soundtrack-rank">${i + 1}</span>
        <span>Empty Slot - Click to Pin Song</span>
      `;
      
      slotItem.addEventListener('click', () => {
        searchDrawer.classList.add('open');
        searchInput.focus();
      });
    }
    
    soundtrackList.appendChild(slotItem);
  }
}

function pinTrack(track) {
  if (pinnedTracks.length >= 10) {
    showToast('Soundtrack is full! Remove a song first.', true);
    return;
  }
  
  // Prevent duplicate pins
  if (pinnedTracks.some(t => t.videoId === track.videoId)) {
    showToast('Song is already pinned to your soundtrack!', true);
    return;
  }

  pinnedTracks.push(track);
  saveProfileData();
  renderPinnedSoundtrack();
  showToast(`Pinned "${track.title}" to slot #${pinnedTracks.length}!`);
}

function unpinTrack(index) {
  const title = pinnedTracks[index]?.title || 'Song';
  pinnedTracks.splice(index, 1);
  saveProfileData();
  renderPinnedSoundtrack();
  showToast(`Removed "${title}" from soundtrack.`);
}

// --- Bio Editor Action Listeners ---

bioEditBtn.addEventListener('click', () => {
  bioTextDisplay.classList.add('hidden');
  bioEditWrapper.classList.remove('hidden');
  bioEditBtn.classList.add('hidden');
  bioInput.focus();
});

bioSaveBtn.addEventListener('click', () => {
  const newBio = bioInput.value.trim();
  userBio = newBio || "Welcome to my music profile! Search and pin your favorite songs here.";
  bioTextDisplay.textContent = userBio;
  
  bioTextDisplay.classList.remove('hidden');
  bioEditWrapper.classList.add('hidden');
  bioEditBtn.classList.remove('hidden');
  
  saveProfileData();
  showToast('Bio updated!');
});

// --- Volume Slider Control ---

volumeToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  volumeSliderContainer.classList.toggle('show');
});

volumeSlider.addEventListener('input', () => {
  const val = volumeSlider.value;
  volumeValue.textContent = `${val}%`;
  
  if (val == 0) {
    volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
  } else if (val < 50) {
    volumeIcon.innerHTML = '<path d="M7 9H3v6h4l5 5V4L7 9zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
  } else {
    volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
  }
});

volumeSlider.addEventListener('change', () => {
  const val = volumeSlider.value;
  if (ytPlayer && ytPlayer.setVolume) {
    ytPlayer.setVolume(val);
  }
});

logoutBtn.addEventListener('click', () => {
  if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
  localStorage.removeItem('groovio_google_access_token');
  localStorage.removeItem('groovio_google_token_expiry');
  window.location.reload();
});

logoRefresh.addEventListener('click', () => {
  loadYouTubeDefaults();
  showToast('YouTube Music refreshed!');
});

document.addEventListener('click', (e) => {
  if (!volumeSliderContainer.contains(e.target) && e.target !== volumeToggleBtn && !volumeToggleBtn.contains(e.target)) {
    volumeSliderContainer.classList.remove('show');
  }
});

// --- Toast Alerts ---

let toastTimeout = null;
function showToast(message, isError = false) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  
  if (isError) {
    toast.classList.add('error');
  } else {
    toast.classList.remove('error');
  }
  
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// --- Start the App ---

init();
