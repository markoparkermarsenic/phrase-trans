import { getProjectAudioFile } from '../stores/projects';
import type { AudioPhrase } from '../types';

export interface ExtractedAudioSegment {
    filename: string;
    audioData: Uint8Array;
    originalName: string;
}

export async function extractAudioSegments(
    projectId: string,
    projectName: string,
    phrases: AudioPhrase[]
): Promise<ExtractedAudioSegment[]> {
    const audioFile = await getProjectAudioFile(projectId);
    if (!audioFile) {
        throw new Error('No audio file found for project');
    }

    const audioBuffer = await fileToAudioBuffer(audioFile);
    const segments: ExtractedAudioSegment[] = [];

    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        const segmentBuffer = extractSegment(audioBuffer, phrase.phraseStart, phrase.phraseEnd);
        const audioData = await audioBufferToWav(segmentBuffer);

        segments.push({
            filename: `${sanitizeFilename(projectName)}_phrase${i + 1}.wav`,
            audioData,
            originalName: phrase.phraseName
        });
    }

    return segments;
}

async function fileToAudioBuffer(file: File): Promise<AudioBuffer> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    const arrayBuffer = await file.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}

function extractSegment(audioBuffer: AudioBuffer, startTime: number, endTime: number): AudioBuffer {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const segmentLength = endSample - startSample;

    const segmentBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        segmentLength,
        sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const segmentData = segmentBuffer.getChannelData(channel);

        for (let i = 0; i < segmentLength; i++) {
            segmentData[i] = originalData[startSample + i] || 0;
        }
    }

    return segmentBuffer;
}

async function audioBufferToWav(audioBuffer: AudioBuffer): Promise<Uint8Array> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const length = audioBuffer.length;
    const dataSize = length * numberOfChannels * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    // Write WAV header
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
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
    view.setUint32(40, dataSize, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            const intSample = sample * 0x7FFF;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    return new Uint8Array(wavBuffer);
}

function sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9_-]/g, '_');
}
