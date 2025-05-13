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
const visualizerContext = visualizerCanvas ? visualizerCanvas.getContext('2d') : null; // Check if canvas exists

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
// audioFiles array ab hardcoded NAHI hai, yeh tracks.json se load hoga
let audioFiles = []; // Declare audioFiles as an empty array initially
// ==============================================================

let currentTrackIndex = 0;
let isPlaying = false;

// Function to format time (e.g., 150 seconds -> 2:30)
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Function to fetch track data from JSON
async function fetchTrackData() {
    try {
        const response = await fetch('tracks.json'); // Fetch the JSON file
        if (!response.ok) {
             // Agar network error ho ya file na mile
             const errorText = `Error loading tracks: HTTP status ${response.status}`;
             console.error(errorText);
             displayErrorMessage(errorText);
             return; // Stop execution if fetch failed
        }
        audioFiles = await response.json(); // Assign fetched data to audioFiles array

         // Filter out any entries that might be missing path or name, or are not objects
         audioFiles = audioFiles.filter(track =>
             typeof track === 'object' && track !== null && track.path && track.name
         );


        console.log("Track data loaded:", audioFiles);

        // Now that data is loaded, initialize the player and render the list
        if (audioFiles.length > 0) {
            // Load the first track initially, but don't autoplay
            loadTrack(currentTrackIndex, false);
            renderTrackList(); // Render the list
        } else {
            // Handle no tracks found in JSON or filtered out
            const noTracksMessage = "No valid tracks found in tracks.json";
            console.warn(noTracksMessage);
            displayErrorMessage(noTracksMessage); // Ya koi aur message dikhayen
        }

    } catch (error) {
        // Agar JSON parse karne mein error ho ya koi doosra error
        const fetchError = `Error fetching or parsing track data: ${error}`;
        console.error(fetchError);
        displayErrorMessage(fetchError);
    }
}

// Function to display a message when tracks can't be loaded
function displayErrorMessage(message) {
     if (trackListUL) {
        trackListUL.innerHTML = `<li class="track-item" style="color:red; text-align:center;">${message}</li>`;
     }
     if (audioBarTrackName) {
         audioBarTrackName.textContent = "Error loading tracks.";
     }
     // Disable controls on error
     if (playPauseBtn) playPauseBtn.disabled = true;
     if (prevBtn) prevBtn.disabled = true;
     if (nextBtn) nextBtn.disabled = true;
     if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.disabled = true;
     if (audioBarNextBtn) audioBarNextBtn.disabled = true;

     if (progressBar) progressBar.style.width = '0%';
     if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
     if (durationDisplay) durationDisplay.textContent = '0:00';
     isPlaying = false;
     updatePlayPauseIcons();
     // Visualizer will stop if isPlaying is false
}


// Function to initialize Web Audio API
function initAudioAPI() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Ensure audioSource exists before creating sourceNode
        if (audioSource) {
             sourceNode = audioContext.createMediaElementSource(audioSource);
             sourceNode.connect(analyser);
             analyser.connect(audioContext.destination);
        } else {
             console.error("Audio source element not found!");
        }
    }
     // Set canvas dimensions here or when window resizes
     if(visualizerCanvas && visualizerContext) {
        visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerCanvas.height = visualizerCanvas.offsetHeight;
     }
}

// Function to load a track - uses data from audioFiles (loaded from JSON)
function loadTrack(index, autoPlay = true) {
    // Ensure audioFiles is loaded and index is valid
    if (!audioFiles || audioFiles.length === 0 || index < 0 || index >= audioFiles.length) {
       console.warn("Attempted to load track with invalid index or no files available:", index);
       // Optionally try loading the first track if the current index is bad but files exist
       if (audioFiles && audioFiles.length > 0) {
           loadTrack(0, autoPlay); // Load the first track instead
       } else {
            // If no files at all, ensure UI is disabled
            if (audioBarTrackName) audioBarTrackName.textContent = "No tracks available.";
            if (playPauseBtn) playPauseBtn.disabled = true;
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.disabled = true;
            if (audioBarNextBtn) audioBarNextBtn.disabled = true;
            if (progressBar) progressBar.style.width = '0%';
            if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
            if (durationDisplay) durationDisplay.textContent = '0:00';
            isPlaying = false;
            updatePlayPauseIcons();
       }
       return; // Exit if invalid
    }

    currentTrackIndex = index; // Update global currentTrackIndex
    const track = audioFiles[index]; // Get the track object from the loaded array
    
    if (audioSource) { // Ensure audioSource element exists
        audioSource.src = track.path; // Use the 'path' property from JSON
        audioSource.load(); // Load the audio file
    } else {
        console.error("Audio source element not found!");
        return; // Cannot load if no audio element
    }


    if (audioBarTrackName) {
        audioBarTrackName.textContent = track.name; // Use the 'name' property for display
    }

    if (autoPlay) {
         if (audioSource) {
            audioSource.play().catch(error => { // Playback error handling
                console.error("Audio Playback Error:", error);
                if (error.name === 'NotAllowedError') {
                    console.warn("Autoplay prevented! User must interact with the document first.");
                }
            });
            isPlaying = true;
         }
    } else {
        isPlaying = false;
        if (audioSource) audioSource.pause();
    }
    updatePlayPauseIcons();
    initAudioAPI(); // Initialize audio API when a track is loaded
    drawVisualizer(); // Start drawing the visualizer
    highlightCurrentTrack(); // Highlight the active track in the list
}

// Function to play or pause
function playPauseToggle() {
     // If no files are loaded or available, prevent toggle
    if (!audioFiles || audioFiles.length === 0) {
         console.warn("No audio files available to play.");
         return;
    }
     // If audioSource element is missing, prevent toggle
    if (!audioSource) {
        console.error("Audio source element not found!");
        return;
    }


    if (!audioContext) { // Initialize context on first play interaction
        initAudioAPI();
        // If it's the very first play and no track is loaded, load the first one
        if (audioSource.src === "" || audioSource.src.endsWith('/')) {
             loadTrack(currentTrackIndex, true); // Autoplay after loading
             return; // Exit to prevent re-toggling
        }
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            if (isPlaying) {
                audioSource.pause();
            } else {
                audioSource.play().catch(error => {
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
            audioSource.play().catch(error => {
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
    const mainIcon = playPauseBtn ? playPauseBtn.querySelector('i') : null;
    const barIcon = audioBarPlayPauseBtn ? audioBarPlayPauseBtn.querySelector('i') : null;

    if (mainIcon) {
        if (isPlaying) {
            mainIcon.classList.remove('fa-play');
            mainIcon.classList.add('fa-pause');
        } else {
            mainIcon.classList.remove('fa-pause');
            mainIcon.classList.add('fa-play');
        }
    }

     if (barIcon) {
        if (isPlaying) {
             barIcon.classList.remove('fa-play');
             barIcon.classList.add('fa-pause');
         } else {
             barIcon.classList.remove('fa-pause');
             barIcon.classList.add('fa-play');
         }
     }
}

// Play next track
function playNextTrack() {
    if (!audioFiles || audioFiles.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % audioFiles.length;
    loadTrack(currentTrackIndex, true); // Autoplay next track
}

// Play previous track
function playPrevTrack() {
    if (!audioFiles || audioFiles.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + audioFiles.length) % audioFiles.length;
    // Handle wrap around for previous track (go to last track from first)
    if (currentTrackIndex < 0) {
        currentTrackIndex = audioFiles.length - 1;
    }
    loadTrack(currentTrackIndex, true); // Autoplay previous track
}

// --- Event Listeners ---

// Main Player Controls
if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseToggle);
if (prevBtn) prevBtn.addEventListener('click', playPrevTrack);
if (nextBtn) nextBtn.addEventListener('click', playNextTrack);

// Bottom Bar Controls
if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.addEventListener('click', playPauseToggle);
if (audioBarNextBtn) audioBarNextBtn.addEventListener('click', playNextTrack);


if (audioSource) {
    audioSource.addEventListener('timeupdate', () => {
        if (!isNaN(audioSource.duration) && progressBar) {
            const progress = (audioSource.currentTime / audioSource.duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = formatTime(audioSource.currentTime);
        }
    });

    audioSource.addEventListener('loadedmetadata', () => {
        if (durationDisplay) {
            durationDisplay.textContent = formatTime(audioSource.duration);
        }
        if (progressBar) progressBar.style.width = '0%'; // Reset progress bar on new track load
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00'; // Reset current time

        // Ensure player controls are enabled if a track is loaded and files exist
        if (audioFiles && audioFiles.length > 0) {
            if (playPauseBtn) playPauseBtn.disabled = false;
            if (prevBtn) prevBtn.disabled = false;
            if (nextBtn) nextBtn.disabled = false;
            if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.disabled = false;
            if (audioBarNextBtn) audioBarNextBtn.disabled = false;
        }
         // initAudioAPI(); // Initialized when loadTrack is called the very first time
         // drawVisualizer(); // Started when play is initiated
        highlightCurrentTrack(); // Update highlight
    });

    audioSource.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayPauseIcons();
        playNextTrack(); // Automatically play next track when current one ends
    });
}


// Seek functionality for progress bar
if (progressBarContainer) {
    progressBarContainer.addEventListener('click', (e) => {
        if (audioSource && !isNaN(audioSource.duration) && audioSource.duration > 0) { // Ensure audio is loaded and has duration
            const width = progressBarContainer.clientWidth;
            const clickX = e.offsetX;
            const duration = audioSource.duration;
            audioSource.currentTime = (clickX / width) * duration;
        }
    });
}

// Volume Control Logic:
// Set initial volume based on slider value (only if slider exists)
if(volumeSlider && audioSource) {
   audioSource.volume = volumeSlider.value;

   volumeSlider.addEventListener('input', () => {
       audioSource.volume = volumeSlider.value;
       // Update volume icon based on volume level (only if icon exists)
       if(volumeIcon) {
           if (audioSource.volume === 0) {
               volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down');
               volumeIcon.classList.add('fa-volume-mute');
           } else if (audioSource.volume < 0.5 && audioSource.volume > 0) {
               volumeIcon.classList.remove('fa-volume-up', 'fa-volume-mute');
               volumeIcon.classList.add('fa-volume-down');
           } else if (audioSource.volume >= 0.5) {
               volumeIcon.classList.remove('fa-volume-down', 'fa-volume-mute');
               volumeIcon.classList.add('fa-volume-up');
           } else { // Handle potential negative or non-numeric values defensively
              volumeIcon.classList.remove('fa-volume-down', 'fa-volume-mute', 'fa-volume-up');
           }
       }
   });
    // Set initial icon based on default value
   if(volumeIcon) {
       if (audioSource.volume === 0) {
            volumeIcon.classList.add('fa-volume-mute');
        } else if (audioSource.volume < 0.5 && audioSource.volume > 0) {
            volumeIcon.classList.add('fa-volume-down');
        } else if (audioSource.volume >= 0.5) {
            volumeIcon.classList.add('fa-volume-up');
        }
   }

}


// Visualizer Drawing Function
function drawVisualizer() {
    // Stop drawing if not playing or if audio API is not initialized or canvas context is not available
    if (!analyser || !dataArray || !isPlaying || !visualizerContext) {
        // Clear canvas if no audio or not playing to avoid stale visual
        if(visualizerCanvas && visualizerContext) {
            visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
        return;
    }

    requestAnimationFrame(drawVisualizer); // Loop to draw continuously

    analyser.getByteFrequencyData(dataArray); // Get frequency data

    visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); // Clear canvas

    // Calculate bar width based on current canvas width and buffer size
    const barWidth = (visualizerCanvas.width / bufferLength) * 1.5;
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

// Function to render the track list - uses data from audioFiles (loaded from JSON)
function renderTrackList() {
    if (!trackListUL) return; // Exit if track list element not found

    trackListUL.innerHTML = ''; // Clear existing list
    if (!audioFiles || audioFiles.length === 0) {
        trackListUL.innerHTML = '<li class="track-item" style="text-align:center;">No audio files found.</li>';
        return;
    }

    audioFiles.forEach((track, index) => { // Iterate over track objects
        const listItem = document.createElement('li');
        listItem.classList.add('track-item');
        listItem.dataset.index = index;

        listItem.textContent = track.name; // Use the 'name' property for list display

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

// Initial setup - Call fetchTrackData to start the process
fetchTrackData();

// Handle window resize for canvas
window.addEventListener('resize', () => {
    if (visualizerCanvas && visualizerContext) {
        visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerCanvas.height = visualizerCanvas.offsetHeight;
        // Redraw visualizer when resized if playing
        if (isPlaying) {
            drawVisualizer();
        } else {
             // If not playing, clear the canvas to prevent stretched visual
             visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
    }
});
