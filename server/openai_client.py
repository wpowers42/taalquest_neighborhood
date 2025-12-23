"""OpenAI API client for script generation and TTS."""

import hashlib
import json
import os
import random
from pathlib import Path
from typing import Dict, List

from openai import OpenAI


class OpenAIClient:
    """Handles OpenAI API calls for script generation and TTS."""

    def __init__(self, api_key: str, audio_cache_dir: str = "generated/audio", characters_data: List[Dict] = None):
        """Initialize OpenAI client.

        Args:
            api_key: OpenAI API key
            audio_cache_dir: Directory to cache generated audio files
            characters_data: List of character objects from characters.json
        """
        self.client = OpenAI(api_key=api_key)
        self.audio_cache_dir = Path(audio_cache_dir)
        self.audio_cache_dir.mkdir(parents=True, exist_ok=True)
        self.characters = characters_data or []

        # Voice mapping
        self.voice_map = {
            0: "alloy",   # Female-sounding
            1: "echo",    # Male-sounding
        }

    def _select_characters_for_location(self, location_id: str, count: int = 2) -> List[Dict]:
        """Select appropriate characters for a given location.

        Args:
            location_id: Location ID to find characters for
            count: Number of characters to select (default: 2)

        Returns:
            List of character dicts with id, name, personality, voice_id
        """
        # Find characters that are associated with this location
        location_characters = [
            char for char in self.characters
            if location_id in char.get("locations", [])
        ]

        # If we don't have enough characters for this location, use any characters
        if len(location_characters) < count:
            location_characters = self.characters.copy()

        # Randomly select the requested number of characters
        selected = random.sample(location_characters, min(count, len(location_characters)))

        # Return simplified character objects for script generation
        return [
            {
                "id": char["id"],
                "name": char["name"],
                "personality": char.get("personality", []),
                "voice_id": char.get("voice_id", 0),
                "occupation": char.get("occupation", "")
            }
            for char in selected
        ]

    def generate_script(self, location: Dict) -> Dict:
        """Generate A1 Dutch dialogue script for a location.

        Args:
            location: Location dict with id, name, type, description

        Returns:
            Script dict with situation, characters, dialogue

        Raises:
            Exception: If generation fails
        """
        # Select appropriate characters for this location
        selected_characters = self._select_characters_for_location(location["id"])

        # Build character descriptions for the prompt
        char_descriptions = []
        for char in selected_characters:
            personality_str = ", ".join(char["personality"])
            char_descriptions.append(
                f"{char['name']} ({char['occupation']}) - personality: {personality_str}"
            )

        prompt = f"""You are a Dutch language teacher creating A1 level dialogues.

Location: {location['name']} ({location['type']})
Context: {location['description']}

Characters for this dialogue:
{chr(10).join(f"- {desc}" for desc in char_descriptions)}

Generate a natural 15-30 second dialogue between these two specific characters at this location, plus 7 comprehension questions.

Requirements for dialogue:
- A1 Dutch level (CEFR A1 - beginner)
- Use EXACTLY these 2 character names: {selected_characters[0]['name']} and {selected_characters[1]['name']}
- Make the dialogue reflect their personalities and occupations
- 4-8 lines total
- Common everyday situations appropriate for this location
- Simple present tense, basic vocabulary
- Natural but slow-paced conversation
- Include English translation for each dialogue line

Requirements for questions:
- 7 multiple-choice questions testing comprehension
- Questions in English (for A1 learners)
- First 5 questions: Test basic details from the dialogue (who, what, where, how much, etc.)
- Last 2 questions: More challenging comprehension that requires inference, understanding context, or synthesizing information from multiple parts of the dialogue
- 4 answer options each (A, B, C, D)
- Mark the correct answer

Return ONLY valid JSON:
{{
  "situation": "brief scenario description",
  "characters": ["{selected_characters[0]['name']}", "{selected_characters[1]['name']}"],
  "dialogue": [
    {{"speaker": "{selected_characters[0]['name']}", "text": "Dutch text here", "translation": "English translation here"}},
    {{"speaker": "{selected_characters[1]['name']}", "text": "Dutch text here", "translation": "English translation here"}}
  ],
  "questions": [
    {{
      "question": "What did {selected_characters[0]['name']} ask for?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0
    }}
  ]
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-5-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            script_data = json.loads(content)

            # Replace the character names array with full character objects including IDs
            script_data["characters"] = [
                {
                    "id": char["id"],
                    "name": char["name"],
                    "voice_id": char["voice_id"]
                }
                for char in selected_characters
            ]

            # Build voice mapping by character name
            voice_map_char = {
                char["name"]: char["voice_id"]
                for char in selected_characters
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
