
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoFile, MontageClip, MontagePlan } from './types';
import { generateStory, generateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/helpers';
import PromptForm from './components/PromptForm';
import FileUpload from './components/FileUpload';
import MontagePreview from './components/MontagePreview';

export default function App() {
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [story, setStory] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [uploadedVideos, setUploadedVideos] = useState<VideoFile[]>([]);
  const [montagePlan, setMontagePlan] = useState<MontagePlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
        audioContextRef.current?.close();
    }
  }, []);

  const handleGenerateStoryAndAudio = async (prompt: string) => {
    setIsLoadingStory(true);
    setErrorMessage('');
    setStory(null);
    setAudioBuffer(null);
    setAudioDuration(0);
    setMontagePlan(null);
    try {
      const storyText = await generateStory(prompt);
      setStory(storyText);
      const base64Audio = await generateSpeech(storyText);
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        const decodedBytes = decode(base64Audio);
        const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
        setAudioBuffer(buffer);
        setAudioDuration(buffer.duration);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingStory(false);
    }
  };

  const handleFilesUploaded = (files: VideoFile[]) => {
    setUploadedVideos(files);
    setMontagePlan(null); // Reset plan when new videos are uploaded
  };

  const handleGenerateMontage = useCallback(() => {
    if (audioDuration === 0 || uploadedVideos.length === 0) {
      setErrorMessage("Silakan hasilkan audio dan unggah video terlebih dahulu.");
      return;
    }
    setErrorMessage('');

    // Fisher-Yates shuffle for randomness
    const shuffledVideos = [...uploadedVideos];
    for (let i = shuffledVideos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledVideos[i], shuffledVideos[j]] = [shuffledVideos[j], shuffledVideos[i]];
    }

    const clips: MontageClip[] = [];
    let remainingTime = audioDuration;
    let totalVideoDuration = 0;

    for (const video of shuffledVideos) {
      if (remainingTime <= 0) break;

      const durationToUse = Math.min(video.duration, remainingTime);
      clips.push({
        video: video,
        startTime: 0,
        duration: durationToUse,
      });
      remainingTime -= durationToUse;
      totalVideoDuration += video.duration;
    }
    
    const totalAvailableDuration = uploadedVideos.reduce((acc, v) => acc + v.duration, 0);
    if(audioDuration > totalAvailableDuration) {
        setErrorMessage(`Peringatan: Durasi audio (${audioDuration.toFixed(1)}d) lebih panjang dari total durasi video (${totalAvailableDuration.toFixed(1)}d).`);
    }

    const plan: MontagePlan = {
      clips,
      totalDuration: audioDuration - remainingTime,
    };
    setMontagePlan(plan);
  }, [audioDuration, uploadedVideos]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 sm:text-5xl">
            Montage Video Cerita AI
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Buat montase video yang memukau secara otomatis berdasarkan narasi audio yang dihasilkan AI.
          </p>
        </header>

        {errorMessage && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Generate Audio */}
        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-1 text-indigo-400">Langkah 1: Hasilkan Trek Audio</h2>
          <p className="text-gray-400 mb-6">Masukkan ide cerita, dan AI akan membuat narasi dan mengubahnya menjadi audio.</p>
          <PromptForm onSubmit={handleGenerateStoryAndAudio} isLoading={isLoadingStory} />
          {story && (
            <div className="mt-6 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
              <h3 className="font-semibold text-gray-300 mb-2">Cerita yang Dihasilkan:</h3>
              <p className="text-gray-400 italic">"{story}"</p>
            </div>
          )}
           {audioBuffer && (
            <div className="mt-4 text-center">
                <p className="text-sm text-green-400">Audio berhasil dibuat! Durasi: {audioDuration.toFixed(2)} detik</p>
            </div>
           )}
        </div>

        {/* Step 2: Upload Videos */}
        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-1 text-indigo-400">Langkah 2: Unggah Klip Video</h2>
          <p className="text-gray-400 mb-6">Unggah klip video yang akan digunakan untuk membuat montase Anda.</p>
          <FileUpload onFilesUploaded={handleFilesUploaded} isLoading={isLoadingStory} />
          {uploadedVideos.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-300 mb-2">Video yang Diunggah:</h3>
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {uploadedVideos.map((v, i) => (
                  <li key={i} className="text-sm bg-gray-900/70 p-2 rounded-md flex justify-between items-center">
                    <span className="truncate text-gray-400">{v.file.name}</span>
                    <span className="font-mono bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">{v.duration.toFixed(2)}d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Step 3: Generate & Preview */}
        {audioDuration > 0 && uploadedVideos.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-1 text-indigo-400">Langkah 3: Buat & Pratinjau Montage</h2>
            <p className="text-gray-400 mb-6">Cocokkan klip video Anda dengan durasi audio dan lihat pratinjaunya.</p>
            {!montagePlan ? (
              <button
                onClick={handleGenerateMontage}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition"
              >
                Buat Montage
              </button>
            ) : (
                <MontagePreview plan={montagePlan} audioBuffer={audioBuffer} audioContext={audioContextRef.current}/>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
