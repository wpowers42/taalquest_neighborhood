"""Pregenerate a scenario for UI/UX development without API delays."""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

from openai_client import OpenAIClient

# Load environment variables
load_dotenv("../.env")

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment")

client = OpenAIClient(api_key)

# Load locations
with open("../data/locations.json", "r", encoding="utf-8") as f:
    locations = json.load(f)

# Select a location (using the bakery for consistent testing)
location = locations[0]  # Bakkerij de Gouden Korrel

print(f"Generating scenario for: {location['name']}")

# Generate script
script = client.generate_script(location)
print(f"Script generated with {len(script['dialogue'])} lines")

# Generate audio for all dialogue lines
audio_files = client.generate_scenario_audio(script)
print(f"Audio generated: {len(audio_files)} files")

# Create the complete scenario response
scenario_data = {
    "location": location,
    "script": script,
    "audio_files": audio_files,
}

# Save to JSON file
output_path = Path("../generated/dev_scenario.json")
output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(scenario_data, f, indent=2, ensure_ascii=False)

print(f"\nScenario saved to: {output_path}")
print("\nScenario details:")
print(f"  Location: {location['name']}")
print(f"  Situation: {script['situation']}")
print(f"  Characters: {', '.join(script['characters'])}")
print(f"  Dialogue lines: {len(script['dialogue'])}")
print(f"  Quiz questions: {len(script.get('questions', []))}")
print(f"  Audio files: {len(audio_files)}")
