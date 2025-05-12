// HTML Elements
const audioSource = document.getElementById('audio-source');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressBarContainer = document.querySelector('.progress-bar-container');
const progressBar = document.querySelector('.progress-bar');
const currentTimeDisplay = document.getElementById('current-time');
const durationDisplay = document.getElementById('duration');
const visualizerCanvas = document.getElementById('visualizer');
const visualizerContext = visualizerCanvas.getContext('2d'); // Get 2D rendering context

// Bottom audio bar elements
const audioBarTrackName = document.getElementById('audio-bar-track-name');
const audioBarPlayPauseBtn = document.getElementById('audio-bar-play-pause');
const audioBarNextBtn = document.getElementById('audio-bar-next');

// Track List elements
const trackListContainer = document.querySelector('.track-list-container');
const trackListUL = document.getElementById('track-list');

// Volume Control elements
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');


// Web Audio API Context and Analyser
let audioContext;
let analyser;
let sourceNode;
let dataArray;
let bufferLength;

// ==============================================================
// ZAROORI! YAHAN PAR AAPKI AUDIO FILES KE PATHS HONGE!
// INHEIN APNI FILES KE EXACT NAAM AUR LOCATIONS KE MUTABIQ UPDATE ZAROOR KAREIN.
// ==============================================================
const audioFiles = [
    'audio/song1.mp3',      // Example: Agar aapki file ka naam 'song1.mp3' hai
    'audio/track_2.wav',    // Example: Agar aapki file ka naam 'track_2.wav' hai
    'audio/jingle.ogg',     // Example: Agar aapki file ka naam 'jingle.ogg' hai
    // Agar aapke paas aur audio files hain, toh unhe yahan is format mein add karein:
    // 'audio/my_new_song.mp3',
    // 'audio/instrumental_track.wav'
];
// ==============================================================

let currentTrackIndex = 0;
let isPlaying = false;

// Function to format time (e.g., 150 seconds -> 2:30)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Function to initialize Web Audio API
function initAudioAPI() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Number of samples for FFT (Fast Fourier Transform)
        // Smaller fftSize means fewer bars but faster updates
        bufferLength = analyser.frequencyBinCount; // Number of data points (half of fftSize)
        dataArray = new Uint8Array(bufferLength); // Array to hold frequency data

        sourceNode = audioContext.createMediaElementSource(audioSource);
        // Connect source to analyser, and analyser to speakers (audio context destination)
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
    }
}

// Function to load a track
function loadTrack(index, autoPlay = true) {
    if (index >= 0 && index < audioFiles.length) {
        currentTrackIndex = index; // Update global currentTrackIndex
        const trackPath = audioFiles[index];
        audioSource.src = trackPath;
        audioSource.load(); // Load the audio file (important for getting duration etc.)

        // Extract file name without extension for display on bottom bar and list
        const fileName = trackPath.split('/').pop(); // Gets "song1.mp3"
        const trackDisplayName = fileName.split('.').slice(0, -1).join('.'); // Gets "song1"
        
        if (audioBarTrackName) {
            audioBarTrackName.textContent = trackDisplayName; // Update bottom bar track name
        }
        
        if (autoPlay) {
            audioSource.play().catch(error => { // Playback error handling
                console.error("Audio Playback Error:", error);
                if (error.name === 'NotAllowedError') {
                    console.warn("Autoplay prevented! User must interact with the document first.");
                    // You might want to show a message on screen here
                }
            });
            isPlaying = true;
        } else {
            isPlaying = false;
            audioSource.pause(); // Ensure it's paused if not auto-playing
        }
        updatePlayPauseIcons();
        initAudioAPI(); // Initialize audio API when a track is loaded
        drawVisualizer(); // Start drawing the visualizer
        highlightCurrentTrack(); // Highlight the active track in the list
    } else {
        // Handle no tracks or invalid index
        console.warn("No track loaded or invalid index:", index);
        if (audioBarTrackName) {
            audioBarTrackName.textContent = "No track";
        }
        playPauseBtn.disabled = true;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        audioBarPlayPauseBtn.disabled = true;
        audioBarNextBtn.disabled = true;
        progressBar.style.width = '0%';
        currentTimeDisplay.textContent = '0:00';
        durationDisplay.textContent = '0:00';
        isPlaying = false; // Not playing if no tracks
        updatePlayPauseIcons();
    }
}

// Function to play or pause
function playPauseToggle() {
    if (!audioContext) { // Initialize context on first play interaction
        initAudioAPI();
        // If it's the very first play and no track is loaded, load the first one
        if (audioFiles.length > 0 && (audioSource.src === "" || audioSource.src.endsWith('/'))) {
            loadTrack(currentTrackIndex, true); // Autoplay after loading
            return; // Exit to prevent re-toggling
        } else if (audioFiles.length === 0) {
             console.warn("No audio files available to play.");
             return;
        }
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            if (isPlaying) {
                audioSource.pause();
            } else {
                audioSource.play().catch(error => { // Playback error handling
                    console.error("Audio Playback Error:", error);
                    if (error.name === 'NotAllowedError') {
                        console.warn("Autoplay prevented! User must interact with the document first.");
                    }
                });
            }
            isPlaying = !isPlaying;
            updatePlayPauseIcons();
            drawVisualizer();
        }).catch(error => {
            console.error("Failed to resume AudioContext:", error);
        });
    } else {
        // Context is running, just play/pause
        if (isPlaying) {
            audioSource.pause();
        } else {
            audioSource.play().catch(error => { // Playback error handling
                console.error("Audio Playback Error:", error);
                if (error.name === 'NotAllowedError') {
                    console.warn("Autoplay prevented! User must interact with the document first.");
                }
            });
        }
        isPlaying = !isPlaying;
        updatePlayPauseIcons();
        drawVisualizer();
    }
}

// Update play/pause icons for both main player and bottom bar
function updatePlayPauseIcons() {
    const mainIcon = playPauseBtn.querySelector('i');
    const barIcon = audioBarPlayPauseBtn.querySelector('i');

    if (isPlaying) {
        mainIcon.classList.remove('fa-play');
        mainIcon.classList.add('fa-pause');
        barIcon.classList.remove('fa-play');
        barIcon.classList.add('fa-pause');
    } else {
        mainIcon.classList.remove('fa-pause');
        mainIcon.classList.add('fa-play');
        barIcon.classList.remove('fa-pause');
        barIcon.classList.add('fa-play');
    }
}

// Play next track
function playNextTrack() {
    if (audioFiles.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % audioFiles.length;
    loadTrack(currentTrackIndex, true); // Autoplay next track
}

// Play previous track
function playPrevTrack() {
    if (audioFiles.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + audioFiles.length) % audioFiles.length;
    loadTrack(currentTrackIndex, true); // Autoplay previous track
}

// --- Event Listeners ---

// Main Player Controls
playPauseBtn.addEventListener('click', playPauseToggle);
prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);

// Bottom Bar Controls
audioBarPlayPauseBtn.addEventListener('click', playPauseToggle);
audioBarNextBtn.addEventListener('click', playNextTrack);

audioSource.addEventListener('timeupdate', () => {
    const progress = (audioSource.currentTime / audioSource.duration) * 100;
    progressBar.style.width = `${progress}%`;
    currentTimeDisplay.textContent = formatTime(audioSource.currentTime);
});

audioSource.addEventListener('loadedmetadata', () => {
    durationDisplay.textContent = formatTime(audioSource.duration);
    progressBar.style.width = '0%'; // Reset progress bar on new track load
    currentTimeDisplay.textContent = '0:00'; // Reset current time
    // Ensure player controls are enabled if a track is loaded
    playPauseBtn.disabled = false;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    audioBarPlayPauseBtn.disabled = false;
    audioBarNextBtn.disabled = false;
    initAudioAPI(); // Re-initialize context if metadata changes (new track loaded)
    drawVisualizer(); // Start drawing the visualizer
    highlightCurrentTrack(); // Update highlight
});

audioSource.addEventListener('ended', () => {
    isPlaying = false; // Set playing state to false
    updatePlayPauseIcons(); // Update icons to play state
    playNextTrack(); // Automatically play next track when current one ends
});

// Seek functionality for progress bar
progressBarContainer.addEventListener('click', (e) => {
    if (!isNaN(audioSource.duration) && audioSource.duration > 0) { // Ensure audio is loaded and has duration
        const width = progressBarContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = audioSource.duration;
        audioSource.currentTime = (clickX / width) * duration;
    }
});

// Volume Control Logic:
// Set initial volume based on slider value
audioSource.volume = volumeSlider.value;

volumeSlider.addEventListener('input', () => {
    audioSource.volume = volumeSlider.value;
    if (audioSource.volume === 0) {
        volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down');
        volumeIcon.classList.add('fa-volume-mute');
    } else if (audioSource.volume < 0.5) {
        volumeIcon.classList.remove('fa-volume-up', 'fa-volume-mute');
        volumeIcon.classList.add('fa-volume-down');
    } else {
        volumeIcon.classList.remove('fa-volume-down', 'fa-volume-mute');
        volumeIcon.classList.add('fa-volume-up');
    }
});


// Visualizer Drawing Function
function drawVisualizer() {
    // Stop drawing if not playing or if audio API is not initialized
    if (!analyser || !dataArray || !isPlaying) { 
        // Clear canvas if no audio or not playing to avoid stale visual
        visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        return;
    }

    requestAnimationFrame(drawVisualizer); // Loop to draw continuously

    analyser.getByteFrequencyData(dataArray); // Get frequency data

    visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); // Clear canvas

    const barWidth = (visualizerCanvas.width / bufferLength) * 1.5; // Width of each bar
    let barHeight;
    let x = 0; // X position for drawing

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 1.5; // Adjust height for better visualization

        // Colors for bars (can be customized)
        const r = 100 + (150 * (i/bufferLength));
        const g = 0 + (50 * (i/bufferLength));
        const b = 200 - (150 * (i/bufferLength));
        visualizerContext.fillStyle = `rgb(${r},${g},${b})`;
        
        // Draw rectangle from the bottom up
        visualizerContext.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1; // Move to the next bar position
    }
}

// Function to render the track list
function renderTrackList() {
    trackListUL.innerHTML = ''; // Clear existing list
    if (audioFiles.length === 0) {
        trackListUL.innerHTML = '<li class="track-item">No audio files found.</li>';
        return;
    }

    audioFiles.forEach((filePath, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('track-item');
        listItem.dataset.index = index; // Store index for click handling

        const fileName = filePath.split('/').pop();
        const trackDisplayName = fileName.split('.').slice(0, -1).join('.');
        listItem.textContent = trackDisplayName;

        listItem.addEventListener('click', () => {
            loadTrack(index, true); // Load and autoplay the clicked track
        });

        trackListUL.appendChild(listItem);
    });
    highlightCurrentTrack(); // Highlight initially loaded track
}

// Function to highlight the currently playing track in the list
function highlightCurrentTrack() {
    const trackItems = document.querySelectorAll('.track-item');
    trackItems.forEach((item, index) => {
        if (index === currentTrackIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}


// Initial setup:
// Initialize the player by loading the first track if available
if (audioFiles.length > 0) {
    loadTrack(currentTrackIndex, false); // Load first track, but don't autoplay initially
    renderTrackList(); // Render the list of tracks
} else {
    // If no audio files are provided, disable buttons and show message
    console.warn("No audio files defined in the 'audioFiles' array.");
    if (audioBarTrackName) {
        audioBarTrackName.textContent = "No audio files found.";
    }
    playPauseBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    audioBarPlayPauseBtn.disabled = true;
    audioBarNextBtn.disabled = true;
    renderTrackList(); // Render empty list message
}

// Handle window resize for canvas
window.addEventListener('resize', () => {
    if (visualizerCanvas) {
        visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerCanvas.height = visualizerCanvas.offsetHeight;
    }
});