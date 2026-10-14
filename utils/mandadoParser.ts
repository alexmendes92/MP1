/**
 * MOTOR DE EXTRAÇÃO DE MANDADOS DE INTIMAÇÃO - PESQUISA N.I
 * MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO
 * 
 * Regras especializadas de extração para Mandado de Intimação (TJSP / e-SAJ):
 * - Autos: formato TJSP CNJ (ex: 1503960-95.2025.8.26.0006)
 * - Nome da(s) parte(s): "Pessoa a ser intimada", Vítima, Réu, Testemunhas
 * - RG, CPF, Filiação (Pai e Mãe), Data de Nascimento, Nacionalidade, Endereço
 * - Fls: captura das folhas no cabeçalho/margem (ex: fls. 164)
 * - Data de Audiência: APENAS a data no formato DD/MM/AAAA (ignora horário conforme especificação)
 * - Mapeamento de Varas para Cargos da 4ª PJ Criminal:
 *     19ª Vara Criminal -> Cargo 71 (71º PJ / Leonardo D'Angelo Vargas Pereira)
 *     16ª Vara Criminal -> Cargo 79 (79º PJ / Margareth Ferraz França)
 */

import { PromotoriaDef } from '../types';
import { formatCPF, formatRG } from './niRulesHelper';

export interface MandadoParty {
  id: string;
  nome: string;
  folha: string;
  cpf: string;
  rg: string;
  pai: string;
  mae: string;
  dataNascimento: string;
  nacionalidade: string;
  tipoParte: 'Vítima' | 'Investigado' | 'Representante da Vítima' | 'Outros';
  endereco?: string;
  telefone?: string;
  email?: string;
  mandadoNumero?: string;
  isSelected?: boolean;
  isPrimary?: boolean;
  sourceDocName?: string;
}

export interface MandadoParseResult {
  numeroProcesso: string;
  vara: string;
  cargo: string;
  cargoNumber: number | null;
  promotor: string;
  dataAudiencia: string; // STRICTLY DD/MM/AAAA (sem horário)
  urgente: boolean;
  urgenteMotivo: string;
  diffDays: number | null;
  folha: string;
  partes: MandadoParty[];
  rawText?: string;
  fileName?: string;
}

/**
 * Detecta a Vara Criminal e mapeia para o Cargo e Promotor de Justiça correspondente
 * Regras fornecidas pelo usuário:
 * VARA: 19ª VARA CRIMINAL = CARGO 71 (Leonardo D'Angelo Vargas Pereira)
 * VARA: 16º VARA CRIMINAL = CARGO 79 (Margareth Ferraz França)
 */
export function detectVaraAndCargo(text: string, promotorias?: PromotoriaDef[]): {
  vara: string;
  cargo: string;
  cargoNumber: number | null;
  promotor: string;
} {
  const clean = text || '';

  // 19ª Vara Criminal = Cargo 71
  if (
    /\b19[ªºaA]?\s*Vara\s*Criminal\b/i.test(clean) || 
    /\b(?:CARGO\s*71|C\.?71|C71)\b/i.test(clean) || 
    /Leonardo\s+D['’]Angelo/i.test(clean)
  ) {
    return {
      vara: '19ª Vara Criminal',
      cargo: '71º Promotor de Justiça',
      cargoNumber: 71,
      promotor: "Leonardo D'Angelo Vargas Pereira",
    };
  }

  // 16ª / 16º Vara Criminal = Cargo 79
  if (
    /\b16[ªºaA]?\s*Vara\s*Criminal\b/i.test(clean) || 
    /\b(?:CARGO\s*79|C\.?79|C79)\b/i.test(clean) || 
    /Margareth\s+Ferraz/i.test(clean)
  ) {
    return {
      vara: '16ª Vara Criminal',
      cargo: '79º Promotor de Justiça',
      cargoNumber: 79,
      promotor: 'Margareth Ferraz França',
    };
  }

  // Busca genérica por menção a Cargo XX (61 a 80)
  const cargoMatch = clean.match(/\b(?:C\.?\s*(\d{2})\b|C(\d{2})\b|CARGO\s*(\d{2})\.?|(\d{2})[ºª]\s*PROMOTOR)/i);
  if (cargoMatch) {
    const num = parseInt(cargoMatch[1] || cargoMatch[2] || cargoMatch[3] || cargoMatch[4], 10);
    if (num >= 61 && num <= 80) {
      let promotorNome = '';
      if (num === 71) promotorNome = "Leonardo D'Angelo Vargas Pereira";
      else if (num === 79) promotorNome = 'Margareth Ferraz França';
      else if (promotorias) {
        const found = promotorias.find(p => p.id === num);
        if (found && found.schedule.length > 0) promotorNome = found.schedule[0].name;
      }
      return {
        vara: '',
        cargo: `${num}º Promotor de Justiça`,
        cargoNumber: num,
        promotor: promotorNome,
      };
    }
  }

  // Outra Vara Criminal não tabelada
  const anyVaraMatch = clean.match(/\b(\d{1,2})[ªºaA]?\s*Vara\s*Criminal\b/i);
  if (anyVaraMatch) {
    return {
      vara: `${anyVaraMatch[1]}ª Vara Criminal`,
      cargo: '',
      cargoNumber: null,
      promotor: '',
    };
  }

  return { vara: '', cargo: '', cargoNumber: null, promotor: '' };
}

/**
 * Extrai a data da audiência no formato estrito DD/MM/AAAA (ignorando horário)
 * e calcula a urgência com base na regra de 30 dias.
 */
export function extractAudienciaDateOnly(text: string): {
  dataAudiencia: string;
  urgente: boolean;
  urgenteMotivo: string;
  diffDays: number | null;
} {
  const clean = text || '';
  let dateFound = '';

  // Procura padrão: "Audiência ... no dia 27/10/2026 às 15:30h" ou "designada para 27/10/2026"
  const audContextMatch = clean.match(
    /(?:audi[êe]ncia|no dia|designada\s+para|data\s+da\s+audi[êe]ncia)[^\d\n\r]{0,90}?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i
  );

  if (audContextMatch) {
    dateFound = audContextMatch[1].replace(/[-.]/g, '/');
  } else {
    // Procura por audiência seguida de data em qualquer ponto próximo
    const audIdx = clean.search(/audi[êe]ncia/i);
    if (audIdx !== -1) {
      const windowText = clean.slice(audIdx, audIdx + 300);
      const dm = windowText.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\b/);
      if (dm) dateFound = dm[1].replace(/[-.]/g, '/');
    }
  }

  if (!dateFound) {
    return {
      dataAudiencia: '',
      urgente: false,
      urgenteMotivo: 'Prioridade Normal',
      diffDays: null,
    };
  }

  // Normaliza estritamente para DD/MM/AAAA
  const parts = dateFound.split('/');
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  const normalizedDate = `${day}/${month}/${year}`;

  // Cálculo da urgência (≤ 30 dias = Urgente)
  const dNum = parseInt(day, 10);
  const mNum = parseInt(month, 10) - 1;
  const yNum = parseInt(year, 10);
  const targetDate = new Date(yNum, mNum, dNum);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isUrgente = diffDays >= 0 && diffDays <= 30;

  let motivo = 'Prioridade Normal';
  if (isUrgente) {
    motivo = diffDays === 0 ? '🚨 Urgente (Audiência Hoje!)' : `🚨 Urgente (Audiência em ${diffDays} dias)`;
  } else if (diffDays > 30) {
    motivo = `Prioridade Normal (Audiência em ${diffDays} dias)`;
  } else if (diffDays < 0) {
    motivo = `Prioridade Normal (Audiência realizada há ${Math.abs(diffDays)} dias)`;
  }

  return {
    dataAudiencia: normalizedDate,
    urgente: isUrgente,
    urgenteMotivo: motivo,
    diffDays,
  };
}

/**
 * Extrai o número de Folhas (fls.)
 */
export function extractMandadoFls(text: string): string {
  const clean = text || '';
  // Procura "fls. 164", "fls 164", "fl. 164", "folhas 164"
  const match = clean.match(/\b(?:fls?\.?|folhas?)\s*[:#]?\s*(\d{1,5})\b/i);
  if (match) {
    return match[1];
  }
  return '01';
}

/**
 * Extrai o número do Processo no padrão TJSP CNJ (8.26)
 */
export function extractMandadoProcesso(text: string): string {
  const clean = text || '';
  const match = clean.match(/\b(\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4})\b/);
  if (match) return match[1];

  // Alternativa com espaçamento flexível
  const lenient = clean.match(/\b(\d{7})[-.]?(\d{2})[-.]?(\d{4})[-.]?(8)[-.]?(26)[-.]?(\d{4})\b/);
  if (lenient) {
    return `${lenient[1]}-${lenient[2]}.${lenient[3]}.8.26.${lenient[6]}`;
  }

  return '';
}

/**
 * Função principal para analisar o texto completo de um ou múltiplos Mandados de Intimação
 */
export function parseMandadoDocument(text: string, fileName?: string, promotorias?: PromotoriaDef[]): MandadoParseResult {
  const clean = (text || '').replace(/\r/g, '');

  // 1. Processo / Autos
  const numeroProcesso = extractMandadoProcesso(clean);

  // 2. Vara & Cargo
  const { vara, cargo, cargoNumber, promotor } = detectVaraAndCargo(clean, promotorias);

  // 3. Fls
  const folha = extractMandadoFls(clean);

  // 4. Data da Audiência (somente DD/MM/AAAA)
  const { dataAudiencia, urgente, urgenteMotivo, diffDays } = extractAudienciaDateOnly(clean);

  // 5. Partes Envolvidas
  const partes: MandadoParty[] = [];
  const addedNames = new Set<string>();

  // A) Intimando principal a partir do bloco "Pessoa a ser intimada", "Intimando(a)", "Destinatário", etc.
  const intimadaBlocks = clean.match(/(?:Pessoa\s+a\s+ser\s+(?:intimada|notificada|citada)|Intimand[oa](?:\(a\))?|Destinat[áa]rio(?:\(a\))?)[:\s]*([\s\S]+?)(?=(?:FINALIDADE|OBJETIVO|DESPACHO|AUDI[ÊE]NCIA|ADVERT[ÊE]NCIAS|O\(A\)\s+MM|MANDA|Link\s+para|CUMPRA-SE|Pessoa\s+a\s+ser|$))/gi);

  if (intimadaBlocks && intimadaBlocks.length > 0) {
    intimadaBlocks.forEach((block) => {
      const snippet = block.replace(/^(?:Pessoa\s+a\s+ser\s+(?:intimada|notificada|citada)|Intimand[oa](?:\(a\))?|Destinat[áa]rio(?:\(a\))?)[:\s]*/i, '').trim();
      if (!snippet) return;

      // Nome antes da primeira vírgula ou primeira quebra de linha
      const commaIdx = snippet.indexOf(',');
      let rawName = (commaIdx !== -1 ? snippet.substring(0, commaIdx) : snippet.split('\n')[0]).trim();
      let nome = rawName
        .toUpperCase()
        .replace(/^[\s\-*•–—]+/, '')
        .replace(/^(?:VÍTIMA|RÉU|TESTEMUNHA|PARTE|NOME|QUALIFICADO\(A\))[:\s-]*/i, '')
        .trim();

      if (nome && !addedNames.has(nome) && nome.length >= 3 && !/\b(?:MANDADO|TRIBUNAL|JUSTIÇA|OFICIAL)\b/i.test(nome)) {
        // CPF
        const cpfM = snippet.match(/(?:CPF|C\.P\.F)[.:\s]*([\d.-]{11,14})/i) || snippet.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/);
        const cpf = cpfM ? formatCPF(cpfM[1]) : '';

        // RG (número puro ou formatado)
        const rgM = snippet.match(/(?:\bRG\b|\bR\.G\.\b)[.:\s]*([0-9A-Za-z.\-X]{4,15})/i);
        const rgRaw = rgM ? rgM[1].trim().replace(/[-.]$/, '') : '';
        const rg = rgRaw ? formatRG(rgRaw) : '';

        // Pai (com ou sem dois pontos: "Pai: NOME" ou "Pai NOME")
        const paiM = snippet.match(/(?:\bpai\b|filia[çc][ãa]o\s+paterna)[:\s]+([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:,|m[ãa]e|filia[çc]|nascid|de\s+cor|brasileir|$))/i);
        const pai = paiM ? paiM[1].trim().replace(/[,;]+$/, '') : '';

        // Mãe (com ou sem dois pontos: "Mãe: NOME" ou "Mãe NOME")
        const maeM = snippet.match(/(?:\bm[ãa]e\b|filia[çc][ãa]o\s+materna)[:\s]+([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:,|pai|filia[çc]|nascid|de\s+cor|brasileir|$))/i);
        const mae = maeM ? maeM[1].trim().replace(/[,;]+$/, '') : '';

        // Data Nascimento
        const dobM = snippet.match(/(?:nascid[oa]|data\s+de\s+nasc)[^\d\n\r]{0,30}?(\d{2}\/\d{2}\/\d{4})/i) ||
                     snippet.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
        const dataNascimento = dobM ? dobM[1].replace(/[-.]/g, '/') : '';

        // Endereço
        const endM = snippet.match(/(?:Rua|Av|Avenida|Travessa|Alameda|Praça|Estrada)\s+[^,\n\r]+,\s*\d+[^;\n\r]*(?:CEP\s*[\d.-]+)?[^;\n\r]*/i) ||
                     snippet.match(/(?:Rua|Av|Avenida|Travessa|Alameda|Praça|Estrada)[^\n\r]+/i);
        const endereco = endM ? endM[0].trim().replace(/[,;]+$/, '') : '';

        // Tipo de parte baseado no mandado (se nome coincide com Vítima no cabeçalho ou texto)
        let tipoParte: 'Vítima' | 'Investigado' | 'Representante da Vítima' | 'Outros' = 'Vítima';
        const isReuNoHeader = new RegExp(`R[ée]u:[^\\n\\r]*${nome.split(' ')[0]}`, 'i').test(clean);
        if (isReuNoHeader) {
          tipoParte = 'Investigado';
        } else if (new RegExp(`V[íi]tima:[^\\n\\r]*${nome.split(' ')[0]}`, 'i').test(clean) || /v[íi]tima/i.test(clean)) {
          tipoParte = 'Vítima';
        } else if (/testemunha/i.test(clean)) {
          tipoParte = 'Representante da Vítima';
        }

        // Mandado nº
        const manM = clean.match(/(?:Mandado\s*n[ºo]?[:\s]*)([0-9./-]+)/i);
        const mandadoNumero = manM ? manM[1].trim() : undefined;

        addedNames.add(nome);
        partes.push({
          id: `p-${crypto.randomUUID().slice(0, 8)}`,
          nome,
          folha,
          cpf,
          rg: rg || rgRaw,
          pai,
          mae,
          dataNascimento,
          nacionalidade: /feminino|mulher|solteira|estudante/i.test(snippet) ? 'Brasileira' : 'Brasileiro',
          tipoParte,
          endereco,
          mandadoNumero,
          isSelected: true,
          isPrimary: true,
          sourceDocName: fileName,
        });
      }
    });
  }

  // B) Fallback para Vítima identificada no cabeçalho se não foi capturada pelo bloco
  const vitimaHeaderMatch = clean.match(/\bV[íi]tima:\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:\n|R[ée]u|Autor|Oficial|Mandado|$))/i);
  if (vitimaHeaderMatch) {
    const nomeVitima = vitimaHeaderMatch[1].trim().toUpperCase();
    if (nomeVitima && !addedNames.has(nomeVitima) && nomeVitima.length >= 3 && !/\b(?:JUSTIÇA|PÚBLICA)\b/i.test(nomeVitima)) {
      addedNames.add(nomeVitima);
      partes.push({
        id: `p-${crypto.randomUUID().slice(0, 8)}`,
        nome: nomeVitima,
        folha,
        cpf: '',
        rg: '',
        pai: '',
        mae: '',
        dataNascimento: '',
        nacionalidade: 'Brasileira',
        tipoParte: 'Vítima',
        isSelected: partes.length === 0,
        isPrimary: partes.length === 0,
        sourceDocName: fileName,
      });
    }
  }

  // C) Réu identificado no cabeçalho:
  // IMPORTANTE: Em um Mandado de Intimação, o Réu citado no cabeçalho dos autos
  // NUNCA deve ser selecionado por padrão e NUNCA é a parte principal se houver intimando (Bruna).
  const reuMatch = clean.match(/\bR[ée]u:\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:\n|V[íi]tima|Autor|Oficial|Mandado|$))/i);
  if (reuMatch) {
    const nomeReu = reuMatch[1].trim().toUpperCase();
    if (nomeReu && !addedNames.has(nomeReu) && nomeReu.length >= 3 && !/\b(?:JUSTIÇA|PÚBLICA)\b/i.test(nomeReu)) {
      addedNames.add(nomeReu);
      partes.push({
        id: `p-${crypto.randomUUID().slice(0, 8)}`,
        nome: nomeReu,
        folha,
        cpf: '',
        rg: '',
        pai: '',
        mae: '',
        dataNascimento: '',
        nacionalidade: 'Brasileiro',
        tipoParte: 'Investigado',
        isSelected: false, // JAMAIS selecionado automaticamente quando há mandado para intimando
        isPrimary: false,  // JAMAIS primário
        sourceDocName: fileName,
      });
    }
  }

  // D) Testemunhas no texto
  const testMatch = clean.match(/\bTestemunha(?:\s+de\s+Acusa[çc][ãa]o)?:\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*(?:\n|,|CPF|RG|$))/i);
  if (testMatch) {
    const nomeTest = testMatch[1].trim().toUpperCase();
    if (nomeTest && !addedNames.has(nomeTest) && nomeTest.length >= 3) {
      addedNames.add(nomeTest);
      partes.push({
        id: `p-${crypto.randomUUID().slice(0, 8)}`,
        nome: nomeTest,
        folha,
        cpf: '',
        rg: '',
        pai: '',
        mae: '',
        dataNascimento: '',
        nacionalidade: 'Brasileiro',
        tipoParte: 'Representante da Vítima',
        isSelected: false,
        isPrimary: false,
        sourceDocName: fileName,
      });
    }
  }

  return {
    numeroProcesso,
    vara,
    cargo,
    cargoNumber,
    promotor,
    dataAudiencia,
    urgente,
    urgenteMotivo,
    diffDays,
    folha,
    partes,
    rawText: clean,
    fileName,
  };
}

/**
 * Verifica se um texto possui características evidentes de Mandado de Intimação (TJSP)
 */
export function isMandadoDocument(text: string): boolean {
  if (!text) return false;
  return /\b(?:mandado\s+de\s+intima[çc]|pessoa\s+a\s+ser\s+(?:intimada|notificada|citada)|intimand[oa]|manda\s+a\s+qualquer\s+oficial|mandado\s*n[ºo]?)\b/i.test(text);
}

