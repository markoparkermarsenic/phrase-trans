<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import WaveSurfer from "wavesurfer.js";
    import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

    export let audioFile: File | null = null;
    export let onClose: () => void;
    export let onTrimComplete: (trimmedBlob: Blob) => void;

    let waveformRef: HTMLDivElement;
    let wavesurfer: WaveSurfer;
    let regions: RegionsPlugin;
    let trimRegion: any = null;

    onMount(() => {
        wavesurfer = WaveSurfer.create({
            container: waveformRef,
            waveColor: "rgb(200, 0, 200)",
            progressColor: "rgb(100, 0, 100)",
            height: 128,
            normalize: true,
            interact: true,
            barWidth: 2,
            barGap: 2,
            fillParent: true,
            responsive: true,
            minPxPerSec: 50,
            maxCanvasWidth: 4000,
        });

        regions = RegionsPlugin.create();
        wavesurfer.registerPlugin(regions);

        wavesurfer.on("ready", () => {
            // Create initial region spanning the entire audio
            const duration = wavesurfer.getDuration();
            trimRegion = regions.addRegion({
                id: "trim-region",
                start: 0,
                end: duration,
                color: "rgba(255, 74, 74, 0.5)",
                drag: false,
                resize: true,
            });
        });

        if (audioFile) {
            loadAudio(audioFile);
        }
    });

    onDestroy(() => {
        if (wavesurfer) {
            wavesurfer.destroy();
        }
    });

    async function loadAudio(file: File) {
        try {
            await wavesurfer.loadBlob(file);
        } catch (error) {
            console.error("Error loading audio:", error);
        }
    }

    async function handleTrim() {
        if (!trimRegion || !audioFile) return;

        const audioContext = new AudioContext();
        const audioData = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        // Calculate trim points in samples
        const startSample = Math.floor(
            trimRegion.start * audioBuffer.sampleRate,
        );
        const endSample = Math.floor(trimRegion.end * audioBuffer.sampleRate);
        const duration = endSample - startSample;

        // Create new buffer for trimmed audio
        const trimmedBuffer = new AudioContext().createBuffer(
            audioBuffer.numberOfChannels,
            duration,
            audioBuffer.sampleRate,
        );

        // Copy the trimmed portion
        for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
        ) {
            const channelData = audioBuffer.getChannelData(channel);
            const trimmedData = trimmedBuffer.getChannelData(channel);
            for (let i = 0; i < duration; i++) {
                trimmedData[i] = channelData[startSample + i];
            }
        }

        // Convert buffer to blob
        const offlineContext = new OfflineAudioContext(
            trimmedBuffer.numberOfChannels,
            trimmedBuffer.length,
            trimmedBuffer.sampleRate,
        );
        const source = offlineContext.createBufferSource();
        source.buffer = trimmedBuffer;
        source.connect(offlineContext.destination);
        source.start();

        const renderedBuffer = await offlineContext.startRendering();
        const blob = await audioBufferToBlob(renderedBuffer);

        onTrimComplete(blob);
    }

    async function audioBufferToBlob(audioBuffer: AudioBuffer): Promise<Blob> {
        const channelData = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            channelData.push(audioBuffer.getChannelData(i));
        }

        const interleaved = new Float32Array(
            audioBuffer.length * audioBuffer.numberOfChannels,
        );
        for (let i = 0; i < audioBuffer.length; i++) {
            for (
                let channel = 0;
                channel < audioBuffer.numberOfChannels;
                channel++
            ) {
                interleaved[i * audioBuffer.numberOfChannels + channel] =
                    channelData[channel][i];
            }
        }

        const wavBuffer = await encodeWAV(
            interleaved,
            audioBuffer.sampleRate,
            audioBuffer.numberOfChannels,
        );
        return new Blob([wavBuffer], { type: "audio/wav" });
    }

    function encodeWAV(
        samples: Float32Array,
        sampleRate: number,
        numChannels: number,
    ): ArrayBuffer {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        /* RIFF identifier */
        writeString(view, 0, "RIFF");
        /* RIFF chunk length */
        view.setUint32(4, 36 + samples.length * 2, true);
        /* RIFF type */
        writeString(view, 8, "WAVE");
        /* format chunk identifier */
        writeString(view, 12, "fmt ");
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * 2, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, "data");
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);

        floatTo16BitPCM(view, 44, samples);

        return buffer;
    }

    function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function floatTo16BitPCM(
        output: DataView,
        offset: number,
        input: Float32Array,
    ) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
    }
</script>

<div class="modal-overlay">
    <div class="modal-content">
        <h2>Trim Audio</h2>
        <div class="waveform-container">
            <div bind:this={waveformRef} class="waveform" />
        </div>
        <div class="modal-actions">
            <button class="cancel-button" on:click={onClose}>Cancel</button>
            <button class="trim-button" on:click={handleTrim}>Apply Trim</button
            >
        </div>
    </div>
</div>

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        width: 80%;
        max-width: 800px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .waveform-container {
        margin: 1rem 0;
        background: #f5f5f5;
        border-radius: 4px;
        padding: 1rem;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
    }

    button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        border: none;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .cancel-button {
        background: #e0e0e0;
    }

    .cancel-button:hover {
        background: #d0d0d0;
    }

    .trim-button {
        background: rgb(200, 0, 200);
        color: white;
    }

    .trim-button:hover {
        background: rgb(180, 0, 180);
    }
</style>
