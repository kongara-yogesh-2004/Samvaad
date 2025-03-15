import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const API_BASE_URL = 'http://10.0.53.41:8000';

const WebcamWithAudioDots = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isInitialized || !webcamRef.current) return;
    const stream = webcamRef.current.stream;
    if (!stream) return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyserNode = audioCtx.createAnalyser();
    const audioSource = audioCtx.createMediaStreamSource(stream);
    audioSource.connect(analyserNode);
    analyserNode.fftSize = 32;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAudioLevels = () => {
      analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      setAudioLevels([
        avg > 10 ? Math.min(1, avg / 50) : 0,
        avg > 30 ? Math.min(1, (avg - 20) / 50) : 0,
        avg > 50 ? Math.min(1, (avg - 40) / 50) : 0,
      ]);
      requestAnimationFrame(updateAudioLevels);
    };
    updateAudioLevels();

    return () => {
      audioSource.disconnect();
      audioCtx.close();
    };
  }, [isInitialized]);

  const handleUserMedia = (stream) => {
    setIsInitialized(true);
  };

  const startRecording = () => {
    if (!webcamRef.current?.stream) return;
    const mediaRecorder = new MediaRecorder(webcamRef.current.stream, {
      mimeType: 'video/webm',
    });
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Capture 1-second chunks

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const formData = new FormData();
        formData.append('video_chunk', event.data, 'chunk.webm');
        try {
          await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    };
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="webcam-container bg-gray-800 rounded-lg shadow-lg overflow-hidden relative">
        <Webcam
          ref={webcamRef}
          audio={true}
          mirrored={true}
          videoConstraints={{ width: 220, height: 124, facingMode: 'user' }}
          onUserMedia={handleUserMedia}
          className="w-56 h-32 object-cover"
          muted={true}
        />

        <div className="absolute bottom-2 left-2 flex items-end space-x-1 bg-black bg-opacity-40 rounded-full px-3 py-2">
          {audioLevels.map((level, index) => (
            <div 
              key={index}
              className="w-2 rounded-full transition-transform duration-100 ease-in-out"
              style={{ 
                height: `${5 + level * 5}px`,
                backgroundColor: `rgba(66, 133, 244, ${0.4 + level * 0.6})`,
                transform: `scaleY(${1 + level * 0.2})`,
                boxShadow: level > 0.3 ? `0 0 6px rgba(66, 133, 244, ${level})` : 'none'
              }}
            />
          ))}
        </div>

        <div className="absolute top-2 right-2 space-x-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
              title="Start Recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="10" r="5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-full p-1"
              title="Stop Recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="6" y="6" width="8" height="8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcamWithAudioDots;
