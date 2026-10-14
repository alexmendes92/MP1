import express from 'express';
import path from 'path';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { parseMandadoDocument } from './utils/mandadoParser';

const require = createRequire(import.meta.url);
let pdfjsLib: any = null;
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
} catch (e) {
  console.warn('[PDF] Aviso: Não foi possível carregar pdfjs-dist:', e);
}

// Extrai texto puro de um buffer de PDF de forma rápida e segura
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  if (!pdfjsLib) {
    return { text: '', numPages: 1 };
  }
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      verbosity: 0,
      isEvalSupported: false,
    });
    const doc = await loadingTask.promise;
    const numPages = doc.numPages || 1;
    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
      const pageObj = await doc.getPage(i);
      const textContent = await pageObj.getTextContent();
      const pageStrings = (textContent.items || [])
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0);
      fullText += `--- PÁGINA ${i} ---\n` + pageStrings.join(' ') + '\n\n';
    }
    return { text: fullText.trim(), numPages };
  } catch (err: any) {
    console.warn('[PDF] Erro ao extrair texto do PDF:', err?.message || err);
    return { text: '', numPages: 1 };
  }
}

// In-memory set of models currently experiencing quota limits (429)
const quotaCooldownMap = new Map<string, number>();

async function callGeminiWithFallback(params: {
  contents: any[];
  config?: any;
  preferredModel?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Approved, high-availability direct tier models for maximum speed
  const defaultModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  // Map legacy, experimental or quota-constrained aliases to valid, fast tier models
  const modelMap: Record<string, string> = {
    'gemini-3.8-flash': 'gemini-3.8-flash',
    'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
    'gemini-flash-latest': 'gemini-flash-latest',
    'gemini-3-flash-preview': 'gemini-3.8-flash',
    'gemini-3.7-flash': 'gemini-3.8-flash',
    'gemini-3.5-flash': 'gemini-3.8-flash',
    'gemini-3-pro-preview': 'gemini-3.8-flash',
    'gemini-3.1-pro-preview': 'gemini-3.8-flash',
    'gemini-flash-lite-latest': 'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite': 'gemini-3.1-flash-lite',
    'gemini-3.6-flash': 'gemini-3.8-flash',
    'gemini-pro-latest': 'gemini-3.8-flash',
    'gemini-flash': 'gemini-3.8-flash',
    'gemini-pro': 'gemini-3.8-flash',
  };

  const rawPreferred = params.preferredModel?.trim();
  const normalizedPreferred = rawPreferred ? (modelMap[rawPreferred] || rawPreferred) : null;

  // Prepara configuração otimizada: desativa thinking desnecessário para respostas imediatas (ultra-rápido)
  const callConfig = { ...(params.config || {}) };
  if (callConfig.thinkingConfig === undefined) {
    callConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
  }

  // Filter out candidate models that hit quota within the last 60 seconds
  const now = Date.now();
  const allCandidates = Array.from(
    new Set([normalizedPreferred, ...defaultModels].filter(Boolean) as string[])
  );

  const candidateModels = allCandidates.filter(m => {
    const cooldownUntil = quotaCooldownMap.get(m);
    return !cooldownUntil || cooldownUntil < now;
  });

  // If all candidates are in cooldown, use all candidates anyway
  const finalCandidates = candidateModels.length > 0 ? candidateModels : allCandidates;

  let lastError: any = null;
  for (const model of finalCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // 18-second individual timeout per model to allow swift failover
        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: callConfig,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout de processamento excedido no modelo ${model}`)), 18000)
          ),
        ]);

        if (response && (response.text !== undefined || response.candidates)) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);

        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
          // Place model on 60-second cooldown so subsequent calls don't re-trigger 429
          quotaCooldownMap.set(model, Date.now() + 60000);
          break; // Try next model immediately
        }

        if ((errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) && attempt === 0) {
          // Wait 1.5s for brief 503 spike to clear before retrying this model
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        // Try next candidate model seamlessly
        break;
      }
    }
  }

  console.error('[Gemini] Todos os modelos alternativos falharam. Último erro:', lastError?.message || lastError);
  throw lastError || new Error('Não foi possível obter resposta dos modelos Gemini.');
}

function formatGeminiErrorMessage(error: any): string {
  const msg = String(error?.message || error || '');
  if (msg.includes('Timeout') || msg.includes('tempo limite') || msg.includes('timeout')) {
    return 'O processamento demorou mais que o esperado. Por favor, tente novamente com um trecho menor ou repita a solicitação.';
  }
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
    return 'Os servidores de inteligência artificial do Google estão com alta demanda temporária. Por favor, tente novamente em instantes.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Limite momentâneo de requisições atingido. Por favor, aguarde alguns segundos e tente novamente.';
  }
  return error?.message || 'Erro no processamento com Gemini';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check endpoint for container / dev-server readiness
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(express.json({ limit: '20mb' }));

  // Endpoint dedicado de alta performance para extração direta de texto de arquivos PDF
  app.post('/api/pdf/extract-text', async (req, res) => {
    try {
      const { fileBase64, fileName } = req.body;
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'Buffer Base64 do PDF não fornecido' });
      }

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const { text, numPages } = await extractTextFromPdfBuffer(buffer);

      return res.json({
        success: true,
        fileName: fileName || 'documento.pdf',
        numPages,
        text,
        hasTextLayer: Boolean(text && text.trim().length > 20),
      });
    } catch (error: any) {
      console.error('Erro em /api/pdf/extract-text:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Falha ao processar arquivo PDF',
      });
    }
  });

  // Endpoint 1: Extração estruturada de dados de pessoa (NI / Qualificação com suporte a texto, imagem e PDF)
  app.post('/api/gemini/parse-person', async (req, res) => {
    try {
      const { text, imageBase64, mimeType } = req.body;
      let effectiveText = (text && typeof text === 'string') ? text.trim() : '';
      const hasImage = Boolean(imageBase64 && typeof imageBase64 === 'string');

      if (!effectiveText && !hasImage) {
        return res.status(400).json({ error: 'Texto, imagem ou PDF não fornecido para extração' });
      }

      // Se for PDF, extrai a camada de texto nativa com pdfjs-dist
      if (hasImage && (mimeType === 'application/pdf' || mimeType?.includes('pdf'))) {
        const cleanPdfBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        try {
          const pdfResult = await extractTextFromPdfBuffer(Buffer.from(cleanPdfBase64, 'base64'));
          if (pdfResult.text) {
            effectiveText = effectiveText ? `${effectiveText}\n\n${pdfResult.text}` : pdfResult.text;
          }
        } catch (pdfErr) {
          console.warn('Falha na extração de texto do PDF em parse-person:', pdfErr);
        }
      }

      // Fast-path especializado para Mandado de Intimação (garante que a Pessoa a ser intimada, ex: BRUNA, seja extraída, e JAMAIS o Réu do cabeçalho)
      if (effectiveText && /\b(?:mandado\s+de\s+intima[çc]|pessoa\s+a\s+ser\s+(?:intimada|notificada|citada)|intimand[oa]|manda\s+a\s+qualquer\s+oficial|mandado\s*n[ºo]?)\b/i.test(effectiveText)) {
        const mandadoRes = parseMandadoDocument(effectiveText);
        if (mandadoRes && mandadoRes.partes && mandadoRes.partes.length > 0) {
          const primary = mandadoRes.partes[0];
          return res.json({
            success: true,
            data: {
              nome: primary.nome,
              cpf: primary.cpf,
              rg: primary.rg,
              dataNascimento: primary.dataNascimento,
              nacionalidade: primary.nacionalidade || 'Brasileira',
              folha: primary.folha || mandadoRes.folha || '01',
              pai: primary.pai || '',
              mae: primary.mae || '',
              numeroProcesso: mandadoRes.numeroProcesso || '',
              cargo: mandadoRes.cargo || '',
              promotor: mandadoRes.promotor || '',
              dataAudiencia: mandadoRes.dataAudiencia || '',
              urgente: mandadoRes.urgente || false,
            },
          });
        }
      }

      // Parser heurístico prévio para extração imediata e garantia contra falhas
      const localBoletim = effectiveText ? parseBoletimHelper(effectiveText) : null;

      // Fast-path instantâneo (0ms de latência): se não há imagem e o parser local já extraiu os dados com certeza
      if (!hasImage && localBoletim && localBoletim.nome && (localBoletim.cpf || localBoletim.rg)) {
        return res.json({
          success: true,
          data: {
            nome: localBoletim.nome,
            cpf: localBoletim.cpf,
            rg: localBoletim.rg,
            dataNascimento: localBoletim.dataNascimento,
            nacionalidade: localBoletim.nacionalidade || 'Brasileiro',
            folha: localBoletim.folha || '01',
            pai: localBoletim.pai || '',
            mae: localBoletim.mae || '',
            numeroProcesso: localBoletim.numeroProcesso || '',
            cargo: localBoletim.cargo || '',
            promotor: localBoletim.promotor || '',
            dataAudiencia: localBoletim.dataAudiencia || '',
            urgente: localBoletim.urgente || false,
          },
        });
      }

      const prompt = `Você é um assistente de documentação jurídica do Ministério Público do Estado de São Paulo (MPSP).
Sua tarefa é analisar cuidadosamente as informações fornecidas (texto e/ou imagem/print/captura de tela de Boletim de Ocorrência da Polícia Civil, Cédula de Identidade RG, CNH, Mandado, Denúncia ou Autos Processuais) e extrair os dados da pessoa / investigado / réu / vítima para qualificação cadastral na pesquisa de antecedentes (Folha de Antecedentes Criminais / SIS-NI).

ATENÇÃO RIGOROSA AOS FORMATOS:
- SE FOR MANDADO DE INTIMAÇÃO (TJSP): Extraia rigorosamente os dados da PESSOA A SER INTIMADA / VÍTIMA / INTIMANDO (ex: BRUNA RODRIGUES DÔDÔ), que possui qualificação completa (RG, CPF, Filiação) no corpo do mandado. NUNCA extraia o Réu citado no cabeçalho do processo (ex: 'Réu: JAILTON...') quando a intimação for direcionada a outra pessoa!

ATENÇÃO RIGOROSA AOS FORMATOS DO BOLETIM DE OCORRÊNCIA (RDO / DELEGACIA / PLANTÃO):
- O nome da parte vem após "Nome:" (ex: "Nome: GABRIELA FIGUEIREDO FERNANDES").
- O CPF pode vir com quebra de linha após o rótulo "CPF:" (ex: "CPF:\n40527706841" ou "CPF: 405.277.068-41").
- O RG pode vir acompanhado de UF (ex: "49395483 - SP" -> extraia apenas o número "49395483").
- Nacionalidade "Brasil" deve ser convertida para "Brasileira" ou "Brasileiro" (se Sexo: Feminino, retorne "Brasileira").
- A data de nascimento está em "Nascimento:" no formato DD/MM/AAAA.
- Se houver número de folhas nos autos (ex: "fls. 01"), capture no campo folha.

${effectiveText ? `Texto fornecido:\n"""\n${effectiveText.slice(0, 10000)}\n"""` : ''}
${hasImage && mimeType !== 'application/pdf' ? `Uma imagem ou captura de documento foi anexada/colada. Realize OCR visual minucioso para identificar nome, filiação (pai/mãe), data de nascimento, RG, CPF e folha dos autos.` : ''}

Retorne estritamente um JSON com os campos:
- nome: Nome completo da parte (em regra é o primeiro nome. NUNCA inclua no nome itens para ignorar como FONE, CEP, COR, NATURAL DE, ENDEREÇO, ESTADO)
- folha: Número de folhas mencionado nos autos (padrões: Fls##, Fl#, Folhas##, Folhas (numero), ex: "01", "12")
- nacionalidade: Nacionalidade (ex: "Brasileiro", "Brasileira")
- cpf: Número do CPF se presente (apenas números ou formatado 000.000.000-00)
- rg: Número do RG / Documento de Identidade (sem a UF)
- pai: Nome completo do pai (se presente)
- mae: Nome completo da mãe (se presente)
- dataNascimento: Data de nascimento (formato DD/MM/AAAA)
- numeroProcesso: Número dos autos no formato CNJ / TJSP 8.26 (ex: "1519377-68.2026.8.26.0454") se presente no documento/texto
- cargo: Cargo ministerial se mencionado (C.71 / Cargo 71 -> "71º Promotor de Justiça"; C.79 / Cargo 79 -> "79º Promotor de Justiça")
- promotor: Nome do Promotor (Cargo 79 -> "Margareth Ferraz França"; Cargo 71 -> "Leonardo D'Angelo Vargas Pereira")
- dataAudiencia: Data e horário de audiência se designada ("AUDIÊNCIA", "Audiência Virtual de Instrução, Debates e Julgamento", ex: "09/11/2026 às 13:15h" ou "19/10/2026")
- urgente: true se a audiência for nos próximos 30 dias (≤ 30 dias) ou réu preso, senão false`;

      const parts: any[] = [];
      if (hasImage && mimeType !== 'application/pdf') {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: prompt });

      let parsed: any = {};
      try {
        const response = await callGeminiWithFallback({
          contents: [{ parts }],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                folha: { type: Type.STRING },
                nacionalidade: { type: Type.STRING },
                cpf: { type: Type.STRING },
                rg: { type: Type.STRING },
                pai: { type: Type.STRING },
                mae: { type: Type.STRING },
                dataNascimento: { type: Type.STRING },
                numeroProcesso: { type: Type.STRING },
                cargo: { type: Type.STRING },
                promotor: { type: Type.STRING },
                dataAudiencia: { type: Type.STRING },
                urgente: { type: Type.BOOLEAN },
              },
              required: ['nome'],
            },
          },
        });

        parsed = JSON.parse(response.text || '{}');
      } catch (aiErr: any) {
        console.warn('Falha no Gemini em parse-person, utilizando extração heurística estruturada:', aiErr?.message);
        if (localBoletim && localBoletim.nome) {
          parsed = {
            nome: localBoletim.nome,
            cpf: localBoletim.cpf,
            rg: localBoletim.rg,
            dataNascimento: localBoletim.dataNascimento,
            nacionalidade: localBoletim.nacionalidade,
            folha: localBoletim.folha || '01',
            pai: '',
            mae: ''
          };
        } else {
          throw aiErr;
        }
      }

      // Combina com o parser local para preencher lacunas deixadas pela IA
      if (localBoletim) {
        if (!parsed.cpf && localBoletim.cpf) parsed.cpf = localBoletim.cpf;
        if (!parsed.rg && localBoletim.rg) parsed.rg = localBoletim.rg;
        if (!parsed.dataNascimento && localBoletim.dataNascimento) parsed.dataNascimento = localBoletim.dataNascimento;
        if ((!parsed.nome || parsed.nome.length < 3) && localBoletim.nome) parsed.nome = localBoletim.nome;
      }

      // Extração determinística complementar do processo / cargo / audiência a partir do texto
      if (effectiveText) {
        if (!parsed.numeroProcesso) {
          const procMatch = effectiveText.match(/\b(\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4})\b/);
          if (procMatch) parsed.numeroProcesso = procMatch[1];
        }
        if (!parsed.cargo) {
          if (/\b(?:C\.?\s*71\b|C71\b|CARGO\s*71\.?|CARGO\s*71\b)/i.test(effectiveText) || /\b19[ªºaA]?\s*Vara\s*Criminal\b/i.test(effectiveText) || /Leonardo\s+D['’]Angelo/i.test(effectiveText)) {
            parsed.cargo = '71º Promotor de Justiça';
            parsed.promotor = "Leonardo D'Angelo Vargas Pereira";
          } else if (/\b(?:C\.?\s*79\b|C79\b|CARGO\s*79\.?|CARGO\s*79\b)/i.test(effectiveText) || /\b16[ªºaA]?\s*Vara\s*Criminal\b/i.test(effectiveText) || /Margareth(?:\s+Ferraz)?/i.test(effectiveText)) {
            parsed.cargo = '79º Promotor de Justiça';
            parsed.promotor = 'Margareth Ferraz França';
          }
        }
        if (!parsed.dataAudiencia) {
          const audMatch = effectiveText.match(/(?:audi[êe]ncia|no dia|designada\s+para)[^\d\n\r]{0,90}?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i);
          if (audMatch) {
            parsed.dataAudiencia = audMatch[1].replace(/[-.]/g, '/');
          }
        } else if (parsed.dataAudiencia) {
          // Garante que não inclui horário (estritamente DD/MM/AAAA)
          const dateOnly = parsed.dataAudiencia.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/);
          if (dateOnly) {
            parsed.dataAudiencia = dateOnly[1].replace(/[-.]/g, '/');
          }
        }
      }

      return res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error('Erro em /api/gemini/parse-person:', error?.message);
      return res.status(500).json({
        error: formatGeminiErrorMessage(error),
        fallback: true,
      });
    }
  });

  // Endpoint 1M: Extração especializada de Mandado de Intimação (suporte a 1 ou mais partes, Vara/Cargo e audiência)
  app.post('/api/gemini/parse-mandado', async (req, res) => {
    try {
      const { text, fileBase64, fileName } = req.body;
      let effectiveText = (text && typeof text === 'string') ? text.trim() : '';

      if (fileBase64 && typeof fileBase64 === 'string') {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        try {
          const pdfResult = await extractTextFromPdfBuffer(Buffer.from(cleanBase64, 'base64'));
          if (pdfResult.text) {
            effectiveText = effectiveText ? `${effectiveText}\n\n${pdfResult.text}` : pdfResult.text;
          }
        } catch (pdfErr) {
          console.warn('Erro ao extrair PDF em parse-mandado:', pdfErr);
        }
      }

      if (!effectiveText) {
        return res.status(400).json({ error: 'Texto ou arquivo PDF do mandado não fornecido' });
      }

      // 1. Extração determinística local imediata (100% aderente às regras de Vara/Cargo/Data/Fls)
      const localParsed = parseMandadoDocument(effectiveText, fileName);

      // 2. Enriquecimento complementar via Gemini se API disponível
      let geminiData: any = null;
      if (process.env.GEMINI_API_KEY) {
        try {
          const prompt = `Você é um analista jurídico do Ministério Público de São Paulo (MPSP).
Analise o Mandado de Intimação (TJSP) e extraia rigorosamente os dados:
- numeroProcesso: Número dos autos no formato 0000000-00.0000.8.26.0000
- vara: Vara judicial (ex: "19ª Vara Criminal", "16ª Vara Criminal")
- cargo: Se Vara for 19ª Vara Criminal, o cargo é "71º Promotor de Justiça" (promotor: "Leonardo D'Angelo Vargas Pereira"). Se 16ª Vara Criminal, o cargo é "79º Promotor de Justiça" (promotor: "Margareth Ferraz França").
- dataAudiencia: Data da audiência APENAS no formato DD/MM/AAAA. NUNCA inclua o horário (descarte horas e minutos).
- folha: Número de folhas mencionado nos autos (ex: "164")
- partes: Lista com todas as partes a serem intimadas e réus/vítimas mencionados. Para cada parte:
  * nome: Nome completo em MAIÚSCULAS
  * tipoParte: "Vítima", "Investigado", "Representante da Vítima" ou "Outros"
  * cpf: CPF formatado
  * rg: RG sem UF
  * pai: Nome do pai se presente
  * mae: Nome da mãe se presente
  * dataNascimento: Data no formato DD/MM/AAAA
  * nacionalidade: "Brasileiro" ou "Brasileira"
  * folha: Número de folhas
  * endereco: Endereço completo se houver
  * isPrimary: true para a pessoa que é o alvo principal da intimação no mandado

Texto do Mandado:
"""
${effectiveText.slice(0, 15000)}
"""`;

          const response = await callGeminiWithFallback({
            contents: [{ parts: [{ text: prompt }] }],
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  numeroProcesso: { type: Type.STRING },
                  vara: { type: Type.STRING },
                  cargo: { type: Type.STRING },
                  promotor: { type: Type.STRING },
                  dataAudiencia: { type: Type.STRING },
                  folha: { type: Type.STRING },
                  partes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nome: { type: Type.STRING },
                        tipoParte: { type: Type.STRING },
                        cpf: { type: Type.STRING },
                        rg: { type: Type.STRING },
                        pai: { type: Type.STRING },
                        mae: { type: Type.STRING },
                        dataNascimento: { type: Type.STRING },
                        nacionalidade: { type: Type.STRING },
                        folha: { type: Type.STRING },
                        endereco: { type: Type.STRING },
                        isPrimary: { type: Type.BOOLEAN },
                      },
                      required: ['nome'],
                    },
                  },
                },
              },
            },
          });

          if (response.text) {
            geminiData = JSON.parse(response.text);
          }
        } catch (geminiErr: any) {
          console.warn('Gemini falhou em parse-mandado, usando extração heurística:', geminiErr?.message);
        }
      }

      // Merge: localParsed tem prioridade nas regras estritas solicitadas pelo usuário
      const finalResult = { ...localParsed };

      if (geminiData) {
        if (!finalResult.numeroProcesso && geminiData.numeroProcesso) {
          finalResult.numeroProcesso = geminiData.numeroProcesso;
        }
        if (!finalResult.vara && geminiData.vara) {
          finalResult.vara = geminiData.vara;
        }
        if (!finalResult.cargo && geminiData.cargo) {
          finalResult.cargo = geminiData.cargo;
          finalResult.promotor = geminiData.promotor;
        }
        if (!finalResult.dataAudiencia && geminiData.dataAudiencia) {
          const dOnly = geminiData.dataAudiencia.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/);
          if (dOnly) finalResult.dataAudiencia = dOnly[1].replace(/[-.]/g, '/');
        }
        if ((!finalResult.folha || finalResult.folha === '01') && geminiData.folha) {
          finalResult.folha = geminiData.folha;
        }

        if (Array.isArray(geminiData.partes) && geminiData.partes.length > 0) {
          finalResult.partes.forEach(localP => {
            const gPart = geminiData.partes.find((gp: any) => 
              gp.nome && localP.nome && (gp.nome.includes(localP.nome) || localP.nome.includes(gp.nome))
            );
            if (gPart) {
              if (!localP.cpf && gPart.cpf) localP.cpf = gPart.cpf;
              if (!localP.rg && gPart.rg) localP.rg = gPart.rg;
              if (!localP.pai && gPart.pai) localP.pai = gPart.pai;
              if (!localP.mae && gPart.mae) localP.mae = gPart.mae;
              if (!localP.dataNascimento && gPart.dataNascimento) localP.dataNascimento = gPart.dataNascimento;
              if (!localP.endereco && gPart.endereco) localP.endereco = gPart.endereco;
            }
          });

          if (finalResult.partes.length === 0) {
            finalResult.partes = geminiData.partes.map((gp: any, idx: number) => ({
              id: `p-${idx + 1}`,
              nome: gp.nome.toUpperCase(),
              folha: gp.folha || finalResult.folha || '01',
              cpf: gp.cpf || '',
              rg: gp.rg || '',
              pai: gp.pai || '',
              mae: gp.mae || '',
              dataNascimento: gp.dataNascimento || '',
              nacionalidade: gp.nacionalidade || 'Brasileiro',
              tipoParte: gp.tipoParte || 'Vítima',
              endereco: gp.endereco || '',
              isSelected: true,
              isPrimary: gp.isPrimary ?? (idx === 0),
            }));
          }
        }
      }

      // Regra obrigatória: Vara 19 = Cargo 71, Vara 16 = Cargo 79
      if (/\b19[ªºaA]?\s*Vara\s*Criminal\b/i.test(finalResult.vara || effectiveText)) {
        finalResult.vara = '19ª Vara Criminal';
        finalResult.cargo = '71º Promotor de Justiça';
        finalResult.promotor = "Leonardo D'Angelo Vargas Pereira";
        finalResult.cargoNumber = 71;
      } else if (/\b16[ªºaA]?\s*Vara\s*Criminal\b/i.test(finalResult.vara || effectiveText)) {
        finalResult.vara = '16ª Vara Criminal';
        finalResult.cargo = '79º Promotor de Justiça';
        finalResult.promotor = 'Margareth Ferraz França';
        finalResult.cargoNumber = 79;
      }

      // Regra obrigatória: Data de Audiência estritamente DD/MM/AAAA sem horário
      if (finalResult.dataAudiencia) {
        const dM = finalResult.dataAudiencia.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
        if (dM) {
          finalResult.dataAudiencia = `${dM[1].padStart(2, '0')}/${dM[2].padStart(2, '0')}/${dM[3]}`;
        }
      }

      return res.json({ success: true, data: finalResult });
    } catch (err: any) {
      console.error('Erro em /api/gemini/parse-mandado:', err);
      return res.status(500).json({ error: err?.message || 'Falha ao processar mandado de intimação' });
    }
  });

  // Função auxiliar para extração robusta de Boletim de Ocorrência (Polícia Civil de SP / RDO / Plantão)
  function parseBoletimHelper(rawText: string) {
    const text = (rawText || '').replace(/\r/g, '');
    const result: Record<string, string> = {
      nome: '',
      tipoParte: 'Vítima',
      cpf: '',
      rg: '',
      dataNascimento: '',
      nacionalidade: 'Brasileiro',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '',
      telefone: '',
      email: '',
      folha: '01',
    };

    // 1. Tipo da Parte
    if (/^\s*(?:v[íi]tima|ofendido)\b/im.test(text) || /\b(?:qualifica[çc][ãa]o da v[íi]tima)\b/i.test(text)) {
      result.tipoParte = 'Vítima';
    } else if (/^\s*(?:investigado|indiciado|autor|r[ée]u|autor dos fatos|averiguado)\b/im.test(text)) {
      result.tipoParte = 'Investigado';
    } else if (/^\s*(?:representante|advogado|testemunha)\b/im.test(text)) {
      result.tipoParte = 'Representante da Vítima';
    }

    // 2. Nome
    const intimadaMatch = text.match(/(?:Pessoa\s+a\s+ser\s+(?:intimada|notificada|citada)|Intimand[oa](?:\(a\))?|Destinat[áa]rio(?:\(a\))?)[:\s]*([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:[.,;\n\r]|CPF|RG|Nasc|Filia[çc]|Endere[çc]|Nacionalidade|$))/i);
    const nomeMatch = intimadaMatch ||
                      text.match(/(?:Nome|Nome completo|Indiciado|V[íi]tima|Qualificado\(a\)):\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:[.,;\n\r]|CPF|RG|Nasc|Filia[çc]|Endere[çc]|Nacionalidade|$))/i) ||
                      text.match(/Nome:\s*([^\n\r,;.]+)/i);
    if (nomeMatch) {
      result.nome = nomeMatch[1].trim().toUpperCase();
    }

    // 3. RG
    const rgMatch = text.match(/RG:\s*([0-9A-Za-z.\s/-]+?)(?=\s*(?:[.,;\n\r]|CPF|Nasc|Exibiu|Natural|Nacionalidade|$))/i) ||
                    text.match(/RG:\s*([0-9A-Za-z.\s/-]+?)(?:,|- SP|Exibiu|CPF|Natural|Nacionalidade|\n|$)/i);
    if (rgMatch) {
      result.rg = rgMatch[1].trim();
    }

    // 4. CPF (com suporte a quebra de linha após "CPF:")
    const cpfMatch = text.match(/CPF:\s*([\d.-]{11,14})/i) || text.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/);
    if (cpfMatch) {
      const rawCpf = cpfMatch[1].replace(/\D/g, '');
      if (rawCpf.length === 11) {
        result.cpf = `${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}`;
      } else {
        result.cpf = cpfMatch[1].trim();
      }
    }

    // 5. Data de Nascimento
    const nascMatch = text.match(/(?:Nascimento|Data de Nasc(?:imento)?):\s*(\d{2}\/\d{2}\/\d{4})/i) ||
                      text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (nascMatch) {
      result.dataNascimento = nascMatch[1].trim();
    }

    // 6. Nacionalidade
    const nacMatch = text.match(/Nacionalidade:\s*([^\n\r,;]+)/i);
    if (nacMatch) {
      const nac = nacMatch[1].trim();
      result.nacionalidade = nac.toLowerCase() === 'brasil' ? 'Brasileiro' : nac;
    }

    // 7. Endereço estruturado
    const endMatch = text.match(/(?:Endere[çc]os?|Endere[çc]o):\s*(?:Residencial|Comercial)?:\s*([^\n\r]+)/i);
    if (endMatch) {
      const fullEnd = endMatch[1].trim();

      // CEP
      const cepMatch = fullEnd.match(/CEP:?\s*(\d{8}|\d{5}-?\d{3})/i) || text.match(/CEP:?\s*(\d{8}|\d{5}-?\d{3})/i);
      if (cepMatch) {
        const rawCep = cepMatch[1].replace(/\D/g, '');
        if (rawCep.length === 8) {
          result.cep = `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}`;
        } else {
          result.cep = cepMatch[1].trim();
        }
      }

      // Cidade e UF no final: "- S.PAULO - SP" ou "- São Paulo - SP"
      const cidUfMatch = fullEnd.match(/(?:-\s*|\s+)([A-Za-zÀ-ÿ.\s]+?)\s*-\s*([A-Z]{2})\s*$/);
      if (cidUfMatch) {
        let cid = cidUfMatch[1].trim().replace(/^-\s*/, '');
        if (cid.toUpperCase() === 'S.PAULO' || cid.toUpperCase() === 'SÃO PAULO') {
          cid = 'São Paulo';
        }
        result.cidade = cid;
        result.uf = cidUfMatch[2].trim().toUpperCase();
      }

      // Isola a parte do endereço removendo sufixos de CEP e Cidade-UF
      let prefix = fullEnd;
      prefix = prefix.replace(/,\s*CEP\s*[\d.-]+\s*-\s*[A-Za-zÀ-ÿ.\s]+-\s*[A-Z]{2}\s*$/i, '');
      prefix = prefix.replace(/\s*CEP\s*[\d.-]+\s*-\s*[A-Za-zÀ-ÿ.\s]+-\s*[A-Z]{2}\s*$/i, '');
      prefix = prefix.replace(/\s*-\s*[A-Za-zÀ-ÿ.\s]+-\s*[A-Z]{2}\s*$/i, '');

      // Logradouro e Número
      const logrMatch = prefix.match(/^([A-Za-zÀ-ÿ0-9.\s]+?),\s*(\d+|s\/nº?|sn|S\/N)\b/i);
      if (logrMatch) {
        result.endereco = logrMatch[1].trim();
        result.numero = logrMatch[2].trim();

        const remainder = prefix.slice(logrMatch[0].length).replace(/^,\s*/, '').trim();
        if (remainder) {
          if (remainder.startsWith('-')) {
            result.bairro = remainder.replace(/^-\s*/, '').trim();
          } else if (remainder.includes('-')) {
            const parts = remainder.split('-');
            result.complemento = parts[0].trim();
            result.bairro = parts.slice(1).join('-').trim();
          } else {
            if (/^(apto|apartamento|bloco|casa|fundos|conjunto|cj|sala)/i.test(remainder)) {
              result.complemento = remainder.trim();
            } else {
              result.bairro = remainder.trim();
            }
          }
        }
      } else {
        result.endereco = prefix.trim();
      }
    }

    // 8. Contato / Celular / Telefone
    const telMatch = text.match(/(?:Contato|Celular|Telefone|WhatsApp|Fone):\s*(?:Celular:\s*|Telefone:\s*)?\(?(\d{2})\)?\s*(\d{4,5})[-.\s]?(\d{4})/i) ||
                     text.match(/\(?(\d{2})\)?\s*(\d{4,5})[-.\s]?(\d{4})/);
    if (telMatch) {
      const ddd = telMatch[1];
      const p1 = telMatch[2];
      const p2 = telMatch[3];
      result.telefone = `(${ddd}) ${p1}-${p2}`;
    }

    // 9. E-mail
    const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/);
    if (emailMatch) {
      result.email = emailMatch[1].trim().toLowerCase();
    }

    // 10. Fls
    const flsMatch = text.match(/(?:fls?\.?|folhas?)\s*(\d+)/i);
    if (flsMatch) {
      result.folha = flsMatch[1];
    }

    // 11. Processo TJSP (8.26)
    const procMatch = text.match(/\b(\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4})\b/);
    if (procMatch) {
      result.numeroProcesso = procMatch[1];
    }

    // 12. Cargo / Promotor
    if (/\b(?:C\.?\s*79\b|C79\b|CARGO\s*79\.?|CARGO\s*79\b)/i.test(text) || /Margareth(?:\s+Ferraz)?/i.test(text)) {
      result.cargo = '79º Promotor de Justiça';
      result.promotor = 'Margareth Ferraz França';
    } else if (/\b(?:C\.?\s*71\b|C71\b|CARGO\s*71\.?|CARGO\s*71\b)/i.test(text) || /Leonardo\s+D['’]Angelo/i.test(text)) {
      result.cargo = '71º Promotor de Justiça';
      result.promotor = "Leonardo D'Angelo Vargas Pereira";
    }

    // 13. Data de Audiência e Urgência
    const audMatch = text.match(/(?:audi[êe]ncia(?:\s+virtual)?(?:\s+de\s+instru[çc][ãa]o(?:,?\s*debates)?(?:\s*e\s*julgamento)?)?)[^\d\n\r]{0,90}?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}(?:\s*(?:[àa]s|as)\s*\d{1,2}[:h]\d{2}(?:h)?)?)/i);
    if (audMatch) {
      result.dataAudiencia = audMatch[1].trim();
      const dateOnly = result.dataAudiencia.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
      if (dateOnly) {
        const d = parseInt(dateOnly[1], 10);
        const m = parseInt(dateOnly[2], 10) - 1;
        const y = parseInt(dateOnly[3], 10);
        const target = new Date(y, m, d);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        result.urgente = (diffDays >= 0 && diffDays <= 30) || /r[ée]u preso/i.test(text);
      }
    }

    return result;
  }

  // Endpoint 1B: Extração especializada de Parte / Vítima / Investigado (com suporte nativo a BO da Polícia Civil)
  app.post('/api/gemini/parse-party', async (req, res) => {
    try {
      const { text, imageBase64, mimeType } = req.body;
      let effectiveText = (text && typeof text === 'string') ? text.trim() : '';
      const hasImage = Boolean(imageBase64 && typeof imageBase64 === 'string');

      if (!effectiveText && !hasImage) {
        return res.status(400).json({ error: 'Texto ou imagem/PDF não fornecido para extração' });
      }

      // Se foi enviado um arquivo PDF, extrai a camada de texto nativa imediatamente
      if (hasImage && (mimeType === 'application/pdf' || mimeType?.includes('pdf'))) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        const pdfResult = await extractTextFromPdfBuffer(Buffer.from(cleanBase64, 'base64'));
        if (pdfResult.text) {
          effectiveText = effectiveText ? `${effectiveText}\n\n${pdfResult.text}` : pdfResult.text;
        }
      }

      // Executa o parser local especializado sobre o texto disponível
      const localResult = effectiveText ? parseBoletimHelper(effectiveText) : {};

      // Fast-path instantâneo (0ms de latência): se não há imagem e o parser local já extraiu os dados essenciais
      if (!hasImage && localResult.nome && (localResult.cpf || localResult.endereco)) {
        return res.json({ success: true, data: localResult });
      }

      const parts: any[] = [];
      // Anexa binário apenas se for imagem pura ou se o PDF não possuía camada de texto
      if (hasImage && (mimeType !== 'application/pdf' || !effectiveText)) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }

      const prompt = `Você é um assistente especialista do Ministério Público do Estado de São Paulo (MPSP) para qualificação de partes em autos criminais e notificações de arquivamento.
Analise detalhadamente as informações fornecidas (texto e/ou documento de Boletim de Ocorrência da Polícia Civil do Estado de SP - RDO / Plantão, Termo de Oitiva, Qualificação Policial ou Autos Processuais).
${effectiveText ? `\nTexto transcrito do documento:\n"""\n${effectiveText.slice(0, 10000)}\n"""\n` : ''}

Extraia e estruture com máxima precisão os campos da pessoa:
- nome: Nome completo em CAIXA ALTA (ex: "GABRIELA FIGUEIREDO FERNANDES")
- tipoParte: "Vítima", "Investigado" ou "Representante da Vítima" (baseado no cabeçalho ou papel exercido)
- folha: Número de fls. mencionadas (ex: "01", "12")
- cpf: CPF formatado 000.000.000-00 (ou somente números)
- rg: Número de RG completo
- dataNascimento: Data no formato DD/MM/AAAA
- nacionalidade: Nacionalidade (ex: "Brasileiro" ou "Brasileira")
- endereco: Apenas o Logradouro/Rua/Avenida (ex: "Rua Jean Aubert" - NÃO inclua número, bairro ou CEP aqui)
- numero: Número do imóvel (ex: "103" ou "s/n")
- complemento: Complemento do imóvel se houver (ex: "Apto 12", "Bloco B")
- bairro: Nome do bairro (ex: "Vila Praia")
- cidade: Nome da cidade (ex: "São Paulo")
- uf: Sigla do Estado em duas letras (ex: "SP")
- cep: CEP no formato 00000-000
- telefone: Telefone ou Celular com DDD formatado (ex: "(11) 95443-9797")
- email: Endereço de e-mail se existente`;

      parts.push({ text: prompt });

      let aiResult: any = {};
      try {
        const response = await callGeminiWithFallback({
          contents: [{ parts }],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                tipoParte: { type: Type.STRING, enum: ['Vítima', 'Investigado', 'Representante da Vítima'] },
                folha: { type: Type.STRING },
                cpf: { type: Type.STRING },
                rg: { type: Type.STRING },
                dataNascimento: { type: Type.STRING },
                nacionalidade: { type: Type.STRING },
                endereco: { type: Type.STRING },
                numero: { type: Type.STRING },
                complemento: { type: Type.STRING },
                bairro: { type: Type.STRING },
                cidade: { type: Type.STRING },
                uf: { type: Type.STRING },
                cep: { type: Type.STRING },
                telefone: { type: Type.STRING },
                email: { type: Type.STRING },
              },
              required: ['nome'],
            },
          },
        });
        aiResult = JSON.parse(response.text || '{}');
      } catch (err: any) {
        console.warn('Aviso: Falha na IA em /api/gemini/parse-party, usando fallback local:', err?.message);
      }

      // Mescla o resultado local com o resultado da IA
      const finalResult: Record<string, string> = {
        ...localResult,
        ...Object.fromEntries(
          Object.entries(aiResult).filter(([_, v]) => v !== undefined && v !== null && String(v).trim().length > 0)
        ),
      };

      // Garante formatação correta de CEP e CPF
      if (finalResult.cep && /^\d{8}$/.test(finalResult.cep)) {
        finalResult.cep = `${finalResult.cep.slice(0, 5)}-${finalResult.cep.slice(5, 8)}`;
      }
      if (finalResult.cpf && /^\d{11}$/.test(finalResult.cpf)) {
        finalResult.cpf = `${finalResult.cpf.slice(0, 3)}.${finalResult.cpf.slice(3, 6)}.${finalResult.cpf.slice(6, 9)}-${finalResult.cpf.slice(9, 11)}`;
      }

      return res.json({ success: true, data: finalResult });
    } catch (error: any) {
      console.error('Erro em /api/gemini/parse-party:', error?.message);
      return res.status(500).json({ error: formatGeminiErrorMessage(error) });
    }
  });

  // Endpoint 2: Geração de texto genérica (Ofícios, Cotas, Notificações, etc.)
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { model, prompt, systemInstruction, files, config } = req.body;
      if (!prompt && (!files || files.length === 0)) {
        return res.status(400).json({ error: 'Prompt ou arquivos não fornecidos' });
      }

      const parts: any[] = [];
      if (files && Array.isArray(files)) {
        for (const f of files) {
          if (f.mimeType && f.data) {
            let hasTextLayer = false;
            // Se for PDF, tenta extrair o texto para reforçar a contextualização e acelerar o envio
            if (f.mimeType === 'application/pdf' || f.mimeType?.includes('pdf')) {
              try {
                const cleanData = f.data.replace(/^data:[^;]+;base64,/, '');
                const pdfRes = await extractTextFromPdfBuffer(Buffer.from(cleanData, 'base64'));
                if (pdfRes.text && pdfRes.text.length > 20) {
                  hasTextLayer = true;
                  parts.push({
                    text: `[TEXTO TRANSCRITO DO ARQUIVO PDF ${f.name || ''}]:\n"""\n${pdfRes.text.slice(0, 15000)}\n"""`,
                  });
                }
              } catch (e) {
                // Silently ignore text extraction in fallback
              }
            }

            // Anexa os dados binários apenas se for imagem pura ou se o PDF não possuía texto
            if (!hasTextLayer) {
              parts.push({
                inlineData: {
                  mimeType: f.mimeType,
                  data: f.data,
                },
              });
            }
          }
        }
      }

      if (systemInstruction) {
        parts.push({ text: `[INSTRUÇÃO DO SISTEMA]: ${systemInstruction}` });
      }
      if (prompt) {
        parts.push({ text: prompt });
      }

      const callConfig: any = {};
      if (config?.responseMimeType) {
        callConfig.responseMimeType = config.responseMimeType;
      }
      if (config?.responseSchema) {
        callConfig.responseSchema = config.responseSchema;
      }

      const response = await callGeminiWithFallback({
        preferredModel: model,
        contents: [{ parts }],
        config: Object.keys(callConfig).length > 0 ? callConfig : undefined,
      });

      return res.json({ success: true, text: response.text || '' });
    } catch (error: any) {
      console.error('Erro em /api/gemini/generate:', error?.message);
      return res.status(500).json({
        error: formatGeminiErrorMessage(error),
      });
    }
  });

  // Endpoint 3: Análise de Ofício / Requisição Bodycam e BOPM
  app.post('/api/parse-oficio', async (req, res) => {
    try {
      const { text, fileBase64, mimeType } = req.body;
      let effectiveText = (text && typeof text === 'string') ? text.trim() : '';

      if (!effectiveText && !fileBase64) {
        return res.status(400).json({ error: 'Texto ou arquivo do Ofício não fornecido' });
      }

      // Se for PDF, extrai a camada de texto nativa imediatamente
      if (fileBase64 && (!mimeType || mimeType === 'application/pdf' || mimeType.includes('pdf'))) {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        const pdfRes = await extractTextFromPdfBuffer(Buffer.from(cleanBase64, 'base64'));
        if (pdfRes.text) {
          effectiveText = effectiveText ? `${effectiveText}\n\n${pdfRes.text}` : pdfRes.text;
        }
      }

      const promptText = `Você é um assistente especialista jurídico do Ministério Público de São Paulo (MPSP).
Analise com inteligência o documento/texto a seguir extraído de um Ofício, Cota MP, Despacho ou documento do SEI/Processo Digital do MPSP.
Extraia com extrema precisão os dados necessários para instruir a requisição oficial de imagens de câmeras corporais operacionais (Bodycam) e/ou Boletim de Ocorrência da Polícia Militar (BOPM).

Sua resposta deve seguir rigorosamente o esquema JSON fornecido.

Diretrizes de extração:
1. requestType: 
   - "BODYCAM" se o documento solicitar especificamente gravações, imagens de câmeras individuais/corporais, mídias de vídeo;
   - "BOPM" se solicitar especificamente cópia integral do Boletim de Ocorrência da Polícia Militar / extrato de chamadas COPOM / talao de ocorrência;
   - "AMBOS" se solicitar tanto câmeras corporais quanto BOPM.
2. numeroOficio: O número completo e limpo do ofício/cota (Ex: "0103-26 - 4ª PJCrim", "SEI 6019.2026/000123" ou "0104-26").
3. numeroProcesso: O número unificado do processo no formato padrão do TJSP: NNNNNNN-DD.AAAA.8.26.OOOO (Ex: "1514999-68.2026.8.26.0228").
4. numeroBo: O número do Boletim de Ocorrência mencionado (Ex: "KG6509-1/2026", "38492/2026", "DT7888-1/2026").
5. delegaciaOrigem: A Delegacia / Distrito Policial de origem da ocorrência (Ex: "73º D.P. JAÇANÃ", "13º D.P. CASA VERDE", "38º D.P. VILA PENTEADO").
6. policiaisMilitares: Nome completo dos Policiais Militares que atuaram no fato/atendimento (Ex: "Felippe Pinheiro da Silva e Thiago Carvalho de Oliveira").
7. trechoDetalhes: O recorte específico do tempo/fatos ou local solicitado (Ex: "momento da abordagem do réu na via pública e buscas na residência").
8. promotorNome: Nome completo do(a) Promotor(a) de Justiça que assina (Ex: "Margareth Ferraz França").
9. promotorCargo: Cargo do(a) Promotor(a) (Ex: "79ª Promotora de Justiça Criminal").
10. promotorGender: "F" se for Promotora (Feminino) ou "M" se for Promotor (Masculino).
11. batalhaoIdentificado: O Batalhão ou OPM destinatária ou mencionada (Ex: "5º BPM/M", "9º BPM/M", "12º BPM/M", "38º BPM/M", "COPOM", "1º BAEP", "1º BPChq").
12. isUrgente: boolean true se contiver indicação de urgência, réu preso, audiência de custódia ou prazo fatal.
13. resumoOcorrencia: Resumo técnico em 1 linha.

${effectiveText ? `Texto do Ofício fornecido:\n"""\n${effectiveText.slice(0, 10000)}\n"""` : ''}`;

      const contentsParts: any[] = [];
      if (fileBase64 && mimeType) {
        contentsParts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileBase64,
          },
        });
      }
      contentsParts.push({ text: promptText });

      const response = await callGeminiWithFallback({
        contents: [{ parts: contentsParts }],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              requestType: { type: Type.STRING, description: 'BODYCAM, BOPM, or AMBOS' },
              numeroOficio: { type: Type.STRING },
              numeroProcesso: { type: Type.STRING },
              numeroBo: { type: Type.STRING },
              delegaciaOrigem: { type: Type.STRING },
              policiaisMilitares: { type: Type.STRING },
              trechoDetalhes: { type: Type.STRING },
              promotorNome: { type: Type.STRING },
              promotorCargo: { type: Type.STRING },
              promotorGender: { type: Type.STRING },
              batalhaoIdentificado: { type: Type.STRING },
              isUrgente: { type: Type.BOOLEAN },
              resumoOcorrencia: { type: Type.STRING },
            },
            required: ['requestType', 'numeroProcesso', 'numeroBo'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Resposta vazia da IA Gemini');
      }

      const parsedData = JSON.parse(responseText);
      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error('Erro na análise de ofício via Gemini:', error?.message);
      return res.status(500).json({ 
        error: formatGeminiErrorMessage(error), 
        useFallback: true 
      });
    }
  });

  // Endpoint 4: Análise e Extração de Promoção de Arquivamento em Lote (Notificação de Partes)
  app.post('/api/gemini/parse-archiving-promotion', async (req, res) => {
    try {
      const { text, fileBase64, mimeType } = req.body;
      let effectiveText = (text && typeof text === 'string') ? text.trim() : '';

      if (!effectiveText && !fileBase64) {
        return res.status(400).json({ error: 'Texto ou arquivo PDF da Promoção de Arquivamento não fornecido.' });
      }

      // Se for PDF, extrai o texto do PDF com pdfjs-dist
      if (fileBase64 && (!mimeType || mimeType === 'application/pdf' || mimeType.includes('pdf'))) {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        const pdfRes = await extractTextFromPdfBuffer(Buffer.from(cleanBase64, 'base64'));
        if (pdfRes.text) {
          effectiveText = effectiveText ? `${effectiveText}\n\n${pdfRes.text}` : pdfRes.text;
        }
      }

      const promptText = `Você é um analista jurídico especializado do Ministério Público do Estado de São Paulo (MPSP).
Sua tarefa é analisar rigorosamente a PROMOÇÃO DE ARQUIVAMENTO (documento em PDF ou texto anexo) e extrair os dados processuais e, PRINCIPALMENTE, os dados das pessoas a intimar/notificar que constam no final da promoção (item 2 e NOTAS DE RODAPÉ / rodapé final).

Preste atenção especial nestes elementos:
1. NÚMERO DO PROCESSO (Autos): Geralmente no cabeçalho ou texto (ex: "1508585-11.2023.8.26.0050", "1515688-16.2026.8.26.0454", "1570292-09.2025.8.26.0050", "1524580-11.2026.8.26.0454", "1538099-53.2026.8.26.0454").
2. VARA / ÓRGÃO DO DIPO: Geralmente no cabeçalho (ex: "Juiz das Garantias - 1ª RAJ - Capital", "1ª RAJ – CAPITAL").
3. PROMOTORIA: (ex: "4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL" ou "PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL").
4. PROMOTOR DE JUSTIÇA: Nome do Promotor que subscreve no final (ex: "Leonardo D’Angelo Vargas Pereira").
5. DATA DA PROMOÇÃO: Data no fecho (ex: "27 de agosto de 2026", "1 de setembro de 2026", "4 de setembro de 2026", "8 de setembro de 2026").
6. DELITO / FATO APURADO: Breve identificação do crime sob apuração (ex: "Furto de energia - art. 155, caput, CP", "Estelionato - art. 171, CP", "Apropriação indébita e concorrência desleal", "Extorsão mediante sequestro", "Perseguição - art. 147-A, CP").
7. DISPOSIÇÃO SOBRE INVESTIGADOS / BENS: No item 2 do final (ex: "dispensa-se a intimação do investigado por ausência de bens apreendidos a restituir", "dispensável a intimação dos suspeitos").
8. PARTES A INTIMAR (NO RODAPÉ / NOTA DE RODAPÉ):
   No final da promoção, há uma chamada de nota de rodapé (ex: "determinei a intimação do representante da vítima¹" ou "determinei a intimação da vítima¹").
   No rodapé da página (ou texto final correspondente), encontram-se os dados exatos de qualificação:
   - Nome completo da parte (ou mais de uma parte se houver "CLEITON LUIS DE PAULA e NATALI BEZERRA DE PAULA")
   - Tipo de parte: "Vítima", "Representante da Vítima", "Investigado" ou "Outros"
   - Endereço completo: logradouro, número, complemento, bairro, cidade, UF, CEP
   - Contatos se presentes: celular, telefone, recado, e-mail
   - Folhas de referência: fls. (ex: "fls. 05", "fls. 02 e 473", "fl. 06", "fls. 08")
   - Texto original exato da nota de rodapé.

Retorne estritamente um JSON estruturado seguindo o esquema especificado.`;

      const contentsParts: any[] = [];
      // Anexa o binário do arquivo apenas se não foi possível extrair a camada de texto nativa do PDF
      if (fileBase64 && mimeType && (!effectiveText || effectiveText.length < 50)) {
        contentsParts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileBase64,
          },
        });
      }
      if (effectiveText) {
        // Otimização: se o documento for longo, foca no cabeçalho (processo/vara/promotor) e no terço final (rodapés das vítimas)
        const optimizedText = effectiveText.length > 9000
          ? `${effectiveText.slice(0, 3500)}\n\n[... TRECHO INTERMEDIÁRIO DE FUNDAMENTAÇÃO JURÍDICA OMITIDO PARA ACELERAÇÃO ...]\n\n${effectiveText.slice(-5500)}`
          : effectiveText;
        contentsParts.push({ text: `Texto transcrito ou parcial do documento:\n"""\n${optimizedText}\n"""` });
      }
      contentsParts.push({ text: promptText });

      const response = await callGeminiWithFallback({
        contents: [{ parts: contentsParts }],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              numeroProcesso: { type: Type.STRING },
              varaGarantias: { type: Type.STRING },
              promotoria: { type: Type.STRING },
              promotor: { type: Type.STRING },
              dataPromocao: { type: Type.STRING },
              delito: { type: Type.STRING },
              disposicaoInvestigado: { type: Type.STRING },
              partes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    tipoParte: { type: Type.STRING },
                    endereco: { type: Type.STRING },
                    numero: { type: Type.STRING },
                    complemento: { type: Type.STRING },
                    bairro: { type: Type.STRING },
                    cidade: { type: Type.STRING },
                    uf: { type: Type.STRING },
                    cep: { type: Type.STRING },
                    telefone: { type: Type.STRING },
                    email: { type: Type.STRING },
                    folha: { type: Type.STRING },
                    textoRodapeOriginal: { type: Type.STRING },
                  },
                  required: ['nome'],
                },
              },
            },
            required: ['numeroProcesso', 'partes'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Resposta vazia da IA Gemini');
      }

      const parsedData = JSON.parse(responseText);
      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error('Erro na análise de promoção de arquivamento via Gemini:', error?.message);
      return res.status(500).json({ 
        error: formatGeminiErrorMessage(error), 
        useFallback: true 
      });
    }
  });

  // Endpoint 5: Análise e Extração de Pesquisa de NI em Lote (Múltiplos Mandados/Processos)
  app.post('/api/gemini/parse-batch-ni', async (req, res) => {
    try {
      const { text, fileBase64, mimeType } = req.body;
      let effectiveText = (text && typeof text === 'string') ? text.trim() : '';

      if (!effectiveText && !fileBase64) {
        return res.status(400).json({ error: 'Texto ou arquivo PDF de mandados/processos não fornecido.' });
      }

      // Se for PDF, extrai o texto do PDF com pdfjs-dist
      if (fileBase64 && (!mimeType || mimeType === 'application/pdf' || mimeType.includes('pdf'))) {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        const pdfRes = await extractTextFromPdfBuffer(Buffer.from(cleanBase64, 'base64'));
        if (pdfRes.text) {
          effectiveText = effectiveText ? `${effectiveText}\n\n${pdfRes.text}` : pdfRes.text;
        }
      }

      const promptText = `Você é um analista processual sênior do Ministério Público de São Paulo (MPSP).
Sua tarefa é analisar o documento em anexo (ou texto transcrito) contendo múltiplos mandados de intimação, citação, ocorrências ou despachos com processos e qualificação de pessoas para confecção de solicitações de PESQUISA DE NI / LOCALIZAÇÃO (SIS/NI).

REGRAS DE PESQUISA N.I (COMO EXTRAIR OS DADOS COMPLETOS):
1. PROCESSO: Padrão TJSP (8.26), formato CNJ (ex: "1519377-68.2026.8.26.0454", "0063582-38.2011.8.26.0050", "1523280-47.2025.8.26.0228", etc.).
2. DATA DE AUDIÊNCIA: Contextos como "AUDIÊNCIA", "Audiência Virtual de Instrução, Debates e Julgamento", "Audiência de Instrução e Julgamento".
3. PRIORIDADE:
   - Audiência nos próximos 30 dias = URGENTE (urgente: true)
   - Audiência acima de 30 dias = PRIORIDADE NORMAL (urgente: false)
   - Também marque urgente: true se houver expressamente "Réu Preso", "Urgente", "Tramitação prioritária" ou prisão.
4. CARGO / PROMOTOR:
   - C.71, C71, CARGO 71. -> 71º Promotor de Justiça (Leonardo D'Angelo Vargas Pereira)
   - C.79, C79, CARGO 79. -> 79º Promotor de Justiça (Margareth Ferraz França)
5. FOLHAS:
   - Fls## - Fl#- Folhas## - Folhas (numero), ex: Fls12, Fl#5, Folhas##88, Folhas (45), fls. 01.
6. PARTE:
   - Em regra é o primeiro nome qualificado da pessoa nos autos/bloco.
   - ITENS PARA IGNORAR NAS REGRAS DE PESQUISA DO N.I (NUNCA incluir no nome da parte):
     * FONE / TELEFONE / CELULAR
     * CEP
     * COR / ETNIA
     * NATURAL DE / NATURALIDADE
     * ENDEREÇO / RESIDÊNCIA
     * ESTADO / UF / ESTADO CIVIL

Para cada processo, identifique:
- numeroProcesso: Número dos autos no formato CNJ
- vara: Vara judicial (ex: "16ª Vara Criminal do Foro Central Criminal Barra Funda")
- dataAudiencia: Data e horário de audiência se houver designação (ex: "09/11/2026 às 13:15h", "14/09/2026 às 13:15h")
- urgente: true (se audiência nos próximos 30 dias ou réu preso) ou false (se > 30 dias)
- partes: Lista de TODAS as pessoas vinculadas àquele processo que constam no mandado/bloco:
  * nome: Nome completo da pessoa (apenas o nome, sem dados de endereço, fone, cep, cor, naturalidade)
  * tipoParte: "Vítima", "Réu", "Testemunha", "Investigado" ou "Outros"
  * rg: RG sem pontos ou com pontuação (sem a UF)
  * cpf: CPF formatado
  * pai: Nome completo do pai
  * mae: Nome completo da mãe
  * dataNascimento: Data de nascimento (DD/MM/AAAA)
  * nacionalidade: "Brasileiro" ou "Brasileira" ou indicada
  * endereco: Endereço completo (Rua/Av, número, complemento, bairro, CEP, Cidade, UF)
  * telefone: Telefones fixos ou celulares identificados (ex: "(11) 96650-9234")
  * email: E-mail identificado
  * mandadoNumero: Número do mandado se houver (ex: "050.2026/180194-0")
  * folha: Número de folhas se indicado nos autos (ex: "01", "12")

Retorne estritamente o JSON com a estrutura 'casos'.`;

      const contentsParts: any[] = [];
      // Anexa binário apenas se o arquivo não tiver texto extraído
      if (fileBase64 && mimeType && (!effectiveText || effectiveText.length < 50)) {
        contentsParts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileBase64,
          },
        });
      }
      if (effectiveText) {
        contentsParts.push({ text: `Texto fornecido:\n"""\n${effectiveText.slice(0, 18000)}\n"""` });
      }
      contentsParts.push({ text: promptText });

      const response = await callGeminiWithFallback({
        contents: [{ parts: contentsParts }],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              casos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    numeroProcesso: { type: Type.STRING },
                    vara: { type: Type.STRING },
                    dataAudiencia: { type: Type.STRING },
                    urgente: { type: Type.BOOLEAN },
                    partes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          tipoParte: { type: Type.STRING },
                          rg: { type: Type.STRING },
                          cpf: { type: Type.STRING },
                          pai: { type: Type.STRING },
                          mae: { type: Type.STRING },
                          dataNascimento: { type: Type.STRING },
                          nacionalidade: { type: Type.STRING },
                          endereco: { type: Type.STRING },
                          telefone: { type: Type.STRING },
                          email: { type: Type.STRING },
                          mandadoNumero: { type: Type.STRING },
                          folha: { type: Type.STRING },
                        },
                        required: ['nome'],
                      },
                    },
                  },
                  required: ['numeroProcesso', 'partes'],
                },
              },
            },
            required: ['casos'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Resposta vazia da IA Gemini');
      }

      const parsedData = JSON.parse(responseText);
      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error('Erro na análise em lote de NI via Gemini:', error?.message);
      return res.status(500).json({ 
        error: formatGeminiErrorMessage(error), 
        useFallback: true 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MPSP Bodycam App] Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();

