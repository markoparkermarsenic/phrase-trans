import { writable, type Writable, get } from 'svelte/store';
import type { AudioPhrase } from '../types';

export const phrases: Writable<AudioPhrase[]> = writable([]);
let phraseCounter = 1;

export const addPhrase = (): void => {
    phrases.update((current) => [...current, createPhrase()]);
};

export const createPhrase = (): AudioPhrase => {
    const phrase = {
        phraseID: crypto.randomUUID(),
        phraseStart: 0,
        phraseEnd: 0,
        complete: false,
        speed: 100,
        phraseName: `Phrase${phraseCounter}`
    };
    phraseCounter++;
    return phrase;
};

export const deletePhrase = (phraseID: string): void => {
    phrases.update((current) => current.filter(phrase => phrase.phraseID !== phraseID));
};
