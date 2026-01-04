<script lang="ts">
  import { phrases, addPhrase } from "./lib/stores/phrases";

  import {
    activeProjectId,
    storeAudioFile,
    getProjectAudioFile,
    initializeProjectsStore,
  } from "./lib/stores/projects";
  import ProjectDashboard from "./lib/components/ProjectDashboard.svelte";
  import type { AudioPhrase } from "./lib/types";
  import { onDestroy, onMount } from "svelte";

  onMount(() => {
    initializeProjectsStore();
  });

  // Audio player reference
  let audioPlayer: HTMLAudioElement;
  let currentAudio: string | null = null;

  // Function to handle file selection
  async function handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file && $activeProjectId) {
      try {
        // Store file in IndexedDB and get reference
        await storeAudioFile($activeProjectId, file);
        currentAudio = URL.createObjectURL(file);
      } catch (error) {
        console.error("Failed to store audio file:", error);
        alert("Failed to store audio file. Please try again.");
      }
    }
  }

  // Load project audio file when switching projects
  $: if ($activeProjectId) {
    if (currentAudio) {
      URL.revokeObjectURL(currentAudio);
      currentAudio = null;
    }
    getProjectAudioFile($activeProjectId)
      .then((file) => {
        if (file) {
          currentAudio = URL.createObjectURL(file);
        }
      })
      .catch((error) => {
        console.error("Failed to load project audio file:", error);
      });
  }

  // Function to validate timing
  function validateTiming(start: number, end: number): boolean {
    return (
      start >= 0 &&
      end > start &&
      (audioPlayer ? end <= audioPlayer.duration : true)
    );
  }

  // Function to play specific phrase
  function playPhrase(phrase: AudioPhrase): void {
    if (audioPlayer && validateTiming(phrase.phraseStart, phrase.phraseEnd)) {
      audioPlayer.currentTime = phrase.phraseStart;
      audioPlayer.playbackRate = phrase.speed / 100;
      audioPlayer.play();

      // Stop at phrase end
      const stopAtEnd = () => {
        if (audioPlayer.currentTime >= phrase.phraseEnd) {
          audioPlayer.pause();
          audioPlayer.removeEventListener("timeupdate", stopAtEnd);
        }
      };

      audioPlayer.addEventListener("timeupdate", stopAtEnd);
    }
  }

  // Cleanup audio URL when component is destroyed
  onDestroy(() => {
    if (currentAudio) {
      URL.revokeObjectURL(currentAudio);
    }
  });
</script>

<main>
  {#if !$activeProjectId}
    <ProjectDashboard />
  {:else}
    <div class="workspace">
      <div class="workspace-header">
        <button class="back-btn" on:click={() => ($activeProjectId = null)}>
          ← Back to Projects
        </button>
      </div>
      <div class="audio-controls">
        <input type="file" accept="audio/*" on:change={handleFileSelect} />
        {#if currentAudio}
          <audio bind:this={audioPlayer} src={currentAudio} controls></audio>
        {/if}
      </div>

      <button on:click={() => addPhrase($activeProjectId)}
        >Add New Phrase</button
      >

      <div class="phrases-list">
        {#each $phrases as phrase (phrase.phraseID)}
          <div class="phrase-item">
            <span>{phrase.phraseName}</span>
            <div class="timing-controls">
              <input type="number" bind:value={phrase.phraseStart} />
              <input type="number" bind:value={phrase.phraseEnd} />
              <button
                on:click={() => playPhrase(phrase)}
                disabled={!currentAudio}
              >
                Play Phrase
              </button>
            </div>
            <div class="speed-control">
              <span>Speed: {phrase.speed}%</span>
              <input
                type="range"
                min="50"
                max="200"
                bind:value={phrase.speed}
              />
            </div>
            <label>
              Complete:
              <input type="checkbox" bind:checked={phrase.complete} />
            </label>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</main>

<style>
  main {
    min-height: 100vh;
    background: #f9f9f9;
  }

  .storage-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
  }

  .workspace {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .workspace-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
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
  }

  .back-btn:hover {
    color: #333;
  }

  .audio-controls {
    margin: 1rem 0;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .phrases-list {
    margin-top: 1rem;
  }

  .phrase-item {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .timing-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .speed-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  input[type="number"] {
    width: 80px;
    padding: 0.25rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  button {
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style>
