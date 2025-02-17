<script lang="ts">
  import type { AudioPhrase } from "../types";
  import type WaveSurfer from "wavesurfer.js";

  export let phrase: AudioPhrase;
  export let wavesurfer: WaveSurfer | null = null;
  export let onUpdate: (phrase: AudioPhrase) => void;
  export let onPlayPhrase: (start: number, end: number, speed: number) => void;
  export let onDelete: (phraseID: string) => void;

  function handlePlay() {
    onPlayPhrase(phrase.phraseStart, phrase.phraseEnd, phrase.speed);
  }

  function updatePhraseName() {
    // If the name is empty or just whitespace, get the number from the current phrases
    if (!phrase.phraseName.trim()) {
      const match = phrase.phraseName.match(/Phrase(\d+)/);
      const number = match ? match[1] : "";
      phrase.phraseName = `Phrase${number || "1"}`;
    }
    onUpdate(phrase);
  }

  function updateTiming(
    start: number | null = null,
    end: number | null = null,
  ) {
    const updatedPhrase = {
      ...phrase,
      phraseStart: start ?? phrase.phraseStart,
      phraseEnd: end ?? phrase.phraseEnd,
    };
    onUpdate(updatedPhrase);
  }

  // Mark current position as start/end
  function markCurrentTime(type: "start" | "end") {
    if (wavesurfer) {
      const currentTime = wavesurfer.getCurrentTime();
      if (type === "start") {
        updateTiming(currentTime, null);
      } else {
        updateTiming(null, currentTime);
      }
    }
  }
</script>

<div class="phrase-item" style="background: {phrase.color || 'white'}">
  <span class="phrase-id">ID: {phrase.phraseName}</span>
  <input
    type="string"
    bind:value={phrase.phraseName}
    on:change={() => updatePhraseName()}
  />

  <div class="timing-controls">
    <div class="time-input">
      <label
        >Start:
        <input
          type="number"
          step="0.1"
          bind:value={phrase.phraseStart}
          on:change={() => updateTiming()}
        />
      </label>
    </div>

    <div class="time-input">
      <label
        >End:
        <input
          type="number"
          step="0.1"
          bind:value={phrase.phraseEnd}
          on:change={() => updateTiming()}
        />
      </label>
    </div>

    <button on:click={handlePlay} disabled={!wavesurfer} class="play-button">
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
      on:change={() => onUpdate(phrase)}
    />
  </div>

  <label class="complete-checkbox">
    Complete:
    <input
      type="checkbox"
      bind:checked={phrase.complete}
      on:change={() => onUpdate(phrase)}
    />
  </label>

  <button on:click={() => onDelete(phrase.phraseID)} class="delete-button">
    Delete
  </button>
</div>

<style>
  .phrase-item {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #ccc;
  }

  .timing-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .time-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .time-input input[type="number"] {
    width: 80px;
  }

  .speed-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  button {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .play-button {
    background: #4a9eff;
    color: white;
    border: none;
  }

  .play-button:hover:not(:disabled) {
    background: #1e56b0;
  }

  .mark-button {
    font-size: 0.8rem;
  }

  .complete-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .delete-button {
    background: #ff4a4a;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    margin-left: auto;
  }

  .delete-button:hover {
    background: #b01e1e;
  }
</style>
