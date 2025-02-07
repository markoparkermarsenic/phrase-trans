import type { AudioPhrase } from '../types';

export const compressAudioFile = async (file: File): Promise<File> => {
    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create offline context with reduced sample rate (22050 Hz instead of 44100 Hz)
    const offlineContext = new OfflineAudioContext(
        1, // Mono channel for smaller size
        Math.floor(audioBuffer.length * (44100 / audioBuffer.sampleRate)),
        44100 // Lower sample rate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);

    // Start source and render
    source.start(0);
    const renderedBuffer = await offlineContext.startRendering();

    // Convert to WAV with reduced quality
    const wavBlob = await audioBufferToWav(renderedBuffer, 8); // 8-bit depth instead of 16-bit

    // Create new File object with compressed data
    return new File([wavBlob], file.name.replace(/\.[^/.]+$/, '') + '_compressed.wav', {
        type: 'audio/wav'
    });
};

const audioBufferToWav = (buffer: AudioBuffer, bitDepth: number): Promise<Blob> => {
    return new Promise(resolve => {
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numberOfChannels * bytesPerSample;

        const length = buffer.length;
        const wavBuffer = new ArrayBuffer(44 + length * bytesPerSample);
        const view = new DataView(wavBuffer);

        // Write WAV header
        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * bytesPerSample, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length * bytesPerSample, true);

        // Write audio data with reduced bit depth
        let offset = 44;
        const channelData = buffer.getChannelData(0); // Use first channel for mono
        const maxValue = Math.pow(2, bitDepth - 1) - 1;

        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            if (bitDepth === 8) {
                view.setInt8(offset, sample * maxValue);
                offset += 1;
            } else {
                view.setInt16(offset, sample * maxValue, true);
                offset += 2;
            }
        }

        resolve(new Blob([wavBuffer], { type: 'audio/wav' }));
    });
};

export const validateTiming = (start: number, end: number, duration?: number): boolean => {
    return start >= 0 && end > start && (duration ? end <= duration : true);
};

export const playPhrase = (
    audioPlayer: HTMLAudioElement,
    phrase: AudioPhrase
): void => {
    if (audioPlayer && validateTiming(phrase.phraseStart, phrase.phraseEnd)) {
        audioPlayer.currentTime = phrase.phraseStart;
        audioPlayer.playbackRate = phrase.speed / 100;
        audioPlayer.play();

        const stopAtEnd = () => {
            if (audioPlayer.currentTime >= phrase.phraseEnd) {
                audioPlayer.pause();
                audioPlayer.removeEventListener('timeupdate', stopAtEnd);
            }
        };

        audioPlayer.addEventListener('timeupdate', stopAtEnd);
    }
};
