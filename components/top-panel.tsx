"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, SkipBack, Repeat, Upload, Mic, MicOff, Volume2 } from "lucide-react";

interface AudioTrack {
  id: string;
  name: string;
  audioUrl: string;
  audioElement: HTMLAudioElement | null;
  startTime: number;
  duration: number;
  color: string;
  muted: boolean;
  solo: boolean;
  recordArmed: boolean;
  volume: number;
  instrument?: string;
}

const TRACK_HEIGHT = 80;

export function TopPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tempo, setTempo] = useState(120);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [key, setKey] = useState("C");
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [masterVolume, setMasterVolume] = useState([100]);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTrackIdRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioUnlockedRef = useRef<boolean>(false);
  const dragStateRef = useRef<{
    isDragging: boolean;
    trackId: string | null;
    startX: number;
    initialStartTime: number;
    hasMoved: boolean;
  }>({
    isDragging: false,
    trackId: null,
    startX: 0,
    initialStartTime: 0,
    hasMoved: false,
  });
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const rulerScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineWrapperRef = useRef<HTMLDivElement | null>(null);

  // Timeline settings - simple seconds-based timeline
  const pixelsPerSecond = 100;
  
  // Calculate timeline length: longest track duration, or extend to viewport width when empty
  const timelineSeconds = useMemo(() => {
    if (tracks.length === 0) {
      // When no tracks, calculate based on viewport width to extend to edge of screen
      if (timelineWidth > 0) {
        const seconds = Math.ceil(timelineWidth / pixelsPerSecond);
        // Ensure at least 16 seconds, but can be more
        return Math.max(16, seconds);
      }
      return 16; // Fallback
    }
    // Find the maximum end time of all tracks
    const trackEndTimes = tracks
      .map(track => {
        const duration = track.duration || 0;
        const startTime = track.startTime || 0;
        return startTime + duration;
      })
      .filter(time => isFinite(time) && time > 0);
    
    if (trackEndTimes.length === 0) {
      // If no valid track times, use default
      return 16;
    }
    
    const maxEndTime = Math.max(...trackEndTimes);
    // Round up to nearest second, ensure it's valid
    const seconds = Math.ceil(maxEndTime);
    return isFinite(seconds) && seconds > 0 ? Math.max(16, seconds) : 16;
  }, [tracks, timelineWidth]);
  
  const totalWidth = Math.max(timelineSeconds * pixelsPerSecond, 0);

  // Recalculate timeline width when viewport changes (for empty state)
  useEffect(() => {
    const updateTimelineWidth = () => {
      if (timelineWrapperRef.current) {
        const width = timelineWrapperRef.current.clientWidth;
        setTimelineWidth(width);
      }
    };

    // Initial measurement
    updateTimelineWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateTimelineWidth();
    });

    if (timelineWrapperRef.current) {
      resizeObserver.observe(timelineWrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sync scroll between ruler and timeline tracks
  useEffect(() => {
    const rulerElement = rulerScrollRef.current;
    const timelineElement = timelineScrollRef.current;
    
    if (!rulerElement || !timelineElement) return;

    let isScrollingRuler = false;
    let isScrollingTimeline = false;

    const handleRulerScroll = () => {
      if (!isScrollingTimeline && timelineElement) {
        isScrollingRuler = true;
        timelineElement.scrollLeft = rulerElement.scrollLeft;
        requestAnimationFrame(() => {
          isScrollingRuler = false;
        });
      }
    };

    const handleTimelineScroll = () => {
      if (!isScrollingRuler && rulerElement) {
        isScrollingTimeline = true;
        rulerElement.scrollLeft = timelineElement.scrollLeft;
        requestAnimationFrame(() => {
          isScrollingTimeline = false;
        });
      }
    };

    rulerElement.addEventListener('scroll', handleRulerScroll);
    timelineElement.addEventListener('scroll', handleTimelineScroll);

    return () => {
      rulerElement.removeEventListener('scroll', handleRulerScroll);
      timelineElement.removeEventListener('scroll', handleTimelineScroll);
    };
  }, []);

  // Unlock audio on first user interaction
  const unlockAudio = async () => {
    if (audioUnlockedRef.current) return;
    
    // Try to play a silent audio to unlock audio context
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      silentAudio.volume = 0.01;
      await silentAudio.play();
      silentAudio.pause();
      audioUnlockedRef.current = true;
      console.log('Audio context unlocked');
    } catch (error) {
      console.warn('Could not unlock audio context:', error);
    }
  };

  // Start/stop audio playback (only when isPlaying changes)
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now() - currentTime * 1000;
      startTimeRef.current = startTime;
      
      const hasSoloActive = tracks.some(t => t.solo);
      
      // Start playing tracks - set initial position ONCE and play
      tracks.forEach((track) => {
        if (!track.audioElement) return;
        
        const audio = track.audioElement;
        const playTime = currentTime - track.startTime;
        
        // Determine if track should play
        let shouldPlay = !track.muted && playTime >= 0 && playTime < track.duration;
        
        // Solo logic
        if (hasSoloActive) {
          shouldPlay = shouldPlay && track.solo;
        }
        
        if (shouldPlay) {
          // Set initial position ONCE when starting playback
          if (playTime >= 0 && playTime < track.duration) {
            audio.currentTime = playTime;
          } else {
            audio.currentTime = 0;
          }
          
          // Play the audio - let it play naturally without interference
          audio.play()
            .then(() => {
              console.log(`✓ Playing: ${track.name} | Volume: ${(audio.volume * 100).toFixed(0)}% | Start: ${audio.currentTime.toFixed(2)}s`);
            })
            .catch((error) => {
              console.error(`✗ Error playing ${track.name}:`, error);
            });
        } else {
          audio.pause();
        }
      });
    } else {
      // Stop all audio
      tracks.forEach((track) => {
        if (track.audioElement) {
          track.audioElement.pause();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]); // Only when play state changes - don't reset on every frame!

  // Update timeline visual position (separate from audio playback)
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        setCurrentTime(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateTime);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isPlaying]);

  // Update recording track duration in real-time while recording
  useEffect(() => {
    if (isRecording && recordingTrackIdRef.current && recordingStartTimeRef.current >= 0) {
      const updateRecordingDuration = () => {
        const elapsed = currentTime - recordingStartTimeRef.current;
        if (elapsed > 0) {
          setTracks(prev => prev.map(track => 
            track.id === recordingTrackIdRef.current 
              ? { ...track, duration: Math.max(0.1, elapsed) }
              : track
          ));
        }
      };
      
      // Update every 100ms while recording
      const interval = setInterval(updateRecordingDuration, 100);
      
      return () => clearInterval(interval);
    }
  }, [isRecording, currentTime]);

  // Update audio volumes when tracks or master volume change
  useEffect(() => {
    const hasSoloActive = tracks.some(t => t.solo);
    
    tracks.forEach((track) => {
      if (track.audioElement) {
        const audio = track.audioElement;
        let baseVolume = track.volume / 100;
        
        // Apply mute
        if (track.muted) {
          baseVolume = 0;
        }
        
        // Apply solo: if solo is active and this track is not soloed, mute it
        if (hasSoloActive && !track.solo) {
          baseVolume = 0;
        }
        
        const finalVolume = baseVolume * (masterVolume[0] / 100);
        const clampedVolume = Math.max(0, Math.min(1, finalVolume));
        
        // Set volume on the audio element
        audio.volume = clampedVolume;
        audio.muted = false; // Ensure not muted
      }
    });
  }, [tracks, masterVolume]);

  const handlePlayPause = async () => {
    // Unlock audio on first play
    try {
      await unlockAudio();
    } catch (error) {
      console.warn('Could not unlock audio:', error);
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    tracks.forEach((track) => {
      if (track.audioElement) {
        track.audioElement.pause();
        track.audioElement.currentTime = 0;
      }
    });
  };

  const handleRewind = () => {
    setCurrentTime(0);
    tracks.forEach((track) => {
      if (track.audioElement) {
        track.audioElement.currentTime = 0;
      }
    });
  };

  // Listen for addTrackToTimeline event from bottom panel
  useEffect(() => {
    const handleAddTrackToTimeline = async (event: Event) => {
      const customEvent = event as CustomEvent<{ audioUrl: string; name: string }>;
      const { audioUrl, name } = customEvent.detail;

      console.log(`Adding track to timeline: ${name} from ${audioUrl}`);

      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audio.volume = 1.0;
      
      const trackId = Date.now().toString();
      
      const handleCanPlay = () => {
        const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        
        const newTrack: AudioTrack = {
          id: trackId,
          name: name,
          audioUrl: audioUrl,
          audioElement: audio,
          startTime: currentTime,
          duration: duration,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          muted: false,
          solo: false,
          recordArmed: false,
          volume: 100,
          instrument: "Generated Song",
        };
        
        audioElementsRef.current.set(trackId, audio);
        setTracks(prev => [...prev, newTrack]);
        
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };
      
      const handleError = (e: Event) => {
        console.error('Error loading generated song:', e);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };
      
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.load();
    };

    window.addEventListener('addTrackToTimeline', handleAddTrackToTimeline);

    return () => {
      window.removeEventListener('addTrackToTimeline', handleAddTrackToTimeline);
    };
  }, [currentTime]);

  // Load default tracks on component mount
  useEffect(() => {
    const loadDefaultTracks = async () => {
      const defaultTrackFiles = [
        'ES_Online Casino, Cards, Shuffle 05 - Epidemic Sound.mp3',
        'ES_The Sleepy Sneaky Sway - Luella Gren.mp3',
        'pop.mp3'
      ];
      const defaultTracks: AudioTrack[] = [];

      for (let i = 0; i < defaultTrackFiles.length; i++) {
        const fileName = defaultTrackFiles[i];
        // Use filename without extension as track name
        const trackName = fileName.replace(/\.[^/.]+$/, "");
        // Encode the filename for URL to handle spaces and special characters
        const audioUrl = `/audio-track-default/${encodeURIComponent(fileName)}`;
        const audio = new Audio(audioUrl);
        
        audio.preload = "auto";
        audio.volume = 1.0;
        
        const trackId = `default-${i}-${Date.now()}`;
        
        try {
          // Wait for audio to be ready
          await new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
              
              if (duration > 0) {
                const newTrack: AudioTrack = {
                  id: trackId,
                  name: trackName,
                  audioUrl,
                  audioElement: audio,
                  startTime: 0, // All tracks start at the same time
                  duration: duration,
                  color: `hsl(${(i * 60) % 360}, 70%, 50%)`, // Different colors for each track
                  muted: false,
                  solo: false,
                  recordArmed: false,
                  volume: 100,
                  instrument: "Default Track",
                };
                
                defaultTracks.push(newTrack);
                audioElementsRef.current.set(trackId, audio);
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                resolve();
              }
            };
            
            const handleError = (e: Event) => {
              console.warn(`Failed to load default track: ${fileName}`, e);
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(new Error(`Failed to load ${fileName}`));
            };
            
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);
            audio.load();
          });
        } catch (error) {
          console.warn(`Skipping default track ${fileName}:`, error);
        }
      }

      if (defaultTracks.length > 0) {
        setTracks(defaultTracks);
        console.log(`✓ Loaded ${defaultTracks.length} default tracks`);
      }
    };

    loadDefaultTracks();
  }, []); // Only run on mount

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`Uploading file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)}KB)`);

    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio();
    
    // Simple, straightforward audio setup
    audio.src = audioUrl;
    audio.preload = "auto";
    audio.volume = 1.0; // Start at full volume
    
    const trackId = Date.now().toString();
    
    // Wait for audio to be ready
    const handleCanPlay = () => {
      console.log(`✓ Audio ready: ${file.name}`);
      console.log(`  - Duration: ${audio.duration.toFixed(2)}s`);
      console.log(`  - ReadyState: ${audio.readyState}`);
      console.log(`  - Volume: ${audio.volume}`);
      
      const newTrack: AudioTrack = {
        id: trackId,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        audioUrl,
        audioElement: audio,
        startTime: currentTime,
        duration: audio.duration || 0,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        muted: false,
        solo: false,
        recordArmed: false,
        volume: 100,
        instrument: "Audio File",
      };
      
      audioElementsRef.current.set(trackId, audio);
      setTracks(prev => [...prev, newTrack]);
      
      // Clean up event listener
      audio.removeEventListener('canplay', handleCanPlay);
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    
    // Also listen for errors
    audio.addEventListener('error', (e) => {
      console.error('Audio loading error:', e);
      console.error('Audio error details:', audio.error);
    });
    
    // Load the audio
    audio.load();
  };

  const startRecording = async () => {
    try {
      // Unlock audio context first
      await unlockAudio();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      
      // Detect supported mimeType for MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      // Store recording start time and create placeholder track
      const recordingStartTime = currentTime;
      recordingStartTimeRef.current = recordingStartTime;
      const trackId = Date.now().toString();
      recordingTrackIdRef.current = trackId;
      
      // Create a placeholder track that appears immediately
      const placeholderTrack: AudioTrack = {
        id: trackId,
        name: `Recording...`,
        audioUrl: '',
        audioElement: null,
        startTime: recordingStartTime,
        duration: 0.1, // Small placeholder duration, will be updated when recording stops
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        muted: false,
        solo: false,
        recordArmed: false,
        volume: 100,
        instrument: "Microphone",
      };
      
      setTracks(prev => [...prev, placeholderTrack]);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Calculate actual recording duration based on when recording stopped
        const recordingEndTime = currentTime;
        const recordingStartTime = recordingStartTimeRef.current;
        const recordingDuration = Math.max(0.1, recordingEndTime - recordingStartTime);
        
        // Use the actual mimeType from MediaRecorder
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        // Configure audio element for better playback
        audio.preload = "auto";
        audio.volume = 1.0;
        
        // Unlock audio context before loading
        try {
          await unlockAudio();
        } catch (error) {
          console.warn('Could not unlock audio for recording:', error);
        }
        
        const handleCanPlay = () => {
          // Use the actual duration from the audio element, or fall back to calculated duration
          const duration = isFinite(audio.duration) && audio.duration > 0 
            ? audio.duration 
            : (recordingDuration > 0 ? recordingDuration : 0.1);
          
          console.log(`✓ Recording ready: ${duration.toFixed(2)}s`);
          console.log(`  - Duration: ${duration.toFixed(2)}s`);
          console.log(`  - ReadyState: ${audio.readyState}`);
          console.log(`  - Volume: ${audio.volume}`);
          console.log(`  - MimeType: ${mimeType}`);
          
          // Update the placeholder track with actual audio data
          setTracks(prev => prev.map(track => 
            track.id === trackId 
              ? {
                  ...track,
                  name: `Recording ${new Date().toLocaleTimeString()}`,
                  audioUrl,
                  audioElement: audio,
                  duration: duration,
                }
              : track
          ));
          
          audioElementsRef.current.set(trackId, audio);
          
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
        
        const handleLoadedMetadata = () => {
          const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : recordingDuration;
          console.log(`✓ Recording metadata loaded: ${duration.toFixed(2)}s`);
          
          // If canplay hasn't fired yet, try to update the track now
          if (duration > 0) {
            setTracks(prev => prev.map(track => 
              track.id === trackId 
                ? {
                    ...track,
                    name: `Recording ${new Date().toLocaleTimeString()}`,
                    audioUrl,
                    audioElement: audio,
                    duration: duration,
                  }
                : track
            ));
            audioElementsRef.current.set(trackId, audio);
          }
        };
        
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', (e) => {
          console.error('Recording audio error:', e);
          console.error('Audio error details:', audio.error);
          console.error('Blob type:', mimeType);
          console.error('Blob size:', blob.size);
        });
        
        // Load the audio
        audio.load();
        
        // Stop the media stream tracks
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(track => track.stop());
          recordingStreamRef.current = null;
        }
      };

      // Start recording with timeslice to ensure data is available
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      // Start playback when recording starts
      setIsPlaying(true);
      
      console.log(`✓ Recording started with mimeType: ${mimeType}`);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop playback when recording stops
      setIsPlaying(false);
    }
  };

  const toggleMute = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
  };

  const toggleSolo = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId 
        ? { ...track, solo: !track.solo }
        : track
    ));
  };

  const toggleRecordArm = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, recordArmed: !track.recordArmed } : track
    ));
  };

  const updateTrackVolume = (trackId: string, volume: number[]) => {
    const newVolume = volume[0];
    setTracks(tracks.map(track => {
      if (track.id === trackId) {
        return { ...track, volume: newVolume };
      }
      return track;
    }));
  };

  const deleteTrack = useCallback((trackId: string) => {
    setTracks(prevTracks => {
      const trackToDelete = prevTracks.find(t => t.id === trackId);
      if (trackToDelete) {
        // Clean up audio element
        if (trackToDelete.audioElement) {
          trackToDelete.audioElement.pause();
          trackToDelete.audioElement.src = '';
          trackToDelete.audioElement.load();
        }
        // Remove from audio elements ref
        audioElementsRef.current.delete(trackId);
        // Clean up blob URL if it's a blob
        if (trackToDelete.audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(trackToDelete.audioUrl);
        }
      }
      const newTracks = prevTracks.filter(t => t.id !== trackId);
      return newTracks;
    });
    // Clear selection if deleted track was selected
    setSelectedTrackId(prev => prev === trackId ? null : prev);
  }, []);

  const formatTime = (seconds: number) => {
    const bars = Math.floor(seconds / 4); // Assuming 4/4 time
    const beats = Math.floor((seconds % 4) / 1);
    return `${String(bars).padStart(3, '0')} ${beats + 1}`;
  };

  const getPlayheadPosition = () => {
    // Playhead position based on current time
    return Math.min(currentTime * pixelsPerSecond, totalWidth);
  };

  const handleTrackMouseDown = (e: React.MouseEvent, trackId: string, currentStartTime: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timelineScrollRef.current) return;
    
    const containerRect = timelineScrollRef.current.getBoundingClientRect();
    const startX = e.clientX - containerRect.left + timelineScrollRef.current.scrollLeft;
    
    dragStateRef.current = {
      isDragging: false,
      trackId,
      startX,
      initialStartTime: currentStartTime,
      hasMoved: false,
    };
    
    // Select track immediately on mousedown
    setSelectedTrackId(trackId);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStateRef.current.trackId || !timelineScrollRef.current) return;
    
    const containerRect = timelineScrollRef.current.getBoundingClientRect();
    const currentX = e.clientX - containerRect.left + timelineScrollRef.current.scrollLeft;
    const deltaX = currentX - dragStateRef.current.startX;
    
    // If mouse moved more than 5 pixels, consider it a drag
    if (Math.abs(deltaX) > 5) {
      dragStateRef.current.isDragging = true;
      dragStateRef.current.hasMoved = true;
      
      const deltaTime = deltaX / pixelsPerSecond; // Convert pixels to seconds
      const newStartTime = Math.max(0, dragStateRef.current.initialStartTime + deltaTime);
      
      setTracks(prevTracks =>
        prevTracks.map(track =>
          track.id === dragStateRef.current.trackId
            ? { ...track, startTime: newStartTime }
            : track
        )
      );
    }
  };

  const handleMouseUp = () => {
    dragStateRef.current = {
      isDragging: false,
      trackId: null,
      startX: 0,
      initialStartTime: 0,
      hasMoved: false,
    };
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle Delete key to remove selected track
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Delete if not typing in an input field
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const target = event.target as HTMLElement;
        // Don't delete if user is typing in an input field
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        if (selectedTrackId) {
          event.preventDefault();
          deleteTrack(selectedTrackId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTrackId, deleteTrack]);

  const visibleTracks = tracks.length > 0 ? tracks : [];
  const hasSolo = tracks.some(t => t.solo);

  return (
    <div className="h-full flex flex-col bg-muted/30 border-b">
      {/* Transport Controls Bar */}
      <div className="flex items-center gap-4 p-3 border-b bg-background shrink-0">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRewind}
            className="h-9 w-9"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            className="h-9 w-9"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="h-9 w-9"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className="h-9 w-9"
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        {/* Time/Tempo Display */}
        <div className="flex items-center gap-4 px-3 py-1.5 bg-muted rounded-md">
          <div className="text-sm font-mono font-semibold">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm font-mono">
            {tempo} BPM
          </div>
          <div className="text-sm font-mono">
            {timeSignature} {key}
          </div>
        </div>

        {/* Master Volume Control */}
        <div className="ml-auto flex items-center gap-2 w-32">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={masterVolume}
            onValueChange={setMasterVolume}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Track Controls */}
        <div className="w-64 bg-muted/50 border-r shrink-0 flex flex-col">
          {/* Spacer to align with ruler */}
          <div className="h-8 border-b bg-muted/50 shrink-0" />
          {/* Track list */}
          <div className="flex-1 overflow-y-auto">
            {visibleTracks.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <p className="mb-2">No tracks yet</p>
                <p>Upload or record to add tracks</p>
              </div>
            ) : (
              <div>
                {visibleTracks.map((track, index) => {
                  return (
                    <div key={track.id}>
                      <div
                        className={`h-20 bg-background/50 flex flex-col p-2 cursor-pointer transition-colors ${
                          selectedTrackId === track.id 
                            ? 'bg-accent border-l-2 border-foreground' 
                            : 'hover:bg-accent/50'
                        }`}
                        style={{ height: `${TRACK_HEIGHT}px` }}
                        onClick={() => setSelectedTrackId(track.id)}
                        onFocus={() => setSelectedTrackId(track.id)}
                        tabIndex={0}
                      >
                    {/* Track Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{track.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {track.instrument || "Audio"}
                        </div>
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-1 mb-2">
                      <Button
                        variant={track.muted ? "destructive" : "outline"}
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() => toggleMute(track.id)}
                        title="Mute"
                      >
                        M
                      </Button>
                      <Button
                        variant={track.solo ? "default" : "outline"}
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() => toggleSolo(track.id)}
                        title="Solo"
                      >
                        S
                      </Button>
                      <Button
                        variant={track.recordArmed ? "destructive" : "outline"}
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() => toggleRecordArm(track.id)}
                        title="Record Arm"
                      >
                        R
                      </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-1 flex-1">
                      <div className="flex-1 h-2 bg-muted rounded-full relative overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${track.volume}%` }}
                        />
                      </div>
                      <Slider
                        value={[track.volume]}
                        onValueChange={(val) => updateTrackVolume(track.id, val)}
                        max={100}
                        step={1}
                        className="w-16 h-2"
                      />
                      </div>
                      </div>
                      {index < visibleTracks.length - 1 && (
                        <div className="border-b border-border/50" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Upload Button at bottom of left panel */}
          <div className="border-t p-3 bg-background/50">
            <Input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('audio-upload')?.click()}
              className="w-full"
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              Upload Audio
            </Button>
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden" ref={timelineWrapperRef}>
          {/* Ruler - showing seconds 0, 1, 2, 3... up to timeline length */}
          <div 
            ref={rulerScrollRef}
            className="h-8 border-b bg-muted/50 flex items-end relative shrink-0 overflow-x-auto scrollbar-hide"
          >
            <div 
              className="relative" 
              style={{ 
                width: `${totalWidth}px`,
                minWidth: "100%"
              }}
            >
              {/* Always show numbers 0, 1, 2, 3... up to timeline length */}
              {Array.from({ length: Math.max(1, Math.floor(timelineSeconds) + 1) }).map((_, i) => {
                const position = i * pixelsPerSecond;
                return (
                  <div
                    key={i}
                    className="absolute border-l border-foreground/20 h-full"
                    style={{ left: `${position}px` }}
                  >
                    <span className="text-xs text-muted-foreground px-1 absolute bottom-0">
                      {i}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Tracks */}
          <div 
            ref={timelineScrollRef}
            className="flex-1 overflow-auto relative w-full"
          >
            <div
              className="relative"
              style={{ 
                width: `${totalWidth}px`,
                minWidth: "100%", 
                minHeight: "100%" 
              }}
            >
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: `${getPlayheadPosition()}px` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500" />
              </div>

              {/* Track Lanes */}
              {visibleTracks.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="mb-2">No tracks yet</p>
                    <p className="text-sm">Upload audio files or record to get started</p>
                  </div>
                </div>
              ) : (
                <div className="relative" ref={timelineContainerRef}>
                  {visibleTracks.map((track, index) => {
                    const left = track.startTime * pixelsPerSecond;
                    const width = Math.max(track.duration * pixelsPerSecond, 50);
                    const trackIsVisible = !hasSolo || track.solo;
                    const trackOpacity = track.muted ? 0.3 : (trackIsVisible ? 0.8 : 0.3);
                    const isDragging = dragStateRef.current.isDragging && dragStateRef.current.trackId === track.id;
                    
                    return (
                      <div key={track.id}>
                        {/* Track Lane Background with Divider */}
                        <div
                          className="absolute border-b border-border/30"
                          style={{
                            left: 0,
                            top: `${index * TRACK_HEIGHT}px`,
                            width: `${totalWidth}px`,
                            minWidth: "100%",
                            height: `${TRACK_HEIGHT}px`,
                            backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                          }}
                        />
                        
                        {/* Draggable Track Block */}
                        <div
                          className={`absolute border-2 rounded cursor-move select-none transition-transform ${
                            selectedTrackId === track.id ? 'ring-2 ring-foreground ring-offset-2' : ''
                          }`}
                          style={{
                            left: `${left}px`,
                            top: `${index * TRACK_HEIGHT + 2}px`,
                            width: `${width}px`,
                            height: `${TRACK_HEIGHT - 4}px`,
                            backgroundColor: track.color,
                            opacity: trackOpacity,
                            borderColor: selectedTrackId === track.id ? 'hsl(0, 0%, 100%)' : track.color,
                            zIndex: isDragging ? 30 : 10,
                            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                            boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
                            userSelect: 'none',
                          }}
                          onMouseDown={(e) => {
                            // Only start drag on left mouse button
                            if (e.button === 0) {
                              handleTrackMouseDown(e, track.id, track.startTime);
                            }
                          }}
                        >
                          <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white drop-shadow overflow-hidden pointer-events-none">
                            {track.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
