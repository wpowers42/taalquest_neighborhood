"""Data models for TaalQuest."""

from typing import List
from pydantic import BaseModel, Field


class Location(BaseModel):
    """A location in the Dutch neighborhood."""

    id: str = Field(..., description="Unique identifier for the location")
    name: str = Field(..., description="Dutch name of the location")
    type: str = Field(..., description="Type of location (e.g., bakkerij, supermarkt)")
    description: str = Field(..., description="Brief description of the location")


class DialogueLine(BaseModel):
    """A single line of dialogue."""

    speaker: str = Field(..., description="Name of the character speaking")
    text: str = Field(..., description="A1 Dutch text")
    voice_id: int = Field(..., ge=0, le=1, description="Voice ID (0 or 1)")


class Scenario(BaseModel):
    """A scenario at a specific location."""

    location: Location = Field(..., description="The location where this scenario takes place")
    situation: str = Field(..., description="Brief description of the scenario")
    characters: List[str] = Field(..., min_length=2, max_length=2, description="Two character names")


class Script(BaseModel):
    """A complete script with dialogue."""

    scenario: Scenario = Field(..., description="The scenario for this script")
    dialogue: List[DialogueLine] = Field(..., min_length=4, max_length=8, description="4-8 dialogue lines")
    duration_estimate: float = Field(default=20.0, description="Estimated duration in seconds")

    @property
    def audio_files(self) -> List[str]:
        """Get list of expected audio file paths for this script."""
        return [f"generated/audio/{i:02d}_{line.speaker}_{line.voice_id}.wav"
                for i, line in enumerate(self.dialogue)]
