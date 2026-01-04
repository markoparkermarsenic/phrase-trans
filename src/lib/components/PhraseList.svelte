<script lang="ts">
  import { phrases, deletePhrase, reorderPhrases } from "../stores/phrases";
  import PhraseItem from "./PhraseItem.svelte";
  import type { AudioPhrase } from "../types";
  import type WaveSurfer from "wavesurfer.js";

  export let wavesurfer: WaveSurfer | null = null;

  let draggedIndex: number | null = null;
  let dragOverIndex: number | null = null;
  let isDragging = false;

  function handleDragStart(event: DragEvent, index: number) {
    // Only allow dragging from the color strip
    const target = event.target as HTMLElement;
    if (!target.classList.contains("color-strip")) {
      event.preventDefault();
      return;
    }

    isDragging = true;
    draggedIndex = index;

    // Make the drag image transparent
    const dragImage = (event.target as HTMLElement).parentElement?.cloneNode(
      true,
    ) as HTMLElement;
    if (dragImage) {
      dragImage.style.opacity = "0.5";
      document.body.appendChild(dragImage);
      event.dataTransfer?.setDragImage(dragImage, 0, 0);
      setTimeout(() => dragImage.remove(), 0);
    }
  }

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
  {#each $phrases as phrase, index (phrase.phraseID)}
    <div
      class="phrase-wrapper"
      class:dragging={index === draggedIndex}
      class:drag-over={index === dragOverIndex}
      draggable="true"
      on:dragstart={(e) => handleDragStart(e, index)}
      on:dragend={() => {
        if (isDragging && draggedIndex !== null && dragOverIndex !== null) {
          reorderPhrases(draggedIndex, dragOverIndex);
        }
        isDragging = false;
        draggedIndex = null;
        dragOverIndex = null;
      }}
      on:dragover|preventDefault={() => {
        if (isDragging && draggedIndex !== index) {
          dragOverIndex = index;
        }
      }}
      on:dragleave={() => {
        if (isDragging && dragOverIndex === index) {
          dragOverIndex = null;
        }
      }}
    >
      <PhraseItem
        {phrase}
        {wavesurfer}
        onUpdate={handlePhraseUpdate}
        onPlayPhrase={handlePlayPhrase}
        onDelete={deletePhrase}
      />
    </div>
  {/each}
</div>

<style>
  .phrases-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .phrase-wrapper {
    position: relative;
  }

  .phrase-wrapper.dragging {
    opacity: 0.5;
  }

  .phrase-wrapper.drag-over::before {
    content: "";
    position: absolute;
    top: -4px;
    left: 0;
    right: 0;
    height: 4px;
    background: rgb(200, 0, 200);
    border-radius: 2px;
  }
</style>
