import librosa
import numpy as np

# Define a mapping of chroma vectors to chord labels
CHORD_MAPPING = {
    # Major and Minor Chords
    'C': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    'Cm': [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    'D': [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    'Dm': [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    'E': [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    'Em': [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0],
    'F': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    'Fm': [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    'G': [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    'Gm': [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    'A': [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    'Am': [0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    'B': [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    'Bm': [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0],

    # Diminished Chords
    'Cdim': [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    'Ddim': [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    'Edim': [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    'Fdim': [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    'Gdim': [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    'Adim': [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    'Bdim': [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],

    # Augmented Chords
    'Caug': [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    'Daug': [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    'Eaug': [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    'Faug': [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    'Gaug': [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    'Aaug': [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    'Baug': [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],

    # 7th Chords
    'C7': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    'D7': [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    'E7': [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    'F7': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    'G7': [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    'A7': [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    'B7': [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
}

def extract_chroma(audio_path):
    """
    Extract chroma features from an audio file using Librosa.
    """
    y, sr = librosa.load(audio_path)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    return chroma

def identify_chord(chroma_vector):
    """
    Identify the chord by comparing the chroma vector to predefined chord templates.
    """
    max_similarity = -1
    identified_chord = None

    for chord, template in CHORD_MAPPING.items():
        similarity = np.dot(chroma_vector, template)
        if similarity > max_similarity:
            max_similarity = similarity
            identified_chord = chord

    return identified_chord

def analyze_audio(audio_path):
    """
    Analyze an audio file and identify chords over time.
    """
    chroma = extract_chroma(audio_path)
    chords = []

    for frame in chroma.T:
        chroma_vector = np.round(frame)  # Round to binary-like values
        chord = identify_chord(chroma_vector)
        chords.append(chord)

    return chords

def main():
    # Path to your audio file
    audio_path = "test.mp4"

    # Analyze the audio and identify chords
    chords = analyze_audio(audio_path)

    # Print the identified chords
    print("Identified Chords:")
    from collections import Counter
    c = Counter(chords)
    print(c)

if __name__ == "__main__":
    main()
