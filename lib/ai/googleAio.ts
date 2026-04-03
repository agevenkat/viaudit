import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from './retry';
import { detectBrandMention, detectCitationPosition, extractUrls } from './parse';
import type { EngineResult, EngineQueryParams } from './types';
import { logger } from '@/lib/logger';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env['GOOGLE_AI_API_KEY'] ?? '');
  }
  return _genAI;
}

export async function queryGoogleAio(params: EngineQueryParams): Promise<EngineResult | null> {
  const { prompt, brandName } = params;

  return withRetry(async () => {
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction:
        'You are Google Search AI Overview. Provide a comprehensive answer with sources and citations. Include relevant product recommendations when asked about tools or services.',
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    if (!response) {
      logger.warn({ prompt }, 'googleAio: empty response');
      return { response: '', brandMentioned: false, citationPosition: null, sourceUrls: [] };
    }

    return {
      response,
      brandMentioned:   detectBrandMention(response, brandName),
      citationPosition: detectCitationPosition(response, brandName),
      sourceUrls:       extractUrls(response),
    };
  }, `googleAio:${prompt.slice(0, 40)}`);
}
