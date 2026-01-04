import { initializePyodide } from './pyodide';
import type { ExtractedAudioSegment } from './audioExtraction';

export async function generateAnkiDeck(
    projectName: string,
    audioSegments: ExtractedAudioSegment[]
): Promise<Uint8Array> {
    const pyodide = await initializePyodide();

    // Convert audio segments to Python-readable format
    const mediaFiles: { [filename: string]: Uint8Array } = {};
    audioSegments.forEach(segment => {
        mediaFiles[segment.filename] = segment.audioData;
    });

    // Convert JavaScript objects to Python-compatible format
    const segmentsData = audioSegments.map((segment, index) => ({
        filename: segment.filename,
        originalName: segment.originalName,
        index: index
    }));

    // Convert media files to base64 for Python compatibility
    const mediaFilesB64: { [filename: string]: string } = {};
    for (const [filename, audioData] of Object.entries(mediaFiles)) {
        // Convert Uint8Array to base64 string in chunks to avoid stack overflow
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < audioData.length; i += chunkSize) {
            const chunk = audioData.slice(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);
        mediaFilesB64[filename] = base64;
    }

    // Pass data to Python as JSON strings
    pyodide.globals.set('project_name', projectName);
    pyodide.globals.set('segments_json', JSON.stringify(segmentsData));
    pyodide.globals.set('media_files_json', JSON.stringify(mediaFilesB64));

    // Python code to generate Anki deck using genanki
    const pythonCode = `
import genanki
import random
import io
import json
import base64

# Parse data from JSON
segments_data = json.loads(segments_json)
media_files_b64 = json.loads(media_files_json)

# Create a unique model ID
model_id = random.randrange(1 << 30, 1 << 31)

# Define the card model for audio cards
audio_model = genanki.Model(
    model_id,
    'Audio Card Model',
    fields=[
        {'name': 'Front'},
        {'name': 'Back'},
    ],
    templates=[
        {
            'name': 'Audio Card',
            'qfmt': '{{Front}}',
            'afmt': '{{FrontSide}}<hr id="answer">{{Back}}',
        },
    ],
    css='''
.card {
    font-family: arial;
    font-size: 20px;
    text-align: center;
    color: black;
    background-color: white;
}
'''
)

# Create deck with unique ID and place in Transcriptions folder
deck_id = random.randrange(1 << 30, 1 << 31)
deck_name = f"Transcriptions::{project_name}"
deck = genanki.Deck(deck_id, deck_name)

# Add notes for each audio segment
for segment in segments_data:
    front_text = f"{project_name}.phrase{segment['index'] + 1}"
    # Include both automatic playback and HTML audio controls
    back_audio = f'[sound:{segment["filename"]}]<br><br><audio controls="" src="{segment["filename"]}"></audio>'
    
    note = genanki.Note(
        model=audio_model,
        fields=[front_text, back_audio]
    )
    
    deck.add_note(note)

# Prepare media files for genanki by writing to temporary files
import tempfile
import os

media_file_list = []
temp_files = []
temp_dir = tempfile.mkdtemp()

for filename, base64_data in media_files_b64.items():
    # Decode base64 back to bytes
    audio_bytes = base64.b64decode(base64_data)
    
    # Create a temporary file with the exact filename we want
    temp_path = os.path.join(temp_dir, filename)
    temp_files.append(temp_path)
    
    # Write audio data to temporary file
    with open(temp_path, 'wb') as temp_file:
        temp_file.write(audio_bytes)
    
    media_file_list.append(temp_path)

# Create the package
package = genanki.Package(deck, media_files=media_file_list)

# Generate the .apkg file in memory
output_buffer = io.BytesIO()
package.write_to_file(output_buffer)
output_buffer.seek(0)

# Clean up temporary files and directory after package creation is complete
for temp_path in temp_files:
    try:
        os.unlink(temp_path)
    except:
        pass  # Ignore cleanup errors

try:
    os.rmdir(temp_dir)
except:
    pass  # Ignore cleanup errors

# Return the bytes
apkg_bytes = output_buffer.getvalue()
`;

    try {
        await pyodide.runPythonAsync(pythonCode);
        const apkgBytes = pyodide.globals.get('apkg_bytes');

        // Convert Python bytes to JavaScript Uint8Array
        const apkgArray = new Uint8Array(apkgBytes.toJs());

        return apkgArray;
    } catch (error) {
        console.error('Error generating Anki deck:', error);
        throw new Error(`Failed to generate Anki deck: ${error}`);
    }
}

export function downloadAnkiDeck(apkgData: Uint8Array, filename: string): void {
    const blob = new Blob([apkgData], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.apkg`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
