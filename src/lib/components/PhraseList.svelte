<script lang="ts">
  import { phrases } from "../stores/phrases";
  import PhraseItem from "./PhraseItem.svelte";
  import type { AudioPhrase } from "../types";
  import type WaveSurfer from "wavesurfer.js";

  export let wavesurfer: WaveSurfer | null = null;

  const handlePhraseUpdate = (phrase: AudioPhrase): void => {
    phrases.update((current: AudioPhrase[]) =>
      current.map((p) => (p.phraseID === phrase.phraseID ? phrase : p)),
    );
  };
  const handlePlayPhrase = (
    start: number,
    end: number,
    speed: number,
  ): void => {
    if (wavesurfer) {
      wavesurfer.setPlaybackRate(speed / 100);
      wavesurfer.setTime(start); // Set the playback position
      wavesurfer.play(); // Start playing

      // Add listener to stop at end time
      const handleTimeUpdate = () => {
        if (wavesurfer.getCurrentTime() >= end) {
          wavesurfer.pause();
          wavesurfer.un("timeupdate", handleTimeUpdate); // Remove the listener
        }
      };

      wavesurfer.on("timeupdate", handleTimeUpdate);
    }
  };
</script>

<div class="phrases-list">
  {#each $phrases as phrase (phrase.phraseID)}
    <PhraseItem
      {phrase}
      {wavesurfer}
      onUpdate={handlePhraseUpdate}
      onPlayPhrase={handlePlayPhrase}
    />
  {/each}
</div>
