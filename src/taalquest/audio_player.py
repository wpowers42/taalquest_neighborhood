"""Audio playback using macOS afplay command."""

import subprocess
import time
from pathlib import Path
from typing import List, Optional


class AudioPlayer:
    """Handles audio playback with macOS afplay command."""

    def __init__(self):
        """Initialize audio player."""
        self.current_sequence: List[str] = []
        self.current_index: int = 0
        self.is_playing_sequence: bool = False
        self.pause_duration_ms: int = 500
        self.current_process: Optional[subprocess.Popen] = None

    def play_audio(self, filepath: str) -> bool:
        """Play a single audio file using afplay.

        Args:
            filepath: Path to the audio file

        Returns:
            True if playback started successfully, False otherwise
        """
        try:
            if not Path(filepath).exists():
                raise FileNotFoundError(f"Audio file not found: {filepath}")

            # Stop any currently playing audio
            if self.current_process and self.current_process.poll() is None:
                self.current_process.terminate()

            # Start afplay in background
            self.current_process = subprocess.Popen(
                ["afplay", filepath],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            return True
        except Exception as e:
            print(f"Error playing audio: {e}")
            return False

    def play_sequence(self, filepaths: List[str], pause_ms: int = 500) -> bool:
        """Play multiple audio files sequentially with pauses.

        Args:
            filepaths: List of audio file paths to play in sequence
            pause_ms: Pause duration between files in milliseconds

        Returns:
            True if sequence started successfully, False otherwise
        """
        if not filepaths:
            return False

        # Validate all files exist
        for filepath in filepaths:
            if not Path(filepath).exists():
                raise FileNotFoundError(f"Audio file not found: {filepath}")

        self.current_sequence = filepaths
        self.current_index = 0
        self.pause_duration_ms = pause_ms
        self.is_playing_sequence = True

        # Start playing first file
        return self.play_audio(filepaths[0])

    def update_sequence_playback(self) -> bool:
        """Update sequence playback state. Call this regularly in event loop.

        Returns:
            True if still playing, False if sequence complete
        """
        if not self.is_playing_sequence:
            return False

        # Check if current file finished playing
        if self.current_process and self.current_process.poll() is not None:
            # Current file finished
            # Move to next file
            self.current_index += 1

            if self.current_index >= len(self.current_sequence):
                # Sequence complete
                self.is_playing_sequence = False
                self.current_process = None
                return False

            # Wait for pause duration
            time.sleep(self.pause_duration_ms / 1000.0)

            # Play next file
            self.play_audio(self.current_sequence[self.current_index])

        return True

    def stop_audio(self):
        """Stop audio playback."""
        if self.current_process and self.current_process.poll() is None:
            self.current_process.terminate()
            self.current_process = None
        self.is_playing_sequence = False
        self.current_index = 0

    def is_playing(self) -> bool:
        """Check if audio is currently playing.

        Returns:
            True if playing, False otherwise
        """
        if self.current_process and self.current_process.poll() is None:
            return True
        return self.is_playing_sequence

    def get_playback_progress(self) -> Optional[float]:
        """Get current playback progress.

        Returns:
            Progress as a value between 0.0 and 1.0, or None if not playing a sequence
        """
        if not self.is_playing_sequence or not self.current_sequence:
            return None

        return (self.current_index + 1) / len(self.current_sequence)

    def cleanup(self):
        """Cleanup resources."""
        self.stop_audio()
