<script lang="ts">
    import { onMount } from "svelte";
    import { getLocalStorageUsage } from "../utils/browser";

    let storageInfo = {
        used: 0,
        total: 0,
        percentage: 0,
    };

    function formatBytes(bytes: number): string {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    function updateStorageInfo() {
        storageInfo = getLocalStorageUsage();
    }

    onMount(() => {
        updateStorageInfo();
        // Listen for storage changes
        window.addEventListener("storage", updateStorageInfo);
        return () => {
            window.removeEventListener("storage", updateStorageInfo);
        };
    });
</script>

<div class="storage-indicator">
    <div class="storage-bar">
        <div
            class="storage-used"
            style="width: {Math.min(storageInfo.percentage, 100)}%"
            class:warning={storageInfo.percentage > 80}
            class:critical={storageInfo.percentage > 90}
        />
    </div>
    <div class="storage-text">
        {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)} used ({storageInfo.percentage.toFixed(
            1,
        )}%)
    </div>
</div>

<style>
    .storage-indicator {
        margin: 1rem 0;
        font-size: 0.875rem;
    }

    .storage-bar {
        width: 100%;
        height: 8px;
        background-color: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
    }

    .storage-used {
        height: 100%;
        background-color: #3b82f6;
        transition: width 0.3s ease;
    }

    .storage-used.warning {
        background-color: #f59e0b;
    }

    .storage-used.critical {
        background-color: #ef4444;
    }

    .storage-text {
        color: #64748b;
    }
</style>
