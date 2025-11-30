"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Info, Zap } from "lucide-react";

// Audio style options
const AUDIO_STYLES = [
  "JAZZ", "PUNK", "REGGAE", "COUNTRY",
  "POP", "ROCK", "BLUES", "OPERA",
  "POP", "DRUMS", "SOUL", "INDIE",
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

  return (
    <div className="h-full flex flex-col bg-muted/20 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Hummingbird</h2>
      </div>

      {/* Three Main Sections */}
      <div className="flex-1 grid grid-cols-3 gap-6 mb-6">
        {/* Audio Reference Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Audio Reference</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6">
            {/* Audio Style Grid */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Audio Style</h3>
              <div className="grid grid-cols-4 gap-2">
                {AUDIO_STYLES.map((style, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-lg bg-background hover:bg-accent"
                    onClick={() => setAudioReferenceState("completed")}
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Audio Reference */}
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Selected Audio Reference</h3>
              {audioReferenceState === "empty" ? (
                <div className="h-full min-h-[200px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center bg-muted/30">
                  <div className="w-12 h-12 border-2 border-foreground rounded flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Select style OR Add from your track
                  </p>
                </div>
              ) : (
                <div className="h-full min-h-[200px] border rounded-lg bg-muted/50 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Audio reference selected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lyrics Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Lyrics</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6">
            {/* Lyrics Theme Grid */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Lyrics Theme</h3>
              <div className="grid grid-cols-3 gap-2">
                {LYRICS_THEMES.map((theme, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-lg bg-background hover:bg-accent"
                    onClick={() => setLyricsState("completed")}
                  >
                    {theme}
                  </Button>
                ))}
              </div>
            </div>

            {/* Lyrics Reference */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Lyrics Reference</h3>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              {lyricsState === "empty" ? (
                <div className="flex-1 min-h-[200px] border rounded-lg bg-background">
                  <textarea
                    className="w-full h-full p-4 resize-none border-0 rounded-lg bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                    placeholder="Enter lyrics reference..."
                    onClick={() => setLyricsState("completed")}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-[200px] border rounded-lg bg-background p-4">
                  <p className="text-sm text-muted-foreground">Lyrics reference entered</p>
                </div>
              )}
              <Button
                variant="default"
                size="sm"
                className="mt-3 w-full rounded-lg"
                onClick={() => setLyricsState("completed")}
              >
                Generate Lyrics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Song Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Generated Song</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {generatedSongState === "empty" ? (
              <div className="flex-1 min-h-[400px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">No song generated yet</p>
                  <p className="text-xs text-muted-foreground">Complete Audio Reference and Lyrics to generate</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-[400px] border rounded-lg bg-muted/50 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Generated song will appear here</p>
                  <p className="text-xs text-muted-foreground">Audio player and controls will be shown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Demo Song Button */}
      <Button
        variant="default"
        size="lg"
        className="w-full rounded-lg bg-foreground text-background hover:bg-foreground/90"
        onClick={() => {
          setAudioReferenceState("completed");
          setLyricsState("completed");
          setGeneratedSongState("completed");
        }}
      >
        <Zap className="h-5 w-5 mr-2" />
        Generate Demo Song
      </Button>
    </div>
  );
}

