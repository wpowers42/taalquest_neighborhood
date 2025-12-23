/**
 * TaalQuest Constants
 * Centralized configuration and constant values
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API = {
    BASE_URL: 'https://api.openai.com/v1'
  , ENDPOINTS: {
        MODELS: '/models'
      , CHAT_COMPLETIONS: '/chat/completions'
      , AUDIO_SPEECH: '/audio/speech'
    }
};

export const MODELS = {
    CHAT: 'gpt-4.1-mini'
  , TTS: 'tts-1'
};

export const RESPONSE_FORMATS = {
    JSON: { type: 'json_object' }
  , MP3: 'mp3'
};

// Temperature settings for different API call types
export const TEMPERATURE = {
    CREATIVE: 1.0      // For creative scenario generation
  , BALANCED: 0.7      // For conversation outline
  , FOCUSED: 0.5       // For dialogue generation
  , DETERMINISTIC: 0.0 // For JSON structuring
};

// ============================================================================
// LOCAL STORAGE
// ============================================================================

export const STORAGE_KEYS = {
    API_KEY: 'taalquest_api_key'
};

export const API_KEY_PREFIX = 'sk-';

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================

export const AUDIO = {
    PAUSE_BETWEEN_LINES_MS: 500
};

// Voice mapping for TTS (OpenAI voices)
export const VOICE_MAP = {
    0: 'alloy'  // Female-sounding
  , 1: 'echo'   // Male-sounding
};

// ============================================================================
// CHARACTERS
// ============================================================================

export const CHARACTERS = [
    { name: 'Sanne', gender: 'F', voice_id: 0 }
  , { name: 'Pieter', gender: 'M', voice_id: 1 }
  , { name: 'Emma', gender: 'F', voice_id: 0 }
  , { name: 'Lars', gender: 'M', voice_id: 1 }
  , { name: 'Sophie', gender: 'F', voice_id: 0 }
  , { name: 'Hendrik', gender: 'M', voice_id: 1 }
  , { name: 'Anna', gender: 'F', voice_id: 0 }
  , { name: 'David', gender: 'M', voice_id: 1 }
];

// ============================================================================
// UI STATES
// ============================================================================

export const UI_STATES = {
    INITIAL: 'initial'
  , LOADING: 'loading'
  , READY: 'ready'
  , PLAYING: 'playing'
  , FINISHED: 'finished'
  , ERROR: 'error'
};

// ============================================================================
// QUIZ CONFIGURATION
// ============================================================================

export const QUIZ = {
    SCORE_THRESHOLDS: {
        PERFECT: 100
      , GREAT: 75
      , PASSING: 50
    }
};
