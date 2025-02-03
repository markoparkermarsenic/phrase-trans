<script lang="ts">
  import type WaveSurfer from "wavesurfer.js";
  import WaveformPlayer from "$lib/components/WaveformPlayer.svelte";
  import PhraseList from "$lib/components/PhraseList.svelte";
  import { addPhrase } from "$lib/stores/phrases";

  let audioFile: File | null = null;
  let wavesurfer: WaveSurfer | null = null;

  function handleFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      audioFile = file;
    }
  }

  function handleWaveformReady(ws: WaveSurfer): void {
    wavesurfer = ws;
  }
</script>

<main>
  <div class="audio-controls">
    <input
      type="file"
      accept="audio/*"
      on:change={handleFileSelect}
      class="file-input"
    />

    {#if audioFile}
      <WaveformPlayer {audioFile} onPlayerReady={handleWaveformReady} />
    {/if}
  </div>

  <div class="controls">
    <button on:click={addPhrase}>Add New Phrase</button>
  </div>

  <PhraseList {wavesurfer} />
</main>

<style>
  main {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .audio-controls {
    margin-bottom: 2rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .controls {
    margin: 1rem 0;
  }

  .file-input {
    margin-bottom: 1rem;
    width: 100%;
    padding: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #4a9eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  button:hover {
    background: #1e56b0;
  }
</style>
