import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import WebcamWithAudioDots from './audio';


// API base URL
const API_BASE_URL = 'http://10.0.53.41:8000';




const InteractiveInterviewApp = () => {
  // State variables for interview flow
  const [status, setStatus] = useState('idle'); // idle, ready, asking, listening, processing, completed, error, stopped, starting
  const [isInterviewRunning, setIsInterviewRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [syllabusData, setSyllabusData] = useState([]);
  
  // Constants
  const silenceThreshold = 0.05;
  const silenceDuration = 3000;

  // References
  const navigate = useNavigate();
  const location = useLocation();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const timeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleAgreeAndClose = () => {
    if (agreedToTerms) {
      setShowInstructions(false); // Close the modal
    }
  };
  // Get questions from location state or use default questions
  
  // Use questions from location state if available, otherwise use default questions
  useEffect(() => {
    if (location.state?.syllabusData) {
      setSyllabusData(location.state.syllabusData);
    }
  }, [location.state]);

  // console.log(location.state.syllabusData)

  const interviewQuestions = location.state.syllabusData;

  const totalQuestions = Object.keys(interviewQuestions).length;
//   console.log(totalQuestions)
  // console.log(interviewQuestions)
  // Cleanup effect for audio resources
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (audioRef.current) audioRef.current.pause();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [silenceTimer]);

  // Control interview flow
  useEffect(() => {
    if (isInterviewRunning) {
      askQuestion();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (silenceTimer) clearTimeout(silenceTimer);
    }
  }, [isInterviewRunning, currentQuestionNumber]);

  // Handle webcam media access
  const handleUserMedia = (stream) => {
    setHasMediaAccess(true);
  };

  const handleUserMediaError = (error) => {
    console.error("Error accessing media devices:", error);
    setHasMediaAccess(false);
    setError(`Camera access error: ${error.message}`);
  };

  // Ask the current question using TTS
  const askQuestion = async () => {
    if (currentQuestionNumber > totalQuestions) {
      setStatus('completed');
      setIsInterviewRunning(false);
      return;
    }
    
    setStatus('asking');
    const questionText = interviewQuestions[currentQuestionNumber.toString()];
    
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/tts/`,
        {
          params: { text: questionText },
          responseType: 'blob'
        }
      );
      
      const url = URL.createObjectURL(new Blob([response.data], { type: 'audio/wav' }));
      setAudioUrl(url);
      
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setStatus('listening');
        startRecording();
      };
      
      audio.play().catch(error => {
        handleError("Error playing audio: " + error.message);
        setStatus('listening');
        startRecording();
      });
    } catch (error) {
      handleError("Failed to fetch audio: " + (error.response?.data?.detail || error.message || "Unknown error"));
      setStatus('listening');
      startRecording();
    } finally {
      setLoading(false);
    }
  };

  // Start the interview process
  const startInterview = () => {
    setCurrentQuestionNumber(1);
    setStatus('starting');
    setError('');
    setTranscript('');
    setRecordedAudio(null);
    setIsInterviewRunning(true);
  };
  
  // Stop the interview process
  // const stopInterview = () => {
  //   setIsInterviewRunning(false);
  //   setStatus('stopped');
    
    // if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // if (silenceTimer) clearTimeout(silenceTimer);
    // if (audioRef.current) audioRef.current.pause();
    // if (isRecording) stopRecording();

    
  // };

  const stopInterview = () => {
    setLoading(true);
    // Simulate stopping the interview
    setTimeout(() => {
      setIsInterviewRunning(false);
      setIsRecording(false);
      setStatus('completed');
      setLoading(false);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (audioRef.current) audioRef.current.pause();
      if (isRecording) stopRecording();
      
      
      setTimeout(() => {
    
        navigate('/code');
      }, 100000);
    }, 1000);
  };

  
  const monitorAudioLevel = (analyserNode) => {
    if (!analyserNode) return;
    
    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!isRecording) return;
      
      analyserNode.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      
      const average = sum / bufferLength / 255;
      setVolumeLevel(average);

      if (average < silenceThreshold) {
        if (!silenceTimer) {
          const timer = setTimeout(() => {
            stopRecording();
          }, silenceDuration);
          setSilenceTimer(timer);
        }
      } else {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
      }

      if (isRecording) {
        requestAnimationFrame(checkVolume);
      }
    };

    checkVolume();
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
        sendAudioToServer(audioBlob);
        
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
      });

      mediaRecorder.start();
      setIsRecording(true);
      monitorAudioLevel(analyser);
    } catch (error) {
      handleError('Microphone access denied. Please check your settings.');
      timeoutRef.current = setTimeout(() => {
        setCurrentQuestionNumber(prevNumber => prevNumber + 1);
      }, 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('processing');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };


  const sendAudioToServer = async (audioBlob) => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
  
      const response = await axios.post(`${API_BASE_URL}/stt/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      if (response.data && response.data.transcript) {
        setTranscript(prevTranscripts =>
          `${prevTranscripts}Q${currentQuestionNumber}: ${interviewQuestions[currentQuestionNumber.toString()]}\nA: ${response.data.transcript}\n\n`
        );
      } else {
        setTranscript(prevTranscripts =>
          `${prevTranscripts}Q${currentQuestionNumber}: ${interviewQuestions[currentQuestionNumber.toString()]}\nA: [No transcript available]\n\n`
        );
      }

      timeoutRef.current = setTimeout(() => {
        setCurrentQuestionNumber(prevNumber => prevNumber + 1);
      }, 2000);
    } catch (error) {
      handleError('Failed to process audio: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
      timeoutRef.current = setTimeout(() => {
        setCurrentQuestionNumber(prevNumber => prevNumber + 1);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };



  

  // Handle errors
  const handleError = (errorMessage) => {
    setStatus('error');
    setError(errorMessage || 'An error occurred');
    timeoutRef.current = setTimeout(() => {
      setCurrentQuestionNumber(prevNumber => prevNumber + 1);
      setError('');
    }, 2000);
  };

  // Helper function to determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'text-green-500';
      case 'listening': return 'text-yellow-500';
      case 'processing': return 'text-blue-500';
      case 'completed': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  const goToSecondRound = () => {
    navigate('/code');
  };

  const handleButtonClick = () => {
    sendTranscriptToServer();  // Send the transcript
    goToSecondRound();          // Stop the interview
  };


  const sendTranscriptToServer = async () => {
    try {
      // Make the POST request to the backend
      const response = await axios.post('http://10.0.53.41:8000/questions', {
        "message" : transcript, // Corrected here
      });
      console.log("Transcript sent successfully:", response.data);
    } catch (error) {
      console.error("Error sending transcript:", error);
    }
  };
  
  // console.log(transcript); // This will log the transcript
  
 
    
  // StatusBadge component
  const StatusBadge = ({ status, loading }) => {
    const statusConfig = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ready' },
      asking: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Asking' },
      listening: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Listening' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' },
      error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' },
      stopped: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Stopped' },
      starting: { bg: 'bg-green-100', text: 'text-green-800', label: 'Starting' }
    };

    const config = statusConfig[status] || statusConfig.idle;
    
    return (
      <span className={`text-sm font-medium px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
        {loading ? 'Loading...' : config.label}
      </span>
    );
  };


  return (
    <div className="max-w-6xl mx-auto p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        Interactive Interview Assistant
      </h2>

      {showInstructions && (
  <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
    <div className="relative max-w-lg w-full p-6 rounded-lg bg-white shadow-xl mx-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Interview Instructions</h2>
      
      <div className="space-y-4 text-gray-700">
        <p>Welcome to your virtual interview session. Please read the following instructions carefully:</p>
        
        <ol className="list-decimal pl-6 space-y-2">
          <li>Ensure you are in a quiet environment with minimal background noise.</li>
          <li>Your camera and microphone will be used during this session.</li>
          <li>You will be asked {totalQuestions} questions one at a time.</li>
          <li>Take your time to answer each question thoroughly.</li>
          <li>You can pause the interview at any time by clicking the stop button.</li>
          <li>Your responses will be recorded for assessment purposes.</li>
          <li>This session may last approximately 15-20 minutes.</li>
        </ol>
        
        <div className="pt-4">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={agreedToTerms}
              onChange={() => setAgreedToTerms(!agreedToTerms)}
              className="mr-2 h-5 w-5 text-blue-500"
            />
            <span>I have read and agree to these instructions</span>
          </label>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleAgreeAndClose}
          disabled={!agreedToTerms}
          className={`px-4 py-2 rounded-md ${
            agreedToTerms 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-300 cursor-not-allowed text-gray-600'
          } font-medium`}
        >
          Continue to Interview
        </button>
      </div>
    </div>
  </div>
)}

      
      
      <div>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-6"
        >
          ← Back
        </button>
      </div>

      {/* Webcam Display */}
      <WebcamWithAudioDots />
      
      {/* Progress Bar */}
      <div className="mb-8 px-4">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Progress</span>
        <span>{Math.round((currentQuestionNumber / 5) * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${(currentQuestionNumber / 7) * 100}%` }}
        ></div>
      </div>
    </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          {error}
        </div>
      )}
      
 {/* Control Panel */}
<div className="flex justify-center space-x-4 mb-8">
  {status === 'completed' ? (
    <button
      onClick={handleButtonClick}
      className="px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-300 bg-green-600 text-white hover:bg-green-700 flex items-center justify-center"
    >
      Proceed to 2nd Round
    </button>

  ) : !isInterviewRunning ? (
    <button
      onClick={startInterview}
      disabled={loading}
      className={`px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-300 transform hover:scale-105 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 text-white`}
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Start Interview
    </button>
  ) : (
    <>
      <button
        onClick={stopInterview} 
        disabled={loading}
        className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-300 transform hover:scale-105 flex items-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Stop Interview
      </button>
      
      {isRecording && (
        <button
          onClick={stopRecording}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-300 transform hover:scale-105 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Stop Recording
        </button>
      )}
    </>
  )}
</div>
      
      {/* Two-column layout for desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Question Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col transition-all duration-500 hover:shadow-xl">
          <div className="mb-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Question {currentQuestionNumber} of {totalQuestions}
            </span>
            <div className="flex items-center">
              <span className="text-sm mr-2">Status:</span>
              <StatusBadge status={status} loading={loading} />
            </div>
          </div>
          
          <div className="text-xl font-medium mb-6 text-gray-800 flex-grow">
          {currentQuestionNumber <= totalQuestions 
            ? interviewQuestions[currentQuestionNumber.toString()]
            : "Congratulations! You've completed the interview."}
        </div>
          
          {isRecording && (
            <div className="flex items-center justify-center bg-red-50 p-4 rounded-lg border border-red-100">
              <div
                className="w-4 h-4 bg-red-500 rounded-full mr-3 animate-pulse"
                style={{ opacity: Math.max(0.3, volumeLevel * 2) }}
              ></div>
              <span className="text-red-600 font-medium">Recording your answer...</span>
            </div>
          )}
        </div>
        
        {/* Response Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition-all duration-500 hover:shadow-xl">
          <h3 className="text-lg font-medium mb-4 text-gray-700 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Your Response
          </h3>
          
          {recordedAudio ? (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <audio
                controls
                src={recordedAudio}
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-6">
              <div className="text-center text-gray-400 italic">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p>Your recorded response will appear here</p>
              </div>
            </div>
          )}
          
          {transcript ? (
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-700 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Transcript
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <p className="whitespace-pre-wrap text-sm font-mono text-gray-700">
                  {transcript}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 italic">
              <p>Transcript will appear here after recording</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Tips Section */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h3 className="text-md font-medium mb-2 text-blue-700 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Interview Tips
        </h3>
        <ul className="text-sm text-blue-800">
          <li className="mb-1">• Speak clearly and at a moderate pace</li>
          <li className="mb-1">• Structure your answers with examples when possible</li>
          <li className="mb-1">• Take a moment to collect your thoughts before answering</li>
        </ul>
      </div>
    </div>

    
  );
};

export default InteractiveInterviewApp;
