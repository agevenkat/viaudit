export interface EngineResult {
  response:        string;
  brandMentioned:  boolean;
  citationPosition: number | null;
  sourceUrls:      string[];
}

export interface EngineQueryParams {
  prompt:    string;
  brandName: string;
}
