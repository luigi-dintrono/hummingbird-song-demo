# Default Audio Tracks

This folder contains three default audio tracks that are automatically loaded when the top panel initializes.

## Required Files

The following three audio files must be present:

- `track1.mp3` - First default track
- `track2.mp3` - Second default track  
- `track3.mp3` - Third default track

## File Requirements

- Format: MP3
- Any duration (will be detected automatically)
- Sample rate: 44.1kHz recommended
- Bitrate: 128kbps or higher recommended

## Behavior

- Tracks are automatically loaded when the component mounts
- Tracks are staggered on the timeline (2 seconds apart)
- Each track has a unique color for visual identification
- Tracks are named "Track 1", "Track 2", "Track 3"
- If a file fails to load, it will be skipped with a warning

## Usage

Simply place your three MP3 files in this folder with the exact names listed above. The tracks will automatically appear in the timeline when the application loads.

