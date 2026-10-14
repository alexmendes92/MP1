/**
 * REGRAS E MOTOR DE EXTRAÇÃO DE DADOS - PESQUISA N.I
 * MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO (4ª PJ Crim)
 * 
 * Arquitetura Refatorada e Modular:
 * 1. Extratores Atômicos de Metadados Processuais:
 *    - Processo TJSP (8.26)
 *    - Cargo / Promotor (C.71 / Leonardo D'Angelo, C.79 / Margareth Ferraz)
 *    - Audiência & Prioridade (regra dos 30 dias: <= 30d Urgente, > 30d Normal)
 *    - Folhas (Fls##, Fl#, Folhas##, Folhas (numero))
 * 2. Segmentador e Extratores Atômicos de Partes:
 *    - Segmentação inteligente de múltiplos envolvidos (testemunhas, réus, intimandos)
 *    - Limpeza de nomes ignorando: FONE, CEP, COR, NATURAL DE, ENDEREÇO, ESTADO
 *    - Formatação estrita de CPF (000.000.000-00) e RG (ex: 52.567.458)
 *    - Filiação completa sem truncar sobrenomes
 * 3. Formatador Oficial Padronizado:
 *    - Saída unificada em texto puro e modelo oficial MPSP
 */

import { PromotoriaDef } from '../types';

/* =========================================================================
   INTERFACES E TIPOS
   ========================================================================= */

export type NiTipoParte = 'Vítima' | 'Réu' | 'Testemunha' | 'Investigado' | 'Outros';

export interface NiPersonData {
  id?: string;
  nome: string;
  folha: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  nacionalidade: string;
  pai: string;
  mae: string;
  tipoParte?: NiTipoParte;
  endereco?: string;
  telefone?: string;
  email?: string;
  mandadoNumero?: string;
}

export interface NiCaseMetadata {
  numeroProcesso?: string;
  cargo?: string;
  promotor?: string;
  cargoCode?: string;
  cargoDisplay?: string;
  dataAudiencia?: string;
  dataAudienciaOnly?: string;
  urgente?: boolean;
  urgenteMotivo?: string;
  diffDays?: number | null;
}

export interface NiExtractedData extends NiPersonData, NiCaseMetadata {
  partes?: NiPersonData[];
}

/* =========================================================================
   1. FUNÇÕES UTILITÁRIAS DE FORMATAÇÃO
   ========================================================================= */

/**
 * Formata RG no padrão paulista/nacional (ex: 52567458 -> 52.567.458)
 */
export function formatRG(value?: string): string {
  if (!value) return '';
  const clean = value.trim().replace(/^RG[:\s]*/i, '').replace(/[-.\s]/g, '');
  if (!clean) return value.trim();

  // 8 dígitos (ex: 52567458 -> 52.567.458)
  if (/^\d{8}$/.test(clean)) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3');
  }
  // 9 dígitos com dígito verificador numérico ou X (ex: 52567458X -> 52.567.458-X)
  if (/^\d{8}[0-9Xx]$/.test(clean)) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})([0-9Xx])$/, '$1.$2.$3-$4').toUpperCase();
  }
  // 9 dígitos numéricos
  if (/^\d{9}$/.test(clean)) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4');
  }
  // 10 dígitos (com zero à esquerda ou estadual)
  if (/^\d{10}$/.test(clean)) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  // Se já possui formatação válida
  if (/[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}/.test(value)) {
    return value.trim();
  }
  return value.trim();
}

/**
 * Formata CPF no padrão 000.000.000-00
 */
export function formatCPF(value?: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return value.trim();
}

/**
 * Extrai estritamente a data (DD/MM/AAAA) da audiência
 */
export function extractDateOnly(dateString?: string): string {
  if (!dateString) return 'Não designada';
  const match = dateString.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (match) return match[1];
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2].slice(0, 2)}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateString;
}

/**
 * Formata a sigla do cargo para o cabeçalho (ex: 79º Promotor -> 79º PJ.)
 */
export function formatCargoDisplay(cargo?: string): string {
  if (!cargo) return '';
  const match = cargo.match(/\d+/);
  if (match) {
    return `${match[0]}º PJ.`;
  }
  return cargo;
}

/* =========================================================================
   2. EXTRATORES DE METADADOS DO PROCESSO
   ========================================================================= */

/**
 * Calcula a urgência com base na regra de 30 dias para a audiência:
 * - Audiência nos próximos 30 dias (0 a 30 dias): URGENTE
 * - Audiência acima de 30 dias: PRIORIDADE NORMAL
 */
export function calculateUrgencyFromAudiencia(dateStr?: string): { urgente: boolean; diffDays: number | null; label: string } {
  if (!dateStr) {
    return { urgente: false, diffDays: null, label: 'Prioridade Normal' };
  }

  let day: number, month: number, year: number;
  const matchDMY = dateStr.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  const matchYMD = dateStr.match(/(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);

  if (matchDMY) {
    day = parseInt(matchDMY[1], 10);
    month = parseInt(matchDMY[2], 10) - 1;
    year = parseInt(matchDMY[3], 10);
  } else if (matchYMD) {
    year = parseInt(matchYMD[1], 10);
    month = parseInt(matchYMD[2], 10) - 1;
    day = parseInt(matchYMD[3], 10);
  } else {
    return { urgente: false, diffDays: null, label: 'Prioridade Normal' };
  }

  const targetDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isUrgente = diffDays >= 0 && diffDays <= 30;

  let label = 'Prioridade Normal';
  if (isUrgente) {
    label = diffDays === 0 ? '🚨 Urgente (Audiência Hoje!)' : `🚨 Urgente (Audiência em ${diffDays} dias)`;
  } else if (diffDays > 30) {
    label = `Prioridade Normal (Audiência em ${diffDays} dias)`;
  } else if (diffDays < 0) {
    label = `Prioridade Normal (Audiência realizada há ${Math.abs(diffDays)} dias)`;
  }

  return {
    urgente: isUrgente,
    diffDays,
    label
  };
}

/**
 * Extrai o Cargo e o Promotor de Justiça correspondente:
 * - C.71, C71, CARGO 71. -> 71º PJ. / Leonardo D'Angelo Vargas Pereira
 * - C.79, C79, CARGO 79. -> 79º PJ. / Margareth Ferraz França
 */
export function extractCargoPromotor(text: string, promotorias?: PromotoriaDef[]): { cargo: string; promotor: string; cargoCode: string } | null {
  if (!text) return null;

  // Cargo 71 especificamente (ou 19ª Vara Criminal)
  if (
    /\b(?:C\.?\s*71\b|C71\b|CARGO\s*71\.?|CARGO\s*71\b|71[ºª]\s*PROMOTOR)/i.test(text) || 
    /\b19[ªºaA]?\s*Vara\s*Criminal\b/i.test(text) || 
    /Leonardo\s+D['’]Angelo/i.test(text)
  ) {
    return {
      cargo: '71º Promotor de Justiça',
      promotor: "Leonardo D'Angelo Vargas Pereira",
      cargoCode: 'C.71'
    };
  }

  // Cargo 79 especificamente (ou 16ª / 16º Vara Criminal)
  if (
    /\b(?:C\.?\s*79\b|C79\b|CARGO\s*79\.?|CARGO\s*79\b|79[ºª]\s*PROMOTOR)/i.test(text) || 
    /\b16[ªºaA]?\s*Vara\s*Criminal\b/i.test(text) || 
    /Margareth(?:\s+Ferraz)?/i.test(text)
  ) {
    return {
      cargo: '79º Promotor de Justiça',
      promotor: 'Margareth Ferraz França',
      cargoCode: 'C.79'
    };
  }

  // Outros cargos genéricos (C.61 até C.80)
  const generalMatch = text.match(/\b(?:C\.?\s*(\d{2})\b|C(\d{2})\b|CARGO\s*(\d{2})\.?|(\d{2})[ºª]\s*PROMOTOR)/i);
  if (generalMatch) {
    const num = parseInt(generalMatch[1] || generalMatch[2] || generalMatch[3] || generalMatch[4], 10);
    if (num >= 61 && num <= 80) {
      const cargoLabel = `${num}º Promotor de Justiça`;
      let promotorNome = '';
      if (num === 79) {
        promotorNome = 'Margareth Ferraz França';
      } else if (num === 71) {
        promotorNome = "Leonardo D'Angelo Vargas Pereira";
      } else if (promotorias) {
        const found = promotorias.find(p => p.id === num || p.label.includes(String(num)));
        if (found && found.schedule.length > 0) {
          promotorNome = found.schedule[0].name;
        }
      }
      return {
        cargo: cargoLabel,
        promotor: promotorNome,
        cargoCode: `C.${num}`
      };
    }
  }

  return null;
}

/**
 * Extrai o número do Processo no padrão TJSP (8.26):
 * Formato CNJ: XXXXXXX-XX.XXXX.8.26.XXXX
 */
export function extractProcessoTJSP(text: string): string | null {
  if (!text) return null;

  const matchFormatted = text.match(/\b(\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4})\b/);
  if (matchFormatted) return matchFormatted[1];

  const matchLenient = text.match(/\b(\d{7})[-.]?(\d{2})[-.]?(\d{4})[-.]?(8)[-.]?(26)[-.]?(\d{4})\b/);
  if (matchLenient) {
    return `${matchLenient[1]}-${matchLenient[2]}.${matchLenient[3]}.8.26.${matchLenient[6]}`;
  }

  return null;
}

/**
 * Extrai o número de Folhas:
 * Padrões: Fls##, Fl#, Folhas##, Folhas (numero), fls. XX, #XX
 */
export function extractFolhas(text: string): string {
  if (!text) return '01';

  const match = text.match(/\b(?:folhas?|fls?\.?|fl\.?)\s*#{0,2}\s*\(?(\d{1,5})\)?/i) ||
                text.match(/#+\s*\(?(\d{1,5})\)?/);

  if (match) {
    return match[1].padStart(2, '0');
  }

  return '01';
}

/**
 * Extrai a data e horário da audiência com cálculo de urgência
 */
export function extractDataAudiencia(text: string): { 
  dataAudiencia: string; 
  dataAudienciaOnly: string; 
  urgente: boolean; 
  label: string; 
  diffDays: number | null 
} | null {
  if (!text) return null;

  const audContextMatch = text.match(/(?:audi[êe]ncia(?:\s+virtual)?(?:\s+de\s+instru[çc][ãa]o(?:,?\s*debates)?(?:\s*e\s*julgamento)?)?)[^\d\n\r]{0,90}?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}(?:\s*(?:[àa]s|as)\s*\d{1,2}[:h]\d{2}(?:h)?)?)/i);

  let fullAudStr = '';
  let dateStr = '';

  if (audContextMatch) {
    fullAudStr = audContextMatch[1].trim();
    const dateMatch = fullAudStr.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/);
    if (dateMatch) {
      dateStr = dateMatch[1].replace(/[-.]/g, '/');
    }
  } else if (/audi[êe]ncia/i.test(text)) {
    const afterAud = text.slice(Math.max(0, text.search(/audi[êe]ncia/i)));
    const anyDateMatch = afterAud.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\b/);
    if (anyDateMatch) {
      dateStr = anyDateMatch[1].replace(/[-.]/g, '/');
      fullAudStr = dateStr;
    }
  }

  if (dateStr) {
    const urgency = calculateUrgencyFromAudiencia(dateStr);
    const dateOnly = extractDateOnly(dateStr);
    return {
      dataAudiencia: dateOnly,
      dataAudienciaOnly: dateOnly,
      urgente: urgency.urgente,
      label: urgency.label,
      diffDays: urgency.diffDays
    };
  }

  return null;
}

/* =========================================================================
   3. EXTRATORES DE DADOS DA PARTE
   ========================================================================= */

/**
 * Limpa o nome da parte excluindo rigorosamente:
 * FONE, CEP, COR, NATURAL DE, ENDEREÇO, ESTADO, QUALIFICAÇÃO CIVIL
 */
export function cleanPartyName(rawName: string): string {
  if (!rawName) return '';

  let cleaned = rawName
    .replace(/[\r\n\t]+/g, ' ')
    // Marcadores iniciais de lista (- , * , bullet, traço)
    .replace(/^[\s\-*•–—]+/g, '')
    // Prefixos como "Pessoa a ser intimada: do/da/de", "Pessoa intimanda:"
    .replace(/^(?:(?:Pessoa\s+a\s+ser\s+intimada|Pessoa\s+intimanda)(?:\s*:\s*(?:do|da|de|a|o)?|\s+(?:do|da|de|a|o))\s*)/i, '')
    // Rótulos de papel processual: "Testemunha de Acusação:", "Réu:", "Indiciado:", etc.
    .replace(/^(?:(?:Testemunha(?:\s+de\s+Acusa[çc][ãa]o|\s+da\s+Acusa[çc][ãa]o|\s+de\s+Defesa|\s+da\s+Defesa|\s+do\s+Ju[íi]zo)?|R[ée]u|Investigado|Indiciado|Nome(?:\s+completo)?|Parte|V[íi]tima|Qualificado\(a\))[:\s-]*(?:do|da|de|a|o)?\s*)/i, '')
    // ITENS PARA IGNORAR NAS REGRAS DE PESQUISA DO N.I:
    // Corta qualificações a partir de palavras-chave conhecidas
    .replace(/[,;]?\s+\b(?:brasileir[oa]|solteir[oa]|casad[oa]|divorciad[oa]|vi[úu]v[oa]|uni[ãa]o\s+est[áa]vel|maior|menor|operador|ajudante|comerciante|aut[ôo]nom[oa]|motorista|policial|militar|médic[oa]|advogad[oa]|estudante|aposentad[oa]|desempregad[oa]|RG|CPF|FONE|TELEFONE|TEL|CEL|CELULAR|CEP|COR|NATURAL(?:\s+DE)?|NATURALIDADE|ENDERE[ÇC]O?|RESID[ÊE]NCIA|RESIDENTE|DOMIC[ÍI]LIO|ESTADO\s+CIVIL|ESTADO|UF|SEXO|NASCID[OA]|PAI|M[ÃA]E|FILIA[ÇC][ÃA]O)\b.*$/i, '')
    // Se restar vírgula com dados posteriores, o nome é o fragmento anterior à primeira vírgula
    .replace(/[,;].*$/, '')
    // Remove menções de folhas ou traços residuais no final
    .replace(/[-–—]\s*(?:fls?|folhas?|\d+).*$/i, '')
    .replace(/[,;.\-–—]+$/, '')
    .trim();

  return cleaned.toUpperCase();
}

/**
 * Extrai o nome limpo da parte a partir de um fragmento
 */
export function extractPersonNome(snippet: string): string {
  const lines = snippet.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/^\s*[-*•]?\s*\d{4,7}-\d{2}\.\d{4}/.test(line)) continue;
    if (/^\s*[-*•]?\s*pesquisa/i.test(line)) continue;
    if (/^\s*[-*•]?\s*audi[êe]ncia\b/i.test(line)) continue;
    if (/^\s*[-*•]?\s*(?:fls?|folhas?)\.?\s*\d+\s*$/i.test(line)) continue;

    // Se é uma linha com dados pessoais
    if (/\b(?:brasileir[oa]|solteir[oa]|casad[oa]|divorciad[oa]|vi[úu]v[oa]|rg\s*[\dXx]|cpf\s*\d|pai\s+|m[ãa]e\s+|nascid[oa]|testemunha|pessoa\s+a\s+ser\s+intimada|r[ée]u|indiciado|investigado|v[íi]tima)\b/i.test(line)) {
      const candidate = cleanPartyName(line);
      if (candidate && candidate.length >= 3 && !/\b(?:AUDIÊNCIA|PROCESSO|CARGO|FOLHAS|MINISTÉRIO)\b/i.test(candidate)) {
        return candidate;
      }
    }
  }

  // Linha inicial válida como fallback
  for (const line of lines) {
    if (/^\s*[-*•]?\s*\d{4,7}-\d{2}\.\d{4}/.test(line)) continue;
    if (/^\s*[-*•]?\s*pesquisa/i.test(line)) continue;
    if (/^\s*[-*•]?\s*audi[êe]ncia/i.test(line)) continue;
    if (/^\s*[-*•]?\s*(?:fls?|folhas?)\.?\s*\d+\s*$/i.test(line)) continue;
    if (line.includes(':') && !/^(?:[-*•\s]*)(?:nome|r[ée]u|indiciado|testemunha|pessoa|v[íi]tima)/i.test(line)) continue;

    const candidate = cleanPartyName(line);
    if (candidate && candidate.length >= 3 && !/\b(?:AUDIÊNCIA|PROCESSO|CARGO|FOLHAS|MINISTÉRIO|VIRTUAL)\b/i.test(candidate)) {
      return candidate;
    }
  }

  return '';
}

/**
 * Extrai o CPF formatado
 */
export function extractPersonCpf(snippet: string): string {
  const cpfMatch = snippet.match(/(?:CPF|C\.P\.F)[.:\s\n\r]*([0-9.\-]{11,14}|\d{11})/i) ||
                   snippet.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/) ||
                   snippet.match(/\b(\d{11})\b/);
  if (cpfMatch) {
    return formatCPF(cpfMatch[1] || cpfMatch[0]);
  }
  return '';
}

/**
 * Extrai o RG formatado com pontuação, com limite de palavra estrito para evitar colisão com "CARGO"
 */
export function extractPersonRg(snippet: string): string {
  const rgMatch = snippet.match(/(?:\bRG\b|\bR\.G\.\b|\bIdentidade\b|\bC[ée]dula(?:\s+de\s+Identidade)?\b|\bRegistro\s*Geral\b)[.:\s]*([0-9A-Za-z.\-X]{4,15})(?:\s*-\s*[A-Za-z]{2})?/i);
  if (rgMatch) {
    return formatRG(rgMatch[1].trim().replace(/[-.]$/, ''));
  }
  return '';
}

/**
 * Extrai filiação (Pai e Mãe) sem truncar nomes por palavras contendo "nasc" ou fone/endereço
 */
export function extractPersonFiliacao(snippet: string): { pai: string; mae: string } {
  let pai = '';
  let mae = '';

  const filiacaoStop = '(?=\\s*(?:,|[;\\n\\r]|\\b(?:FONE|TEL|CEL|CELULAR|TELEFONE|CEP|COR|NATURAL|ENDERE[ÇC]|RESID[ÊE]NCIA|DOMIC[ÍI]LIO|ESTADO|UF|RG|CPF|NASCID[OA]|DATA\\s+DE\\s+NASC)\\b|$))';

  // Formato conjunto: "Filiação: Mãe e Pai"
  const conjunta = snippet.match(new RegExp(`(?:Filia[çc][ãa]o)[:\\s]*([A-Za-zÀ-ÿ\\s]+?)\\s+e\\s+([A-Za-zÀ-ÿ\\s]+?)${filiacaoStop}`, 'i'));
  if (conjunta) {
    mae = conjunta[1].trim().replace(/[,;]+$/, '');
    pai = conjunta[2].trim().replace(/[,;]+$/, '');
    return { pai, mae };
  }

  // Mãe isolada
  const maeMatch = snippet.match(new RegExp(`(?:m[ãa]e|filia[çc][ãa]o\\s+materna|filho\\s+de)[:\\s]*([A-Za-zÀ-ÿ\\s]+?)(?=\\s*(?:,|[;\\n\\r]|\\s+e\\s+(?:de\\s+)?pai|\\bpai\\b|${filiacaoStop}))`, 'i'));
  if (maeMatch) {
    mae = maeMatch[1].trim().replace(/[,;]+$/, '');
  }

  // Pai isolado
  const paiMatch = snippet.match(new RegExp(`(?:pai|filia[çc][ãa]o\\s+paterna)[:\\s]*([A-Za-zÀ-ÿ\\s]+?)(?=\\s*(?:,|[;\\n\\r]|\\bm[ãa]e\\b|${filiacaoStop}))`, 'i'));
  if (paiMatch) {
    pai = paiMatch[1].trim().replace(/[,;]+$/, '');
  }

  return { pai, mae };
}

/**
 * Extrai a data de nascimento
 */
export function extractPersonNascimento(snippet: string): string {
  const dobMatch = snippet.match(/(?:Nascimento|Data\s+de\s+Nasc(?:imento)?)[.:\s]*(\d{2}[/\-.]\d{2}[/\-.]\d{4})/i) ||
                   snippet.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (dobMatch) {
    return dobMatch[1].replace(/[-.]/g, '/');
  }
  return '';
}

/**
 * Extrai a nacionalidade
 */
export function extractPersonNacionalidade(snippet: string): string {
  const isFeminino = /Sexo:\s*Feminino/i.test(snippet) || /v[íi]tima/i.test(snippet);
  const nacMatch = snippet.match(/Nacionalidade[:\s]*([A-Za-zÀ-ÿ]+)/i);
  if (nacMatch) {
    const nac = nacMatch[1].trim().toLowerCase();
    if (nac === 'brasil' || nac === 'brasileiro' || nac === 'brasileira') {
      return isFeminino ? 'Brasileira' : 'Brasileiro';
    }
    return nacMatch[1].trim();
  }
  return isFeminino ? 'Brasileira' : 'Brasileiro';
}

/**
 * Determina o tipo de parte processual
 */
export function extractPersonTipo(snippet: string): NiTipoParte {
  if (/testemunha/i.test(snippet)) return 'Testemunha';
  if (/r[ée]u|acusad[oa]/i.test(snippet)) return 'Réu';
  if (/investigad[oa]|indiciad[oa]/i.test(snippet)) return 'Investigado';
  if (/pessoa\s+a\s+ser\s+intimada|intimand[oa]/i.test(snippet)) return 'Outros';
  return 'Vítima';
}

/**
 * Extrai dados secundários de contato/endereço (para integração SIS-NI / Lote)
 */
export function extractPersonContatos(snippet: string): { 
  endereco?: string; 
  telefone?: string; 
  email?: string; 
  mandadoNumero?: string 
} {
  const endMatch = snippet.match(/(?:Endere[çc]o|Resid[êe]ncia|Rua|Av|Avenida|Travessa|Alameda|Pra[çc]a)[:\s]*([^\n\r]+?)(?=\s*(?:FONE|TEL|CEL|CEP|RG|CPF|Fls|Folhas|Mandado|[;\n]|$))/i);
  const telMatch = snippet.match(/(?:Fone|Telefone|Tel|Cel|Celular)[:\s]*([0-9()\s\-\.]{8,20})/i);
  const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const manMatch = snippet.match(/(?:Mandado\s*n[ºo]?[:\s]*)([0-9./-]+)/i);

  return {
    endereco: endMatch ? endMatch[1].trim().replace(/[,;]+$/, '') : undefined,
    telefone: telMatch ? telMatch[1].trim() : undefined,
    email: emailMatch ? emailMatch[0].trim() : undefined,
    mandadoNumero: manMatch ? manMatch[1].trim() : undefined
  };
}

/* =========================================================================
   4. PIPELINE DE EXTRAÇÃO E SEGMENTAÇÃO
   ========================================================================= */

/**
 * Extrai todos os campos estruturados de uma pessoa a partir de um fragmento
 */
export function extractPersonFromSnippet(snippet: string, defaultFolha: string = '01', idx: number = 0): NiPersonData {
  const cleanSnippet = (snippet || '').replace(/\r/g, '');

  const nome = extractPersonNome(cleanSnippet) || `PARTE ${idx + 1}`;
  const folhaExtracted = extractFolhas(cleanSnippet);
  const folha = (folhaExtracted && folhaExtracted !== '01') ? folhaExtracted : defaultFolha;
  const cpf = extractPersonCpf(cleanSnippet);
  const rg = extractPersonRg(cleanSnippet);
  const { pai, mae } = extractPersonFiliacao(cleanSnippet);
  const dataNascimento = extractPersonNascimento(cleanSnippet);
  const nacionalidade = extractPersonNacionalidade(cleanSnippet);
  const tipoParte = extractPersonTipo(cleanSnippet);
  const contatos = extractPersonContatos(cleanSnippet);

  return {
    id: `p-${crypto.randomUUID().slice(0, 8)}`,
    nome,
    folha,
    cpf,
    rg,
    pai,
    mae,
    dataNascimento,
    nacionalidade,
    tipoParte,
    ...contatos
  };
}

/**
 * Segmenta um texto contendo potencialmente múltiplos envolvidos em blocos individuais
 */
export function segmentPersonSnippets(text: string): string[] {
  const cleanText = (text || '').replace(/\r/g, '');

  const candidateSnippets = cleanText
    .split(/(?:^|\n)\s*(?:[-*•–—]\s+|\b(?=Testemunha|V[íi]tima|R[ée]u|Investigado|Indiciado|Pessoa\s+a\s+ser\s+intimada))/i)
    .map(s => s.trim())
    .filter(Boolean);

  const validSnippets: string[] = [];

  for (const snip of candidateSnippets) {
    // Ignora linhas que são puramente metadados processuais
    if (/^\s*\d{4,7}-\d{2}\.\d{4}/.test(snip)) continue;
    if (/^\s*audi[êe]ncia\b/i.test(snip)) continue;
    if (/^\s*(?:fls?|folhas?)\.?\s*\d+\s*$/i.test(snip)) continue;
    if (/^\s*pesquisa/i.test(snip)) continue;

    // Se contém indícios de dados de pessoa
    if (/\b(?:brasileir[oa]|solteir[oa]|casad[oa]|divorciad[oa]|rg|cpf|testemunha|intimada|r[ée]u|indiciado|investigado|v[íi]tima|nascid|filia[çc]|operador|ajudante)\b/i.test(snip)) {
      validSnippets.push(snip);
    }
  }

  // Se não foi possível segmentar por marcadores, utiliza o bloco inteiro
  if (validSnippets.length === 0 && cleanText.trim().length > 10) {
    validSnippets.push(cleanText.trim());
  }

  return validSnippets;
}

/**
 * MOTOR PRINCIPAL DE EXTRAÇÃO:
 * Executa a extração completa de Metadados e todas as Partes identificadas
 */
export function extractNiCompleteData(text: string, promotorias?: PromotoriaDef[]): NiExtractedData {
  const cleanText = (text || '').replace(/\r/g, '');

  // 1. Metadados do Processo
  const numeroProcesso = extractProcessoTJSP(cleanText) || undefined;
  const cargoInfo = extractCargoPromotor(cleanText, promotorias);
  const defaultFolha = extractFolhas(cleanText);
  const audInfo = extractDataAudiencia(cleanText);

  const cargo = cargoInfo?.cargo;
  const promotor = cargoInfo?.promotor;
  const cargoCode = cargoInfo?.cargoCode;
  const cargoDisplay = formatCargoDisplay(cargo);
  const dataAudiencia = audInfo?.dataAudiencia;
  const dataAudienciaOnly = audInfo?.dataAudienciaOnly;
  const urgente = audInfo?.urgente;
  const urgenteMotivo = audInfo?.label;
  const diffDays = audInfo?.diffDays;

  // 2. Segmentação e Extração das Partes
  const snippets = segmentPersonSnippets(cleanText);
  const partes: NiPersonData[] = [];

  snippets.forEach((snip, idx) => {
    const person = extractPersonFromSnippet(snip, defaultFolha, idx);
    if (person && person.nome && !/\b(?:AUDIÊNCIA|PROCESSO|CARGO|FOLHAS|MINISTÉRIO|TRIBUNAL|JUSTIÇA)\b/i.test(person.nome)) {
      partes.push(person);
    }
  });

  // ORDENAÇÃO E PRIORIZAÇÃO RIGOROSA:
  // Partes com qualificação completa (CPF, RG, Filiação) ou explicitamente identificadas como
  // "Pessoa a ser intimada" ou "Vítima" têm precedência MÁXIMA sobre nomes sem documentos
  // (como réus citados apenas no cabeçalho do processo TJSP).
  partes.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.cpf) scoreA += 30;
    if (a.rg) scoreA += 25;
    if (a.mae) scoreA += 15;
    if (a.pai) scoreA += 10;
    if (a.dataNascimento) scoreA += 10;
    if (a.tipoParte === 'Vítima') scoreA += 10;
    if (a.tipoParte === 'Testemunha') scoreA += 5;
    if (new RegExp(`(?:Pessoa\\s+a\\s+ser\\s+intimada|intimada|intimando)[:\\s]*${a.nome.split(' ')[0]}`, 'i').test(cleanText)) scoreA += 50;

    if (b.cpf) scoreB += 30;
    if (b.rg) scoreB += 25;
    if (b.mae) scoreB += 15;
    if (b.pai) scoreB += 10;
    if (b.dataNascimento) scoreB += 10;
    if (b.tipoParte === 'Vítima') scoreB += 10;
    if (b.tipoParte === 'Testemunha') scoreB += 5;
    if (new RegExp(`(?:Pessoa\\s+a\\s+ser\\s+intimada|intimada|intimando)[:\\s]*${b.nome.split(' ')[0]}`, 'i').test(cleanText)) scoreB += 50;

    return scoreB - scoreA;
  });

  // Primeira parte para compatibilidade direta de propriedades planas (agora sempre a parte principal qualificada)
  const firstPerson = partes[0] || {
    nome: '',
    folha: defaultFolha || '01',
    cpf: '',
    rg: '',
    dataNascimento: '',
    nacionalidade: 'Brasileiro',
    pai: '',
    mae: ''
  };

  return {
    ...firstPerson,
    partes,
    numeroProcesso,
    cargo,
    promotor,
    cargoCode,
    cargoDisplay,
    dataAudiencia,
    dataAudienciaOnly,
    urgente,
    urgenteMotivo,
    diffDays
  };
}

/* =========================================================================
   5. FORMATADOR PADRÃO OFICIAL (SAÍDA DA PESQUISA N.I)
   ========================================================================= */

/**
 * Gera a string de saída padronizada exatamente conforme a especificação do usuário
 */
export function formatStandardNiOutput(
  caseMeta: Partial<NiCaseMetadata>, 
  partes: NiPersonData[]
): string {
  const proc = caseMeta.numeroProcesso || '________________';
  const dataAud = caseMeta.dataAudienciaOnly || extractDateOnly(caseMeta.dataAudiencia);
  const prioridade = caseMeta.urgente ? 'Urgente' : 'Normal';
  
  const cargoFormatted = caseMeta.cargoDisplay || formatCargoDisplay(caseMeta.cargo) || '________________';
  const promotorName = caseMeta.promotor || (
    caseMeta.cargo?.includes('79') ? 'Margareth Ferraz França' :
    caseMeta.cargo?.includes('71') ? "Leonardo D'Angelo Vargas Pereira" :
    '________________'
  );

  let output = `Autos: ${proc}\n`;
  output += `Data Audiência: ${dataAud} | Prioridade: ${prioridade}\n`;
  output += `Promotor: ${promotorName} | Cargo: ${cargoFormatted}\n\n`;

  if (!partes || partes.length === 0) {
    output += `• Nenhuma parte cadastrada`;
    return output;
  }

  partes.forEach((p, idx) => {
    if (idx > 0) output += `\n`;
    output += `• Nome: ${p.nome || '________________'} - (Fls. ${p.folha || '____'})\n`;
    output += `• Nacionalidade: ${p.nacionalidade || 'Brasileiro'}\n`;
    output += `• CPF: ${p.cpf ? formatCPF(p.cpf) : '________________'}\n`;
    output += `• RG: ${p.rg ? formatRG(p.rg) : '________________'}\n`;
    output += `• Pai: ${p.pai || '________________'}\n`;
    output += `• Mãe: ${p.mae || '________________'}\n`;
    output += `• Data de Nascimento: ${p.dataNascimento || '____/____/____'}\n`;
  });

  return output.trim();
}
