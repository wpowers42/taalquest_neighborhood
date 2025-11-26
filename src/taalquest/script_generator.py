"""Script generation using Ollama gpt-oss:20b."""

import json
import random
from typing import Optional

import httpx

from .models import Location, Scenario, Script, DialogueLine


OLLAMA_BASE_URL = "http://localhost:11434"


class ScriptGenerator:
    """Generates A1 Dutch dialogue scripts using Ollama."""

    def __init__(self, model: str = "gpt-oss:20b"):
        self.model = model
        self.client = httpx.Client(timeout=120.0)

    def generate_scenario_script(self, location: Location) -> Script:
        """Generate a complete script for a location.

        Args:
            location: The location where the scenario takes place

        Returns:
            A Script with scenario and dialogue

        Raises:
            Exception: If generation fails or Ollama is not available
        """
        prompt = self._build_prompt(location)

        try:
            response_text = self._call_ollama(prompt)
            scenario_data = self._parse_json_response(response_text)
            script = self._build_script(location, scenario_data)
            return script
        except Exception as e:
            raise Exception(f"Failed to generate script: {e}")

    def _build_prompt(self, location: Location) -> str:
        """Build the prompt for script generation."""
        return f"""You are a Dutch language teacher creating A1 level dialogues.

Location: {location.name} ({location.type})
Context: {location.description}

Generate a natural 15-30 second dialogue between two people at this location.

Requirements:
- A1 Dutch level (CEFR A1 - beginner)
- 2 speakers with distinct Dutch names
- 4-8 lines total
- Common everyday situations
- Simple present tense, basic vocabulary
- Natural but slow-paced conversation

Format your response ONLY as valid JSON (no other text):
{{
  "situation": "brief scenario description in English",
  "characters": ["Name1", "Name2"],
  "dialogue": [
    {{"speaker": "Name1", "text": "Dutch text here"}},
    {{"speaker": "Name2", "text": "Dutch text here"}}
  ]
}}

Important: Return ONLY the JSON object, no additional text."""

    def _call_ollama(self, prompt: str) -> str:
        """Call Ollama API to generate text."""
        url = f"{OLLAMA_BASE_URL}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
            }
        }

        response = self.client.post(url, json=payload)
        response.raise_for_status()

        result = response.json()
        return result.get("response", "")

    def _parse_json_response(self, response_text: str) -> dict:
        """Parse JSON from the response text.

        Handles cases where the model includes markdown formatting or extra text.
        """
        # Try to extract JSON from markdown code blocks
        text = response_text.strip()

        # Remove markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1

        if start == -1 or end == 0:
            raise ValueError("No JSON object found in response")

        json_text = text[start:end]
        return json.loads(json_text)

    def _build_script(self, location: Location, scenario_data: dict) -> Script:
        """Build a Script object from the generated data."""
        # Create scenario
        scenario = Scenario(
            location=location,
            situation=scenario_data["situation"],
            characters=scenario_data["characters"]
        )

        # Assign random voices to characters
        # Ensure two characters get different voices
        voice_map = {
            scenario.characters[0]: 0,
            scenario.characters[1]: 1
        }

        # Create dialogue lines with voice assignments
        dialogue = []
        for line_data in scenario_data["dialogue"]:
            speaker = line_data["speaker"]
            voice_id = voice_map.get(speaker, random.randint(0, 1))

            dialogue_line = DialogueLine(
                speaker=speaker,
                text=line_data["text"],
                voice_id=voice_id
            )
            dialogue.append(dialogue_line)

        # Estimate duration (roughly 2 seconds per line + pauses)
        duration_estimate = len(dialogue) * 2.5

        return Script(
            scenario=scenario,
            dialogue=dialogue,
            duration_estimate=duration_estimate
        )

    def check_ollama_available(self) -> bool:
        """Check if Ollama is running and the model is available."""
        try:
            response = self.client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()

            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]

            return any(self.model in name for name in model_names)
        except Exception:
            return False

    def close(self):
        """Close the HTTP client."""
        self.client.close()
