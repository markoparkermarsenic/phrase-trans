import { writable, type Writable, get } from 'svelte/store';
import { isBrowser } from '../utils/browser';
import { compressAudioFile } from '../utils/audio';

export interface Project {
    id: string;
    name: string;
    phraseIDs: string[];
    lastModified: number;
    created: number;
}

// Store for all projects
export const projects: Writable<Project[]> = writable([]);

// Store for active project ID
export const activeProjectId: Writable<string | null> = writable(null);

// IndexedDB setup for audio files
const DB_NAME = 'audioStorage';
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// Initialize IndexedDB
const initDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!isBrowser) {
            reject(new Error('IndexedDB is only available in browser environment'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

// Load projects from localStorage
const loadProjects = (): void => {
    if (!isBrowser) return;

    try {
        const storedProjects = localStorage.getItem('projects');
        if (storedProjects) {
            projects.set(JSON.parse(storedProjects));
        }

        const storedActiveId = localStorage.getItem('activeProjectId');
        if (storedActiveId) {
            activeProjectId.set(storedActiveId);
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
};

// Save projects to localStorage
const saveProjects = (projectsList: Project[]): void => {
    if (!isBrowser) return;
    try {
        localStorage.setItem('projects', JSON.stringify(projectsList));
    } catch (error) {
        console.error('Failed to save projects:', error);
    }
};

// Save active project ID to localStorage
const saveActiveProject = (id: string | null): void => {
    if (!isBrowser) return;
    try {
        if (id) {
            localStorage.setItem('activeProjectId', id);
        } else {
            localStorage.removeItem('activeProjectId');
        }
    } catch (error) {
        console.error('Failed to save active project:', error);
    }
};

let initialized = false;

// Export initialization function to be called from hooks
export const initializeProjectsStore = () => {
    if (initialized || !isBrowser) return;

    // Load data from storage
    loadProjects();
    initDB().catch(console.error);

    // Set up subscriptions only on the client side
    projects.subscribe(saveProjects);
    activeProjectId.subscribe(saveActiveProject);

    initialized = true;
};

// Initialize immediately if in browser environment
if (isBrowser) {
    initializeProjectsStore();
}

// Create a new project
export const createProject = (name: string): void => {
    const project: Project = {
        id: crypto.randomUUID(),
        name,
        phraseIDs: [],
        lastModified: Date.now(),
        created: Date.now()
    };

    projects.update(current => [...current, project]);
    activeProjectId.set(project.id);
};

// Delete a project and its associated data
export const deleteProject = async (id: string): Promise<void> => {
    if (!isBrowser || !db) return;

    try {
        // Remove audio file from IndexedDB
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        await new Promise<void>((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Update active project if needed
        if (get(activeProjectId) === id) {
            const currentProjects = get(projects);
            const otherProject = currentProjects.find(p => p.id !== id);
            activeProjectId.set(otherProject?.id || null);
        }

        // Remove project from store
        projects.update(current => current.filter(p => p.id !== id));
    } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
    }
};

// Store audio file in IndexedDB
export const storeAudioFile = async (projectId: string, file: File): Promise<void> => {
    if (!isBrowser || !db) {
        throw new Error('Storage not available');
    }

    try {
        // Compress the audio file before storing
        // const compressedFile = await compressAudioFile(file);

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.put(file, projectId);
            request.onsuccess = () => {
                projects.update(current =>
                    current.map(project =>
                        project.id === projectId
                            ? { ...project, lastModified: Date.now() }
                            : project
                    )
                );
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to store audio file:', error);
        throw error;
    }
};

// Get audio file from IndexedDB
export const getProjectAudioFile = async (projectId: string): Promise<File | null> => {
    if (!isBrowser || !db) return null;

    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};
