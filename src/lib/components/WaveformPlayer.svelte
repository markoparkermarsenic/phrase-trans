<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import WaveSurfer from "wavesurfer.js";
  import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
  import { phrases, deletePhrase } from "../stores/phrases";

  export let audioFile: File | null = null;
  export let onPlayerReady: (wavesurfer: WaveSurfer) => void = () => {};

  let waveformRef: HTMLDivElement;
  let wavesurfer: WaveSurfer;
  let regions: RegionsPlugin;
  let previousPhrases: string[] = [];
  let currentPhraseStart: number | null = null;
  let selectedRegion: any = null;

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
    if (!wavesurfer) {
      console.error("wavesurfer is not initialized");
      return;
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
        const phraseID = crypto.randomUUID();
        const phrase = {
          phraseID,
          phraseStart: currentPhraseStart,
          phraseEnd: currentTime,
          complete: false,
          speed: 100,
        };

        // Add region to the waveform
        regions.addRegion({
          id: phraseID,
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

  function handleKeyPress(event: KeyboardEvent) {
    if (!wavesurfer) {
      console.error("wavesurfer is not initialized");
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
      } else {
        wavesurfer.play();
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
    event.preventDefault(); // Prevent default scrolling behavior

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
    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keypress", handleKeyPress);
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
  <div bind:this={waveformRef} />
  {#if currentPhraseStart !== null}
    <div class="marking-indicator">
      Marking phrase... (Press 'x' again to end)
    </div>
  {/if}
  <label>
    <input type="checkbox" bind:checked={loop} on:change={handleLoopChange} />
    Loop regions
  </label>
  <br />
  <label class="zoom-slider">
    Zoom:
    <input
      type="range"
      min="10"
      max="1000"
      bind:value={zoomLevel}
      on:input={handleZoomChange}
    />
  </label>
  <br />
  <label class="speed-slider">
    Speed:
    <input
      type="range"
      min="15"
      max="110"
      bind:value={speedLevel}
      on:input={handleSpeedChange}
    />
    {speedLevel}%
  </label>
</div>

<style>
  .waveform-container {
    width: 100%;
    margin: 1rem 0;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    position: relative;
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
  }
</style>
