import { writable, type Writable, get } from 'svelte/store';
import type { AudioPhrase } from '../types';
import { activeProjectId, projects } from './projects';
import { isBrowser } from '../utils/browser';

// Store for all phrases
export const phrases: Writable<AudioPhrase[]> = writable([]);

// Store for all phrases (not filtered by project)
const allPhrases: Writable<AudioPhrase[]> = writable([]);

// Load phrases from localStorage
const loadPhrases = (): void => {
    if (!isBrowser) return;

    try {
        const storedPhrases = localStorage.getItem('phrases');
        if (storedPhrases) {
            const loadedPhrases = JSON.parse(storedPhrases);
            allPhrases.set(loadedPhrases);

            // Set initial phrases based on active project
            const currentProjectId = get(activeProjectId);
            if (currentProjectId) {
                const projectPhrases = loadedPhrases.filter(
                    (p: AudioPhrase) => p.projectID === currentProjectId
                );
                phrases.set(projectPhrases);
            }
        }
    } catch (error) {
        console.error('Failed to load phrases:', error);
        allPhrases.set([]);
        phrases.set([]);
    }
};

// Save phrases to localStorage
const savePhrases = (phrasesList: AudioPhrase[]): void => {
    if (!isBrowser) return;
    try {
        localStorage.setItem('phrases', JSON.stringify(phrasesList));
    } catch (error) {
        console.error('Failed to save phrases:', error);
    }
};

// Initialize from storage
if (isBrowser) {
    loadPhrases();
}

// Subscribe to changes
phrases.subscribe((currentPhrases) => {
    // Update allPhrases when phrases change
    const currentProjectId = get(activeProjectId);
    if (currentProjectId) {
        allPhrases.update(all => {
            // Remove current project's phrases
            const otherPhrases = all.filter(p => p.projectID !== currentProjectId);
            // Add updated phrases
            return [...otherPhrases, ...currentPhrases];
        });
    }
});

// Save all phrases whenever they change
allPhrases.subscribe(savePhrases);

// Subscribe to active project changes to filter phrases
activeProjectId.subscribe(projectId => {
    if (projectId) {
        const allPhrasesValue = get(allPhrases);
        const projectPhrases = allPhrasesValue.filter(
            phrase => phrase.projectID === projectId
        );
        phrases.set(projectPhrases);
    } else {
        phrases.set([]);
    }
});

let phraseCounter = 1;

export const addPhrase = (projectId: string = get(activeProjectId) || ''): void => {
    if (!projectId) return;

    const phrase = createPhrase(projectId);
    phrases.update(current => [...current, phrase]);

    // Add phrase reference to project
    projects.update(current =>
        current.map(project =>
            project.id === projectId
                ? {
                    ...project,
                    phraseIDs: [...project.phraseIDs, phrase.phraseID],
                    lastModified: Date.now()
                }
                : project
        )
    );
};

export const createPhrase = (projectId: string): AudioPhrase => {
    const phrase: AudioPhrase = {
        phraseID: crypto.randomUUID(),
        projectID: projectId,
        phraseStart: 0,
        phraseEnd: 0,
        complete: false,
        speed: 100,
        phraseName: `Phrase ${phraseCounter}`,
        lastAccessed: Date.now()
    };
    phraseCounter++;
    return phrase;
};

export const deletePhrase = (phraseID: string): void => {
    const phrase = get(phrases).find(p => p.phraseID === phraseID);
    if (!phrase) return;

    // Remove phrase from store
    phrases.update(current => current.filter(p => p.phraseID !== phraseID));

    // Remove phrase reference from project
    projects.update(current =>
        current.map(project =>
            project.id === phrase.projectID
                ? {
                    ...project,
                    phraseIDs: project.phraseIDs.filter(id => id !== phraseID),
                    lastModified: Date.now()
                }
                : project
        )
    );
};

export const updatePhrase = (phraseID: string, updates: Partial<AudioPhrase>): void => {
    phrases.update(current =>
        current.map(phrase =>
            phrase.phraseID === phraseID
                ? { ...phrase, ...updates, lastAccessed: Date.now() }
                : phrase
        )
    );
};

export const getProjectPhrases = (projectId: string): AudioPhrase[] => {
    return get(allPhrases).filter(phrase => phrase.projectID === projectId);
};
