"""Main application entry point for TaalQuest."""

import json
import random
import sys
import tkinter as tk
from pathlib import Path
from typing import List, Optional

from .audio_player import AudioPlayer
from .models import Location, Script
from .script_generator import ScriptGenerator
from .tts_generator import TTSGenerator
from .ui.game_window import GameWindow


class TaalQuestApp:
    """Main application class orchestrating the game flow."""

    def __init__(self):
        """Initialize the TaalQuest application."""
        # Initialize components
        self.script_generator = ScriptGenerator()
        self.tts_generator = TTSGenerator()
        self.audio_player = AudioPlayer()

        # Load locations
        self.locations: List[Location] = []
        self.last_location_id: Optional[str] = None

        # Current scenario state
        self.current_script: Optional[Script] = None
        self.current_audio_files: List[str] = []

        # Initialize TKinter
        self.root = tk.Tk()
        self.window = GameWindow(
            self.root,
            on_play=self.handle_play,
            on_replay=self.handle_replay,
            on_continue=self.handle_continue
        )

        # Update timer for audio playback
        self.update_timer_id = None

    def run(self):
        """Run the application."""
        # Check prerequisites
        if not self._check_prerequisites():
            return

        # Load locations
        if not self._load_locations():
            return

        # Generate first scenario
        self.root.after(100, self.generate_new_scenario)

        # Start main loop
        self.root.mainloop()

    def _check_prerequisites(self) -> bool:
        """Check if all required components are available."""
        self.window.set_state_loading()
        self.window.set_status("Checking system requirements...")
        self.root.update()

        # Check Ollama
        if not self.script_generator.check_ollama_available():
            self.window.set_state_error(
                "Ollama not running or gpt-oss:20b not found. "
                "Please start Ollama and run: ollama pull gpt-oss:20b"
            )
            return False

        # Check TTS
        if not self.tts_generator.check_say_available():
            self.window.set_state_error(
                "macOS say command or Dutch voices not available. "
                "Please ensure Dutch voices are installed."
            )
            return False

        return True

    def _load_locations(self) -> bool:
        """Load locations from JSON file."""
        try:
            locations_file = Path("data/locations.json")
            if not locations_file.exists():
                raise FileNotFoundError("data/locations.json not found")

            with open(locations_file, "r") as f:
                locations_data = json.load(f)

            self.locations = [Location(**loc) for loc in locations_data]

            if not self.locations:
                raise ValueError("No locations found in database")

            return True
        except Exception as e:
            self.window.set_state_error(f"Failed to load locations: {e}")
            return False

    def generate_new_scenario(self):
        """Generate a new scenario with random location."""
        self.window.set_state_loading()
        self.root.update()

        try:
            # Select random location (avoid repeating)
            available_locations = [
                loc for loc in self.locations
                if loc.id != self.last_location_id
            ]
            if not available_locations:
                available_locations = self.locations

            location = random.choice(available_locations)
            self.last_location_id = location.id

            # Update UI with location
            self.window.set_location(location.name)
            self.window.set_status("Generating dialogue...")
            self.root.update()

            # Generate script
            script = self.script_generator.generate_scenario_script(location)
            self.current_script = script

            # Generate TTS for each dialogue line
            self.window.set_status("Generating audio...")
            self.root.update()

            audio_files = []
            for line in script.dialogue:
                filepath = self.tts_generator.generate_speech(
                    line.text,
                    line.voice_id
                )
                audio_files.append(filepath)

            self.current_audio_files = audio_files

            # Ready to play
            self.window.set_state_ready()

        except Exception as e:
            self.window.set_state_error(f"Generation failed: {str(e)[:50]}")
            print(f"Error generating scenario: {e}")

    def handle_play(self):
        """Handle play button click."""
        if not self.current_audio_files:
            return

        self.window.set_state_playing()

        # Start playing sequence
        success = self.audio_player.play_sequence(
            self.current_audio_files,
            pause_ms=500
        )

        if success:
            # Start update loop to check when playback finishes
            self._schedule_playback_update()
        else:
            self.window.set_state_error("Failed to start playback")

    def handle_replay(self):
        """Handle replay button click."""
        self.handle_play()

    def handle_continue(self):
        """Handle continue button click."""
        # Stop any playing audio
        self.audio_player.stop_audio()

        # Generate new scenario
        self.generate_new_scenario()

    def _schedule_playback_update(self):
        """Schedule playback status update."""
        # Cancel any existing timer
        if self.update_timer_id:
            self.root.after_cancel(self.update_timer_id)

        self._update_playback_status()

    def _update_playback_status(self):
        """Update playback status and check if finished."""
        is_still_playing = self.audio_player.update_sequence_playback()

        if is_still_playing:
            # Schedule next update
            self.update_timer_id = self.root.after(100, self._update_playback_status)
        else:
            # Playback finished
            self.window.set_state_finished()
            self.update_timer_id = None

    def cleanup(self):
        """Cleanup resources."""
        self.audio_player.cleanup()
        self.script_generator.close()
        self.tts_generator.close()


def main():
    """Main entry point."""
    app = TaalQuestApp()
    try:
        app.run()
    finally:
        app.cleanup()


if __name__ == "__main__":
    main()
