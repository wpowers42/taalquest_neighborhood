/**
 * TaalQuest: Neighborhood Watch - Frontend Application
 * Vanilla JavaScript - No frameworks
 */

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const PAUSE_BETWEEN_AUDIO_MS = 500;

// Application state
const state = {
    locations: [],
    currentLocation: null,
    currentScript: null,
    currentAudioFiles: [],
    lastLocationId: null,
    isPlaying: false,
    currentAudioIndex: 0,
};

// DOM elements
const elements = {
    locationName: null,
    statusMessage: null,
    playButton: null,
    replayButton: null,
    continueButton: null,
};

// Audio player
const audio = new Audio();

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing TaalQuest...');

    // Get DOM elements
    elements.locationName = document.getElementById('location-name');
    elements.statusMessage = document.getElementById('status-message');
    elements.playButton = document.getElementById('play-button');
    elements.replayButton = document.getElementById('replay-button');
    elements.continueButton = document.getElementById('continue-button');

    // Set up event listeners
    elements.playButton.addEventListener('click', handlePlay);
    elements.replayButton.addEventListener('click', handleReplay);
    elements.continueButton.addEventListener('click', handleContinue);

    // Set up audio event listeners
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleAudioError);

    // Load locations and generate first scenario
    try {
        await fetchLocations();
        await loadNewScenario();
    } catch (error) {
        setUIState('error', error.message);
    }
}

/**
 * Fetch all available locations from API
 */
async function fetchLocations() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/locations`);
        if (!response.ok) throw new Error('Failed to fetch locations');

        state.locations = await response.json();
        console.log(`Loaded ${state.locations.length} locations`);
    } catch (error) {
        console.error('Error fetching locations:', error);
        throw new Error('Could not load locations. Is the backend running?');
    }
}

/**
 * Generate and load a new scenario
 */
async function loadNewScenario() {
    setUIState('loading');

    try {
        // Generate scenario
        const response = await fetch(`${API_BASE_URL}/api/generate-scenario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exclude_location_id: state.lastLocationId,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate scenario');
        }

        const data = await response.json();

        // Update state
        state.currentLocation = data.location;
        state.currentScript = data.script;
        state.currentAudioFiles = data.audio_files;
        state.lastLocationId = data.location.id;
        state.currentAudioIndex = 0;

        console.log('Scenario generated:', data);

        // Update UI
        elements.locationName.textContent = data.location.name;
        setUIState('ready');

    } catch (error) {
        console.error('Error loading scenario:', error);
        setUIState('error', 'Failed to generate scenario. Please try again.');
    }
}

/**
 * Start playing the audio sequence
 */
function handlePlay() {
    if (!state.currentAudioFiles || state.currentAudioFiles.length === 0) {
        return;
    }

    state.isPlaying = true;
    state.currentAudioIndex = 0;
    setUIState('playing');

    playCurrentAudio();
}

/**
 * Replay the current scenario
 */
function handleReplay() {
    handlePlay();
}

/**
 * Continue to next scenario
 */
async function handleContinue() {
    await loadNewScenario();
}

/**
 * Play the current audio file in the sequence
 */
function playCurrentAudio() {
    if (!state.isPlaying || state.currentAudioIndex >= state.currentAudioFiles.length) {
        return;
    }

    const filename = state.currentAudioFiles[state.currentAudioIndex];
    const audioUrl = `${API_BASE_URL}/api/audio/${filename}`;

    console.log(`Playing audio ${state.currentAudioIndex + 1}/${state.currentAudioFiles.length}: ${filename}`);

    audio.src = audioUrl;
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
        setUIState('error', 'Audio playback failed');
        state.isPlaying = false;
    });
}

/**
 * Handle audio ended event
 */
function handleAudioEnded() {
    if (!state.isPlaying) return;

    state.currentAudioIndex++;

    // Check if more audio files to play
    if (state.currentAudioIndex < state.currentAudioFiles.length) {
        // Pause before next audio
        setTimeout(() => {
            playCurrentAudio();
        }, PAUSE_BETWEEN_AUDIO_MS);
    } else {
        // Sequence complete
        state.isPlaying = false;
        setUIState('finished');
        console.log('Audio sequence completed');
    }
}

/**
 * Handle audio error
 */
function handleAudioError(event) {
    console.error('Audio error:', event);
    state.isPlaying = false;
    setUIState('error', 'Audio loading failed');
}

/**
 * Set UI state
 * @param {string} stateName - 'loading', 'ready', 'playing', 'finished', 'error'
 * @param {string} message - Optional message for error state
 */
function setUIState(stateName, message = '') {
    // Reset all buttons
    elements.playButton.disabled = true;
    elements.replayButton.disabled = true;
    elements.continueButton.disabled = true;

    // Clear existing classes
    elements.playButton.classList.remove('loading');

    switch (stateName) {
        case 'loading':
            elements.playButton.innerHTML = '<span class="button-icon">⏳</span><span class="button-text">Generating...</span>';
            elements.playButton.classList.add('loading');
            elements.statusMessage.textContent = 'Creating your Dutch scenario...';
            break;

        case 'ready':
            elements.playButton.innerHTML = '<span class="button-icon">▶</span><span class="button-text">Tap to Play</span>';
            elements.playButton.disabled = false;
            elements.statusMessage.textContent = '';
            break;

        case 'playing':
            elements.playButton.innerHTML = '<span class="button-icon">▶</span><span class="button-text">Playing...</span>';
            elements.statusMessage.textContent = '🔊 Listen to the dialogue...';
            break;

        case 'finished':
            elements.playButton.innerHTML = '<span class="button-icon">✓</span><span class="button-text">Finished</span>';
            elements.replayButton.disabled = false;
            elements.continueButton.disabled = false;
            elements.statusMessage.textContent = 'Tap Replay to listen again, or Continue for a new scene';
            break;

        case 'error':
            elements.playButton.innerHTML = '<span class="button-icon">↻</span><span class="button-text">Try Again</span>';
            elements.playButton.disabled = false;
            elements.continueButton.disabled = false;
            elements.statusMessage.innerHTML = `<div class="error-message">❌ ${message}</div>`;
            break;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
