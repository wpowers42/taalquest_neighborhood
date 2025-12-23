/**
 * TaalQuest - Standalone A1 Dutch Listening Practice
 * Frontend-only application using OpenAI API directly
 */

import { generateScenario, generateScript } from './api.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'taalquest_api_key';
const PAUSE_BETWEEN_AUDIO_MS = 500;

// Embedded character data (simplified from original characters.json)
const CHARACTERS = [
    { name: 'Sanne', gender: 'F', voice_id: 0 },
    { name: 'Pieter', gender: 'M', voice_id: 1 },
    { name: 'Emma', gender: 'F', voice_id: 0 },
    { name: 'Lars', gender: 'M', voice_id: 1 },
    { name: 'Sophie', gender: 'F', voice_id: 0 },
    { name: 'Hendrik', gender: 'M', voice_id: 1 },
    { name: 'Anna', gender: 'F', voice_id: 0 },
    { name: 'David', gender: 'M', voice_id: 1 }
];

// Voice mapping for TTS
const VOICE_MAP = {
    0: 'alloy',  // Female-sounding
    1: 'echo'    // Male-sounding
};

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
    state.apiKey = localStorage.getItem(STORAGE_KEY);
    return state.apiKey;
}

function saveApiKey(key) {
    localStorage.setItem(STORAGE_KEY, key);
    state.apiKey = key;
}

function clearApiKey() {
    localStorage.removeItem(STORAGE_KEY);
    state.apiKey = null;
}

async function validateApiKey(key) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
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

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'tts-1',
            voice: voice,
            input: text,
            response_format: 'mp3'
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
    setUIState('loading');

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

        // Generate audio for each line
        elements.statusMessage.textContent = 'Generating audio...';
        const audioUrls = [];

        for (let i = 0; i < script.dialogue.length; i++) {
            const line = script.dialogue[i];
            elements.statusMessage.textContent = `Generating audio (${i + 1}/${script.dialogue.length})...`;

            const audioUrl = await generateAudio(line.text, line.voice_id);
            audioUrls.push(audioUrl);
        }

        state.currentAudioUrls = audioUrls;

        // Reset quiz state
        state.quizQuestions = script.questions || [];
        state.currentQuestionIndex = 0;
        state.quizScore = 0;
        state.quizAnswered = false;
        state.quizShown = false;

        // Update UI
        elements.scenarioSituation.textContent = script.situation || '';
        setUIState('ready');

        console.log('Scenario ready');

    } catch (error) {
        console.error('Error generating scenario:', error);
        setUIState('error', error.message || 'Failed to generate scenario');
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
    setUIState('playing');

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
        setUIState('error', 'Audio playback failed');
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
        }, PAUSE_BETWEEN_AUDIO_MS);
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
            setUIState('finished');
        }
    }
}

function handleAudioError(event) {
    console.error('Audio error:', event);
    state.isPlaying = false;
    setUIState('error', 'Audio loading failed');
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
        case 'loading':
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

        case 'ready':
            elements.generateButton.style.display = 'none';
            elements.playButton.style.display = 'flex';
            elements.playButton.disabled = false;
            elements.playButton.innerHTML = '<span class="button-icon">&#9654;</span><span class="button-text">Play</span>';
            elements.statusMessage.textContent = '';
            elements.controls.style.display = 'none';
            break;

        case 'playing':
            elements.playButton.innerHTML = '<span class="button-icon">&#9654;</span><span class="button-text">Playing...</span>';
            elements.statusMessage.textContent = 'Listen to the dialogue...';
            break;

        case 'finished':
            elements.playButton.style.display = 'none';
            elements.controls.style.display = 'flex';
            elements.replayButton.disabled = false;
            elements.newDialogueButton.disabled = false;
            elements.statusMessage.textContent = '';
            break;

        case 'error':
            elements.generateButton.style.display = 'flex';
            elements.playButton.style.display = 'none';
            elements.generateButton.innerHTML = '<span class="button-icon">&#8635;</span><span class="button-text">Try Again</span>';
            elements.generateButton.disabled = false;
            elements.statusMessage.innerHTML = `<div class="error-message">${message}</div>`;
            break;

        case 'initial':
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

    if (percentage === 100) {
        elements.quizMessage.textContent = 'Perfect! Uitstekend!';
    } else if (percentage >= 75) {
        elements.quizMessage.textContent = 'Great job! Goed gedaan!';
    } else if (percentage >= 50) {
        elements.quizMessage.textContent = 'Not bad! Keep practicing!';
    } else {
        elements.quizMessage.textContent = 'Keep trying! Blijf oefenen!';
    }

    // Show controls
    setUIState('finished');
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

    if (!key.startsWith('sk-')) {
        elements.apiKeyError.textContent = 'Invalid API key format. It should start with "sk-"';
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
        setUIState('initial');
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
        setUIState('initial');
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
