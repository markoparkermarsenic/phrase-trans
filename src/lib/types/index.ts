export interface AudioPhrase {
  phraseID: string;
  phraseStart: number;
  phraseEnd: number;
  complete: boolean;
  speed: number;
  color?: string;
  phraseName: string
}
