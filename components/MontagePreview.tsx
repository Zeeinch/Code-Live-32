
import React, { useRef, useState, useEffect } from 'react';
import type { MontagePlan } from '../types';
import PlayIcon from './icons/PlayIcon';

interface MontagePreviewProps {
  plan: MontagePlan | null;
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
}

const MontagePreview: React.FC<MontagePreviewProps> = ({ plan, audioBuffer, audioContext }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const nextClipTimeoutRef = useRef<number | null>(null);

  const cleanup = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if(nextClipTimeoutRef.current) {
      clearTimeout(nextClipTimeoutRef.current);
    }
    setIsPlaying(false);
    setCurrentClipIndex(0);
  };
  
  // Cleanup on unmount or when plan changes
  useEffect(() => {
    return cleanup;
  }, [plan]);


  const playNextClip = (index: number) => {
    if (!plan || !videoRef.current || index >= plan.clips.length) {
      cleanup();
      return;
    }
    
    setCurrentClipIndex(index);
    const clip = plan.clips[index];
    videoRef.current.src = clip.video.url;
    videoRef.current.currentTime = clip.startTime;
    videoRef.current.play().catch(e => console.error("Error playing video:", e));

    if (nextClipTimeoutRef.current) {
      clearTimeout(nextClipTimeoutRef.current);
    }
    
    nextClipTimeoutRef.current = window.setTimeout(() => {
        playNextClip(index + 1);
    }, clip.duration * 1000);
  };
  
  const handlePlay = () => {
    if (!plan || !audioBuffer || !audioContext || !videoRef.current) return;

    if (isPlaying) {
      cleanup();
      return;
    }
    
    setIsPlaying(true);

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    audioSourceRef.current = source;
    
    source.onended = () => {
        cleanup();
    };
    
    playNextClip(0);
  };

  if (!plan) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
       <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        {!isPlaying && (
           <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <p className="text-white text-lg font-semibold">Pratinjau Montage</p>
           </div>
        )}
       </div>
      <button
        onClick={handlePlay}
        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
      >
        <PlayIcon />
        {isPlaying ? 'Hentikan Pratinjau' : 'Putar Pratinjau'}
      </button>
      <p className="text-center text-xs text-gray-400">
        Ini adalah pratinjau. Pemrosesan video yang sebenarnya memerlukan pengaturan FFmpeg di sisi server.
      </p>
    </div>
  );
};

export default MontagePreview;

