<script lang="ts">
  import { writable, type Writable } from "svelte/store";
  import type { AudioPhrase } from "./lib/types";

  // Store for phrases
  const phrases: Writable<AudioPhrase[]> = writable([]);

  // Audio player reference
  let audioPlayer: HTMLAudioElement;
  let currentAudio: string | null = null;

  // Create a new phrase with default values
  const createPhrase = (): AudioPhrase => ({
    phraseID: crypto.randomUUID(),
    phraseStart: 0,
    phraseEnd: 0,
    complete: false,
    speed: 100, // percentage
  });

  // Function to add a new phrase
  function addPhrase(): void {
    phrases.update((currentPhrases: AudioPhrase[]): AudioPhrase[] => [
      ...currentPhrases,
      createPhrase(),
    ]);
  }

  // Function to update phrase timing
  function updatePhraseTiming(
    phraseID: string,
    start: number,
    end: number,
  ): void {
    phrases.update((currentPhrases: AudioPhrase[]): AudioPhrase[] =>
      currentPhrases.map(
        (phrase: AudioPhrase): AudioPhrase =>
          phrase.phraseID === phraseID
            ? { ...phrase, phraseStart: start, phraseEnd: end }
            : phrase,
      ),
    );
  }

  // Function to toggle completion status
  function toggleComplete(phraseID: string): void {
    phrases.update((currentPhrases: AudioPhrase[]): AudioPhrase[] =>
      currentPhrases.map(
        (phrase: AudioPhrase): AudioPhrase =>
          phrase.phraseID === phraseID
            ? { ...phrase, complete: !phrase.complete }
            : phrase,
      ),
    );
  }

  // Function to update playback speed
  function updateSpeed(phraseID: string, newSpeed: number): void {
    phrases.update((currentPhrases: AudioPhrase[]): AudioPhrase[] =>
      currentPhrases.map(
        (phrase: AudioPhrase): AudioPhrase =>
          phrase.phraseID === phraseID
            ? { ...phrase, speed: newSpeed }
            : phrase,
      ),
    );
  }

  // Function to handle file selection
  function handleFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      currentAudio = URL.createObjectURL(file);
    }
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
</script>

<main>
  <div class="audio-controls">
    <input type="file" accept="audio/*" on:change={handleFileSelect} />
    {#if currentAudio}
      <audio> bind:this={audioPlayer} src={currentAudio} controls </audio>
    {/if}
  </div>

  <button on:click={addPhrase}>Add New Phrase</button>

  <div class="phrases-list">
    {#each $phrases as phrase (phrase.phraseID)}
      <div class="phrase-item">
        <span>ID: {phrase.phraseID}</span>
        <div class="timing-controls">
          <input
            type="number"
            bind:value={phrase.phraseStart}
            on:change={() =>
              updatePhraseTiming(
                phrase.phraseID,
                phrase.phraseStart,
                phrase.phraseEnd,
              )}
          />
          <input
            type="number"
            bind:value={phrase.phraseEnd}
            on:change={() =>
              updatePhraseTiming(
                phrase.phraseID,
                phrase.phraseStart,
                phrase.phraseEnd,
              )}
          />
          <button on:click={() => playPhrase(phrase)} disabled={!currentAudio}>
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
            on:change={() => updateSpeed(phrase.phraseID, phrase.speed)}
          />
        </div>
        <label>
          Complete:
          <input
            type="checkbox"
            bind:checked={phrase.complete}
            on:change={() => toggleComplete(phrase.phraseID)}
          />
        </label>
      </div>
    {/each}
  </div>
</main>

<style>
  .audio-controls {
    margin: 1rem 0;
  }

  .phrases-list {
    margin-top: 1rem;
  }

  .phrase-item {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid #ccc;
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
  }
</style>
