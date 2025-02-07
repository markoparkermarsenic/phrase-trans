export interface Project {
  id: string;
  name: string;
  created: number;
  lastModified: number;
  phraseIDs: string[];
  audioFileRefs: string[];
}

export interface AudioPhrase {
  phraseID: string;
  projectID: string;
  phraseStart: number;
  phraseEnd: number;
  complete: boolean;
  speed: number;
  color?: string;
  phraseName: string;
  filePath?: string;
  fileChecksum?: string;
  lastAccessed?: number;
}
