"""TKinter UI components for TaalQuest."""

import tkinter as tk
from tkinter import font as tkfont
from typing import Callable, Optional


class GameWindow:
    """Main game window UI."""

    def __init__(
        self,
        root: tk.Tk,
        on_play: Callable,
        on_replay: Callable,
        on_continue: Callable
    ):
        """Initialize the game window.

        Args:
            root: The root Tkinter window
            on_play: Callback for play button
            on_replay: Callback for replay button
            on_continue: Callback for continue button
        """
        self.root = root
        self.on_play = on_play
        self.on_replay = on_replay
        self.on_continue = on_continue

        self._setup_window()
        self._create_widgets()

    def _setup_window(self):
        """Configure the main window."""
        self.root.title("TaalQuest: Neighborhood Watch")
        self.root.geometry("500x600")
        self.root.resizable(False, False)

        # Set colors
        self.bg_color = "#f5f5f5"
        self.accent_color = "#2196F3"
        self.root.configure(bg=self.bg_color)

    def _create_widgets(self):
        """Create all UI widgets."""
        # Title
        title_font = tkfont.Font(family="Helvetica", size=20, weight="bold")
        self.title_label = tk.Label(
            self.root,
            text="TaalQuest: Neighborhood Watch",
            font=title_font,
            bg=self.bg_color,
            fg="#333"
        )
        self.title_label.pack(pady=20)

        # Location frame
        location_frame = tk.Frame(self.root, bg=self.bg_color)
        location_frame.pack(pady=20)

        # Location icon placeholder
        self.location_icon = tk.Label(
            location_frame,
            text="🏘️",
            font=("Helvetica", 48),
            bg=self.bg_color
        )
        self.location_icon.pack()

        # Location name
        location_font = tkfont.Font(family="Helvetica", size=18, weight="bold")
        self.location_label = tk.Label(
            location_frame,
            text="Loading...",
            font=location_font,
            bg=self.bg_color,
            fg="#555",
            wraplength=400
        )
        self.location_label.pack(pady=10)

        # Status/Play area
        status_frame = tk.Frame(self.root, bg=self.bg_color)
        status_frame.pack(pady=30, expand=True)

        # Status label (shows "Playing...", "Ready", etc.)
        status_font = tkfont.Font(family="Helvetica", size=14)
        self.status_label = tk.Label(
            status_frame,
            text="",
            font=status_font,
            bg=self.bg_color,
            fg="#666"
        )
        self.status_label.pack()

        # Play button (main action button)
        self.play_button = tk.Button(
            status_frame,
            text="▶ Tap to Play",
            font=("Helvetica", 16, "bold"),
            bg=self.accent_color,
            fg="white",
            width=15,
            height=2,
            relief=tk.FLAT,
            cursor="hand2",
            command=self.on_play
        )
        self.play_button.pack(pady=20)

        # Control buttons frame
        controls_frame = tk.Frame(self.root, bg=self.bg_color)
        controls_frame.pack(pady=20)

        # Replay button
        button_font = tkfont.Font(family="Helvetica", size=12)
        self.replay_button = tk.Button(
            controls_frame,
            text="↻ Replay",
            font=button_font,
            bg="white",
            fg="#333",
            width=12,
            height=2,
            relief=tk.SOLID,
            borderwidth=1,
            cursor="hand2",
            command=self.on_replay,
            state=tk.DISABLED
        )
        self.replay_button.grid(row=0, column=0, padx=10)

        # Continue button
        self.continue_button = tk.Button(
            controls_frame,
            text="→ Continue",
            font=button_font,
            bg="white",
            fg="#333",
            width=12,
            height=2,
            relief=tk.SOLID,
            borderwidth=1,
            cursor="hand2",
            command=self.on_continue,
            state=tk.DISABLED
        )
        self.continue_button.grid(row=0, column=1, padx=10)

    def set_location(self, location_name: str):
        """Update the location display.

        Args:
            location_name: Name of the location to display
        """
        self.location_label.config(text=location_name)

    def set_status(self, status: str):
        """Update the status message.

        Args:
            status: Status text to display
        """
        self.status_label.config(text=status)

    def set_state_loading(self):
        """Set UI to loading state."""
        self.play_button.config(state=tk.DISABLED, text="Generating...")
        self.replay_button.config(state=tk.DISABLED)
        self.continue_button.config(state=tk.DISABLED)
        self.set_status("Generating scenario...")

    def set_state_ready(self):
        """Set UI to ready state (ready to play)."""
        self.play_button.config(state=tk.NORMAL, text="▶ Tap to Play")
        self.replay_button.config(state=tk.DISABLED)
        self.continue_button.config(state=tk.DISABLED)
        self.set_status("")

    def set_state_playing(self):
        """Set UI to playing state."""
        self.play_button.config(state=tk.DISABLED, text="▶ Playing...")
        self.replay_button.config(state=tk.DISABLED)
        self.continue_button.config(state=tk.DISABLED)
        self.set_status("🔊 Playing audio...")

    def set_state_finished(self):
        """Set UI to finished state (can replay or continue)."""
        self.play_button.config(state=tk.DISABLED, text="✓ Finished")
        self.replay_button.config(state=tk.NORMAL)
        self.continue_button.config(state=tk.NORMAL)
        self.set_status("Tap Replay to listen again, or Continue for a new scene")

    def set_state_error(self, error_message: str):
        """Set UI to error state.

        Args:
            error_message: Error message to display
        """
        self.play_button.config(state=tk.NORMAL, text="↻ Try Again")
        self.replay_button.config(state=tk.DISABLED)
        self.continue_button.config(state=tk.NORMAL)
        self.set_status(f"❌ Error: {error_message}")
