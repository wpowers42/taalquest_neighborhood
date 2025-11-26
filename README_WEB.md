# TaalQuest: Neighborhood Watch - Web App

An audio-first A1 Dutch learning game where you explore a Dutch neighborhood and listen to slice-of-life dialogues. Now available as a web application!

## Features
- 🏘️ 15 Dutch neighborhood locations
- 🤖 AI-generated A1-level Dutch dialogues (OpenAI gpt-5.1)
- 🔊 Text-to-speech with distinct voices (OpenAI gpt-4o-mini-tts)
- 🎮 Simple tap-to-continue gameplay
- 💻 Browser-based (Chrome, Firefox, Safari, Edge)

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (zero dependencies!)
- **Backend**: Python Flask
- **AI**: OpenAI API (gpt-5.1 + gpt-4o-mini-tts)
- **Audio**: HTML5 Audio API

## Setup

### Prerequisites
- Python 3.11+
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository** (if not already done)
```bash
cd taalquest_neighborhood
```

2. **Set up environment variable**
```bash
# Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

3. **Install Python dependencies**
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the App

### Option 1: Two-Server Setup (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd server
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```
Backend runs on: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd web
python -m http.server 8000
```
Frontend runs on: http://localhost:8000

**Open your browser** and visit http://localhost:8000

### Option 2: Single-Server Setup

You can also configure Flask to serve the static files directly (modify `server/app.py` to serve the `web/` directory).

## How to Play

1. **Start the app** - A random Dutch location appears
2. **Tap "Play"** - Listen to the A1 Dutch dialogue
3. **Replay** - Listen again to reinforce learning
4. **Continue** - Get a new scenario at a different location

## Project Structure

```
taalquest_neighborhood/
├── web/                    # Frontend
│   ├── index.html         # Main game page
│   ├── styles.css         # Styling
│   └── app.js             # Game logic
├── server/                 # Backend
│   ├── app.py             # Flask API
│   ├── openai_client.py   # OpenAI integration
│   └── requirements.txt   # Python dependencies
├── data/
│   └── locations.json     # 15 Dutch locations
└── generated/
    └── audio/             # Cached audio files (auto-generated)
```

## API Endpoints

- `GET /api/locations` - Get all locations
- `POST /api/generate-scenario` - Generate script + audio
- `GET /api/audio/<filename>` - Serve audio file
- `GET /health` - Health check

## API Costs

Approximate costs per scenario (with OpenAI API):
- **Script generation**: Check gpt-5.1 pricing
- **Audio generation**: Check gpt-4o-mini-tts pricing
- **Caching**: Audio files are cached to reduce API costs

## Development

### Backend Testing
```bash
# Test OpenAI connection
cd server
source venv/bin/activate
python -c "from openai_client import OpenAIClient; import os; from dotenv import load_dotenv; load_dotenv('../.env'); client = OpenAIClient(os.getenv('OPENAI_API_KEY')); print('OpenAI client initialized successfully')"
```

### Frontend Testing
Open `web/index.html` directly in browser, or use any static file server.

## Troubleshooting

### "Failed to fetch locations"
- Ensure backend is running on http://localhost:5000
- Check CORS is enabled in Flask

### "OpenAI API Error"
- Verify `.env` file contains valid `OPENAI_API_KEY`
- Check OpenAI API quota/billing

### "Audio playback failed"
- Check browser console for errors
- Verify audio files are generated in `generated/audio/`
- Try a different browser (Chrome/Firefox recommended)

## Desktop App

The original desktop TKinter app (with Ollama integration) is preserved in:
- `src/taalquest/` - Desktop app code
- See `README.md` for desktop app instructions

## License

Educational project for Dutch language learning.

## Future Enhancements

- [ ] Comprehension quiz questions
- [ ] Progress tracking
- [ ] Multiple difficulty levels (A1, A2, B1)
- [ ] Voice selection UI
- [ ] PWA for mobile use
- [ ] Cloud deployment
