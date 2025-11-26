/**
 * TaalQuest: Neighborhood Watch - Frontend Application
 * Vanilla JavaScript - No frameworks
 */

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const PAUSE_BETWEEN_AUDIO_MS = 500;

// Dev mode check (use ?dev=true in URL for instant pregenerated scenario)
const urlParams = new URLSearchParams(window.location.search);
const DEV_MODE = urlParams.get('dev') === 'true';

// Application state
const state = {
    locations: [],
    currentLocation: null,
    currentScript: null,
    currentAudioFiles: [],
    lastLocationId: null,
    isPlaying: false,
    currentAudioIndex: 0,
    // Quiz state
    quizQuestions: [],
    currentQuestionIndex: 0,
    quizScore: 0,
    quizAnswered: false,
    quizShown: false,
};

// DOM elements
const elements = {
    locationName: null,
    statusMessage: null,
    playButton: null,
    replayButton: null,
    continueButton: null,
    // Quiz elements
    quizSection: null,
    quizProgress: null,
    quizQuestion: null,
    quizOptions: null,
    quizFeedback: null,
    quizNextButton: null,
    quizContent: null,
    quizResults: null,
    quizScore: null,
    quizMessage: null,
    // Transcript elements
    transcriptControls: null,
    showDutchButton: null,
    showEnglishButton: null,
    dutchTranscript: null,
    englishTranscript: null,
    dutchContent: null,
    englishContent: null,
};

// Audio player
const audio = new Audio();

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing TaalQuest...');

    if (DEV_MODE) {
        console.log('🚀 DEV MODE ENABLED - Using pregenerated scenario for instant testing');
        console.log('💡 To disable: remove ?dev=true from URL');
    }

    // Get DOM elements
    elements.locationName = document.getElementById('location-name');
    elements.statusMessage = document.getElementById('status-message');
    elements.playButton = document.getElementById('play-button');
    elements.replayButton = document.getElementById('replay-button');
    elements.continueButton = document.getElementById('continue-button');

    // Quiz elements
    elements.quizSection = document.getElementById('quiz-section');
    elements.quizProgress = document.getElementById('quiz-progress');
    elements.quizQuestion = document.getElementById('quiz-question');
    elements.quizOptions = document.getElementById('quiz-options');
    elements.quizFeedback = document.getElementById('quiz-feedback');
    elements.quizNextButton = document.getElementById('quiz-next-button');
    elements.quizContent = document.getElementById('quiz-content');
    elements.quizResults = document.getElementById('quiz-results');
    elements.quizScore = document.getElementById('quiz-score');
    elements.quizMessage = document.getElementById('quiz-message');

    // Transcript elements
    elements.transcriptControls = document.getElementById('transcript-controls');
    elements.showDutchButton = document.getElementById('show-dutch-button');
    elements.showEnglishButton = document.getElementById('show-english-button');
    elements.dutchTranscript = document.getElementById('dutch-transcript');
    elements.englishTranscript = document.getElementById('english-transcript');
    elements.dutchContent = document.getElementById('dutch-content');
    elements.englishContent = document.getElementById('english-content');

    // Set up event listeners
    elements.playButton.addEventListener('click', handlePlay);
    elements.replayButton.addEventListener('click', handleReplay);
    elements.continueButton.addEventListener('click', handleContinue);
    elements.quizNextButton.addEventListener('click', handleNextQuestion);
    elements.showDutchButton.addEventListener('click', toggleDutchTranscript);
    elements.showEnglishButton.addEventListener('click', toggleEnglishTranscript);

    // Set up audio event listeners
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleAudioError);

    // Add dev mode indicator to UI
    if (DEV_MODE) {
        const subtitle = document.querySelector('.subtitle');
        subtitle.textContent = '🚀 DEV MODE - Instant pregenerated scenario';
        subtitle.style.color = '#ff9800';
        subtitle.style.fontWeight = 'bold';
    }

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
        let response;

        if (DEV_MODE) {
            // Use pregenerated scenario for instant UI/UX testing
            response = await fetch(`${API_BASE_URL}/api/dev-scenario`);
        } else {
            // Generate new scenario via OpenAI API
            response = await fetch(`${API_BASE_URL}/api/generate-scenario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    exclude_location_id: state.lastLocationId,
                }),
            });
        }

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

        // Reset quiz state
        state.quizQuestions = data.script.questions || [];
        state.currentQuestionIndex = 0;
        state.quizScore = 0;
        state.quizAnswered = false;
        state.quizShown = false;

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

        // Show transcript controls
        elements.transcriptControls.style.display = 'flex';

        // Enable replay button
        elements.replayButton.disabled = false;

        // Check if quiz questions available and not yet shown
        if (state.quizQuestions && state.quizQuestions.length > 0 && !state.quizShown) {
            showQuiz();
        } else if (!state.quizShown) {
            setUIState('finished');
        }

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

/**
 * Show quiz section and display first question
 */
function showQuiz() {
    elements.quizSection.style.display = 'block';
    elements.quizContent.style.display = 'block';
    elements.quizResults.style.display = 'none';
    elements.statusMessage.textContent = '';

    state.currentQuestionIndex = 0;
    state.quizScore = 0;
    state.quizShown = true;

    displayCurrentQuestion();
}

/**
 * Display the current quiz question
 */
function displayCurrentQuestion() {
    const question = state.quizQuestions[state.currentQuestionIndex];
    state.quizAnswered = false;

    // Update progress
    elements.quizProgress.textContent = `Question ${state.currentQuestionIndex + 1} of ${state.quizQuestions.length}`;

    // Display question
    elements.quizQuestion.textContent = question.question;

    // Clear previous options
    elements.quizOptions.innerHTML = '';

    // Display options
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'quiz-option';
        optionDiv.textContent = option;
        optionDiv.dataset.index = index;
        optionDiv.addEventListener('click', () => handleAnswerSelection(index));
        elements.quizOptions.appendChild(optionDiv);
    });

    // Hide feedback and next button
    elements.quizFeedback.style.display = 'none';
    elements.quizNextButton.style.display = 'none';
}

/**
 * Handle answer selection
 */
function handleAnswerSelection(selectedIndex) {
    if (state.quizAnswered) return;

    state.quizAnswered = true;
    const question = state.quizQuestions[state.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correct_answer;

    if (isCorrect) {
        state.quizScore++;
    }

    // Show feedback
    const options = elements.quizOptions.querySelectorAll('.quiz-option');
    options.forEach((option, index) => {
        option.classList.add('disabled');
        if (index === question.correct_answer) {
            option.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            option.classList.add('incorrect');
        }
    });

    // Display feedback message
    elements.quizFeedback.style.display = 'block';
    if (isCorrect) {
        elements.quizFeedback.className = 'quiz-feedback correct';
        elements.quizFeedback.textContent = '✓ Correct! Goed gedaan!';
    } else {
        elements.quizFeedback.className = 'quiz-feedback incorrect';
        elements.quizFeedback.textContent = `✗ Incorrect. The correct answer was: ${question.options[question.correct_answer]}`;
    }

    // Show next button or finish button
    if (state.currentQuestionIndex < state.quizQuestions.length - 1) {
        elements.quizNextButton.textContent = 'Next Question';
        elements.quizNextButton.style.display = 'block';
    } else {
        elements.quizNextButton.textContent = 'See Results';
        elements.quizNextButton.style.display = 'block';
    }
}

/**
 * Handle next question button click
 */
function handleNextQuestion() {
    if (state.currentQuestionIndex < state.quizQuestions.length - 1) {
        state.currentQuestionIndex++;
        displayCurrentQuestion();
    } else {
        showQuizResults();
    }
}

/**
 * Show quiz results
 */
function showQuizResults() {
    elements.quizContent.style.display = 'none';
    elements.quizResults.style.display = 'block';

    const percentage = Math.round((state.quizScore / state.quizQuestions.length) * 100);

    elements.quizScore.textContent = `${state.quizScore} / ${state.quizQuestions.length}`;

    if (percentage === 100) {
        elements.quizMessage.textContent = 'Perfect! Uitstekend! 🎉';
    } else if (percentage >= 66) {
        elements.quizMessage.textContent = 'Great job! Goed gedaan! 👏';
    } else if (percentage >= 33) {
        elements.quizMessage.textContent = 'Not bad! Keep practicing! 💪';
    } else {
        elements.quizMessage.textContent = 'Keep trying! Blijf oefenen! 📚';
    }

    // Show replay and continue buttons
    setUIState('finished');
}

/**
 * Continue to next scenario (also hides quiz and transcripts)
 */
async function handleContinue() {
    // Hide quiz section and transcripts
    elements.quizSection.style.display = 'none';
    elements.transcriptControls.style.display = 'none';
    elements.dutchTranscript.style.display = 'none';
    elements.englishTranscript.style.display = 'none';
    elements.showDutchButton.classList.remove('active');
    elements.showEnglishButton.classList.remove('active');

    await loadNewScenario();
}

/**
 * Toggle Dutch transcript visibility
 */
function toggleDutchTranscript() {
    const isVisible = elements.dutchTranscript.style.display === 'block';

    if (!isVisible) {
        // Populate transcript if first time
        if (!elements.dutchContent.innerHTML) {
            populateDutchTranscript();
        }
        elements.dutchTranscript.style.display = 'block';
        elements.showDutchButton.classList.add('active');
        elements.showDutchButton.textContent = '📝 Hide Dutch Text';
    } else {
        elements.dutchTranscript.style.display = 'none';
        elements.showDutchButton.classList.remove('active');
        elements.showDutchButton.textContent = '📝 Show Dutch Text';
    }
}

/**
 * Toggle English transcript visibility
 */
function toggleEnglishTranscript() {
    const isVisible = elements.englishTranscript.style.display === 'block';

    if (!isVisible) {
        // Populate transcript if first time
        if (!elements.englishContent.innerHTML) {
            populateEnglishTranscript();
        }
        elements.englishTranscript.style.display = 'block';
        elements.showEnglishButton.classList.add('active');
        elements.showEnglishButton.textContent = '📖 Hide English Translation';
    } else {
        elements.englishTranscript.style.display = 'none';
        elements.showEnglishButton.classList.remove('active');
        elements.showEnglishButton.textContent = '📖 Show English Translation';
    }
}

/**
 * Populate Dutch transcript
 */
function populateDutchTranscript() {
    elements.dutchContent.innerHTML = '';

    state.currentScript.dialogue.forEach((line) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'transcript-line';

        const speakerDiv = document.createElement('div');
        speakerDiv.className = 'speaker';
        speakerDiv.textContent = line.speaker + ':';

        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = line.text;

        lineDiv.appendChild(speakerDiv);
        lineDiv.appendChild(textDiv);
        elements.dutchContent.appendChild(lineDiv);
    });
}

/**
 * Populate English transcript
 */
function populateEnglishTranscript() {
    elements.englishContent.innerHTML = '';

    state.currentScript.dialogue.forEach((line) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'transcript-line';

        const speakerDiv = document.createElement('div');
        speakerDiv.className = 'speaker';
        speakerDiv.textContent = line.speaker + ':';

        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = line.translation || '[Translation not available]';

        lineDiv.appendChild(speakerDiv);
        lineDiv.appendChild(textDiv);
        elements.englishContent.appendChild(lineDiv);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
