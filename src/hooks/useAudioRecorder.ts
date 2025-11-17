import { useState, useRef, useCallback, useEffect } from 'react';

type AudioRecorderOptions = {
  onRecordingComplete: (blob: Blob) => void;
};

type AudioRecorderControls = {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
};

// Threshold for silence, on a scale of 0-255 where 128 is zero.
const SILENCE_THRESHOLD = 5;
// Duration of silence in ms to trigger auto-stop
const SILENCE_DURATION_MS = 3000;
// How often to check for silence in ms
const SILENCE_CHECK_INTERVAL_MS = 200;

export const useAudioRecorder = ({ onRecordingComplete }: AudioRecorderOptions): AudioRecorderControls => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for silence detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceDetectionIntervalRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceDetectionIntervalRef.current) {
      clearInterval(silenceDetectionIntervalRef.current);
      silenceDetectionIntervalRef.current = null;
    }
    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
    }
    
    sourceNodeRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
    silenceStartRef.current = null;
  }, []);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // onstop will handle the rest
    }
  }, []);

  const startRecording = useCallback(() => {
    async function getMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = []; // Clear previous chunks

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          cleanupSilenceDetection();
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          
          if (audioBlob.size > 0) {
            onRecordingCompleteRef.current(audioBlob);
          }
        };

        // --- Silence detection setup ---
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        sourceNodeRef.current = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyserRef.current = analyser;
        
        sourceNodeRef.current.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        silenceStartRef.current = null;

        silenceDetectionIntervalRef.current = window.setInterval(() => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataArray);
            
            let isSilent = true;
            for (let i = 0; i < bufferLength; i++) {
                if (Math.abs(dataArray[i] - 128) > SILENCE_THRESHOLD) {
                    isSilent = false;
                    break;
                }
            }

            if (isSilent) {
                if (silenceStartRef.current === null) {
                    silenceStartRef.current = Date.now();
                } else {
                    if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
                        stopRecording();
                    }
                }

            } else {
                silenceStartRef.current = null; // Reset if sound is detected
            }
        }, SILENCE_CHECK_INTERVAL_MS);

        mediaRecorder.onstart = () => {
          setIsRecording(true);
        };
        
        mediaRecorder.start();
      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please ensure permissions are granted.');
      }
    }
    getMedia();
  }, [cleanupSilenceDetection, stopRecording]);


  return { isRecording, startRecording, stopRecording };
};
