"""Flask backend for TaalQuest web app."""

import json
import os
import random
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from openai_client import OpenAIClient

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for localhost frontend

# Initialize OpenAI client
openai_key = os.getenv("OPENAI_API_KEY")
if not openai_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

ai_client = OpenAIClient(
    api_key=openai_key,
    audio_cache_dir=str(Path(__file__).parent.parent / "generated" / "audio")
)

# Load locations
locations_file = Path(__file__).parent.parent / "data" / "locations.json"
with open(locations_file, "r") as f:
    LOCATIONS = json.load(f)


@app.route("/api/locations", methods=["GET"])
def get_locations():
    """Get all available locations."""
    return jsonify(LOCATIONS)


@app.route("/api/generate-scenario", methods=["POST"])
def generate_scenario():
    """Generate a complete scenario with script and audio.

    Request body:
        {
            "location_id": "bakkerij_centrum",
            "exclude_location_id": "previous_id"  # optional
        }

    Returns:
        {
            "location": {...},
            "script": {...},
            "audio_files": ["file1.mp3", ...]
        }
    """
    try:
        data = request.get_json()
        location_id = data.get("location_id")
        exclude_id = data.get("exclude_location_id")

        # If no location specified, choose random
        if not location_id:
            available = [loc for loc in LOCATIONS if loc["id"] != exclude_id]
            if not available:
                available = LOCATIONS
            location = random.choice(available)
        else:
            location = next((loc for loc in LOCATIONS if loc["id"] == location_id), None)
            if not location:
                return jsonify({"error": "Location not found"}), 404

        # Generate script
        script = ai_client.generate_script(location)

        # Generate audio for all dialogue lines
        audio_files = ai_client.generate_scenario_audio(script)

        return jsonify({
            "location": location,
            "script": script,
            "audio_files": audio_files
        })

    except Exception as e:
        print(f"Error generating scenario: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/generate-audio", methods=["POST"])
def generate_audio():
    """Generate audio for a single text.

    Request body:
        {
            "text": "Dutch text here",
            "voice_id": 0 or 1
        }

    Returns:
        {
            "filename": "abc123_0.mp3"
        }
    """
    try:
        data = request.get_json()
        text = data.get("text")
        voice_id = data.get("voice_id", 0)

        if not text:
            return jsonify({"error": "Text required"}), 400

        filename = ai_client.generate_audio(text, voice_id)

        return jsonify({"filename": filename})

    except Exception as e:
        print(f"Error generating audio: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/audio/<filename>", methods=["GET"])
def get_audio(filename):
    """Serve an audio file."""
    try:
        audio_path = Path(__file__).parent.parent / "generated" / "audio" / filename

        if not audio_path.exists():
            return jsonify({"error": "Audio file not found"}), 404

        return send_file(audio_path, mimetype="audio/mpeg")

    except Exception as e:
        print(f"Error serving audio: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print("Starting TaalQuest Flask backend...")
    print(f"Locations loaded: {len(LOCATIONS)}")
    app.run(host="0.0.0.0", port=5000, debug=True)
