import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, Volume2, Volume1, VolumeX, Maximize,
  Settings, Loader, Subtitles, ChevronLeft, ChevronRight, RotateCcw,
  AlertTriangle, FileText, Lock, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { videoService } from '../../services/video.service';


const VideoPlayer = ({
  url,
  lessonId,
  videoStatus,
  videoProcessingError,
  initialPosition = 0,
  isCompleted = false,
  onComplete,
  hasNextLesson = false,
  nextLessonTitle = "",
  onNextLesson,
  isPreview = false,
  onEnroll,
  enrollLabel = 'Enroll in Course',
  subtitleUrl = null,
  userIdentifier = null,
  disableProgressTracking = false,
  onProgressSave = null
}) => {
  const normalizedUrl = url
    ? (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')
      ? url
      : `http://localhost:4000${url}`)
    : '';

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const trackRef = useRef(null);
  const watchedSecondsRef = useRef(new Set());

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [activeCaption, setActiveCaption] = useState(null);
  const [hlsLoaded, setHlsLoaded] = useState(!!window.Hls);

  // Focus-safe Key control overlays and ripple feedback states
  const rippleRef = useRef(null);
  const [ripple, setRipple] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(initialPosition > 0 && !isCompleted);
  const [showCompletedPrompt, setShowCompletedPrompt] = useState(isCompleted);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);

  // Preview mode constraints
  const PREVIEW_LIMIT = 30; // 30 seconds limit for preview lessons
  const [showPreviewLimitOverlay, setShowPreviewLimitOverlay] = useState(false);

  // Autoplay next countdown states
  const [showAutoplayCountdown, setShowAutoplayCountdown] = useState(false);
  const [autoplayCountdownActive, setAutoplayCountdownActive] = useState(false);
  const [autoplaySeconds, setAutoplaySeconds] = useState(5);
  const [isCompletedTriggered, setIsCompletedTriggered] = useState(false);

  // Screen recording and focus protection states
  const [isRecordingProtected, setIsRecordingProtected] = useState(false);
  const [protectionReason, setProtectionReason] = useState("");

  const controlsTimeoutRef = useRef(null);
  const autoplayTimerRef = useRef(null);

  const persistProgress = () => {
    const video = videoRef.current;
    if (!video) return;

    if (onProgressSave) {
      onProgressSave({
        watchTime: Math.floor(video.currentTime || 0),
        duration: Math.floor(video.duration || 0),
      });
      return;
    }

    if (!disableProgressTracking) {
      videoService.savePlaybackProgress(lessonId, video.currentTime, video.playbackRate, video.duration);
    }
  };

  // Dynamic script loading for hls.js
  useEffect(() => {
    if (window.Hls) {
      setHlsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    script.onload = () => {
      setHlsLoaded(true);
      console.log('[HLS.js] Script loaded successfully from CDN');
    };
    script.onerror = (err) => {
      console.error('[HLS.js] Failed to load hls.js script from CDN', err);
    };
    document.body.appendChild(script);
  }, []);

  // Diagnostics
  useEffect(() => {
    console.log('PLAYER URL', normalizedUrl);
    console.log('ACTIVE LESSON ID', lessonId);
  }, [normalizedUrl, lessonId]);

  // HLS stream binding effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset video element before rebinding source to clear stale media/buffers
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (err) {
      console.warn('[VideoPlayer] Error resetting video element:', err);
    }

    // Clean up any existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = normalizedUrl && normalizedUrl.includes('.m3u8');

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[VideoPlayer] Browser supports native HLS (Safari fallback). Binding source directly.');
        video.src = normalizedUrl;
      } else if (hlsLoaded && window.Hls) {
        setIsLoading(true);
        console.log('[HLS.js] Binding HLS source:', normalizedUrl);
        const hlsInstance = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
        hlsRef.current = hlsInstance;

        hlsInstance.loadSource(normalizedUrl);
        hlsInstance.attachMedia(video);

        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
        });

        hlsInstance.on(window.Hls.Events.ERROR, (event, data) => {
          console.error('[HLS.js Error]', data);
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('[HLS.js] Fatal network error. Recovering...');
                hlsInstance.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('[HLS.js] Fatal media error. Recovering...');
                hlsInstance.recoverMediaError();
                break;
              default:
                console.error('[HLS.js] Unrecoverable HLS error. Destroying instance.');
                hlsInstance.destroy();
                hlsRef.current = null;
                break;
            }
          }
        });
      } else {
        setIsLoading(true);
      }
    } else {
      // For direct seekable MP4 local/secure streams
      if (normalizedUrl) {
        video.src = normalizedUrl;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [normalizedUrl, hlsLoaded]);

  // Cleanup all timers on unmount to prevent stale state updates after navigation
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, []);

  // Sync / Reset states when switching lessons
  useEffect(() => {
    setIsCompletedTriggered(false);
    setShowAutoplayCountdown(false);
    setShowPreviewLimitOverlay(false);
    setAutoplayCountdownActive(false);
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);

    // Clear unique watched seconds tracker for the new lesson
    watchedSecondsRef.current.clear();

    if (isCompleted) {
      setShowCompletedPrompt(true);
      setShowResumePrompt(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    } else {
      setShowCompletedPrompt(false);
      if (initialPosition > 0) {
        const resolvedPosition = isPreview ? Math.min(initialPosition, PREVIEW_LIMIT) : initialPosition;
        if (resolvedPosition >= PREVIEW_LIMIT && isPreview) {
          setShowPreviewLimitOverlay(true);
          setShowResumePrompt(false);
          if (videoRef.current) {
            videoRef.current.currentTime = PREVIEW_LIMIT;
          }
        } else {
          setShowResumePrompt(resolvedPosition > 0);
        }
      } else {
        setShowResumePrompt(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
      }
    }
  }, [lessonId, initialPosition, isPreview, isCompleted]);

  // Auto-save progress interval hook
  useEffect(() => {
    if (isPreview) return; // Sandboxed Preview Mode NEVER persists progress

    const video = videoRef.current;
    const saveInterval = setInterval(() => {
      if (video && !video.paused && !showResumePrompt && !showCompletedPrompt && !showAutoplayCountdown && !showPreviewLimitOverlay) {
        persistProgress();
      }
    }, 10000);
    return () => {
      clearInterval(saveInterval);
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [lessonId, showResumePrompt, showCompletedPrompt, showAutoplayCountdown, showPreviewLimitOverlay, isPreview, disableProgressTracking, onProgressSave]);

  // Screen recording and focus protection hooks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Monkey-patch navigator.mediaDevices.getDisplayMedia to block browser-based screen captures
    if (navigator.mediaDevices && !navigator.mediaDevices.getDisplayMedia._isWrapped) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      const wrappedGetDisplayMedia = async function(constraints) {
        window.dispatchEvent(new CustomEvent('screen-capture-started', { detail: { type: 'api' } }));
        try {
          const stream = await originalGetDisplayMedia.apply(navigator.mediaDevices, [constraints]);
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.addEventListener('ended', () => {
              window.dispatchEvent(new CustomEvent('screen-capture-stopped'));
            });
            const checkTrackEnded = setInterval(() => {
              if (videoTrack.readyState === 'ended') {
                window.dispatchEvent(new CustomEvent('screen-capture-stopped'));
                clearInterval(checkTrackEnded);
              }
            }, 1000);
          }
          return stream;
        } catch (err) {
          window.dispatchEvent(new CustomEvent('screen-capture-stopped'));
          throw err;
        }
      };
      wrappedGetDisplayMedia._isWrapped = true;
      wrappedGetDisplayMedia.original = originalGetDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = wrappedGetDisplayMedia;
    }

    const handleCaptureStart = () => {
      setIsRecordingProtected(true);
      setProtectionReason("Screen Sharing/Recording Detected");
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleCaptureStop = () => {
      setIsRecordingProtected(false);
      setProtectionReason("");
    };

    window.addEventListener('screen-capture-started', handleCaptureStart);
    window.addEventListener('screen-capture-stopped', handleCaptureStop);

    // Global KeyUp to clear clipboard on PrintScreen keystrokes
    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
        toast.error('Screenshots are disabled for protected content.', { id: 'sec-screenshot' });
      }
    };
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('screen-capture-started', handleCaptureStart);
      window.removeEventListener('screen-capture-stopped', handleCaptureStop);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Monitor window focus/blur for active OS-level screen recorder blocking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBlur = () => {
      if (normalizedUrl) {
        setIsRecordingProtected(true);
        setProtectionReason("Window Focus Lost (Security Pause)");
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    const handleFocus = () => {
      setIsRecordingProtected(false);
      setProtectionReason("");
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [normalizedUrl]);


  // Loading state handlers
  const handleWaiting = () => setIsLoading(true);
  const handleCanPlay = () => setIsLoading(false);

  // Autoplay countdown trigger based on completion sync
  useEffect(() => {
    if (isCompletedTriggered && hasNextLesson && onNextLesson && !showAutoplayCountdown) {
      const video = videoRef.current;
      if (video) {
        setIsPlaying(false);
        video.pause();
      }
      setShowAutoplayCountdown(true);
    }
  }, [hasNextLesson, isCompletedTriggered, onNextLesson, showAutoplayCountdown]);

  // Time & Progress update with linear completion tracker
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPreview && video.currentTime >= PREVIEW_LIMIT) {
      video.pause();
      video.currentTime = PREVIEW_LIMIT;
      setIsPlaying(false);
      setShowPreviewLimitOverlay(true);
      setCurrentTime(PREVIEW_LIMIT);
      setProgress(video.duration ? (PREVIEW_LIMIT / video.duration) * 100 : 0);
      return;
    }

    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);

    // Enforce 95% unique watched progress limit for enrolled lessons
    if (!isPreview && video.duration > 0) {
      // Record current integer second into unique set
      watchedSecondsRef.current.add(Math.floor(video.currentTime));

      const uniqueWatchedSeconds = watchedSecondsRef.current.size;
      const watchedPercentage = uniqueWatchedSeconds / video.duration;
      const currentPercentage = video.currentTime / video.duration;

      if (watchedPercentage >= 0.95 || currentPercentage >= 0.95) {
        if (!isCompletedTriggered && !isCompleted) {
          setIsCompletedTriggered(true);
          if (onComplete) onComplete(lessonId);
        }
      }
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (!isPreview && videoRef.current) {
      persistProgress();
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (!isPreview && videoRef.current) {
      persistProgress();
    }
    if (!isCompletedTriggered && !isCompleted) {
      setIsCompletedTriggered(true);
      if (onComplete) onComplete(lessonId);
    }
    setShowCompletedPrompt(true);
    if (hasNextLesson) {
      setAutoplaySeconds(5);
      setAutoplayCountdownActive(true);
    }
  };




  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  const triggerRipple = (type) => {
    setRipple({ type, key: Math.random() });
  };

  const togglePlay = () => {
    if (showResumePrompt || showCompletedPrompt || showAutoplayCountdown) return;

    if (isPreview && videoRef.current && (videoRef.current.currentTime >= PREVIEW_LIMIT || showPreviewLimitOverlay)) {
      setShowPreviewLimitOverlay(true);
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        triggerRipple('play');
      }).catch(() => { });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerRipple('pause');
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !duration || showResumePrompt || showCompletedPrompt || showAutoplayCountdown || (isPreview && showPreviewLimitOverlay)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    let targetTime = pos * duration;

    if (isPreview && targetTime >= PREVIEW_LIMIT) {
      targetTime = PREVIEW_LIMIT;
      videoRef.current.currentTime = PREVIEW_LIMIT;
      videoRef.current.pause();
      setIsPlaying(false);
      setShowPreviewLimitOverlay(true);
      setCurrentTime(PREVIEW_LIMIT);
      setProgress(duration ? (PREVIEW_LIMIT / duration) * 100 : 0);
      return;
    }

    triggerRipple(targetTime > videoRef.current.currentTime ? 'forward' : 'backward');
    videoRef.current.currentTime = targetTime;
  };

  const handleSeekBarMouseMove = (e) => {
    if (!duration || showResumePrompt || showCompletedPrompt || showAutoplayCountdown || (isPreview && showPreviewLimitOverlay)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let calculatedTime = percent * duration;
    let calculatedX = percent * 100;

    if (isPreview && calculatedTime >= PREVIEW_LIMIT) {
      calculatedTime = PREVIEW_LIMIT;
      calculatedX = duration ? (PREVIEW_LIMIT / duration) * 100 : 0;
    }

    setHoverTime(calculatedTime);
    setHoverX(calculatedX);
    setShowHoverTooltip(true);
  };

  const handleSeekBarMouseLeave = () => {
    setShowHoverTooltip(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    triggerRipple(nextMuted ? 'mute' : 'unmute');
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    videoRef.current.volume = vol;
    const nextMuted = vol === 0;
    setIsMuted(nextMuted);
    triggerRipple(nextMuted ? 'mute' : 'unmute');
  };

  const changeSpeed = (speed) => {
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Keyboard Shortcuts Hook with security blocks
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus safety: ignore if focused on inputs
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }

      // ── SECURITY: Block screenshot & DevTools hotkeys ──
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error('Screenshots are disabled for protected content.', { id: 'sec-screenshot' });
        return;
      }
      if (e.key === 'F12') {
        e.preventDefault();
        toast.error('Developer tools are disabled on this page.', { id: 'sec-f12' });
        return;
      }
      if (isCtrl && isShift && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.error('Developer tools are disabled on this page.', { id: 'sec-devtools' });
        return;
      }
      if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toast.error('Saving content is disabled for protected video.', { id: 'sec-save' });
        return;
      }
      if (isCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toast.error('Printing is disabled for protected content.', { id: 'sec-print' });
        return;
      }
      if (isCtrl && e.key.toLowerCase() === 'c') {
        // Only block copy if video is focused
        if (containerRef.current && containerRef.current.contains(document.activeElement)) {
          e.preventDefault();
        }
        return;
      }

      const video = videoRef.current;
      if (!video || showResumePrompt || showCompletedPrompt || showAutoplayCountdown || (isPreview && showPreviewLimitOverlay)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          triggerRipple('backward');
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          triggerRipple('forward');
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolUp = Math.min(1, video.volume + 0.1);
          video.volume = newVolUp;
          setVolume(newVolUp);
          setIsMuted(newVolUp === 0);
          triggerRipple('volume-up');
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolDown = Math.max(0, video.volume - 0.1);
          video.volume = newVolDown;
          setVolume(newVolDown);
          setIsMuted(newVolDown === 0);
          triggerRipple('volume-down');
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, showResumePrompt, showCompletedPrompt, showAutoplayCountdown, isPreview, showPreviewLimitOverlay]);


  // Autoplay countdown effect
  useEffect(() => {
    if (autoplayCountdownActive) {
      setAutoplaySeconds(5);
      autoplayTimerRef.current = setInterval(() => {
        setAutoplaySeconds(prev => {
          if (prev <= 1) {
            clearInterval(autoplayTimerRef.current);
            setAutoplayCountdownActive(false);
            setShowCompletedPrompt(false);
            if (onNextLesson) onNextLesson();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [autoplayCountdownActive]);

  const handleResumePlayback = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = initialPosition;
      setShowResumePrompt(false);
      setShowCompletedPrompt(false);
      setAutoplayCountdownActive(false);
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      video.play().then(() => {
        setIsPlaying(true);
        triggerRipple('play');
      }).catch(() => { });
    }
  };

  const handleStartOver = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      setShowResumePrompt(false);
      setShowCompletedPrompt(false);
      setAutoplayCountdownActive(false);
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      video.play().then(() => {
        setIsPlaying(true);
        triggerRipple('play');
      }).catch(() => { });
    }
  };

  const cancelAutoplay = () => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    setAutoplayCountdownActive(false);
  };

  const triggerImmediateAutoplay = () => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    setAutoplayCountdownActive(false);
    setShowCompletedPrompt(false);
    if (onNextLesson) onNextLesson();
  };


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showResumePrompt && !showCompletedPrompt && !showAutoplayCountdown) setShowControls(false);
    }, 3000);
  };

  // ── Dynamic subtitle cue-change integration via hidden HTML5 track ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitleUrl) {
      setActiveCaption(null);
      return;
    }

    const normalizedSubtitleUrl = subtitleUrl.startsWith('http')
      ? subtitleUrl
      : `http://localhost:4000${subtitleUrl}`;

    const track = trackRef.current;
    if (!track) return;

    const handleCueChange = () => {
      const textTrack = track.track;
      if (!textTrack || !textTrack.activeCues || textTrack.activeCues.length === 0) {
        setActiveCaption(null);
        return;
      }
      const cueText = textTrack.activeCues[0].text;
      // Strip HTML tags from cue text (VTT can contain <b>, <i> etc)
      const plainText = cueText.replace(/<[^>]+>/g, '');
      setActiveCaption(plainText);
    };

    track.addEventListener('cuechange', handleCueChange);
    track.src = normalizedSubtitleUrl;

    // Ensure the text track is active but hidden so cues are available for our custom overlay
    try {
      if (track.track && typeof track.track.mode !== 'undefined') {
        track.track.mode = 'hidden';
      } else {
        const onLoad = () => {
          try {
            if (track.track) track.track.mode = 'hidden';
          } catch (err) {
            console.warn('Failed to set text track mode on load', err);
          }
        };
        track.addEventListener('load', onLoad, { once: true });
      }
    } catch (err) {
      console.warn('Failed to activate text track', err);
    }

    return () => {
      track.removeEventListener('cuechange', handleCueChange);
      setActiveCaption(null);
    };
  }, [subtitleUrl, lessonId]);


  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group aspect-video flex items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !showResumePrompt && !showAutoplayCountdown && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <style>{`
        @keyframes rippleFade {
          0% { transform: scale(0.85); opacity: 0; }
          50% { transform: scale(1.1); opacity: 0.95; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .animate-ripple {
          animation: rippleFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .volume-slider {
          -webkit-appearance: none !important;
          appearance: none !important;
          background: linear-gradient(
            to right,
            #ffffff 0%,
            #ffffff var(--volume-percent),
            rgba(255, 255, 255, 0.3) var(--volume-percent),
            rgba(255, 255, 255, 0.3) 100%
          ) !important;
          height: 3px !important;
          border-radius: 9999px !important;
          border: none !important;
          outline: none !important;
        }
        .volume-slider::-webkit-slider-runnable-track {
          background: transparent !important;
          border: none !important;
          height: 3px !important;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          cursor: pointer !important;
          margin-top: -4.5px !important;
          border: none !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
          transition: transform 0.1s ease !important;
        }
        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15) !important;
        }
        .volume-slider::-moz-range-track {
          background: transparent !important;
          border: none !important;
          height: 3px !important;
        }
        .volume-slider::-moz-range-thumb {
          width: 12px !important;
          height: 12px !important;
          border: none !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          cursor: pointer !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
          transition: transform 0.1s ease !important;
        }
        .volume-slider::-moz-range-thumb:hover {
          transform: scale(1.15) !important;
        }
        
        /* Light Theme Dynamic Blue Theme Styles */
        .light-mode .volume-slider {
          background: linear-gradient(
            to right,
            #3b82f6 0%,
            #3b82f6 var(--volume-percent),
            rgba(255, 255, 255, 0.3) var(--volume-percent),
            rgba(255, 255, 255, 0.3) 100%
          ) !important;
        }
        .light-mode .volume-slider::-webkit-slider-thumb {
          background: #3b82f6 !important;
        }
        .light-mode .volume-slider::-moz-range-thumb {
          background: #3b82f6 !important;
        }
      `}</style>

      {/* Processing Overlay */}
      {videoStatus === 'Processing' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-xl p-6 text-center keep-white border border-white/10 rounded-xl">
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            {/* Premium Dual Concentric Rings (Violet/Cyan) */}
            <div className="absolute inset-0 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]"></div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Processing Video
            </h3>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed font-medium">
              Preparing adaptive playback...
            </p>
          </div>
        </div>
      )}

      {/* Failed Overlay */}
      {videoStatus === 'Failed' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6 text-center keep-white border border-white/10 rounded-xl">
          <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-md max-w-md shadow-2xl flex flex-col items-center">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-full mb-4 border border-red-500/20">
              <AlertTriangle size={36} className="text-red-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold tracking-wide text-red-400">Transcoding Failed</h3>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              {videoProcessingError || 'An error occurred while processing the video. Please contact support.'}
            </p>
          </div>
        </div>
      )}

      {/* Screen Recording / Focus Security Overlay */}
      {isRecordingProtected && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-6 text-center keep-white border border-red-500/20 rounded-xl">
          <div className="p-4 bg-red-500/10 text-red-400 rounded-full mb-4 border border-red-500/20 animate-pulse">
            <Lock size={32} className="text-red-500" />
          </div>
          <div className="bg-[#0f172a]/80 border border-red-500/30 rounded-2xl p-6 backdrop-blur-md max-w-md shadow-2xl">
            <h3 className="text-xl font-bold tracking-wide text-red-400">
              Playback Suspended
            </h3>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              To protect course intellectual property, video playback is disabled while screen recording, screen sharing, or background capture software is detected.
            </p>
            <div className="mt-4 p-2.5 bg-red-950/20 rounded-xl border border-red-500/10 text-xs font-semibold text-red-300/80 uppercase tracking-widest font-mono">
              Status: {protectionReason || 'Screen capture blocked'}
            </div>
            <p className="text-[11px] text-gray-400 mt-3 italic">
              Keep this window active and close screen recorders to resume.
            </p>
          </div>
        </div>
      )}

      {/* Falsy/Missing URL Placeholder */}
      {!normalizedUrl && videoStatus !== 'Processing' && videoStatus !== 'Failed' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6 text-center keep-white border border-white/10 rounded-xl">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md max-w-md shadow-2xl flex flex-col items-center">
            <div className="p-3 bg-white/5 text-gray-400 rounded-full mb-4 border border-white/10">
              <FileText size={36} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold tracking-wide text-gray-300">No Video Found</h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              This lesson does not contain a video. Please check the course outline or view attached files.
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && normalizedUrl && videoStatus !== 'Processing' && videoStatus !== 'Failed' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 keep-white backdrop-blur-sm">
          <Loader size={48} className="animate-spin mb-4 text-blue-500" />
          <span className="text-sm font-medium tracking-wide">Loading video...</span>
        </div>
      )}

      {/* Playback Ripple/Feedback Animations */}
      {ripple && (
        <div
          key={ripple.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div className="bg-black/75 keep-white p-5 rounded-full animate-ripple flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl">
            {ripple.type === 'play' && <Play size={36} fill="currentColor" className="text-blue-500 fill-blue-500" />}
            {ripple.type === 'pause' && <Pause size={36} className="text-blue-500" />}
            {ripple.type === 'backward' && <div className="flex text-blue-400"><ChevronLeft size={24} className="-mr-2" /><ChevronLeft size={24} /></div>}
            {ripple.type === 'forward' && <div className="flex text-blue-400"><ChevronRight size={24} className="-mr-2" /><ChevronRight size={24} /></div>}
            {ripple.type === 'volume-up' && <Volume2 size={36} className="text-blue-500" />}
            {ripple.type === 'volume-down' && <Volume1 size={36} className="text-blue-500" />}
            {ripple.type === 'mute' && <VolumeX size={36} className="text-red-500" />}
            {ripple.type === 'unmute' && <Volume2 size={36} className="text-blue-500" />}
          </div>
        </div>
      )}

      {/* Interactive Resume Playback Overlay */}
      {showResumePrompt && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center keep-white border border-white/5 rounded-xl">
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-full mb-4 border border-blue-500/20">
            <RotateCcw size={32} className="animate-pulse" />
          </div>
          <h3 className="text-xl font-bold font-sans tracking-wide">Resume Playback?</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-sm">
            We saved your progress. Would you like to pick up where you left off at <span className="text-blue-400 font-mono font-semibold">{formatTime(initialPosition)}</span>?
          </p>
          <div className="flex items-center space-x-4 mt-6">
            <button
              onClick={handleResumePlayback}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-white text-sm"
            >
              <Play size={16} fill="currentColor" />
              <span>Resume Playback from {formatTime(initialPosition)}</span>
            </button>
            <button
              onClick={handleStartOver}
              className="border border-white/20 hover:bg-white/10 font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all text-gray-300 text-sm"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Premium Glassmorphic Completed Lecture Overlay */}
      {showCompletedPrompt && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center keep-white border border-white/5 rounded-xl">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-4 border border-emerald-500/20">
            <CheckCircle2 size={36} className="text-emerald-500 animate-bounce" />
          </div>
          <h3 className="text-xl font-bold font-sans tracking-wide text-white">Lecture Completed!</h3>
          
          {hasNextLesson && nextLessonTitle && (
            <div className="mt-2 max-w-sm">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest block">Up Next</span>
              <h4 className="text-sm font-bold text-gray-300 truncate mt-0.5">{nextLessonTitle}</h4>
            </div>
          )}

          {/* Autoplay Circular Countdown if active */}
          {autoplayCountdownActive && hasNextLesson && (
            <div className="relative w-16 h-16 my-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" className="stroke-white/10 fill-none" strokeWidth="3" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-emerald-500 fill-none transition-all duration-1000 ease-linear"
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - autoplaySeconds / 5)}`}
                />
              </svg>
              <span className="absolute text-sm font-bold font-mono text-white">{autoplaySeconds}s</span>
            </div>
          )}

          <div className="flex items-center space-x-4 mt-6">
            <button
              onClick={handleStartOver}
              className="flex items-center space-x-2 border border-white/20 hover:bg-white/10 font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all text-gray-300 text-sm"
            >
              <RotateCcw size={16} />
              <span>Start Over</span>
            </button>
            {hasNextLesson && (
              <button
                onClick={triggerImmediateAutoplay}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-white text-sm"
              >
                <span>Next Lesson</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {autoplayCountdownActive && hasNextLesson && (
            <button
              onClick={cancelAutoplay}
              className="mt-4 text-xs text-gray-400 hover:text-white transition-colors underline decoration-dotted"
            >
              Cancel Autoplay
            </button>
          )}
        </div>
      )}


      {/* Premium Glassmorphic Preview Limit Reached Overlay */}
      {isPreview && showPreviewLimitOverlay && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl p-6 text-center keep-white border border-white/10 rounded-xl">
          <div className="p-4 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full mb-4 border border-amber-500/30 animate-pulse shadow-lg shadow-amber-500/10">
            <Lock size={32} />
          </div>
          <h3 className="text-2xl font-black font-sans tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
            Preview Limit Reached
          </h3>
          <p className="text-sm text-gray-300 mt-3 max-w-md leading-relaxed font-medium">
            You have completed your free 30-second preview. Enroll in this course to instantly unlock full, lifetime access to all lessons, quizzes, downloadable resource files, and interactive Q&A!
          </p>
          <div className="flex items-center space-x-4 mt-8">
            {onEnroll && (
              <button
                onClick={onEnroll}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-bold px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-white text-xs uppercase tracking-widest pointer-events-auto cursor-pointer"
              >
                <span>{enrollLabel}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Premium Platform & User Identity Watermark */}
      {normalizedUrl && videoStatus !== 'Processing' && videoStatus !== 'Failed' && (
        <div
          className="absolute top-4 right-4 flex flex-col items-end pointer-events-none select-none z-10 font-sans text-right"
          style={{
            opacity: 0.22,
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            className="font-bold tracking-[0.2em] text-[10px] sm:text-xs uppercase text-white font-sans"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            EDUCORE
          </div>
          {userIdentifier && !isPreview && (
            <div className="font-mono text-[8px] sm:text-[9px] text-white tracking-wider mt-0.5 select-none">
              {userIdentifier}
            </div>
          )}
        </div>
      )}

      {/* Subtitles Overlay */}
      {subtitlesEnabled && activeCaption && !showResumePrompt && !showAutoplayCountdown && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/85 px-4 py-2 rounded-lg text-sm md:text-base text-center max-w-[85%] font-medium pointer-events-none select-none z-20 shadow-lg border backdrop-blur-sm transition-all duration-300"
          style={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          {activeCaption}
        </div>
      )}

      <video
        ref={videoRef}
        src={(normalizedUrl && !normalizedUrl.includes('.m3u8')) ? normalizedUrl : null}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onPlaying={() => setIsPlaying(true)}
        onPause={handleVideoPause}
        onEnded={handleVideoEnded}
        playsInline
        crossOrigin="anonymous"
        controlsList="nodownload"
        disablePictureInPicture
      >
        {/* Hidden track element for cue-based subtitle delivery */}
        {subtitleUrl && (
          <track
            ref={trackRef}
            kind="subtitles"
            srclang="en"
            label="English"
          />
        )}
      </video>

      {/* Controls Overlay */}
      {normalizedUrl && videoStatus !== 'Processing' && videoStatus !== 'Failed' && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 z-20 ${showControls || showResumePrompt || showAutoplayCountdown ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Seek Bar */}
          <div
            className="w-full h-1.5 rounded-full mb-4 cursor-pointer hover:h-2 transition-all relative group/seek"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            onClick={handleSeek}
            onMouseMove={handleSeekBarMouseMove}
            onMouseLeave={handleSeekBarMouseLeave}
          >
            {/* Progress Bar Fill */}
            <div
              className="h-full bg-blue-500 rounded-full relative transition-all duration-75"
              style={{ width: `${progress}%` }}
            >
              {/* Scrubber Knob */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/seek:opacity-100 transform translate-x-1/2 transition-opacity" />
            </div>

            {/* Hover Time Tooltip */}
            {showHoverTooltip && (
              <div
                className="absolute bottom-full mb-3 bg-gray-900 border border-gray-700/80 text-white keep-white text-xs font-semibold px-2 py-1 rounded shadow-xl pointer-events-none transform -translate-x-1/2"
                style={{ left: `${hoverX}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between" style={{ color: '#ffffff' }}>
            <div className="flex items-center space-x-4">
              <button onClick={togglePlay} className="hover:text-blue-400 transition-colors pointer-events-auto">
                {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
              </button>

              <div className="flex items-center group/volume relative pointer-events-auto">
                <button onClick={toggleMute} className="hover:text-blue-400 transition-colors">
                  {isMuted || volume === 0 ? (
                    <VolumeX size={20} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 group-hover/volume:ml-2 transition-all duration-300 h-1 rounded-lg appearance-none cursor-pointer"
                  style={{
                    '--volume-percent': `${(isMuted ? 0 : volume) * 100}%`
                  }}
                />
              </div>

              <div className="text-xs font-semibold font-mono text-gray-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative pointer-events-auto">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
                >
                  <Settings size={20} />
                </button>

                {/* Settings Menu */}
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 w-32 bg-gray-950/95 backdrop-blur-md rounded-lg py-2 shadow-2xl border border-gray-800 z-50">
                    <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Speed</div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`block w-full text-left px-4 py-1.5 text-xs hover:bg-white/10 transition-colors ${playbackRate === speed ? 'text-blue-400 font-bold' : 'text-gray-300'}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`transition-colors pointer-events-auto ${subtitlesEnabled ? 'text-blue-400' : 'hover:text-blue-400'}`}
                title="Toggle Subtitles"
              >
                <Subtitles size={20} />
              </button>

              <button onClick={toggleFullscreen} className="hover:text-blue-400 transition-colors pointer-events-auto" title="Fullscreen">
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
