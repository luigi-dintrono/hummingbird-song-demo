# Hummingbird Demo

A Digital Audio Workstation (DAW) plugin demo inspired by [DiffRhythm: Blazingly Fast and Embarrassingly Simple End-to-End Full-Length Song Generation with Latent Diffusion](https://arxiv.org/abs/2503.01183). This project is designed to work as a plugin for DAWs like Logic Pro or Ableton Live, providing AI-powered song generation capabilities within the DAW environment.

## Project Overview

Hummingbird is a DAW plugin that enables musicians and producers to:
- Select audio style references (Jazz, Rock, Pop, etc.) or use their timeline as a reference
- Generate or input lyrics with theme-based suggestions
- Generate full-length songs based on selected audio styles using AI
- Edit and arrange audio tracks in a timeline interface
- Record audio directly in the browser
- Integrate seamlessly with their existing DAW workflow

**Note**: This demo application mocks the Ableton Live interface to showcase the plugin's functionality. The interface is designed to feel familiar to Ableton users, but the plugin is intended to work within both Ableton Live and Logic Pro (and other DAWs) as a native plugin.

The application currently uses pre-generated demo audio files, with plans to integrate the DiffRhythm service for real-time song generation.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- OpenAI API key (for lyrics generation)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hummingbird-demo
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

You can get an OpenAI API key from [OpenAI's website](https://platform.openai.com/api-keys).

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

### Audio Files

The application uses three types of audio files for the demo:

#### 1. Default Audio Tracks (`public/audio-track-default/`)

These tracks are automatically loaded when the top panel initializes, providing a starting point for the timeline editor.

**Required Files:**
- `drum beat.mp3` - First default track
- `Shazam recording.mp3` - Second default track  
- `Vivaldi Four Seasons Summer Allegro.mp3` - Third default track

**File Requirements:**
- Format: MP3
- Any duration (will be detected automatically)
- Sample rate: 44.1kHz recommended
- Bitrate: 128kbps or higher recommended

**Behavior:**
- Tracks are automatically loaded when the component mounts
- Tracks are positioned on the timeline starting at time 0
- Each track has a unique color for visual identification
- Track names are derived from the filename (without extension)
- If a file fails to load, it will be skipped with a warning

#### 2. Audio Style Clips (`public/audio-styles/`)

These are 10-second audio clips used as style references in the Audio Reference section. When a user selects an audio style, the corresponding clip plays automatically.

**Required Files:**

Each audio style needs a corresponding MP3 file named in lowercase:
- `jazz.mp3`
- `punk.mp3`
- `reggae.mp3`
- `country.mp3`
- `pop.mp3`
- `rock.mp3`
- `blues.mp3`
- `opera.mp3`
- `drums.mp3`
- `soul.mp3`
- `indie.mp3`
- `rap.mp3`
- `latin.mp3`
- `classical.mp3`
- `techno.mp3`

**File Requirements:**
- Format: MP3
- Duration: ~10 seconds
- Sample rate: 44.1kHz recommended
- Bitrate: 128kbps or higher recommended

**Usage:**
- Audio files are automatically loaded when a user selects an audio style
- The audio auto-plays when selected
- Users can control playback with play/pause/restart buttons
- A 10-second slider allows scrubbing through the clip
- The selected audio style is saved to browser localStorage for persistence

#### 3. Generated Demo Songs (`public/audio-generated-demo/`)

These are pre-generated demo songs that are selected when a user generates a song. The selection is based on the selected audio style.

**File Naming Convention:**
- `generated-song-{style}.mp3` - Style-specific songs (e.g., `generated-song-rock.mp3`, `generated-song-jazz.mp3`)
- `generated-song-timeline.mp3` - Used when timeline is selected as reference
- `generated-song-1.mp3`, `generated-song-2.mp3`, `generated-song-3.mp3` - Fallback random songs

**Selection Logic:**
1. If timeline is selected as reference → uses `generated-song-timeline.mp3`
2. If an audio style is selected (e.g., "ROCK") → uses `generated-song-rock.mp3` (converts to lowercase)
3. If no matching file exists → randomly selects from available files

**File Requirements:**
- Format: MP3
- Any duration (full-length songs)
- Sample rate: 44.1kHz recommended
- Bitrate: 128kbps or higher recommended

**Usage:**
- Songs are selected when "Generate Demo Song" is clicked
- The selected song appears in the Generated Song panel with playback controls
- A full-length slider allows scrubbing through the entire song
- Users can regenerate to get a different song or add the song to the timeline

### How Demo Sounds Work

For demonstration purposes, this DAW plugin demo uses pre-recorded audio files rather than generating them in real-time. In the final plugin implementation, these would be replaced with real-time AI-generated audio:

1. **Audio Style Selection**: When a user selects an audio style (e.g., "Rock"), the system plays the corresponding 10-second clip from `public/audio-styles/rock.mp3`. This gives users a preview of the style they want to reference.

2. **Timeline Reference**: Users can also select their current timeline as a reference. This allows them to use their own arrangement as the style reference.

3. **Song Generation**: When generating a song, the system:
   - Checks if a style-specific generated song exists (e.g., `generated-song-rock.mp3`)
   - Falls back to timeline-specific song if timeline was selected
   - Otherwise randomly selects from available demo songs

4. **Lyrics Generation**: The application uses OpenAI's API to generate lyrics based on selected themes and reference text. This is the only real-time generation feature currently implemented.

## Next Steps: DiffRhythm Integration & Plugin Development

To integrate real-time song generation using the DiffRhythm model and deploy this as a DAW plugin, follow these steps:

### 1. Set Up DiffRhythm Service

The DiffRhythm model is described in the [research paper](https://arxiv.org/abs/2503.01183). You'll need to:

1. **Obtain the DiffRhythm Model**:
   - Check the paper's repository for model weights and code
   - Set up the model inference service (likely using PyTorch or similar framework)
   - The model can generate full-length songs (up to 4m45s) in ~10 seconds

2. **Deploy the Service**:
   - Set up a Python service (Flask/FastAPI) to handle model inference
   - The service should accept:
     - Lyrics (text)
     - Style prompt (audio style name or timeline reference)
   - Return generated audio file (MP3 format)

### 2. Plugin Architecture

To package this as a DAW plugin, you'll need to:

1. **Choose Plugin Format**:
   - **VST3**: Universal plugin format supported by most DAWs
   - **AU (Audio Unit)**: Native format for Logic Pro and GarageBand
   - **AAX**: Pro Tools format
   - **CLAP**: Modern open-source plugin format

2. **Plugin Framework Options**:
   - **JUCE**: C++ framework supporting all major plugin formats
   - **Web-based plugins**: Use WebView/CEF to embed the Next.js app
   - **Native bridge**: Create a native wrapper that communicates with the web interface

3. **Integration Points**:
   - Audio I/O: Connect to DAW's audio engine for timeline reference
   - MIDI: Support MIDI input/output for synchronization
   - Automation: Expose parameters for DAW automation
   - Presets: Save/load plugin states within DAW projects

4. **Recommended Approach**:
   - Use JUCE framework with embedded WebView to host the Next.js interface
   - Create a bridge between the web interface and DAW's audio engine
   - Implement VST3 and AU formats for maximum compatibility

