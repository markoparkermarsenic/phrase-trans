<script lang="ts">
  import type WaveSurfer from "wavesurfer.js";
  import WaveformPlayer from "$lib/components/WaveformPlayer.svelte";
  import PhraseList from "$lib/components/PhraseList.svelte";
  import ProjectDashboard from "$lib/components/ProjectDashboard.svelte";
  import { addPhrase } from "$lib/stores/phrases";
  import {
    activeProjectId,
    storeAudioFile,
    getProjectAudioFile,
  } from "$lib/stores/projects";

  let audioFile: File | null = null;
  let wavesurfer: WaveSurfer | null = null;

  async function handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file && $activeProjectId) {
      try {
        await storeAudioFile($activeProjectId, file);
        audioFile = file;
      } catch (error) {
        console.error("Failed to store audio file:", error);
      }
    }
  }

  // Load audio file when project is selected
  $: if ($activeProjectId) {
    getProjectAudioFile($activeProjectId)
      .then((file) => {
        audioFile = file;
      })
      .catch((error) => {
        console.error("Failed to load audio file:", error);
      });
  }

  function handleWaveformReady(ws: WaveSurfer): void {
    wavesurfer = ws;
  }
</script>

<main>
  {#if $activeProjectId}
    <div class="workspace">
      <div class="workspace-header">
        <button class="back-btn" on:click={() => ($activeProjectId = null)}>
          ← Back to Projects
        </button>
      </div>
      <div class="audio-section">
        {#if !audioFile}
          <label class="upload-card" for="audio-upload">
            <span class="plus">+</span>
            <span class="text">Upload Audio File</span>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              on:change={handleFileSelect}
              class="file-input"
            />
          </label>
        {:else}
          <div class="audio-player">
            <WaveformPlayer {audioFile} onPlayerReady={handleWaveformReady} />
          </div>
        {/if}
      </div>

      <div class="controls">
        <button on:click={() => addPhrase($activeProjectId)}
          >Add New Phrase</button
        >
      </div>

      <PhraseList {wavesurfer} />
    </div>
  {:else}
    <ProjectDashboard />
  {/if}
</main>

<style>
  main {
    min-height: 100vh;
    background: #f9f9f9;
  }

  .workspace {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .workspace-header {
    margin-bottom: 1.5rem;
  }

  .back-btn {
    background: transparent;
    color: #666;
    border: none;
    padding: 0.5rem 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 1rem;
    transition: color 0.2s;
  }

  .back-btn:hover {
    color: #333;
  }

  .audio-section {
    margin-bottom: 2rem;
  }

  .upload-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    border: 2px dashed #ccc;
    border-radius: 12px;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.2s;
    height: 200px;
  }

  .upload-card:hover {
    background: #fafafa;
    border-color: #999;
  }

  .plus {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    color: #666;
  }

  .text {
    color: #666;
    font-size: 1.1rem;
  }

  .file-input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
  }

  .audio-player {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
