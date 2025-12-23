/**
 * TaalQuest - Standalone A1 Dutch Listening Practice
 * Frontend-only application using OpenAI API directly
 */

import { generateScenario, generateScript } from './api.js';
import {
    API
  , MODELS
  , RESPONSE_FORMATS
  , STORAGE_KEYS
  , API_KEY_PREFIX
  , AUDIO
  , VOICE_MAP
  , CHARACTERS
  , UI_STATES
  , QUIZ
} from './constants.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
    // API Key (from localStorage)
    apiKey: null,

    // Current scenario
    currentScript: null,
    currentAudioUrls: [],  // Blob URLs for audio

    // Playback state
    isPlaying: false,
    currentAudioIndex: 0,

    // Quiz state
    quizQuestions: [],
    currentQuestionIndex: 0,
    quizScore: 0,
    quizAnswered: false,
    quizShown: false
};

// DOM elements cache
const elements = {};

// Audio player
const audio = new Audio();

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

function loadApiKey() {
    state.apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    return state.apiKey;
}

function saveApiKey(key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
    state.apiKey = key;
}

function clearApiKey() {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    state.apiKey = null;
}

async function validateApiKey(key) {
    try {
        const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.MODELS}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('API key validation error:', error);
        return false;
    }
}

// ============================================================================
// OPENAI API CALLS
// ============================================================================

async function generateAudio(text, voiceId) {
    const voice = VOICE_MAP[voiceId] || VOICE_MAP[0];

    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.AUDIO_SPEECH}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODELS.TTS,
            voice: voice,
            input: text,
            response_format: RESPONSE_FORMATS.MP3,
            speed: AUDIO.TTS_SPEED
        })
    });

    if (!response.ok) {
        throw new Error('TTS generation failed');
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
}

// ============================================================================
// CHARACTER SELECTION
// ============================================================================

function selectRandomCharacters() {
    // Shuffle and pick one female and one male for voice variety
    const females = CHARACTERS.filter(c => c.gender === 'F');
    const males = CHARACTERS.filter(c => c.gender === 'M');

    const female = females[Math.floor(Math.random() * females.length)];
    const male = males[Math.floor(Math.random() * males.length)];

    // Randomly decide who speaks first
    return Math.random() < 0.5 ? [female, male] : [male, female];
}

// ============================================================================
// SCENARIO GENERATION
// ============================================================================

async function generateNewScenario() {
    console.log('Generating new scenario...');
    setUIState(UI_STATES.LOADING);

    // Clear previous audio blob URLs to prevent memory leaks
    clearAudioUrls();

    try {
        // Select characters
        const [char1, char2] = selectRandomCharacters();
        console.log(`Selected characters: ${char1.name} and ${char2.name}`);

        // Generate rich scenario description
        elements.statusMessage.textContent = 'Imagining scenario...';
        const scenario = await generateScenario(state.apiKey, char1.name, char2.name);
        console.log('Scenario generated:', scenario);

        // Generate script based on scenario (two-stage: outline then dialogue)
        elements.statusMessage.textContent = 'Planning conversation...';
        const script = await generateScript(state.apiKey, char1, char2, scenario.scenario_description);
        console.log('Script generated:', script);

        state.currentScript = script;

        // Generate audio for all lines in parallel
        elements.statusMessage.textContent = `Generating audio for ${script.dialogue.length} lines...`;

        const audioUrls = await Promise.all(
            script.dialogue.map(line => generateAudio(line.text, line.voice_id))
        );

        state.currentAudioUrls = audioUrls;

        // Reset quiz state
        state.quizQuestions = script.questions || [];
        state.currentQuestionIndex = 0;
        state.quizScore = 0;
        state.quizAnswered = false;
        state.quizShown = false;

        // Update UI
        elements.scenarioSituation.textContent = script.situation || '';
        setUIState(UI_STATES.READY);

        console.log('Scenario ready');

    } catch (error) {
        console.error('Error generating scenario:', error);
        setUIState(UI_STATES.ERROR, error.message || 'Failed to generate scenario');
    }
}

function clearAudioUrls() {
    state.currentAudioUrls.forEach(url => {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {
            // Ignore errors
        }
    });
    state.currentAudioUrls = [];
}

// ============================================================================
// AUDIO PLAYBACK
// ============================================================================

function handlePlay() {
    if (!state.currentAudioUrls || state.currentAudioUrls.length === 0) {
        return;
    }

    console.log(`Starting audio playback (${state.currentAudioUrls.length} files)`);

    state.isPlaying = true;
    state.currentAudioIndex = 0;
    elements.currentSpeaker.style.display = 'none';
    setUIState(UI_STATES.PLAYING);

    playCurrentAudio();
}

function handleReplay() {
    console.log('Replaying audio');
    handlePlay();
}

function playCurrentAudio() {
    if (!state.isPlaying || state.currentAudioIndex >= state.currentAudioUrls.length) {
        return;
    }

    const audioUrl = state.currentAudioUrls[state.currentAudioIndex];

    // Show current speaker
    const currentLine = state.currentScript.dialogue[state.currentAudioIndex];
    if (currentLine) {
        elements.speakerName.textContent = currentLine.speaker;
        elements.currentSpeaker.style.display = 'block';
    }

    console.log(`Playing audio ${state.currentAudioIndex + 1}/${state.currentAudioUrls.length}: ${currentLine?.speaker}`);

    audio.src = audioUrl;
    audio.play().catch(error => {
        console.error('Audio playback failed:', error);
        setUIState(UI_STATES.ERROR, 'Audio playback failed');
        state.isPlaying = false;
    });
}

function handleAudioEnded() {
    if (!state.isPlaying) return;

    console.log(`Audio ${state.currentAudioIndex + 1} finished`);

    state.currentAudioIndex++;

    if (state.currentAudioIndex < state.currentAudioUrls.length) {
        // Pause before next audio
        setTimeout(() => {
            playCurrentAudio();
        }, AUDIO.PAUSE_BETWEEN_LINES_MS);
    } else {
        // Sequence complete
        state.isPlaying = false;
        elements.currentSpeaker.style.display = 'none';

        console.log('Audio sequence completed');

        // Show transcript controls
        elements.transcriptControls.style.display = 'flex';

        // Show controls
        elements.controls.style.display = 'flex';
        elements.replayButton.disabled = false;

        // Show quiz if available
        if (state.quizQuestions && state.quizQuestions.length > 0 && !state.quizShown) {
            showQuiz();
        } else if (!state.quizShown) {
            setUIState(UI_STATES.FINISHED);
        }
    }
}

function handleAudioError(event) {
    console.error('Audio error:', event);
    state.isPlaying = false;
    setUIState(UI_STATES.ERROR, 'Audio loading failed');
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

function setUIState(stateName, message = '') {
    // Reset buttons
    elements.generateButton.disabled = true;
    elements.playButton.disabled = true;
    elements.replayButton.disabled = true;
    elements.newDialogueButton.disabled = true;

    // Clear loading class
    elements.generateButton.classList.remove('loading');

    switch (stateName) {
        case UI_STATES.LOADING:
            elements.generateButton.style.display = 'flex';
            elements.playButton.style.display = 'none';
            elements.controls.style.display = 'none';
            elements.generateButton.innerHTML = '<span class="button-icon">&#8987;</span><span class="button-text">Generating...</span>';
            elements.generateButton.classList.add('loading');
            elements.statusMessage.textContent = message || 'Creating your dialogue...';
            elements.transcriptControls.style.display = 'none';
            elements.transcript.style.display = 'none';
            elements.quizSection.style.display = 'none';
            break;

        case UI_STATES.READY:
            elements.generateButton.style.display = 'none';
            elements.playButton.style.display = 'flex';
            elements.playButton.disabled = false;
            elements.playButton.innerHTML = '<span class="button-icon">&#9654;</span><span class="button-text">Play</span>';
            elements.statusMessage.textContent = '';
            elements.controls.style.display = 'none';
            break;

        case UI_STATES.PLAYING:
            elements.playButton.innerHTML = '<span class="button-icon">&#9654;</span><span class="button-text">Playing...</span>';
            elements.statusMessage.textContent = 'Listen to the dialogue...';
            break;

        case UI_STATES.FINISHED:
            elements.playButton.style.display = 'none';
            elements.controls.style.display = 'flex';
            elements.replayButton.disabled = false;
            elements.newDialogueButton.disabled = false;
            elements.statusMessage.textContent = '';
            break;

        case UI_STATES.ERROR:
            elements.generateButton.style.display = 'flex';
            elements.playButton.style.display = 'none';
            elements.generateButton.innerHTML = '<span class="button-icon">&#8635;</span><span class="button-text">Try Again</span>';
            elements.generateButton.disabled = false;
            elements.statusMessage.innerHTML = `<div class="error-message">${message}</div>`;
            break;

        case UI_STATES.INITIAL:
            elements.generateButton.style.display = 'flex';
            elements.playButton.style.display = 'none';
            elements.controls.style.display = 'none';
            elements.generateButton.innerHTML = '<span class="button-icon">&#10024;</span><span class="button-text">Generate New Dialogue</span>';
            elements.generateButton.disabled = false;
            elements.statusMessage.textContent = '';
            elements.transcriptControls.style.display = 'none';
            elements.transcript.style.display = 'none';
            elements.quizSection.style.display = 'none';
            break;
    }
}

// ============================================================================
// QUIZ SYSTEM
// ============================================================================

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

function handleAnswerSelection(selectedIndex) {
    if (state.quizAnswered) return;

    state.quizAnswered = true;
    const question = state.quizQuestions[state.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correct_answer;

    if (isCorrect) {
        state.quizScore++;
    }

    // Show feedback on options
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
        elements.quizFeedback.textContent = 'Correct! Goed gedaan!';
    } else {
        elements.quizFeedback.className = 'quiz-feedback incorrect';
        elements.quizFeedback.textContent = `Incorrect. The correct answer was: ${question.options[question.correct_answer]}`;
    }

    // Show next button
    if (state.currentQuestionIndex < state.quizQuestions.length - 1) {
        elements.quizNextButton.textContent = 'Next Question';
    } else {
        elements.quizNextButton.textContent = 'See Results';
    }
    elements.quizNextButton.style.display = 'block';
}

function handleNextQuestion() {
    if (state.currentQuestionIndex < state.quizQuestions.length - 1) {
        state.currentQuestionIndex++;
        displayCurrentQuestion();
    } else {
        showQuizResults();
    }
}

function showQuizResults() {
    elements.quizContent.style.display = 'none';
    elements.quizResults.style.display = 'block';

    const percentage = Math.round((state.quizScore / state.quizQuestions.length) * 100);

    elements.quizScoreDisplay.textContent = `${state.quizScore} / ${state.quizQuestions.length}`;

    if (percentage === QUIZ.SCORE_THRESHOLDS.PERFECT) {
        elements.quizMessage.textContent = 'Perfect! Uitstekend!';
    } else if (percentage >= QUIZ.SCORE_THRESHOLDS.GREAT) {
        elements.quizMessage.textContent = 'Great job! Goed gedaan!';
    } else if (percentage >= QUIZ.SCORE_THRESHOLDS.PASSING) {
        elements.quizMessage.textContent = 'Not bad! Keep practicing!';
    } else {
        elements.quizMessage.textContent = 'Keep trying! Blijf oefenen!';
    }

    // Show controls
    setUIState(UI_STATES.FINISHED);
}

// ============================================================================
// TRANSCRIPT
// ============================================================================

function toggleTranscript() {
    const isVisible = elements.transcript.style.display === 'block';

    if (!isVisible) {
        // Populate transcript if first time
        if (!elements.transcriptContent.innerHTML) {
            populateTranscript();
        }
        elements.transcript.style.display = 'block';
        elements.showTranscriptButton.classList.add('active');
        elements.showTranscriptButton.textContent = 'Hide Transcript';
    } else {
        elements.transcript.style.display = 'none';
        elements.showTranscriptButton.classList.remove('active');
        elements.showTranscriptButton.textContent = 'Show Transcript';
    }
}

function populateTranscript() {
    elements.transcriptContent.innerHTML = '';

    state.currentScript.dialogue.forEach((line) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'transcript-line';

        // Dutch side
        const dutchSide = document.createElement('div');
        dutchSide.className = 'dutch-side';

        const dutchSpeaker = document.createElement('div');
        dutchSpeaker.className = 'speaker';
        dutchSpeaker.textContent = line.speaker;

        const dutchText = document.createElement('div');
        dutchText.className = 'text';
        dutchText.textContent = line.text;

        dutchSide.appendChild(dutchSpeaker);
        dutchSide.appendChild(dutchText);

        // English side
        const englishSide = document.createElement('div');
        englishSide.className = 'english-side';

        const englishSpeaker = document.createElement('div');
        englishSpeaker.className = 'speaker';
        englishSpeaker.textContent = line.speaker;

        const englishText = document.createElement('div');
        englishText.className = 'text';
        englishText.textContent = line.translation || '[Translation not available]';

        englishSide.appendChild(englishSpeaker);
        englishSide.appendChild(englishText);

        // Add both sides
        lineDiv.appendChild(dutchSide);
        lineDiv.appendChild(englishSide);

        elements.transcriptContent.appendChild(lineDiv);
    });
}

// ============================================================================
// NEW DIALOGUE HANDLER
// ============================================================================

async function handleNewDialogue() {
    // Hide quiz and transcript
    elements.quizSection.style.display = 'none';
    elements.transcriptControls.style.display = 'none';
    elements.transcript.style.display = 'none';
    elements.showTranscriptButton.classList.remove('active');
    elements.showTranscriptButton.textContent = 'Show Transcript';
    elements.currentSpeaker.style.display = 'none';
    elements.transcriptContent.innerHTML = '';

    await generateNewScenario();
}

// ============================================================================
// MODAL HANDLERS
// ============================================================================

function showApiKeyModal() {
    elements.apiKeyModal.style.display = 'flex';
}

function hideApiKeyModal() {
    elements.apiKeyModal.style.display = 'none';
}

function showSettingsModal() {
    elements.settingsApiKeyInput.value = state.apiKey || '';
    elements.settingsModal.style.display = 'flex';
}

function hideSettingsModal() {
    elements.settingsModal.style.display = 'none';
    elements.settingsError.style.display = 'none';
}

async function handleSaveApiKey() {
    const key = elements.apiKeyInput.value.trim();

    if (!key) {
        elements.apiKeyError.textContent = 'Please enter an API key';
        elements.apiKeyError.style.display = 'block';
        return;
    }

    if (!key.startsWith(API_KEY_PREFIX)) {
        elements.apiKeyError.textContent = `Invalid API key format. It should start with "${API_KEY_PREFIX}"`;
        elements.apiKeyError.style.display = 'block';
        return;
    }

    elements.saveApiKeyButton.disabled = true;
    elements.saveApiKeyButton.innerHTML = '<span class="button-text">Validating...</span>';
    elements.apiKeyError.style.display = 'none';

    const isValid = await validateApiKey(key);

    if (isValid) {
        saveApiKey(key);
        hideApiKeyModal();
        setUIState(UI_STATES.INITIAL);
    } else {
        elements.apiKeyError.textContent = 'Invalid API key. Please check and try again.';
        elements.apiKeyError.style.display = 'block';
    }

    elements.saveApiKeyButton.disabled = false;
    elements.saveApiKeyButton.innerHTML = '<span class="button-text">Start Learning</span>';
}

async function handleUpdateApiKey() {
    const key = elements.settingsApiKeyInput.value.trim();

    if (!key) {
        elements.settingsError.textContent = 'Please enter an API key';
        elements.settingsError.style.display = 'block';
        return;
    }

    elements.updateApiKeyButton.disabled = true;
    elements.updateApiKeyButton.innerHTML = '<span class="button-text">Validating...</span>';
    elements.settingsError.style.display = 'none';

    const isValid = await validateApiKey(key);

    if (isValid) {
        saveApiKey(key);
        hideSettingsModal();
    } else {
        elements.settingsError.textContent = 'Invalid API key';
        elements.settingsError.style.display = 'block';
    }

    elements.updateApiKeyButton.disabled = false;
    elements.updateApiKeyButton.innerHTML = '<span class="button-text">Update Key</span>';
}

function handleClearApiKey() {
    if (confirm('Are you sure you want to clear your API key?')) {
        clearApiKey();
        hideSettingsModal();
        showApiKeyModal();
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    console.log('Initializing TaalQuest Standalone...');

    // Cache DOM elements
    elements.apiKeyModal = document.getElementById('api-key-modal');
    elements.apiKeyInput = document.getElementById('api-key-input');
    elements.saveApiKeyButton = document.getElementById('save-api-key-button');
    elements.apiKeyError = document.getElementById('api-key-error');

    elements.settingsModal = document.getElementById('settings-modal');
    elements.settingsButton = document.getElementById('settings-button');
    elements.settingsApiKeyInput = document.getElementById('settings-api-key-input');
    elements.updateApiKeyButton = document.getElementById('update-api-key-button');
    elements.clearApiKeyButton = document.getElementById('clear-api-key-button');
    elements.closeSettingsButton = document.getElementById('close-settings-button');
    elements.settingsError = document.getElementById('settings-error');

    elements.scenarioSituation = document.getElementById('scenario-situation');
    elements.statusMessage = document.getElementById('status-message');
    elements.generateButton = document.getElementById('generate-button');
    elements.playButton = document.getElementById('play-button');
    elements.currentSpeaker = document.getElementById('current-speaker');
    elements.speakerName = document.getElementById('speaker-name');

    elements.controls = document.getElementById('controls');
    elements.replayButton = document.getElementById('replay-button');
    elements.newDialogueButton = document.getElementById('new-dialogue-button');

    elements.transcriptControls = document.getElementById('transcript-controls');
    elements.showTranscriptButton = document.getElementById('show-transcript-button');
    elements.transcript = document.getElementById('transcript');
    elements.transcriptContent = document.getElementById('transcript-content');

    elements.quizSection = document.getElementById('quiz-section');
    elements.quizProgress = document.getElementById('quiz-progress');
    elements.quizQuestion = document.getElementById('quiz-question');
    elements.quizOptions = document.getElementById('quiz-options');
    elements.quizFeedback = document.getElementById('quiz-feedback');
    elements.quizNextButton = document.getElementById('quiz-next-button');
    elements.quizContent = document.getElementById('quiz-content');
    elements.quizResults = document.getElementById('quiz-results');
    elements.quizScoreDisplay = document.getElementById('quiz-score');
    elements.quizMessage = document.getElementById('quiz-message');

    // Set up event listeners
    elements.saveApiKeyButton.addEventListener('click', handleSaveApiKey);
    elements.apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSaveApiKey();
    });

    elements.settingsButton.addEventListener('click', showSettingsModal);
    elements.updateApiKeyButton.addEventListener('click', handleUpdateApiKey);
    elements.clearApiKeyButton.addEventListener('click', handleClearApiKey);
    elements.closeSettingsButton.addEventListener('click', hideSettingsModal);

    elements.generateButton.addEventListener('click', generateNewScenario);
    elements.playButton.addEventListener('click', handlePlay);
    elements.replayButton.addEventListener('click', handleReplay);
    elements.newDialogueButton.addEventListener('click', handleNewDialogue);
    elements.quizNextButton.addEventListener('click', handleNextQuestion);
    elements.showTranscriptButton.addEventListener('click', toggleTranscript);

    // Audio events
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleAudioError);

    // Check for existing API key
    if (loadApiKey()) {
        hideApiKeyModal();
        setUIState(UI_STATES.INITIAL);
    } else {
        showApiKeyModal();
    }

    console.log('TaalQuest initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
