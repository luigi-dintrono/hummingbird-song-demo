"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Info, Zap, Play, Pause, RotateCcw, CheckCircle2, Circle, RefreshCw, PlusCircle, Music } from "lucide-react";
import { generateLyrics } from "@/lib/generate-lyrics";

// Audio style options
const AUDIO_STYLES = [
  "JAZZ", "PUNK", "REGGAE", "COUNTRY",
  "POP", "ROCK", "BLUES", "OPERA",
  "DRUMS", "SOUL", "INDIE",
  "RAP", "LATIN", "CLASSICAL", "TECHNO",
];

// Lyrics theme options
const LYRICS_THEMES = [
  "CHOIR", "HEROIC", "LOVE",
  "NOSTALGIA", "HOME", "LOSS",
  "LIFE", "CHAMPION", "INSPIRING",
  "JOYFUL", "FREE", "HOPE",
];

export function BottomPanel() {
  // State for each section - empty or completed
  const [audioReferenceState, setAudioReferenceState] = useState<"empty" | "completed">("empty");
  const [lyricsState, setLyricsState] = useState<"empty" | "completed">("empty");
  const [generatedSongState, setGeneratedSongState] = useState<"empty" | "completed">("empty");
  const [selectedAudioStyle, setSelectedAudioStyle] = useState<string | null>(null);
  const [isTimelineReference, setIsTimelineReference] = useState<boolean>(false);
  const [selectedLyricsThemes, setSelectedLyricsThemes] = useState<string[]>([]);
  const [lyricsText, setLyricsText] = useState<string>("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load audio style from localStorage on mount
  useEffect(() => {
    try {
      const savedAudioStyle = localStorage.getItem('hummingbird-selectedAudioStyle');
      if (savedAudioStyle) {
        setSelectedAudioStyle(savedAudioStyle);
        setAudioReferenceState("completed");
      }
    } catch (error) {
      console.warn('Failed to load audio style from localStorage:', error);
    }
  }, []);

  // Save audio style to localStorage when it changes
  useEffect(() => {
    if (selectedAudioStyle) {
      try {
        localStorage.setItem('hummingbird-selectedAudioStyle', selectedAudioStyle);
      } catch (error) {
        console.warn('Failed to save audio style to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('hummingbird-selectedAudioStyle');
      } catch (error) {
        console.warn('Failed to remove audio style from localStorage:', error);
      }
    }
  }, [selectedAudioStyle]);
  const [selectedGeneratedSong, setSelectedGeneratedSong] = useState<string | null>(null);
  const [isGeneratedSongPlaying, setIsGeneratedSongPlaying] = useState<boolean>(false);
  const generatedSongAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isGeneratingSong, setIsGeneratingSong] = useState<boolean>(false);
  // Track if lyrics were generated (vs manually typed) to know when to save
  const lyricsGeneratedRef = useRef<boolean>(false);

  // Load lyrics from localStorage on component mount
  useEffect(() => {
    try {
      const savedLyricsText = localStorage.getItem('hummingbird_lyrics_text');
      const savedLyricsThemes = localStorage.getItem('hummingbird_lyrics_themes');
      
      if (savedLyricsText) {
        setLyricsText(savedLyricsText);
        // If there are saved lyrics, mark lyrics as completed
        if (savedLyricsText.trim().length > 0) {
          setLyricsState("completed");
        }
      }
      
      if (savedLyricsThemes) {
        try {
          const themes = JSON.parse(savedLyricsThemes);
          if (Array.isArray(themes) && themes.length > 0) {
            setSelectedLyricsThemes(themes);
            setLyricsState("completed");
          }
        } catch (e) {
          console.warn('Failed to parse saved lyrics themes:', e);
        }
      }
    } catch (error) {
      console.warn('Failed to load lyrics from localStorage:', error);
    }
  }, []);

  // Listen for timeline playback state changes from top panel
  useEffect(() => {
    const handleTimelinePlayState = (event: Event) => {
      const customEvent = event as CustomEvent<{ isPlaying: boolean }>;
      setIsAudioPlaying(customEvent.detail.isPlaying);
    };

    window.addEventListener('timelinePlayStateChanged', handleTimelinePlayState);

    return () => {
      window.removeEventListener('timelinePlayStateChanged', handleTimelinePlayState);
    };
  }, []);

  // Auto-play audio when style is selected
  useEffect(() => {
    if (selectedAudioStyle && audioRef.current && !isTimelineReference) {
      const playAudio = async () => {
        try {
          audioRef.current!.currentTime = 0;
          await audioRef.current!.play();
          setIsAudioPlaying(true);
        } catch (error) {
          console.error('Error playing audio:', error);
          // Auto-play might be blocked by browser, user will need to click play
        }
      };
      playAudio();
    }
  }, [selectedAudioStyle, isTimelineReference]);

  // Update audio element when selected generated song changes
  useEffect(() => {
    if (selectedGeneratedSong && generatedSongAudioRef.current) {
      generatedSongAudioRef.current.src = selectedGeneratedSong;
      generatedSongAudioRef.current.load();
      setIsGeneratedSongPlaying(false);
    }
  }, [selectedGeneratedSong]);

  return (
    <div className="h-full flex flex-col bg-muted/20 p-4 min-h-0 overflow-auto">
      <div className="mb-3 flex justify-center">
        <h2 className="text-base font-medium text-foreground">Hummingbird</h2>
      </div>

      {/* Three Main Sections */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Audio Reference Section */}
        <Card className="flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>Audio Reference</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6 min-h-0 overflow-auto">
            {/* Audio Style Grid */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Audio Style</h3>
              <div className="grid grid-cols-4 gap-2">
                {/* Special button to add timeline as audio reference - First position */}
                <Button
                  variant={isTimelineReference ? "default" : "outline"}
                  size="sm"
                  className={`h-10 rounded-lg border-dashed ${
                    isTimelineReference
                      ? "bg-foreground text-background hover:bg-foreground/90 border-2"
                      : "bg-background hover:bg-accent border-2 border-muted-foreground/50"
                  }`}
                  onClick={() => {
                    if (isTimelineReference) {
                      setSelectedAudioStyle(null);
                      setAudioReferenceState("empty");
                      setIsTimelineReference(false);
                      // Stop timeline playback
                      const stopEvent = new CustomEvent('stopTimeline', {
                        detail: {}
                      });
                      window.dispatchEvent(stopEvent);
                      setIsAudioPlaying(false);
                    } else {
                      // Set timeline as reference and start playing
                      setIsTimelineReference(true);
                      setSelectedAudioStyle(null);
                      setAudioReferenceState("completed");
                      
                      // Dispatch event to top panel to start playing timeline
                      const event = new CustomEvent('playTimeline', {
                        detail: {}
                      });
                      window.dispatchEvent(event);
                      setIsAudioPlaying(true);
                    }
                  }}
                >
                  <Music className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">ADD TIMELINE</span>
                </Button>
                {AUDIO_STYLES.map((style, index) => {
                  const isSelected = selectedAudioStyle === style && !isTimelineReference;
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`h-10 rounded-lg ${
                        isSelected 
                          ? "bg-foreground text-background hover:bg-foreground/90" 
                          : "bg-background hover:bg-accent"
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedAudioStyle(null);
                          setAudioReferenceState("empty");
                          setIsTimelineReference(false);
                          if (audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                            setIsAudioPlaying(false);
                          }
                        } else {
                          setSelectedAudioStyle(style);
                          setAudioReferenceState("completed");
                          setIsTimelineReference(false);
                          // Stop timeline if it was playing
                          const stopEvent = new CustomEvent('stopTimeline', {
                            detail: {}
                          });
                          window.dispatchEvent(stopEvent);
                          setIsAudioPlaying(false);
                        }
                      }}
                    >
                      {style}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Selected Audio Reference */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Selected Audio Reference</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Selected Audio Reference</h4>
                      <p className="text-sm text-muted-foreground">
                        Select an audio style from the grid above or upload your own track to use as a reference for generating your song.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {selectedAudioStyle || isTimelineReference ? (
                <div className="flex-1 border rounded-lg bg-muted/50 flex flex-col items-center justify-center p-4 gap-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {isTimelineReference ? "Selected Reference" : "Selected Style"}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {isTimelineReference ? "Timeline" : selectedAudioStyle}
                    </p>
                  </div>
                  {!isTimelineReference && (
                    <audio
                      ref={audioRef}
                      src={`/audio-styles/${selectedAudioStyle?.toLowerCase()}.mp3`}
                      onPlay={() => setIsAudioPlaying(true)}
                      onPause={() => setIsAudioPlaying(false)}
                      onEnded={() => setIsAudioPlaying(false)}
                      preload="auto"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        if (isTimelineReference) {
                          // Control timeline playback
                          const event = new CustomEvent(isAudioPlaying ? 'pauseTimeline' : 'playTimeline', {
                            detail: {}
                          });
                          window.dispatchEvent(event);
                          setIsAudioPlaying(!isAudioPlaying);
                        } else {
                          // Control audio style playback
                          if (audioRef.current) {
                            if (isAudioPlaying) {
                              audioRef.current.pause();
                            } else {
                              audioRef.current.play();
                            }
                          }
                        }
                      }}
                    >
                      {isAudioPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        if (isTimelineReference) {
                          // Restart timeline
                          const stopEvent = new CustomEvent('stopTimeline', {
                            detail: {}
                          });
                          window.dispatchEvent(stopEvent);
                          const playEvent = new CustomEvent('playTimeline', {
                            detail: {}
                          });
                          window.dispatchEvent(playEvent);
                          setIsAudioPlaying(true);
                        } else {
                          // Restart audio style
                          if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play();
                          }
                        }
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center bg-muted/30">
                  <div className="w-8 h-8 border-2 border-foreground rounded flex items-center justify-center mb-1">
                    <Plus className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center px-2">
                    Select style OR Add from your track
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lyrics Section */}
        <Card className="flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>Lyrics</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6 min-h-0 overflow-auto">
            {/* Lyrics Theme Grid */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Lyrics Theme</h3>
              <div className="grid grid-cols-3 gap-2">
                {LYRICS_THEMES.map((theme, index) => {
                  const isSelected = selectedLyricsThemes.includes(theme);
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`h-10 rounded-lg ${
                        isSelected 
                          ? "bg-foreground text-background hover:bg-foreground/90" 
                          : "bg-background hover:bg-accent"
                      }`}
                      onClick={() => {
                        const newSelectedThemes = isSelected
                          ? selectedLyricsThemes.filter(t => t !== theme)
                          : [...selectedLyricsThemes, theme];
                        setSelectedLyricsThemes(newSelectedThemes);
                        // Update lyrics state if themes are selected or text is entered
                        if (newSelectedThemes.length > 0 || lyricsText.trim().length > 0) {
                          setLyricsState("completed");
                        } else {
                          setLyricsState("empty");
                        }
                      }}
                    >
                      {theme}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Lyrics Reference */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Lyrics Reference</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Lyrics Reference</h4>
                      <p className="text-sm text-muted-foreground">
                        Enter lyrics or text that will be used as a reference for generating the song lyrics. You can also select a theme from the grid above.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 min-h-[120px] border rounded-lg bg-background">
                <textarea
                  className="w-full h-full p-3 resize-none border-0 rounded-lg bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Describe your lyrics or add full lyrics to generate the song"
                  value={lyricsText}
                  onChange={(e) => {
                    setLyricsText(e.target.value);
                    // Update lyrics state if text is entered or themes are selected
                    if (e.target.value.trim().length > 0 || selectedLyricsThemes.length > 0) {
                      setLyricsState("completed");
                    } else {
                      setLyricsState("empty");
                    }
                  }}
                />
              </div>
              <Button
                variant="default"
                size="sm"
                className="mt-3 w-full rounded-lg"
                disabled={isGeneratingLyrics || (selectedLyricsThemes.length === 0 && lyricsText.trim().length === 0)}
                onClick={async () => {
                  if (selectedLyricsThemes.length === 0 && lyricsText.trim().length === 0) {
                    return;
                  }

                  setIsGeneratingLyrics(true);
                  const result = await generateLyrics({
                    themes: selectedLyricsThemes,
                    lyricsReference: lyricsText,
                  });

                  if (result.error) {
                    alert(`Failed to generate lyrics: ${result.error}`);
                  } else if (result.lyrics) {
                    setLyricsText(result.lyrics);
                    setLyricsState("completed");
                    lyricsGeneratedRef.current = true;
                    // Save generated lyrics to localStorage
                    try {
                      localStorage.setItem('hummingbird_lyrics_text', result.lyrics);
                      localStorage.setItem('hummingbird_lyrics_themes', JSON.stringify(selectedLyricsThemes));
                    } catch (error) {
                      console.warn('Failed to save lyrics to localStorage:', error);
                    }
                  }
                  setIsGeneratingLyrics(false);
                }}
              >
                {isGeneratingLyrics ? 'Generating...' : 'Generate Lyrics'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Song Section */}
        <Card className="flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>Generated Song</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 min-h-0 overflow-auto">
            {/* Two Steps with Checkmarks */}
            <div className="flex items-center gap-4 mb-4">
              {/* Step 1: Audio Reference */}
              <div className="flex items-center gap-2">
                {audioReferenceState === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-foreground" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
                <span className={`text-sm ${audioReferenceState === "completed" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  Audio Reference
                </span>
              </div>
              
              {/* Step 2: Lyrics Generated */}
              <div className="flex items-center gap-2">
                {lyricsState === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-foreground" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
                <span className={`text-sm ${lyricsState === "completed" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  Lyrics Generated
                </span>
              </div>
            </div>

            {/* Sound Controls */}
            {generatedSongState === "completed" && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => {
                    // If no song is selected, select a random one
                    if (!selectedGeneratedSong) {
                      const songs = [
                        '/audio-generated-demo/generated-song-1.mp3',
                        '/audio-generated-demo/generated-song-2.mp3',
                        '/audio-generated-demo/generated-song-3.mp3',
                      ];
                      const randomSong = songs[Math.floor(Math.random() * songs.length)];
                      setSelectedGeneratedSong(randomSong);
                      // Wait for audio element to update
                      setTimeout(() => {
                        if (generatedSongAudioRef.current) {
                          generatedSongAudioRef.current.play();
                          setIsGeneratedSongPlaying(true);
                        }
                      }, 100);
                    } else if (generatedSongAudioRef.current) {
                      if (isGeneratedSongPlaying) {
                        generatedSongAudioRef.current.pause();
                        setIsGeneratedSongPlaying(false);
                      } else {
                        generatedSongAudioRef.current.play();
                        setIsGeneratedSongPlaying(true);
                      }
                    }
                  }}
                >
                  {isGeneratedSongPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => {
                    if (generatedSongAudioRef.current) {
                      generatedSongAudioRef.current.currentTime = 0;
                      if (!isGeneratedSongPlaying) {
                        generatedSongAudioRef.current.play();
                        setIsGeneratedSongPlaying(true);
                      }
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                {selectedGeneratedSong && (
                  <audio
                    ref={generatedSongAudioRef}
                    src={selectedGeneratedSong}
                    onPlay={() => setIsGeneratedSongPlaying(true)}
                    onPause={() => setIsGeneratedSongPlaying(false)}
                    onEnded={() => setIsGeneratedSongPlaying(false)}
                    preload="auto"
                  />
                )}
              </div>
            )}

            {/* Song Visualization Bar */}
            {generatedSongState === "completed" && selectedGeneratedSong ? (
              <div className="flex-1 min-h-[200px] border rounded-lg bg-muted/50 flex flex-col p-4 gap-3">
                <div className="text-center mb-2">
                  <p className="text-sm font-medium text-foreground mb-1">Generated Song</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedGeneratedSong.split('/').pop()?.replace('.mp3', '') || 'Generated Song'}
                  </p>
                </div>
                {/* Simple waveform visualization bar */}
                <div className="flex-1 flex items-end justify-center gap-1">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const height = Math.random() * 60 + 20; // Random height for visualization
                    return (
                      <div
                        key={i}
                        className="w-1 bg-foreground rounded-full transition-all"
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-[200px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">No song generated yet</p>
                  <p className="text-xs text-muted-foreground">Complete Audio Reference and Lyrics to generate</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {generatedSongState === "completed" ? (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1 rounded-lg bg-foreground text-background hover:bg-foreground/90"
                  disabled={isGeneratingSong}
                  onClick={async () => {
                    setIsGeneratingSong(true);
                    // Simulate generation delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Select a new random song
                    const songs = [
                      '/audio-generated-demo/generated-song-1.mp3',
                      '/audio-generated-demo/generated-song-2.mp3',
                      '/audio-generated-demo/generated-song-3.mp3',
                    ];
                    const randomSong = songs[Math.floor(Math.random() * songs.length)];
                    setSelectedGeneratedSong(randomSong);
                    setIsGeneratingSong(false);
                    // Reset audio if playing
                    if (generatedSongAudioRef.current) {
                      generatedSongAudioRef.current.pause();
                      generatedSongAudioRef.current.currentTime = 0;
                      setIsGeneratedSongPlaying(false);
                    }
                  }}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingSong ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 rounded-lg"
                  onClick={() => {
                    if (selectedGeneratedSong) {
                      // Dispatch custom event to add track to top panel
                      const event = new CustomEvent('addTrackToTimeline', {
                        detail: {
                          audioUrl: selectedGeneratedSong,
                          name: `Generated Song ${new Date().toLocaleTimeString()}`,
                        },
                      });
                      window.dispatchEvent(event);
                    }
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add to Track
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="lg"
                className="w-full rounded-lg bg-foreground text-background hover:bg-foreground/90"
                disabled={audioReferenceState !== "completed" || lyricsState !== "completed" || isGeneratingSong}
                onClick={async () => {
                  setIsGeneratingSong(true);
                  // Simulate generation delay
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  // Select a random song from the folder
                  const songs = [
                    '/audio-generated-demo/generated-song-1.mp3',
                    '/audio-generated-demo/generated-song-2.mp3',
                    '/audio-generated-demo/generated-song-3.mp3',
                  ];
                  const randomSong = songs[Math.floor(Math.random() * songs.length)];
                  setSelectedGeneratedSong(randomSong);
                  setGeneratedSongState("completed");
                  setIsGeneratingSong(false);
                }}
              >
                <Zap className={`h-5 w-5 mr-2 ${isGeneratingSong ? 'animate-spin' : ''}`} />
                {isGeneratingSong ? 'Generating...' : 'Generate Demo Song'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

