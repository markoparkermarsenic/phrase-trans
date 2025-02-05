<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import WaveSurfer from "wavesurfer.js";
  import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
  import { phrases, deletePhrase, createPhrase } from "../stores/phrases";

  export let audioFile: File | null = null;
  export let onPlayerReady: (wavesurfer: WaveSurfer) => void = () => {};

  let waveformRef: HTMLDivElement;
  let wavesurfer: WaveSurfer;
  let regions: RegionsPlugin;
  let previousPhrases: string[] = [];
  let currentPhraseStart: number | null = null;
  let selectedRegion: any = null;
  let isHoveringWaveform = false;

  const random = (min: number, max: number) =>
    Math.random() * (max - min) + min;
  const randomColor = () =>
    `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`;

  function updatePhrase(regionId: string, start: number, end: number) {
    phrases.update((currentPhrases) =>
      currentPhrases.map((phrase) =>
        phrase.phraseID === regionId
          ? { ...phrase, phraseStart: start, phraseEnd: end }
          : phrase,
      ),
    );
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Always prevent spacebar default behavior
    if (event.key === " ") {
      event.preventDefault();

      if (!wavesurfer) {
        console.error("wavesurfer is not initialized");
        return;
      }

      if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
      } else {
        wavesurfer.play();
      }
    }

    if (event.key === "Backspace" && selectedRegion) {
      event.preventDefault();
      deletePhrase(selectedRegion.id);
      selectedRegion.remove();
      selectedRegion = null;
    }

    if (event.key === "x") {
      event.preventDefault();
      const currentTime = wavesurfer.getCurrentTime();

      if (!wavesurfer.isPlaying()) {
        wavesurfer.play();
      }

      if (currentPhraseStart === null) {
        currentPhraseStart = currentTime;
        console.log("Started new phrase at:", currentTime);
      } else {
        const phrase = createPhrase();
        phrase.phraseStart = currentPhraseStart;
        phrase.phraseEnd = currentTime;

        // Add region to the waveform
        regions.addRegion({
          id: phrase.phraseID,
          start: currentPhraseStart,
          end: currentTime,
          content: "Phrase",
          color: randomColor(),
          drag: true,
          resize: true,
        });

        // Update the phrases store
        phrases.update((currentPhrases) => [...currentPhrases, phrase]);

        currentPhraseStart = null;
        console.log("Completed phrase");
      }
    }
  }

  let loop = true;

  function handleLoopChange(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    loop = checkbox.checked;
  }

  let zoomLevel = 100; // Initial zoom level (pixels per second)
  let speedLevel = 100; // Initial speed level (percentage)

  function handleSpeedChange(event: Event) {
    const slider = event.target as HTMLInputElement;
    const speed = Number(slider.value);
    speedLevel = speed;

    if (wavesurfer) {
      wavesurfer.setPlaybackRate(speed / 100);
    }

    // If a region is selected, update its speed
    if (selectedRegion) {
      phrases.update((currentPhrases) =>
        currentPhrases.map((phrase) =>
          phrase.phraseID === selectedRegion.id
            ? { ...phrase, speed: speed }
            : phrase,
        ),
      );
    }
  }

  // Function to handle zoom level changes
  function handleZoomChange(event: Event) {
    const slider = event.target as HTMLInputElement;
    const minPxPerSec = Number(slider.value);
    zoomLevel = minPxPerSec;
    wavesurfer.zoom(minPxPerSec);
  }

  // Function to handle wheel/pinch events
  function handleWheel(event: WheelEvent) {
    if (isHoveringWaveform) {
      event.preventDefault();
      // Adjust zoom level based on wheel/pinch direction
      const zoomFactor = 1.1; // Controls how fast zooming happens
      if (event.deltaY < 0) {
        // Zoom in (scroll up or pinch out)
        zoomLevel = Math.min(zoomLevel * zoomFactor, 1000); // Cap at 1000px/sec
      } else {
        // Zoom out (scroll down or pinch in)
        zoomLevel = Math.max(zoomLevel / zoomFactor, 10); // Cap at 10px/sec
      }

      // Update WaveSurfer zoom level
      wavesurfer.zoom(zoomLevel);
    }
  }

  function handleMouseEnter() {
    isHoveringWaveform = true;
  }

  function handleMouseLeave() {
    isHoveringWaveform = false;
  }

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
      minPxPerSec: 100,
    });

    regions = RegionsPlugin.create();
    wavesurfer.registerPlugin(regions);

    if (audioFile) {
      loadAudio(audioFile);
    }

    wavesurfer.on("ready", () => {
      onPlayerReady(wavesurfer);
    });

    // Update phrases store when region is updated
    regions.on("region-updated", (region) => {
      console.log("Updated region", region);
      updatePhrase(region.id, region.start, region.end);
    });

    regions.on("region-clicked", (region, e) => {
      e.stopPropagation();
      // Update selection
      if (selectedRegion && selectedRegion !== region) {
        selectedRegion.setOptions({ color: randomColor() });
      }
      selectedRegion = region;
      region.setOptions({ color: "rgba(255, 74, 74, 0.5)" }); // Red highlight for selected

      // Find and apply the phrase's speed
      const phrase = $phrases.find((p) => p.phraseID === region.id);
      if (phrase) {
        speedLevel = phrase.speed;
        wavesurfer.setPlaybackRate(phrase.speed / 100);
      }

      region.play();
    });

    // Handle click outside regions to clear selection
    wavesurfer.on("click", () => {
      if (selectedRegion) {
        selectedRegion.setOptions({ color: randomColor() });
        selectedRegion = null;
      }
    });

    let activeRegion = null;
    regions.on("region-in", (region) => {
      console.log("region-in", region);
      activeRegion = region;

      // Apply phrase speed when region starts playing
      const phrase = $phrases.find((p) => p.phraseID === region.id);
      if (phrase) {
        speedLevel = phrase.speed;
        wavesurfer.setPlaybackRate(phrase.speed / 100);
      }
    });

    regions.on("region-out", (region) => {
      console.log("region-out", region);
      if (activeRegion === region) {
        if (loop) {
          region.play();
        } else {
          activeRegion = null;
          // Reset speed to default when region finishes playing
          speedLevel = 100;
          wavesurfer.setPlaybackRate(1);
        }
      }
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      wavesurfer.destroy();
    };
  });

  async function loadAudio(file: File) {
    try {
      await wavesurfer.loadBlob(file);
    } catch (error) {
      console.error("Error loading audio:", error);
    }
  }

  $: if (audioFile && wavesurfer) {
    loadAudio(audioFile);
  }

  // Handle phrase deletions by removing corresponding regions
  $: if (regions && $phrases) {
    const currentPhraseIds = $phrases.map((p) => p.phraseID);
    const deletedPhraseIds = previousPhrases.filter(
      (id) => !currentPhraseIds.includes(id),
    );

    deletedPhraseIds.forEach((id) => {
      const region = regions.getRegions().find((r) => r.id === id);
      if (region) {
        region.remove();
      }
    });

    previousPhrases = currentPhraseIds;
  }
</script>

<div class="waveform-container">
  <div class="waveform-wrapper">
    <div
      bind:this={waveformRef}
      class="waveform"
      on:mouseenter={handleMouseEnter}
      on:mouseleave={handleMouseLeave}
    />
  </div>
  {#if currentPhraseStart !== null}
    <div class="marking-indicator">
      Marking phrase... (Press 'x' again to end)
    </div>
  {/if}
  <label>
    <input type="checkbox" bind:checked={loop} on:change={handleLoopChange} />
    Loop regions
  </label>
  <div class="speed-control">
    <label class="speed-slider">
      Speed: {speedLevel}%
      <input
        type="range"
        min="15"
        max="110"
        bind:value={speedLevel}
        on:input={handleSpeedChange}
      />
    </label>
  </div>
</div>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  }

  .waveform-container {
    width: 100%;
    margin: 1rem 0;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    position: relative;
    font-family: inherit;
    overflow: hidden;
  }

  .waveform-container :global(wave) {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .speed-control {
    display: flex;
    justify-content: center;
    margin: 1rem 0;
  }

  .speed-slider {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 80%;
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .speed-slider input[type="range"] {
    width: 100%;
    height: 8px;
    margin: 1rem 0;
    -webkit-appearance: none;
    background: rgba(200, 0, 200, 0.2);
    border-radius: 4px;
    cursor: pointer;
  }

  .speed-slider input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: rgb(200, 0, 200);
    border-radius: 50%;
    cursor: pointer;
  }

  .speed-slider input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: rgb(200, 0, 200);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .marking-indicator {
    position: absolute;
    top: 0;
    right: 1rem;
    background: #4a9eff;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0 0 4px 4px;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
</style>
