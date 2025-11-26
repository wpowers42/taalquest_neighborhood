# TaalQuest: Neighborhood Watch

An audio-first A1 Dutch learning game where you explore a Dutch neighborhood and unlock slice-of-life scenes.

## Features
- Randomly generated scenarios in Dutch neighborhoods
- A1-level Dutch dialogues
- Text-to-speech with multiple voices
- Simple tap-to-continue gameplay

## Tech Stack
- Python 3.11+
- TKinter for UI
- Ollama (gpt-oss:20b for script generation)
- macOS `say` command for TTS (Dutch voices)
- macOS `afplay` command for audio playback

## Setup

1. Install dependencies with uv:
```bash
uv sync
```

2. Ensure Ollama is running with the required model:
```bash
ollama pull gpt-oss:20b
```

3. Verify Dutch voices are installed (macOS):
```bash
say -v "?" | grep nl_NL
```
You should see Claire and Xander voices listed.

4. Run the game:
```bash
uv run taalquest
```

## Development

This is a steel thread prototype focusing on core audio generation and playback functionality.
