<script lang="ts">
    import {
        projects,
        activeProjectId,
        createProject,
        deleteProject,
    } from "../stores/projects";
    import { onMount } from "svelte";
    import { isBrowser } from "../utils/browser";

    let newProjectName = "";
    let showCreateForm = false;

    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            createProject(newProjectName.trim());
            newProjectName = "";
            showCreateForm = false;
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (
            confirm(
                "Are you sure you want to delete this project? This will delete all associated phrases and audio files.",
            )
        ) {
            await deleteProject(id);
        }
    };

    const handleSelectProject = (id: string) => {
        $activeProjectId = id;
    };

    // Create default project if none exists
    onMount(() => {
        if (isBrowser && (!$projects || $projects.length === 0)) {
            createProject("Default Project");
        }
    });
</script>

<div class="project-list">
    <div class="header">
        <h2>Projects</h2>
        <button
            class="create-btn"
            on:click={() => (showCreateForm = !showCreateForm)}
        >
            {showCreateForm ? "×" : "+"}
        </button>
    </div>

    {#if showCreateForm}
        <div class="create-form">
            <input
                type="text"
                bind:value={newProjectName}
                placeholder="Project name"
                on:keydown={(e) => e.key === "Enter" && handleCreateProject()}
            />
            <button
                class="submit-btn"
                on:click={handleCreateProject}
                disabled={!newProjectName.trim()}
            >
                Create
            </button>
        </div>
    {/if}

    <ul class="projects">
        {#each $projects as project (project.id)}
            <li class:active={$activeProjectId === project.id}>
                <button
                    class="project-btn"
                    on:click={() => handleSelectProject(project.id)}
                >
                    {project.name}
                </button>
                <button
                    class="delete-btn"
                    on:click={() => handleDeleteProject(project.id)}
                    disabled={$projects.length === 1}
                >
                    ×
                </button>
            </li>
        {/each}
    </ul>
</div>

<style>
    .project-list {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    h2 {
        margin: 0;
        font-size: 1.2rem;
    }

    .create-btn {
        background: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        width: 30px;
        height: 30px;
        font-size: 1.2rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .create-form {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .submit-btn {
        background: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
    }

    .submit-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .projects {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .project-btn {
        flex: 1;
        text-align: left;
        padding: 0.5rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
    }

    li.active .project-btn {
        background: #e3f2fd;
        border-color: #2196f3;
    }

    .delete-btn {
        background: #ff5252;
        color: white;
        border: none;
        border-radius: 4px;
        width: 30px;
        cursor: pointer;
    }

    .delete-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
</style>
