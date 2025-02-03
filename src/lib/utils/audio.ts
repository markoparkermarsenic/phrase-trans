import type { AudioPhrase } from '../types';

export const validateTiming = (start: number, end: number, duration?: number): boolean => {
    return start >= 0 && end > start && (duration ? end <= duration : true);
};

export const playPhrase = (
    audioPlayer: HTMLAudioElement, 
    phrase: AudioPhrase
): void => {
    if (audioPlayer && validateTiming(phrase.phraseStart, phrase.phraseEnd)) {
        audioPlayer.currentTime = phrase.phraseStart;
        audioPlayer.playbackRate = phrase.speed / 100;
        audioPlayer.play();
        
        const stopAtEnd = () => {
            if (audioPlayer.currentTime >= phrase.phraseEnd) {
                audioPlayer.pause();
                audioPlayer.removeEventListener('timeupdate', stopAtEnd);
            }
        };
        
        audioPlayer.addEventListener('timeupdate', stopAtEnd);
    }
};
