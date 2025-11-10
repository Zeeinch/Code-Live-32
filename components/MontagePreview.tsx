import React, { useRef, useState, useEffect } from 'react';
import type { MontagePlan } from '../types.ts';
import PlayIcon from './icons/PlayIcon.tsx';
import GenerateIcon from './icons/GenerateIcon.tsx';

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

  const [isRendering, setIsRendering] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);


  const cleanupPreview = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        // Ignore errors if stop() was already called
      }
      audioSourceRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    if (nextClipTimeoutRef.current) {
      clearTimeout(nextClipTimeoutRef.current);
    }
    setIsPlaying(false);
    setCurrentClipIndex(0);
  };
  
  // Cleanup on unmount or when plan changes
  useEffect(() => {
    return cleanupPreview;
  }, [plan]);


  const playNextClip = (index: number) => {
    if (!plan || !videoRef.current || index >= plan.clips.length) {
      cleanupPreview();
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
  
  const handlePlayPreview = () => {
    if (!plan || !audioBuffer || !audioContext || !videoRef.current) return;

    if (isPlaying) {
      cleanupPreview();
      return;
    }
    
    setIsPlaying(true);
    setDownloadUrl(null); // Hide download link when previewing

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    audioSourceRef.current = source;
    
    source.onended = () => {
        cleanupPreview();
    };
    
    playNextClip(0);
  };

  const handleGenerateFinalVideo = () => {
    if (!plan) return;
    cleanupPreview();
    setIsRendering(true);
    setDownloadUrl(null);

    // Simulate server processing time
    setTimeout(() => {
      // In a real app, this data would be sent to a server.
      // Here, we create a downloadable file with the instructions.
      const simplifiedPlan = {
        totalDuration: plan.totalDuration,
        clips: plan.clips.map(c => ({
            fileName: c.video.file.name,
            startTime: c.startTime,
            duration: c.duration,
        }))
      };

      const planJson = JSON.stringify(simplifiedPlan, null, 2);
      const blob = new Blob([planJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setIsRendering(false);
    }, 4000); // 4-second simulation
  };

  if (!plan) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
       <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-contain"
          muted
          playsInline
        />
        {!isPlaying && (
           <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-center p-4">
            <h3 className="text-white text-lg font-semibold">Siap untuk Pratinjau</h3>
            <p className="text-gray-300 text-sm mt-1">Tekan 'Putar Pratinjau' untuk melihat atau 'Buat Video' untuk simulasi rendering.</p>
           </div>
        )}
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handlePlayPreview}
          disabled={isRendering}
          className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed transition"
        >
          <PlayIcon />
          {isPlaying ? 'Hentikan Pratinjau' : 'Putar Pratinjau'}
        </button>
        <button
          onClick={handleGenerateFinalVideo}
          disabled={isRendering}
          className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
        >
           {isRendering ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Merender... (Simulasi)
            </>
          ) : (
             <>
              <GenerateIcon />
              Buat Video Final
             </>
          )}
        </button>
      </div>
      
      {downloadUrl && !isRendering && (
          <div className="text-center p-4 bg-gray-900/70 rounded-lg border border-gray-700">
            <h4 className="font-semibold text-green-400">Simulasi Selesai!</h4>
            <p className="text-sm text-gray-400 my-2">Di aplikasi nyata, video Anda akan siap. Di sini, Anda dapat mengunduh rencana montase yang akan digunakan oleh server FFmpeg.</p>
            <a 
                href={downloadUrl} 
                download="montage_plan.json"
                className="inline-block mt-2 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition"
            >
                Unduh Rencana Montase (.json)
            </a>
          </div>
      )}

      <p className="text-center text-xs text-gray-400 pt-2">
        Pratinjau berjalan di browser. Pembuatan video final memerlukan server backend dengan FFmpeg.
      </p>
    </div>
  );
};

export default MontagePreview;
