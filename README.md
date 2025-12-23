# TaalQuest: Neighborhood Watch

An audio-first A1 Dutch learning game where you explore a Dutch neighborhood and listen to slice-of-life dialogues.

## Features

- 15 Dutch neighborhood locations
- AI-generated A1-level Dutch dialogues (OpenAI gpt-4.1)
- Text-to-speech with distinct voices (OpenAI gpt-4o-mini-tts)
- Comprehension quiz questions after each dialogue
- Interactive learning with immediate feedback
- Browser-based (Chrome, Firefox, Safari, Edge)
- Zero dependencies - pure HTML/CSS/JavaScript

## Setup

### Prerequisites

- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Modern web browser

### Running the App

1. Open `index.html` in your browser
2. Enter your OpenAI API key when prompted
3. Start learning Dutch!

Alternatively, serve with any static file server:

```bash
python -m http.server 8000
# Then open http://localhost:8000
```

## How to Play

1. **Start the app** - A random Dutch location appears
2. **Tap "Play"** - Listen to the A1 Dutch dialogue
3. **Answer questions** - Test your comprehension with 3 multiple-choice questions
4. **See your score** - Get immediate feedback
5. **Replay** - Listen to the dialogue again
6. **Continue** - Get a new scenario at a different location

## Project Structure

```
taalquest_neighborhood/
├── index.html     # Main game page
├── styles.css     # Styling
└── app.js         # Game logic + embedded data
```

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (zero dependencies!)
- **AI**: OpenAI API (gpt-4.1 + gpt-4o-mini-tts) - called directly from browser

## API Costs

Approximate costs per scenario:
- **Script generation**: ~$0.01 (gpt-4.1)
- **Audio generation**: ~$0.02 (gpt-4o-mini-tts)

## License

Educational project for Dutch language learning.
