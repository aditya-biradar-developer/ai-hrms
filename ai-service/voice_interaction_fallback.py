"""
Fallback voice interaction module that avoids native build requirements.
- Uses pyttsx3 for offline TTS (pure Python wrappers over SAPI on Windows)
- Uses a simple RMS-energy VAD instead of webrtcvad
- Uses openai-whisper for ASR if available, but provides text-only fallback

How to use:
1. Install minimal requirements: see `requirements-alt.txt`
2. Run as module or import `VoiceInteractionFallback` from your app

This is designed for Windows where compiling native extensions may fail.
"""

import time
import numpy as np
import sounddevice as sd
import pyttsx3
import threading

try:
    import whisper
    _HAS_WHISPER = True
except Exception:
    _HAS_WHISPER = False


class VoiceInteractionFallback:
    def __init__(self, sample_rate=16000, channels=1, energy_threshold=0.01, silence_duration=0.6):
        self.sample_rate = sample_rate
        self.channels = channels
        self.energy_threshold = energy_threshold
        self.silence_duration = silence_duration

        # Initialize TTS (pyttsx3 uses native Windows SAPI - no build required)
        self.tts_engine = pyttsx3.init()
        # Choose a voice if available
        voices = self.tts_engine.getProperty('voices')
        if voices:
            # Prefer a female/en-US voice if present
            self.tts_engine.setProperty('voice', voices[0].id)

        # Whisper model (optional)
        if _HAS_WHISPER:
            try:
                self.asr_model = whisper.load_model('base')
            except Exception as e:
                print('Warning: Failed to load whisper model:', e)
                self.asr_model = None
        else:
            self.asr_model = None

    def speak_text(self, text: str, wait=True):
        """Speak using pyttsx3. Runs in background thread if wait=False"""
        if wait:
            self.tts_engine.say(text)
            self.tts_engine.runAndWait()
        else:
            t = threading.Thread(target=self.speak_text, args=(text, True), daemon=True)
            t.start()

    def _rms(self, frames: np.ndarray):
        return np.sqrt(np.mean(np.square(frames)))

    def record_until_silence(self, timeout=15):
        """Record audio frames until sustained silence detected.
        Returns a numpy array of float32 audio samples at `self.sample_rate`.
        """
        block_ms = 30
        blocksize = int(self.sample_rate * (block_ms / 1000.0))

        recorded = []
        silence_blocks = 0
        max_silence_blocks = int(self.silence_duration / (block_ms / 1000.0))

        def callback(indata, frames, time_info, status):
            if status:
                # print('Input status:', status)
                pass
            recorded.append(indata.copy())

        stream = sd.InputStream(samplerate=self.sample_rate, channels=self.channels, blocksize=blocksize, callback=callback)
        stream.start()
        start_ts = time.time()
        try:
            while True:
                time.sleep(block_ms / 1000.0)
                if len(recorded) == 0:
                    continue
                # compute RMS on last block
                last_block = recorded[-1].flatten()
                rms = self._rms(last_block)
                if rms < self.energy_threshold:
                    silence_blocks += 1
                else:
                    silence_blocks = 0
                if silence_blocks >= max_silence_blocks:
                    break
                if time.time() - start_ts > timeout:
                    break
        finally:
            stream.stop()
            stream.close()

        if not recorded:
            return np.zeros((0,), dtype=np.float32)

        audio = np.concatenate(recorded, axis=0)
        audio = audio.flatten().astype(np.float32)
        return audio

    def transcribe_audio(self, audio_np: np.ndarray):
        """Transcribe with whisper if available, otherwise return empty string"""
        if self.asr_model is None:
            print('ASR not available (whisper not installed or failed to load).')
            return ''

        # Whisper expects float32 audio sampled at 16000
        try:
            result = self.asr_model.transcribe(audio_np, language='en')
            return result.get('text', '').strip()
        except Exception as e:
            print('Whisper transcription failed:', e)
            return ''


if __name__ == '__main__':
    print('Voice interaction fallback demo')
    mgr = VoiceInteractionFallback()
    mgr.speak_text('Hello. Please say something after the beep.', wait=True)
    print('Recording...')
    audio = mgr.record_until_silence(timeout=10)
    print('Recorded', len(audio), 'samples')
    if len(audio) > 0 and mgr.asr_model is not None:
        print('Transcribing...')
        text = mgr.transcribe_audio(audio)
        print('Transcript:', text)
    else:
        print('No ASR available; recorded audio length:', len(audio))