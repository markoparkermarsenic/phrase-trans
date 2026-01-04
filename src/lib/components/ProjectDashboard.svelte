<script lang="ts">
    import {
        projects,
        createProject,
        deleteProject,
        activeProjectId,
    } from "../stores/projects";
    import { fade, scale } from "svelte/transition";
    import StorageIndicator from "./StorageIndicator.svelte";
    import {
        exportProjectToAnki,
        validateProjectForExport,
        type ExportProgress,
    } from "../utils/ankiExport";

    let newProjectName = "";
    let showCreateForm = false;
    let exportingProjects = new Set<string>();
    let exportProgress: { [projectId: string]: ExportProgress } = {};

    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            createProject(newProjectName.trim());
            newProjectName = "";
            showCreateForm = false;
        }
    };

    const toggleCreateForm = () => {
        showCreateForm = !showCreateForm;
        if (showCreateForm) {
            // Focus the input after transition
            setTimeout(() => {
                const input = document.querySelector(".create-form input");
                if (input) (input as HTMLInputElement).focus();
            }, 100);
        }
    };

    const handleExportToAnki = async (project: any) => {
        // Validate project first
        const validationError = validateProjectForExport(project);
        if (validationError) {
            alert(validationError);
            return;
        }

        exportingProjects.add(project.id);
        exportingProjects = exportingProjects;

        try {
            await exportProjectToAnki(project, (progress) => {
                exportProgress[project.id] = progress;
                exportProgress = { ...exportProgress };
            });
        } catch (error) {
            console.error("Export failed:", error);
            alert(
                `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            exportingProjects.delete(project.id);
            exportingProjects = exportingProjects;
            delete exportProgress[project.id];
            exportProgress = { ...exportProgress };
        }
    };
</script>

<div class="dashboard" in:fade>
    <header>
        <h1>Transcroob Projects</h1>
    </header>
    <div class="storage-wrapper">
        <StorageIndicator />
    </div>

    {#if $projects.length === 0}
        <div class="empty-state" in:scale>
            <button class="create-btn large" on:click={toggleCreateForm}>
                {#if !showCreateForm}
                    <span class="plus">+</span>
                    <span class="text">Create Your First Project</span>
                {/if}
            </button>
        </div>
    {:else}
        <div class="projects-grid">
            {#each $projects as project (project.id)}
                <div class="project-card" in:scale role="button" tabindex="0">
                    <div
                        class="project-content"
                        on:click={() => ($activeProjectId = project.id)}
                        on:keydown={(e) =>
                            e.key === "Enter" &&
                            ($activeProjectId = project.id)}
                    >
                        <h2>{project.name}</h2>
                        <div class="meta">
                            <span>{project.phraseIDs.length} phrases</span>
                            <span
                                >Last modified: {new Date(
                                    project.lastModified,
                                ).toLocaleDateString()}</span
                            >
                        </div>
                    </div>

                    {#if exportingProjects.has(project.id)}
                        <div class="export-progress">
                            <div class="progress-bar">
                                <div
                                    class="progress-fill"
                                    style="width: {exportProgress[project.id]
                                        ?.progress || 0}%"
                                ></div>
                            </div>
                            <span class="progress-text">
                                {exportProgress[project.id]?.message ||
                                    "Exporting..."}
                            </span>
                        </div>
                    {:else}
                        <button
                            class="export-btn"
                            on:click|stopPropagation={() =>
                                handleExportToAnki(project)}
                            title="Export to Anki"
                            disabled={project.phraseIDs.length === 0}
                        >
                            📱
                        </button>
                    {/if}

                    <button
                        class="delete-btn"
                        on:click|stopPropagation={() =>
                            deleteProject(project.id)}
                        title="Delete project"
                    >
                        ×
                    </button>
                </div>
            {/each}
            <button class="create-btn" on:click={toggleCreateForm}>
                <span class="plus">+</span>
                <span class="text">New Project</span>
            </button>
        </div>
    {/if}

    {#if showCreateForm}
        <div
            class="create-form-overlay"
            transition:fade
            on:click={toggleCreateForm}
        >
            <div class="create-form" on:click|stopPropagation>
                <h2>
                    {$projects.length === 0
                        ? "Create Your First Project"
                        : "Create New Project"}
                </h2>
                <input
                    type="text"
                    bind:value={newProjectName}
                    placeholder="Project name"
                    on:keydown={(e) =>
                        e.key === "Enter" && handleCreateProject()}
                />
                <div class="form-actions">
                    <button class="cancel" on:click={toggleCreateForm}
                        >Cancel</button
                    >
                    <button
                        class="create"
                        on:click={handleCreateProject}
                        disabled={!newProjectName.trim()}
                    >
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .dashboard {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    header {
        margin-bottom: 2rem;
        text-align: center;
    }

    h1 {
        font-size: 2.5rem;
        color: #333;
        margin: 0;
    }

    .empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
    }

    .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        padding: 1rem;
    }

    .project-card {
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .project-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .project-content {
        cursor: pointer;
    }

    .project-card h2 {
        margin: 0 0 1rem 0;
        color: #333;
        font-size: 1.5rem;
    }

    .delete-btn {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: none;
        background: #ff4444;
        color: white;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .project-card:hover .delete-btn {
        opacity: 1;
    }

    .delete-btn:hover {
        background: #ff0000;
    }

    .meta {
        display: flex;
        justify-content: space-between;
        color: #666;
        font-size: 0.9rem;
    }

    .create-btn {
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
        height: 100%;
        min-height: 200px;
    }

    .create-btn:hover {
        background: #fafafa;
        border-color: #999;
    }

    .create-btn.large {
        padding: 3rem;
        min-width: 300px;
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

    .create-form-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .create-form {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .create-form h2 {
        margin: 0 0 1.5rem 0;
        color: #333;
    }

    .create-form input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        margin-bottom: 1.5rem;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
    }

    .form-actions button {
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        border: none;
    }

    .cancel {
        background: #f5f5f5;
        color: #666;
    }

    .create {
        background: #4caf50;
        color: white;
    }

    .create:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .export-btn {
        position: absolute;
        top: 0.5rem;
        right: 3rem;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: none;
        background: #2196f3;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .export-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .project-card:hover .export-btn {
        opacity: 1;
    }

    .export-btn:hover:not(:disabled) {
        background: #1976d2;
    }

    .export-progress {
        position: absolute;
        top: 0.5rem;
        right: 3rem;
        left: 0.5rem;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        padding: 0.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .progress-bar {
        width: 100%;
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 0.25rem;
    }

    .progress-fill {
        height: 100%;
        background: #2196f3;
        transition: width 0.3s ease;
    }

    .progress-text {
        font-size: 0.75rem;
        color: #666;
        display: block;
    }
</style>
