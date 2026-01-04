import { extractAudioSegments } from './audioExtraction';
import { generateAnkiDeck, downloadAnkiDeck } from './ankiGenerator';
import { getProjectPhrases } from '../stores/phrases';
import type { Project } from '../types';

export interface ExportProgress {
    stage: 'initializing' | 'extracting' | 'generating' | 'downloading' | 'complete' | 'error';
    message: string;
    progress: number; // 0-100
}

export type ProgressCallback = (progress: ExportProgress) => void;

export async function exportProjectToAnki(
    project: Project,
    onProgress?: ProgressCallback
): Promise<void> {
    try {
        onProgress?.({
            stage: 'initializing',
            message: 'Initializing export...',
            progress: 0
        });

        // Get all phrases for this project
        const phrases = getProjectPhrases(project.id);

        if (phrases.length === 0) {
            throw new Error('No phrases found in project');
        }

        onProgress?.({
            stage: 'extracting',
            message: 'Extracting audio segments...',
            progress: 20
        });

        // Extract audio segments
        const audioSegments = await extractAudioSegments(
            project.id,
            project.name,
            phrases
        );

        onProgress?.({
            stage: 'generating',
            message: 'Generating Anki deck...',
            progress: 60
        });

        // Generate Anki deck
        const apkgData = await generateAnkiDeck(project.name, audioSegments);

        onProgress?.({
            stage: 'downloading',
            message: 'Preparing download...',
            progress: 90
        });

        // Download the file
        const sanitizedName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadAnkiDeck(apkgData, sanitizedName);

        onProgress?.({
            stage: 'complete',
            message: 'Export completed successfully!',
            progress: 100
        });

    } catch (error) {
        console.error('Export failed:', error);
        onProgress?.({
            stage: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            progress: 0
        });
        throw error;
    }
}

export function validateProjectForExport(project: Project): string | null {
    const phrases = getProjectPhrases(project.id);

    if (phrases.length === 0) {
        return 'Project has no phrases to export';
    }

    // Check if any phrases have invalid timing
    const invalidPhrases = phrases.filter(p => p.phraseStart >= p.phraseEnd);
    if (invalidPhrases.length > 0) {
        return `${invalidPhrases.length} phrase(s) have invalid timing`;
    }

    return null; // Project is valid
}
