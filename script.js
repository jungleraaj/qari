// HTML Elements - Get references to all elements, including new ones
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

const shuffleBtn = document.getElementById('shuffle-btn'); // New
const repeatBtn = document.getElementById('repeat-btn'); // New
const seekBackwardBtn = document.getElementById('seek-backward-btn'); // New
const seekForwardBtn = document.getElementById('seek-forward-btn'); // New
const speedSelect = document.getElementById('speed-select'); // New
const loadingIndicator = document.getElementById('loading-indicator'); // New

const trackArtistDisplay = document.getElementById('track-artist'); // New
const trackNameDetailDisplay = document.getElementById('track-name-detail'); // New
const trackAlbumDisplay = document.getElementById('track-album'); // New


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

// Track Data
let audioFiles = []; // Array to hold track objects from tracks.json
let currentTrackIndex = 0;
let isPlaying = false;

// New Playback State Variables
let isShuffling = false;
let shuffledTrackList = []; // To store the order when shuffling
let repeatMode = 0; // 0: No Repeat, 1: Repeat All, 2: Repeat One


// Function to format time (e.g., 150 seconds -> 2:30)
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Function to show/hide loading indicator
function showLoadingIndicator(message = "Loading...") { // Added default message
    if (loadingIndicator) {
        loadingIndicator.classList.add('visible');
        loadingIndicator.textContent = message;
    }
}

function hideLoadingIndicator() {
     if (loadingIndicator) {
        loadingIndicator.classList.remove('visible');
     }
}


// Function to fetch track data from JSON
async function fetchTrackData() {
    showLoadingIndicator("Fetching track list..."); // Show loading indicator while fetching
    try {
        const response = await fetch('tracks.json'); // Fetch the JSON file
        if (!response.ok) {
             const errorText = `Error loading tracks: HTTP status ${response.status}`;
             console.error(errorText);
             displayErrorMessage(errorText);
             hideLoadingIndicator();
             return;
        }
        let fetchedData = await response.json(); // Parse JSON

         // Filter out any entries that might be missing path or name, or are not valid objects
         audioFiles = fetchedData.filter(track =>
             typeof track === 'object' && track !== null && track.path && track.name
         );


        console.log("Track data loaded:", audioFiles);

        // Now that data is loaded, initialize the player and render the list
        if (audioFiles.length > 0) {
            currentTrackIndex = 0; // Start with the first track
            shuffledTrackList = [...audioFiles]; // Initialize shuffled list
            // Load the first track initially, but don't autoplay
            loadTrack(currentTrackIndex, false);
            renderTrackList(); // Render the list
        } else {
            const noTracksMessage = "No valid tracks found in tracks.json";
            console.warn(noTracksMessage);
            displayErrorMessage(noTracksMessage);
        }

    } catch (error) {
        const fetchError = `Error fetching or parsing track data: ${error}`;
        console.error(fetchError);
        displayErrorMessage(fetchError);
    } finally {
        hideLoadingIndicator(); // Ensure indicator is hidden after fetch attempt
    }
}

// Function to display a message when tracks can't be loaded or no tracks available
function displayErrorMessage(message) {
     if (trackListUL) {
        trackListUL.innerHTML = `<li class="track-item" style="color:red; text-align:center;">${message}</li>`;
     }
     if (audioBarTrackName) {
         audioBarTrackName.textContent = "Error loading tracks.";
     }
     // Disable controls on error/no tracks
     if (playPauseBtn) playPauseBtn.disabled = true;
     if (prevBtn) prevBtn.disabled = true;
     if (nextBtn) nextBtn.disabled = true;
     if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.disabled = true;
     if (audioBarNextBtn) audioBarNextBtn.disabled = true;
     if (shuffleBtn) shuffleBtn.disabled = true;
     if (repeatBtn) repeatBtn.disabled = true;
     if (seekBackwardBtn) seekBackwardBtn.disabled = true;
     if (seekForwardBtn) seekForwardBtn.disabled = true;
     if (speedSelect) speedSelect.disabled = true;


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

        if (audioSource) {
             sourceNode = audioContext.createMediaElementSource(audioSource);
             sourceNode.connect(analyser);
             analyser.connect(audioContext.destination);
        } else {
             console.error("Audio source element not found!");
        }
    }
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
       if (audioFiles && audioFiles.length > 0) {
           // If index is bad but files exist, try loading the first track
           loadTrack(0, autoPlay);
       } else {
            // If no files at all, ensure UI is disabled
            if (audioBarTrackName) audioBarTrackName.textContent = "No tracks available.";
            if (playPauseBtn) playPauseBtn.disabled = true;
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.disabled = true;
            if (audioBarNextBtn) audioBarNextBtn.disabled = true;
             if (shuffleBtn) shuffleBtn.disabled = true;
             if (repeatBtn) repeatBtn.disabled = true;
             if (seekBackwardBtn) seekBackwardBtn.disabled = true;
             if (seekForwardBtn) seekForwardBtn.disabled = true;
             if (speedSelect) speedSelect.disabled = true;


            if (progressBar) progressBar.style.width = '0%';
            if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
            if (durationDisplay) durationDisplay.textContent = '0:00';
            isPlaying = false;
            updatePlayPauseIcons();
       }
       return;
    }

    currentTrackIndex = index; // Update global currentTrackIndex
    const track = audioFiles[index]; // Get the track object from the loaded array

    if (audioSource) {
        audioSource.src = track.path; // Use the 'path' property from JSON
        audioSource.load(); // Load the audio file
        showLoadingIndicator("Loading audio..."); // Show loading indicator
    } else {
        console.error("Audio source element not found!");
        return;
    }

    // Update Track Info Detail - Naya Code
    if (trackArtistDisplay) trackArtistDisplay.textContent = track.artist || ''; // Display artist or empty string if null/undefined
    if (trackNameDetailDisplay) trackNameDetailDisplay.textContent = track.name || ''; // Display track name or empty string
    if (trackAlbumDisplay) trackAlbumDisplay.textContent = track.album || ''; // Display album or empty string


    if (audioBarTrackName) {
        audioBarTrackName.textContent = track.name; // Use the 'name' property for bottom display
    }

    if (autoPlay) {
         if (audioSource) {
            audioSource.play().catch(error => {
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
         // Ensure visualizer is cleared when paused manually
        if(visualizerCanvas && visualizerContext) {
             visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerContext.height);
        }
    }
    updatePlayPauseIcons();
    initAudioAPI();
    // drawVisualizer() is called when play starts
    highlightCurrentTrack();
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


    if (!audioContext) {
        initAudioAPI();
         // If it's the very first play and no track is loaded, load the first one
        if (audioSource.src === "" || audioSource.src.endsWith('/')) {
             loadTrack(currentTrackIndex, true);
             return;
        }
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            if (isPlaying) {
                audioSource.pause();
            } else {
                 // Before playing, ensure loading indicator is shown if not already
                 if (audioSource.readyState < 4) { // Check if still buffering
                     showLoadingIndicator("Buffering...");
                 }
                audioSource.play().catch(error => {
                    console.error("Audio Playback Error:", error);
                    if (error.name === 'NotAllowedError') {
                         console.warn("Autoplay prevented! User must interact with the document first.");
                    }
                    hideLoadingIndicator(); // Hide on error
                });
            }
            isPlaying = !isPlaying;
            updatePlayPauseIcons();
            drawVisualizer(); // Start visualizer loop
        }).catch(error => {
            console.error("Failed to resume AudioContext:", error);
        });
    } else {
        // Context is running
        if (isPlaying) {
            audioSource.pause();
             // Ensure visualizer is cleared when paused manually
            if(visualizerCanvas && visualizerContext) {
                 visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerContext.height);
            }

        } else {
             // Before playing, ensure loading indicator is shown if not already
             if (audioSource.readyState < 4) { // Check if still buffering
                 showLoadingIndicator("Buffering...");
             }
            audioSource.play().catch(error => {
                console.error("Audio Playback Error:", error);
                if (error.name === 'NotAllowedError') {
                     console.warn("Autoplay prevented! User must interact with the document first.");
                }
                hideLoadingIndicator(); // Hide on error
            });
             drawVisualizer(); // Start visualizer loop
        }
        isPlaying = !isPlaying;
        updatePlayPauseIcons();
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

// Shuffle Array Function (Fisher-Yates Algorithm)
function shuffleArray(array) {
    const newArray = [...array]; // Create a copy to avoid modifying original array order
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
    }
    return newArray; // Return the shuffled copy
}


// Toggle Shuffle Mode - Naya Code
function toggleShuffle() {
    isShuffling = !isShuffling; // Toggle the state

    if (shuffleBtn) {
        // Add/remove 'active' class for styling (you might need to add .active style in CSS)
        shuffleBtn.classList.toggle('active', isShuffling);
        // Optional: Change icon color or appearance via CSS class
    }

    if (isShuffling) {
         // Find the currently playing track object
        const currentTrackObject = audioFiles[currentTrackIndex];
         // Shuffle the *entire* audioFiles array and find the position of the current track in the shuffled list
         shuffledTrackList = shuffleArray(audioFiles);
         const currentTrackShuffledIndex = shuffledTrackList.indexOf(currentTrackObject);

         // If the current track is found in the shuffled list, make it the starting point
         if (currentTrackShuffledIndex !== -1) {
             // We need to reorder the shuffled list so the current track is at the currentTrackIndex (0-based index for playback)
             const tracksBeforeCurrent = shuffledTrackList.slice(0, currentTrackShuffledIndex);
             const tracksFromCurrent = shuffledTrackList.slice(currentTrackShuffledIndex);
             shuffledTrackList = [...tracksFromCurrent, ...tracksBeforeCurrent];
         } else {
             // Fallback: If somehow current track not found, just shuffle the whole list
             shuffledTrackList = shuffleArray(audioFiles);
         }

         console.log("Shuffle ON. Shuffled order (starting from current):", shuffledTrackList.map(t => t.name));
    } else {
        // Revert to original order
        shuffledTrackList = [...audioFiles]; // Reset shuffled list to original order
        // Find the current track's index in the original list
        const originalIndex = audioFiles.findIndex(track => track.path === audioSource.src);
        if (originalIndex !== -1) {
            currentTrackIndex = originalIndex; // Update current index to original position
        }
         console.log("Shuffle OFF. Reverted to original order.");
    }
     // Re-render the list if you want the list order to visually change (optional)
     renderTrackList(); // Call this to update the visual list order
     highlightCurrentTrack(); // Ensure highlighting is correct based on the list being rendered
}

// Toggle Repeat Mode - Naya Code
function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3; // Cycle through 0, 1, 2
    const repeatIcon = repeatBtn ? repeatBtn.querySelector('i') : null;

    if (repeatIcon) {
        repeatIcon.classList.remove('fa-repeat', 'fa-repeat-one', 'active'); // Remove previous states and active class
        if (repeatMode === 1) { // Repeat All
            repeatIcon.classList.add('fa-repeat');
            if (repeatBtn) repeatBtn.title = "Repeat All";
            if (repeatBtn) repeatBtn.classList.add('active');
        } else if (repeatMode === 2) { // Repeat One
            repeatIcon.classList.add('fa-repeat-one');
             if (repeatBtn) repeatBtn.title = "Repeat One";
             if (repeatBtn) repeatBtn.classList.add('active');
        } else { // No Repeat (mode 0)
            repeatIcon.classList.add('fa-repeat'); // Default icon for no repeat
             if (repeatBtn) repeatBtn.title = "No Repeat";
             // Active class is removed above
        }
    }
    console.log("Repeat mode changed to:", repeatMode);
}


// Play next track (handles shuffle and repeat all)
function playNextTrack() {
    if (!audioFiles || audioFiles.length === 0) return;

    const currentList = isShuffling ? shuffledTrackList : audioFiles; // Use the correct list
    let nextIndexInCurrentList = -1;

    // Find the index of the currently playing track object within the *current* list (shuffled or original)
    const currentlyLoadedTrackObject = audioFiles[currentTrackIndex]; // Get the track object from the original list
    const currentIndexInCurrentList = currentList.indexOf(currentlyLoadedTrackObject);


    if (repeatMode === 2) { // Repeat One
        nextIndexInCurrentList = currentIndexInCurrentList; // Stay on the same track in the current list
    } else { // Repeat All or No Repeat
         nextIndexInCurrentList = (currentIndexInCurrentList + 1) % currentList.length;
    }

    // Get the track object that is at the 'nextIndexInCurrentList' position in the current list
    const nextTrackObject = currentList[nextIndexInCurrentList];

     // Find the index of this next track object in the *ORIGINAL* audioFiles array
    const originalIndexForNextTrack = audioFiles.indexOf(nextTrackObject);


    // Handle end of playlist in No Repeat mode (when we are about to wrap around)
    if (!isShuffling && repeatMode === 0 && originalIndexForNextTrack === 0 && currentIndexInCurrentList === audioFiles.length - 1 && audioSource && audioSource.currentTime > 0) {
         // We are at the last track, about to go to the first, and repeat is off
        console.log("Playlist ended.");
        if (audioSource) audioSource.pause();
        isPlaying = false;
        updatePlayPauseIcons();
         // Optionally reset time to 0:00
        if (audioSource) audioSource.currentTime = 0;
         // Optionally clear visualizer
        if(visualizerCanvas && visualizerContext) {
             visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
        // Set currentTrackIndex back to the last track so highlighting stays correct before manual play
        currentTrackIndex = audioFiles.length - 1; // Or maybe 0 if you want it to jump to start visual
        highlightCurrentTrack(); // Ensure highlighting is correct
        return; // Stop here
    }

    // If we reach here, load the next track based on its original index
     if (originalIndexForNextTrack !== -1) {
         loadTrack(originalIndexForNextTrack, true); // Load using the original index
     } else {
         // Fallback (shouldn't happen if logic is correct)
          console.error("Could not find next track object in original list!");
          // Try loading the first track as a fallback
          if (audioFiles.length > 0) loadTrack(0, true);
     }
}

// Play previous track (handles shuffle wrap-around)
function playPrevTrack() {
    if (!audioFiles || audioFiles.length === 0) return;

    const currentList = isShuffling ? shuffledTrackList : audioFiles; // Use the correct list
    let prevIndexInCurrentList = -1;

    // Find the index of the currently playing track object within the *current* list
    const currentlyLoadedTrackObject = audioFiles[currentTrackIndex]; // Get the track object from the original list
    const currentIndexInCurrentList = currentList.indexOf(currentlyLoadedTrackObject);


     prevIndexInCurrentList = (currentIndexInCurrentList - 1 + currentList.length) % currentList.length;


    // Get the track object that is at the 'prevIndexInCurrentList' position in the current list
    const prevTrackObject = currentList[prevIndexInCurrentList];

     // Find the index of this prev track object in the *ORIGINAL* audioFiles array
    const originalIndexForPrevTrack = audioFiles.indexOf(prevTrackObject);

     // Load the previous track based on its original index
     if (originalIndexForPrevTrack !== -1) {
         loadTrack(originalIndexForPrevTrack, true); // Load using the original index
     } else {
          // Fallback
          console.error("Could not find previous track object in original list!");
           if (audioFiles.length > 0) loadTrack(0, true);
     }
}


// Seek Forward/Backward - Naya Code
function seekBackward() {
    if (audioSource) {
        audioSource.currentTime -= 10; // Seek back 10 seconds
        // Ensure time doesn't go below zero
        if (audioSource.currentTime < 0) {
            audioSource.currentTime = 0;
        }
    }
}

function seekForward() {
     if (audioSource && !isNaN(audioSource.duration)) {
        audioSource.currentTime += 10; // Seek forward 10 seconds
         // Ensure time doesn't go beyond duration
        if (audioSource.currentTime > audioSource.duration) {
            audioSource.currentTime = audioSource.duration;
        }
     }
}

// Change Playback Speed - Naya Code
function changeSpeed() {
     if (audioSource && speedSelect) {
         audioSource.playbackRate = parseFloat(speedSelect.value);
     }
}


// --- Event Listeners ---

// Main Player Controls
if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseToggle);
if (prevBtn) prevBtn.addEventListener('click', playPrevTrack);
if (nextBtn) nextBtn.addEventListener('click', playNextTrack);

// New Button Event Listeners
if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
if (repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);
if (seekBackwardBtn) seekBackwardBtn.addEventListener('click', seekBackward);
if (seekForwardBtn) seekForwardBtn.addEventListener('click', seekForward);
if (speedSelect) speedSelect.addEventListener('change', changeSpeed);


// Bottom Bar Controls
if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.addEventListener('click', playPauseToggle);
if (audioBarNextBtn) audioBarNextBtn.addEventListener('click', playNextTrack);


if (audioSource) {
     // Event listener for when loading starts
     audioSource.addEventListener('loadstart', showLoadingIndicator);
     // Event listener for when data is loaded enough to play
     audioSource.addEventListener('canplay', hideLoadingIndicator);
     // Event listener for when playback actually starts
     audioSource.addEventListener('playing', hideLoadingIndicator);
      // Event listener for when buffering occurs during playback
     audioSource.addEventListener('waiting', showLoadingIndicator);
     // Event listener for when buffering ends
     audioSource.addEventListener('loadeddata', hideLoadingIndicator);


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
        if (progressBar) progressBar.style.width = '0%';
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';

        // Ensure player controls are enabled if a track is loaded and files exist
        if (audioFiles && audioFiles.length > 0) {
            if (playPauseBtn) playPauseBtn.disabled = false;
            if (prevBtn) prevBtn.disabled = false;
            if (nextBtn) nextBtn.disabled = false;
            if (audioBarPlayPauseBtn) audioBarPlayPauseBtn.disabled = false;
            if (audioBarNextBtn) audioBarNextBtn.disabled = false;
            if (shuffleBtn) shuffleBtn.disabled = false;
            if (repeatBtn) repeatBtn.disabled = false;
            if (seekBackwardBtn) seekBackwardBtn.disabled = false;
            if (seekForwardBtn) seekForwardBtn.disabled = false;
             if (speedSelect) speedSelect.disabled = false;
        }
         // initAudioAPI(); // Initialized when loadTrack is called the very first time
         // drawVisualizer(); // Started when play is initiated
        highlightCurrentTrack();
    });

    // Custom logic for 'ended' event to handle repeat modes
    audioSource.addEventListener('ended', () => {
        isPlaying = false; // Audio element stopped playing
        updatePlayPauseIcons(); // Update icons to play state
         // Clear visualizer when track ends
        if(visualizerCanvas && visualizerContext) {
             visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerContext.height);
        }


        if (repeatMode === 2) { // Repeat One
            console.log("Repeat One: Restarting current track");
            loadTrack(currentTrackIndex, true); // Reload and autoplay the same track using original index
        } else if (repeatMode === 1) { // Repeat All
             console.log("Repeat All: Moving to next track");
            playNextTrack(); // Play the next track in sequence/shuffle
        } else { // No Repeat (mode 0)
            console.log("No Repeat: Track ended.");
            // Default behavior in playNextTrack will handle stopping at the end of the list
            playNextTrack(); // Try to play the next track, which will stop if it's the last one and repeat is off
        }
    });

     // Error handling for audio element itself
     audioSource.addEventListener('error', (e) => {
         console.error('Audio Element Error:', e);
         let errorMessage = "Audio error";
          switch (e.target.error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                  errorMessage = 'Audio playback aborted.';
                  break;
              case MediaError.MEDIA_ERR_NETWORK:
                  errorMessage = 'A network error caused the audio download to fail.';
                  break;
              case MediaError.MEDIA_ERR_DECODE:
                  errorMessage = 'Audio playback was aborted due to a corruption problem or because the media used features the browser did not support.';
                  break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage = 'The audio could not be loaded, either because the server or network failed or because the format is supported.';
                  break;
              default:
                  errorMessage = 'An unknown audio error occurred.';
                  break;
          }
          console.error(errorMessage);
          // Optionally display this error message to the user on the UI
          displayErrorMessage(errorMessage);
          hideLoadingIndicator(); // Hide indicator on error
          isPlaying = false;
          updatePlayPauseIcons();
     });
}


// Seek functionality for progress bar
if (progressBarContainer) {
    progressBarContainer.addEventListener('click', (e) => {
        if (audioSource && !isNaN(audioSource.duration) && audioSource.duration > 0) {
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
        } else if (volumeSlider && volumeSlider.value < 0.5 && volumeSlider.value > 0) {
            volumeIcon.classList.add('fa-volume-down');
        } else if (volumeSlider && volumeSlider.value >= 0.5) {
            volumeIcon.classList.add('fa-volume-up');
        } else { // Default icon if slider value is problematic
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
    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5; // Adjusted bar width for more spacing/fewer bars
    let barHeight;
    let x = 0; // X position for drawing

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i]; // Use raw data for height first

         // Apply scaling factor - adjust this value to make bars taller or shorter overall
        const scaleFactor = 1.5; // Increase this value to make bars taller
        barHeight = barHeight * scaleFactor;


        // Ensure bars don't go beyond canvas height
        if (visualizerCanvas) {
             barHeight = Math.min(barHeight, visualizerCanvas.height);
        }


        // Colors for bars (can be customized)
        const r = 100 + (150 * (i/bufferLength));
        const g = 0 + (50 * (i/bufferLength));
        const b = 200 - (150 * (i/bufferLength));
        visualizerContext.fillStyle = `rgb(${r},${g},${b})`;

        // Draw rectangle from the bottom up
        if (visualizerCanvas) {
            visualizerContext.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
        }


        x += barWidth + 5; // Move to the next bar position (add space between bars)
    }
}

// Function to render the track list - uses data from audioFiles (loaded from JSON)
function renderTrackList() {
    if (!trackListUL) return;

    trackListUL.innerHTML = ''; // Clear existing list
    // Use the currently active list for rendering (original or shuffled)
    const listToRender = isShuffling ? shuffledTrackList : audioFiles;


    if (!listToRender || listToRender.length === 0) {
        trackListUL.innerHTML = '<li class="track-item" style="text-align:center;">No audio files found.</li>';
        return;
    }

    listToRender.forEach((track, index) => { // Iterate over track objects
        const listItem = document.createElement('li');
        listItem.classList.add('track-item');
        listItem.dataset.index = index;

        // Display logic: Primary name, maybe secondary artist/album if available
        let displayText = track.name;
        if (track.artist && track.artist !== "" && track.artist !== track.name) { // Avoid duplicating name if artist is same
            displayText += ` - ${track.artist}`;
        }
        // Optionally add album if desired
        // if (track.album && track.album !== "") {
        //     displayText += ` (${track.album})`;
        // }

        listItem.textContent = displayText; // Display text directly

        listItem.addEventListener('click', () => {
            // When a list item is clicked, find the *original* index of that track object
             const trackObjectClicked = isShuffling ? shuffledTrackList[index] : audioFiles[index];
             const originalIndex = audioFiles.indexOf(trackObjectClicked);


            if (originalIndex !== -1) {
                loadTrack(originalIndex, true); // Load using the original index
            } else {
                 // Fallback if somehow track object not found in original list (shouldn't happen)
                 loadTrack(index, true); // Load using the index in the current list (less reliable after shuffle toggle)
            }
        });

        trackListUL.appendChild(listItem);
    });
    // Highlight based on the current track's index in the *currently displayed list*
    highlightCurrentTrack();
}


// Function to highlight the currently playing track in the list
function highlightCurrentTrack() {
     if (!trackListUL) return;
     // Use the currently active list for highlighting (original or shuffled)
    const listToHighlight = isShuffling ? shuffledTrackList : audioFiles;


    const trackItems = trackListUL.querySelectorAll('.track-item');
    trackItems.forEach((item, index) => {
        // Compare the track object associated with this list item
        // to the track object currently loaded (based on currentTrackIndex in the original list)
        const trackObjectInList = listToHighlight[index];
        const currentlyLoadedTrackObject = audioFiles[currentTrackIndex];

        if (trackObjectInList === currentlyLoadedTrackObject) {
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
        // Redraw visualizer when resized if playing or if visualizer was showing something
        if (isPlaying || (audioSource && audioSource.currentTime > 0)) {
            drawVisualizer();
        } else {
             // If at the beginning and not playing, clear the canvas
             visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
    }
});
