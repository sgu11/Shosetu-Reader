export interface TranslationRequest {
  sourceText: string;
  sourceLanguage: "ja";
  targetLanguage: "ko";
}

export interface TranslationResult {
  translatedText: string;
  provider: string;
  modelName: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface TranslationProvider {
  readonly provider: string;
  readonly modelName: string;
  translate(request: TranslationRequest): Promise<TranslationResult>;
}
