<script lang="ts">
  export let audioUrl: string | null = null;
  export let onAudioLoad: (player: HTMLAudioElement) => void;

  // Initialize as undefined to match the binding type
  let audioPlayer: HTMLAudioElement | undefined;

  // Add proper type checking
  $: if (audioPlayer && audioUrl) {
    onAudioLoad(audioPlayer);
  }
</script>

<div class="audio-player">
  {#if audioUrl}
    <audio> bind:this={audioPlayer} src={audioUrl} controls </audio>
  {/if}
</div>
