"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Info, Zap, Play, Pause, RotateCcw, CheckCircle2, Circle, RefreshCw, PlusCircle, Music } from "lucide-react";
import { generateLyrics } from "@/lib/generate-lyrics";
import { Slider } from "@/components/ui/slider";

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
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [timelineCurrentTime, setTimelineCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTimeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  const [generatedSongCurrentTime, setGeneratedSongCurrentTime] = useState<number>(0);
  const [generatedSongDuration, setGeneratedSongDuration] = useState<number>(0);
  const generatedSongAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isGeneratingSong, setIsGeneratingSong] = useState<boolean>(false);

  // Helper function to select generated song based on audio style
  const selectGeneratedSong = useCallback(() => {
    // Available generated songs
    const availableSongs = [
      '/audio-generated-demo/generated-song-1.mp3',
      '/audio-generated-demo/generated-song-2.mp3',
      '/audio-generated-demo/generated-song-3.mp3',
      '/audio-generated-demo/generated-song-jazz.mp3',
      '/audio-generated-demo/generated-song-rock.mp3',
      '/audio-generated-demo/generated-song-timeline.mp3',
    ];

    // If timeline is selected, use timeline song
    if (isTimelineReference) {
      const timelineSong = '/audio-generated-demo/generated-song-timeline.mp3';
      if (availableSongs.includes(timelineSong)) {
        return timelineSong;
      }
    }

    // If audio style is selected, try to match it
    if (selectedAudioStyle) {
      const styleLower = selectedAudioStyle.toLowerCase();
      const styleSong = `/audio-generated-demo/generated-song-${styleLower}.mp3`;
      if (availableSongs.includes(styleSong)) {
        return styleSong;
      }
    }

    // If no match, pick a random song
    return availableSongs[Math.floor(Math.random() * availableSongs.length)];
  }, [selectedAudioStyle, isTimelineReference]);
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
      const customEvent = event as CustomEvent<{ 
        isPlaying: boolean; 
        currentTime?: number;
        isAudioReference?: boolean;
      }>;
      
      // Only update state and control playback if timeline is selected as audio reference
      // AND it's actually being used as audio reference (not playing directly from top panel)
      const isActuallyAudioReference = isTimelineReference && customEvent.detail.isAudioReference === true;
      
      if (isTimelineReference) {
        // Always update the display state if timeline is selected as reference
        setIsAudioPlaying(customEvent.detail.isPlaying);
        if (customEvent.detail.currentTime !== undefined) {
          const time = Math.min(customEvent.detail.currentTime, 10); // Cap at 10 seconds for display
          setTimelineCurrentTime(time);
          
          // Only pause timeline at 10 seconds if it's actually being used as audio reference
          // (not when playing directly from top panel)
          if (isActuallyAudioReference && customEvent.detail.isPlaying && time >= 10) {
            const pauseEvent = new CustomEvent('pauseTimeline', {
              detail: {}
            });
            window.dispatchEvent(pauseEvent);
            setIsAudioPlaying(false);
          }
        }
      }
    };

    window.addEventListener('timelinePlayStateChanged', handleTimelinePlayState);

    return () => {
      window.removeEventListener('timelinePlayStateChanged', handleTimelinePlayState);
    };
  }, [isTimelineReference]);

  // Track if selection was made by user interaction (vs loaded from localStorage)
  const isUserSelectedRef = useRef<boolean>(false);

  // Auto-play audio when style is selected (only if selected by user interaction)
  useEffect(() => {
    if (selectedAudioStyle && audioRef.current && !isTimelineReference && isUserSelectedRef.current) {
      const playAudio = async () => {
        try {
          audioRef.current!.currentTime = 0;
          setAudioCurrentTime(0);
          await audioRef.current!.play();
          setIsAudioPlaying(true);
        } catch (error) {
          // Auto-play might be blocked by browser, user will need to click play
          // Silently fail - this is expected behavior
        }
      };
      playAudio();
      // Reset flag after attempting to play
      isUserSelectedRef.current = false;
    }
  }, [selectedAudioStyle, isTimelineReference]);

  // Update audio time slider and stop at 10 seconds
  useEffect(() => {
    if (audioRef.current && !isTimelineReference && selectedAudioStyle) {
      const audio = audioRef.current;
      
      const updateTime = () => {
        const currentTime = audio.currentTime;
        setAudioCurrentTime(Math.min(currentTime, 10)); // Cap at 10 seconds
        
        // Stop audio at 10 seconds
        if (currentTime >= 10) {
          audio.pause();
          audio.currentTime = 10;
          setIsAudioPlaying(false);
        }
      };
      
      const handleTimeUpdate = () => updateTime();
      
      if (isAudioPlaying) {
        audio.addEventListener('timeupdate', handleTimeUpdate);
        // Also use interval for smoother updates
        audioTimeUpdateIntervalRef.current = setInterval(updateTime, 100);
      }
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        if (audioTimeUpdateIntervalRef.current) {
          clearInterval(audioTimeUpdateIntervalRef.current);
          audioTimeUpdateIntervalRef.current = null;
        }
      };
    }
  }, [isAudioPlaying, selectedAudioStyle, isTimelineReference]);

  // Reset audio time when style changes
  useEffect(() => {
    if (selectedAudioStyle && audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
    }
  }, [selectedAudioStyle]);

  // Update audio element when selected generated song changes
  useEffect(() => {
    if (selectedGeneratedSong && generatedSongAudioRef.current) {
      generatedSongAudioRef.current.src = selectedGeneratedSong;
      generatedSongAudioRef.current.load();
      setIsGeneratedSongPlaying(false);
      setGeneratedSongCurrentTime(0);
    }
  }, [selectedGeneratedSong]);

  // Track generated song playback time and duration
  useEffect(() => {
    if (generatedSongAudioRef.current) {
      const audio = generatedSongAudioRef.current;
      
      const handleLoadedMetadata = () => {
        const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        setGeneratedSongDuration(duration);
      };
      
      const handleTimeUpdate = () => {
        const currentTime = isFinite(audio.currentTime) ? audio.currentTime : 0;
        setGeneratedSongCurrentTime(currentTime);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
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
            <div className="flex items-center justify-between w-full">
              <CardTitle>Audio Reference</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Audio Reference</h4>
                    <p className="text-sm text-muted-foreground">
                      Select an audio style from the grid below or use your timeline as a reference for generating your song.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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
                  onClick={async () => {
                    if (isTimelineReference) {
                      setSelectedAudioStyle(null);
                      setAudioReferenceState("empty");
                      setIsTimelineReference(false);
                      setTimelineCurrentTime(0);
                      // Stop timeline playback
                      const stopEvent = new CustomEvent('stopTimeline', {
                        detail: {}
                      });
                      window.dispatchEvent(stopEvent);
                      // Notify that timeline is no longer used as audio reference
                      const removedEvent = new CustomEvent('timelineReferenceRemoved', {
                        detail: {}
                      });
                      window.dispatchEvent(removedEvent);
                      setIsAudioPlaying(false);
                    } else {
                      // Set timeline as reference and start playing
                      setIsTimelineReference(true);
                      setSelectedAudioStyle(null);
                      setAudioReferenceState("completed");
                      setTimelineCurrentTime(0);
                      
                      // Wait a bit to ensure any previous play/pause operations complete
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
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
                          // Mark as user-selected to allow autoplay
                          isUserSelectedRef.current = true;
                          setSelectedAudioStyle(style);
                          setAudioReferenceState("completed");
                          setIsTimelineReference(false);
                          setTimelineCurrentTime(0);
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
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Selected Audio Reference</h3>
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
                      onPlay={() => {
                        setIsAudioPlaying(true);
                        // Ensure we don't play past 10 seconds
                        if (audioRef.current && audioRef.current.currentTime >= 10) {
                          audioRef.current.currentTime = 10;
                          audioRef.current.pause();
                          setIsAudioPlaying(false);
                        }
                      }}
                      onPause={() => setIsAudioPlaying(false)}
                      onEnded={() => setIsAudioPlaying(false)}
                      onTimeUpdate={() => {
                        if (audioRef.current && audioRef.current.currentTime >= 10) {
                          audioRef.current.pause();
                          audioRef.current.currentTime = 10;
                          setIsAudioPlaying(false);
                          setAudioCurrentTime(10);
                        }
                      }}
                      preload="auto"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                  onClick={async () => {
                    if (isTimelineReference) {
                      // Control timeline playback
                      // Wait a bit to ensure any previous operations complete
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
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
                              // If we're at or past 10 seconds, restart from beginning
                              if (audioRef.current.currentTime >= 10) {
                                audioRef.current.currentTime = 0;
                                setAudioCurrentTime(0);
                              }
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
                  onClick={async () => {
                    if (isTimelineReference) {
                      // Restart timeline
                      setTimelineCurrentTime(0);
                      
                      // Wait a bit to ensure any previous operations complete
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
                      const stopEvent = new CustomEvent('stopTimeline', {
                        detail: {}
                      });
                      window.dispatchEvent(stopEvent);
                      
                      // Wait a bit more before playing
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
                      const playEvent = new CustomEvent('playTimeline', {
                        detail: {}
                      });
                      window.dispatchEvent(playEvent);
                      setIsAudioPlaying(true);
                    } else {
                          // Restart audio style
                          if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            setAudioCurrentTime(0);
                            audioRef.current.play();
                          }
                        }
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  {(selectedAudioStyle || isTimelineReference) && (
                    <div className="w-full px-2">
                      <Slider
                        value={[isTimelineReference ? timelineCurrentTime : audioCurrentTime]}
                        onValueChange={(values) => {
                          const newTime = Math.min(values[0], 10); // Cap at 10 seconds
                          
                          if (isTimelineReference) {
                            setTimelineCurrentTime(newTime);
                            // Dispatch event to seek timeline
                            const seekEvent = new CustomEvent('seekTimeline', {
                              detail: { time: newTime }
                            });
                            window.dispatchEvent(seekEvent);
                            // If scrubbed to 10 seconds or beyond, pause
                            if (newTime >= 10) {
                              const pauseEvent = new CustomEvent('pauseTimeline', {
                                detail: {}
                              });
                              window.dispatchEvent(pauseEvent);
                              setIsAudioPlaying(false);
                            }
                          } else {
                            setAudioCurrentTime(newTime);
                            if (audioRef.current) {
                              audioRef.current.currentTime = newTime;
                              // If scrubbed to 10 seconds or beyond, pause
                              if (newTime >= 10) {
                                audioRef.current.pause();
                                setIsAudioPlaying(false);
                              }
                            }
                          }
                        }}
                        min={0}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          {(() => {
                            const current = isTimelineReference ? timelineCurrentTime : audioCurrentTime;
                            const minutes = Math.floor(current / 60);
                            const seconds = Math.floor(current % 60);
                            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <span>0:10</span>
                      </div>
                    </div>
                  )}
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
            <div className="flex items-center justify-between w-full">
              <CardTitle>Lyrics</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Lyrics</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter lyrics or text that will be used as a reference for generating the song lyrics. You can also select themes from the grid below.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Lyrics Reference</h3>
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

            {/* Song Visualization Bar */}
            {generatedSongState === "completed" && selectedGeneratedSong ? (
              <div className="flex-1 min-h-[200px] border rounded-lg bg-muted/50 flex flex-col p-4 gap-3">
                {/* Song Name */}
                {selectedGeneratedSong && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {selectedGeneratedSong.split('/').pop()?.replace('.mp3', '') || 'Generated Song'}
                    </p>
                  </div>
                )}

                {/* Play Controls */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      // If no song is selected, select based on audio style
                      if (!selectedGeneratedSong) {
                        const song = selectGeneratedSong();
                        setSelectedGeneratedSong(song);
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
                        setGeneratedSongCurrentTime(0);
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
                      onLoadedMetadata={() => {
                        if (generatedSongAudioRef.current) {
                          const duration = isFinite(generatedSongAudioRef.current.duration) 
                            ? generatedSongAudioRef.current.duration 
                            : 0;
                          setGeneratedSongDuration(duration);
                        }
                      }}
                      onTimeUpdate={() => {
                        if (generatedSongAudioRef.current) {
                          const currentTime = isFinite(generatedSongAudioRef.current.currentTime)
                            ? generatedSongAudioRef.current.currentTime
                            : 0;
                          setGeneratedSongCurrentTime(currentTime);
                        }
                      }}
                      preload="auto"
                    />
                  )}
                </div>

                {/* Slider */}
                {generatedSongDuration > 0 && (
                  <div className="w-full px-2">
                    <Slider
                      value={[generatedSongCurrentTime]}
                      onValueChange={(values) => {
                        const newTime = Math.min(values[0], generatedSongDuration);
                        setGeneratedSongCurrentTime(newTime);
                        if (generatedSongAudioRef.current) {
                          generatedSongAudioRef.current.currentTime = newTime;
                        }
                      }}
                      min={0}
                      max={generatedSongDuration}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>
                        {(() => {
                          const minutes = Math.floor(generatedSongCurrentTime / 60);
                          const seconds = Math.floor(generatedSongCurrentTime % 60);
                          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        })()}
                      </span>
                      <span>
                        {(() => {
                          const minutes = Math.floor(generatedSongDuration / 60);
                          const seconds = Math.floor(generatedSongDuration % 60);
                          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}
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
                    // Select song based on audio style
                    const song = selectGeneratedSong();
                    setSelectedGeneratedSong(song);
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
                  // Select song based on audio style
                  const song = selectGeneratedSong();
                  setSelectedGeneratedSong(song);
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

