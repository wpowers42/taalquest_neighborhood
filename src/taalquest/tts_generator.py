"""Text-to-speech generation using macOS say command."""

import hashlib
import subprocess
import time
from pathlib import Path
from typing import Optional


class TTSGenerator:
    """Generates speech audio using macOS say command with Dutch voices."""

    def __init__(self, output_dir: str = "generated/audio"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Map voice_id to Dutch voices
        self.voices = {
            0: "Claire (Enhanced)",  # Female voice
            1: "Xander (Enhanced)",  # Male voice
        }

    def generate_speech(self, text: str, voice_id: int) -> str:
        """Generate speech audio from text using macOS say command.

        Args:
            text: The text to convert to speech
            voice_id: Voice identifier (0 or 1) for voice variation

        Returns:
            Path to the generated audio file

        Raises:
            Exception: If generation fails
        """
        # Create unique filename
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        timestamp = int(time.time())
        filename = f"{timestamp}_{voice_id}_{text_hash}.aiff"
        filepath = self.output_dir / filename

        # Check if already cached
        if filepath.exists():
            return str(filepath)

        try:
            self._call_say_command(text, voice_id, filepath)
            return str(filepath)
        except Exception as e:
            raise Exception(f"Failed to generate speech: {e}")

    def _call_say_command(self, text: str, voice_id: int, filepath: Path):
        """Call macOS say command to generate speech.

        Args:
            text: Text to speak
            voice_id: Voice identifier (0 or 1)
            filepath: Output file path
        """
        voice = self.voices.get(voice_id, self.voices[0])

        # Use say command: say -v "Voice" -o output.aiff "text"
        command = [
            "say",
            "-v", voice,
            "-o", str(filepath),
            "--file-format=AIFF",
            text
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )

        if not filepath.exists():
            raise ValueError(f"Audio file was not created: {filepath}")

    def check_say_available(self) -> bool:
        """Check if macOS say command is available with Dutch voices."""
        try:
            # Check if say command exists
            result = subprocess.run(
                ["say", "-v", "?"],
                capture_output=True,
                text=True,
                check=True
            )

            # Check if Dutch voices are available
            output = result.stdout
            has_claire = "Claire" in output and "nl_NL" in output
            has_xander = "Xander" in output and "nl_NL" in output

            return has_claire or has_xander
        except Exception:
            return False

    def close(self):
        """Cleanup method for compatibility."""
        pass
