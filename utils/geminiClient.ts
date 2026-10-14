// Client-side helper that routes all Gemini requests to the server backend
// keeping API keys secure and avoiding browser CORS or permission errors.

export enum Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
}

export interface GenerateContentParams {
  model?: string;
  prompt?: string;
  systemInstruction?: string;
  files?: Array<{ mimeType: string; data: string }>;
  config?: {
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
  };
}

export async function generateContentServer(params: GenerateContentParams): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65000);

  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro na chamada do Gemini (Status ${res.status})`);
    }

    const data = await res.json();
    return data.text || '';
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tempo limite de processamento atingido. O servidor está operando com alta demanda no momento.');
    }
    throw err;
  }
}

export const aiClient = {
  models: {
    generateContent: async (options: {
      model?: string;
      contents: any[];
      config?: any;
    }) => {
      let prompt = '';
      const files: Array<{ mimeType: string; data: string }> = [];

      const contentsList = Array.isArray(options.contents) ? options.contents : [options.contents];
      for (const item of contentsList) {
        if (typeof item === 'string') {
          prompt += item + '\n';
        } else if (item?.parts && Array.isArray(item.parts)) {
          for (const p of item.parts) {
            if (p.text) prompt += p.text + '\n';
            if (p.inlineData) {
              files.push({
                mimeType: p.inlineData.mimeType,
                data: p.inlineData.data,
              });
            }
          }
        } else if (item?.inlineData) {
          files.push({
            mimeType: item.inlineData.mimeType,
            data: item.inlineData.data,
          });
        } else if (item?.text) {
          prompt += item.text + '\n';
        }
      }

      const textResult = await generateContentServer({
        model: options.model,
        prompt: prompt.trim(),
        files,
        config: options.config,
      });

      return {
        text: textResult,
      };
    },
  },
};

