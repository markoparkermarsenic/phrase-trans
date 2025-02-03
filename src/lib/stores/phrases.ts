import { writable, type Writable } from 'svelte/store';
import type { AudioPhrase } from '../types';

export const phrases: Writable<AudioPhrase[]> = writable([]);

export const addPhrase = (): void => {
    phrases.update((current) => [...current, createPhrase()]);
};

export const createPhrase = (): AudioPhrase => ({
    phraseID: crypto.randomUUID(),
    phraseStart: 0,
    phraseEnd: 0,
    complete: false,
    speed: 100
});

