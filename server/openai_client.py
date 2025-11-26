"""OpenAI API client for script generation and TTS."""

import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List

from openai import OpenAI


class OpenAIClient:
    """Handles OpenAI API calls for script generation and TTS."""

    def __init__(self, api_key: str, audio_cache_dir: str = "generated/audio"):
        """Initialize OpenAI client.

        Args:
            api_key: OpenAI API key
            audio_cache_dir: Directory to cache generated audio files
        """
        self.client = OpenAI(api_key=api_key)
        self.audio_cache_dir = Path(audio_cache_dir)
        self.audio_cache_dir.mkdir(parents=True, exist_ok=True)

        # Voice mapping
        self.voice_map = {
            0: "alloy",   # Female-sounding
            1: "echo",    # Male-sounding
        }

    def generate_script(self, location: Dict) -> Dict:
        """Generate A1 Dutch dialogue script for a location.

        Args:
            location: Location dict with id, name, type, description

        Returns:
            Script dict with situation, characters, dialogue

        Raises:
            Exception: If generation fails
        """
        prompt = f"""You are a Dutch language teacher creating A1 level dialogues.

Location: {location['name']} ({location['type']})
Context: {location['description']}

Generate a natural 15-30 second dialogue between two people at this location.

Requirements:
- A1 Dutch level (CEFR A1 - beginner)
- 2 speakers with distinct Dutch names
- 4-8 lines total
- Common everyday situations
- Simple present tense, basic vocabulary
- Natural but slow-paced conversation

Return ONLY valid JSON:
{{
  "situation": "brief scenario description",
  "characters": ["Name1", "Name2"],
  "dialogue": [
    {{"speaker": "Name1", "text": "Dutch text here"}},
    {{"speaker": "Name2", "text": "Dutch text here"}}
  ]
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-5.1",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            script_data = json.loads(content)

            # Assign voices to characters (alternating)
            voice_map_char = {
                script_data["characters"][0]: 0,
                script_data["characters"][1]: 1
            }

            # Add voice_id to each dialogue line
            for line in script_data["dialogue"]:
                line["voice_id"] = voice_map_char.get(line["speaker"], 0)

            return script_data

        except Exception as e:
            raise Exception(f"Script generation failed: {e}")

    def generate_audio(self, text: str, voice_id: int) -> str:
        """Generate TTS audio for Dutch text.

        Args:
            text: Dutch text to convert to speech
            voice_id: Voice identifier (0 or 1)

        Returns:
            Filename of generated audio (relative to audio_cache_dir)

        Raises:
            Exception: If generation fails
        """
        # Generate cache filename
        text_hash = hashlib.md5(text.encode()).hexdigest()[:12]
        filename = f"{text_hash}_{voice_id}.mp3"
        filepath = self.audio_cache_dir / filename

        # Check cache
        if filepath.exists():
            print(f"Audio cache hit: {filename}")
            return filename

        # Generate audio
        try:
            voice = self.voice_map.get(voice_id, self.voice_map[0])

            response = self.client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=voice,
                input=text,
                response_format="mp3"
            )

            # Save audio
            response.stream_to_file(str(filepath))
            print(f"Generated audio: {filename}")
            return filename

        except Exception as e:
            raise Exception(f"Audio generation failed: {e}")

    def generate_scenario_audio(self, script: Dict) -> List[str]:
        """Generate audio for all dialogue lines in a script.

        Args:
            script: Script dict with dialogue array

        Returns:
            List of audio filenames in order

        Raises:
            Exception: If any audio generation fails
        """
        audio_files = []
        for line in script["dialogue"]:
            filename = self.generate_audio(line["text"], line["voice_id"])
            audio_files.append(filename)

        return audio_files
