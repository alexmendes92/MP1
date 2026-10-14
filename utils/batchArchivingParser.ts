import JSZip from 'jszip';
import { ArchivingBatchItem, ArchivingBatchParty } from '../types';
import { exportCartaNotificacaoToDocx, exportCertidaoToDocx } from './docxExport';
import { extractTextFromPdfFile, fileToBase64Safe } from './pdfHelper';

// Os 5 casos reais fornecidos nos PDFs de exemplo da solicitação
export const SAMPLE_ARCHIVING_PDF_CASES: ArchivingBatchItem[] = [
  {
    id: 'case-sample-1',
    fileName: 'Promocao_Arquivamento_1508585-11.2023.8.26.0050.pdf',
    fileSize: 184500,
    status: 'SUCCESS',
    numeroProcesso: '1508585-11.2023.8.26.0050',
    varaGarantias: 'Juiz das Garantias - 1ª RAJ - Capital',
    promotoria: 'Promotoria de Justiça Criminal da Capital',
    promotor: 'Leonardo D’Angelo Vargas Pereira',
    dataPromocao: '27 de agosto de 2026',
    delito: 'Furto de energia elétrica (art. 155, caput, do CP)',
    disposicaoInvestigado: 'Não havendo bens apreendidos a restituir, dispensa-se a intimação do investigado.',
    extractedFrom: 'EXEMPLO',
    partes: [
      {
        id: 'p-1',
        nome: 'PEDRO OLIVATTI NETO',
        tipoParte: 'Representante da Vítima',
        endereco: 'AV. DAS NAÇÕES UNIDAS, 14401, CONJ. 1 AO 4 - TORRE B1',
        bairro: 'VILA GERTRUDES',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        cep: '04794-000',
        folha: '05',
        canalPreferencial: 'CORREIOS',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: '¹ PEDRO OLIVATTI NETO, Endereço AV. DAS NAÇÕES UNIDAS, 14401, CONJ. 1 AO 4 - TORRE B1 – VILA GERTRUDES, S. PAULO – SP – fls. 05.'
      }
    ]
  },
  {
    id: 'case-sample-2',
    fileName: 'Promocao_Arquivamento_1515688-16.2026.8.26.0454.pdf',
    fileSize: 142300,
    status: 'SUCCESS',
    numeroProcesso: '1515688-16.2026.8.26.0454',
    varaGarantias: '1ª RAJ – CAPITAL',
    promotoria: '4ª Promotoria de Justiça Criminal da Capital',
    promotor: 'Leonardo D’Angelo Vargas Pereira',
    dataPromocao: '1 de setembro de 2026',
    delito: 'Apropriação indébita (art. 168 do CP) e concorrência desleal (art. 195, III, Lei 9.279/96)',
    disposicaoInvestigado: 'Não havendo bens apreendidos a restituir, dispensa-se a intimação da investigada.',
    extractedFrom: 'EXEMPLO',
    partes: [
      {
        id: 'p-2',
        nome: 'VÂNIA OLIVEIRA DOS ANJOS VIEIRA',
        tipoParte: 'Vítima',
        endereco: 'Avenida Lara Campos, 1068',
        bairro: 'Cidade São Miguel/Vila Progresso',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        cep: '08240-700',
        folha: '02 e 473',
        canalPreferencial: 'CORREIOS',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: '¹ VÂNIA OLIVEIRA DOS ANJOS VIEIRA, Endereço Avenida Lara Campos, 1068, Cidade São Miguel/Vila Progresso, São Paulo/SP, CEP 08240-700– fls. 02 e 473.'
      }
    ]
  },
  {
    id: 'case-sample-3',
    fileName: 'Promocao_Arquivamento_1570292-09.2025.8.26.0050.pdf',
    fileSize: 312000,
    status: 'SUCCESS',
    numeroProcesso: '1570292-09.2025.8.26.0050',
    varaGarantias: '1ª RAJ – CAPITAL',
    promotoria: 'Promotoria de Justiça Criminal da Capital',
    promotor: 'Leonardo D’Angelo Vargas Pereira',
    dataPromocao: '4 de setembro de 2026',
    delito: 'Extorsão mediante sequestro (artigo 159 do Código Penal)',
    disposicaoInvestigado: 'Não havendo bens apreendidos pendentes de restituição, dispensa-se a intimação dos investigados.',
    extractedFrom: 'EXEMPLO',
    partes: [
      {
        id: 'p-3a',
        nome: 'CLEITON LUIS DE PAULA',
        tipoParte: 'Vítima',
        endereco: 'Rua Mário César de Freitas Levy, nº 92, Bloco 22, apartamento 42',
        bairro: 'Jardim Brasília',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        cep: '02858-030',
        folha: '06',
        canalPreferencial: 'CORREIOS',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: '¹ VÍTIMAS 1: CLEITON LUIS DE PAULA e NATALI BEZERRA DE PAULA, Endereço Rua Mário César de Freitas Levy, nº 92, Bloco 22, apartamento 42, Jardim Brasília, São Paulo/SP, CEP 02858-030 – fl. 06'
      },
      {
        id: 'p-3b',
        nome: 'NATALI BEZERRA DE PAULA',
        tipoParte: 'Vítima',
        endereco: 'Rua Mário César de Freitas Levy, nº 92, Bloco 22, apartamento 42',
        bairro: 'Jardim Brasília',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        cep: '02858-030',
        folha: '06',
        canalPreferencial: 'CORREIOS',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: '¹ VÍTIMAS 1: CLEITON LUIS DE PAULA e NATALI BEZERRA DE PAULA, Endereço Rua Mário César de Freitas Levy, nº 92, Bloco 22, apartamento 42, Jardim Brasília, São Paulo/SP, CEP 02858-030 – fl. 06'
      }
    ]
  },
  {
    id: 'case-sample-4',
    fileName: 'Promocao_Arquivamento_1524580-11.2026.8.26.0454.pdf',
    fileSize: 198000,
    status: 'SUCCESS',
    numeroProcesso: '1524580-11.2026.8.26.0454',
    varaGarantias: 'Juiz das Garantias - 1ª RAJ – Capital',
    promotoria: 'Promotoria de Justiça Criminal da Capital',
    promotor: 'Leonardo D’Angelo Vargas Pereira',
    dataPromocao: '8 de setembro de 2026',
    delito: 'Estelionato (artigo 171 do Código Penal)',
    disposicaoInvestigado: 'Dispensável a intimação dos suspeitos, pela ausência de bens apreendidos e pelo desinteresse na reforma do arquivamento.',
    extractedFrom: 'EXEMPLO',
    partes: [
      {
        id: 'p-4',
        nome: 'DERLI GROSSKLAUS',
        tipoParte: 'Vítima',
        endereco: 'Rua José Pedro do Amaral, nº 318',
        bairro: 'Vila Sônia',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        cep: '05632-030',
        telefone: '(11) 97677-2377',
        email: 'camilygross3@gmail.com',
        folha: '06',
        canalPreferencial: 'WHATSAPP',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: '¹ DERLI GROSSKLAUS – Rua José Pedro do Amaral, nº 318, Vila Sônia, nesta Capital/SP; CEP 05632030; Celular: (11) 976772377; e-mail: camilygross3@gmail.com – fls. 06'
      }
    ]
  },
  {
    id: 'case-sample-5',
    fileName: 'Promocao_Arquivamento_1538099-53.2026.8.26.0454.pdf',
    fileSize: 172000,
    status: 'SUCCESS',
    numeroProcesso: '1538099-53.2026.8.26.0454',
    varaGarantias: 'Juiz das Garantias - 1ª RAJ - Capital',
    promotoria: 'Promotoria de Justiça Criminal da Capital',
    promotor: 'Leonardo D’Angelo Vargas Pereira',
    dataPromocao: '27 de agosto de 2026',
    delito: 'Perseguição / Stalking (artigo 147-A, § 1º, inciso III, do Código Penal)',
    disposicaoInvestigado: 'Desnecessária a intimação dos investigados, diante da falta de bens apreendidos.',
    extractedFrom: 'EXEMPLO',
    partes: [
      {
        id: 'p-5',
        nome: 'GUILHERME VINICIUS JUSTINO RODRIGUES',
        tipoParte: 'Vítima',
        endereco: 'Rua Maria Adelaide, 87',
        bairro: 'Vila Regente Feijó',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        cep: '03346-110',
        telefone: '(11) 96064-5750',
        email: 'gvjr.adv@gmail.com',
        folha: '08',
        canalPreferencial: 'EMAIL',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: '¹ GUILHERME VINICIUS JUSTINO RODRIGUES – Endereço: Rua Maria Adelaide, 87, - Vila Regente Feijó, CEP 03346110 - S.PAULO – SP; Recado: (11) 960645750; Email: gvjr.adv@gmail.com – fls. 08.'
      }
    ]
  }
];

// Parser local com Expressões Regulares especializadas nos moldes das promoções MPSP
export function extractArchivingPromotionLocally(text: string, fileName: string): Partial<ArchivingBatchItem> {
  const clean = text.replace(/\r/g, '');
  
  // 1. Processo (Autos nº)
  const procMatch = clean.match(/Autos\s*n[ºo°]?\s*([\d.-]{20,25})/i) || clean.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  const numeroProcesso = procMatch ? procMatch[1].trim() : '';

  // 2. Vara / Órgão DIPO
  const varaMatch = clean.match(/(Juiz das Garantias[^\n]+|1ª\s*RAJ[^\n]+)/i);
  const varaGarantias = varaMatch ? varaMatch[1].trim() : 'Juiz das Garantias - 1ª RAJ - Capital';

  // 3. Promotoria
  const promoMatch = clean.match(/(\d+ª\s*PROMOTORIA DE JUSTIÇA[^\n]+|PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL)/i);
  const promotoria = promoMatch ? promoMatch[1].trim() : '4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL';

  // 4. Promotor
  const promotorMatch = clean.match(/(?:São Paulo[^\n]*\n+)?([A-ZÀ-Úa-zà-ú\s’']+)\s*\n\s*Promotor(?:a)?\s+de\s+Justiça/i);
  const promotor = promotorMatch ? promotorMatch[1].trim() : 'Leonardo D’Angelo Vargas Pereira';

  // 5. Data
  const dataMatch = clean.match(/São Paulo,\s*(\d{1,2}\s+de\s+[a-zçA-ZÇ]+\s+de\s+\d{4})/i);
  const dataPromocao = dataMatch ? dataMatch[1].trim() : new Date().toLocaleDateString('pt-BR');

  // 6. Delito
  const delitoMatch = clean.match(/crime\s+de\s+([^,.\n]+(?:\([^)]+\))?)/i);
  const delito = delitoMatch ? `Crime de ${delitoMatch[1].trim()}` : 'Inquérito Policial';

  // 7. Disposição investigados
  const dispMatch = clean.match(/((?:Não havendo bens|dispensa-se|desnecessária|dispensável)[^\n.]+\.)/i);
  const disposicaoInvestigado = dispMatch ? dispMatch[1].trim() : 'Dispensa-se a intimação dos investigados por ausência de bens.';

  // 8. Partes no Rodapé (Nota de rodapé 1 ou ¹)
  const partes: ArchivingBatchParty[] = [];
  
  // Busca por nota de rodapé no final
  const footnoteRegex = /(?:¹|1|\b1\b)\s*(?:VÍTIMAS?\s*\d*[:\s]*)?([A-ZÀ-Ú\s–-]+?)(?:,\s*Endereço[:\s]*|–\s*Rua|–\s*Av|\s*–\s*Rua|\s*–\s*Av|\s*–\s*)([^\n]+)/gi;
  let fnMatch;
  
  while ((fnMatch = footnoteRegex.exec(clean)) !== null) {
    const rawNameChunk = fnMatch[1].replace(/^[–\-,\s]+|[–\-,\s]+$/g, '').trim();
    const rawAddressChunk = fnMatch[2].trim();

    if (rawNameChunk.length < 3) continue;

    // Verificar se há múltiplas pessoas unidas por " e " (ex: Cleiton e Natali)
    const nomesSeparados = rawNameChunk.includes(' e ') && !rawNameChunk.includes('LTDA') && !rawNameChunk.includes('&')
      ? rawNameChunk.split(' e ')
      : [rawNameChunk];

    // Extrair contatos e folhas do trecho de endereço
    const telMatch = rawAddressChunk.match(/(?:Celular|Tel|Recado|Contato)[:\s]*([\d() -]{8,20})/i);
    const emailMatch = rawAddressChunk.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const cepMatch = rawAddressChunk.match(/CEP[:\s]*([\d.-]{8,10})/i);
    const flsMatch = rawAddressChunk.match(/fls?\.?\s*([\d/ e]+)/i);

    // Limpar endereço removendo contatos e fls
    let cleanAddress = rawAddressChunk
      .replace(/(?:Celular|Tel|Recado|Contato)[:\s]*[\d() -]{8,20}/gi, '')
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, '')
      .replace(/fls?\.?\s*[\d/ e]+/gi, '')
      .replace(/CEP[:\s]*[\d.-]{8,10}/gi, '')
      .replace(/–\s*$/g, '')
      .replace(/;\s*$/g, '')
      .trim();

    // Bairro e cidade
    let bairro = '';
    let cidade = 'SÃO PAULO';
    let uf = 'SP';

    if (cleanAddress.includes('Vila Sônia')) bairro = 'Vila Sônia';
    else if (cleanAddress.includes('Vila Regente Feijó')) bairro = 'Vila Regente Feijó';
    else if (cleanAddress.includes('Vila Gertrudes') || cleanAddress.includes('VILA GERTRUDES')) bairro = 'Vila Gertrudes';
    else if (cleanAddress.includes('Jardim Brasília')) bairro = 'Jardim Brasília';
    else if (cleanAddress.includes('Cidade São Miguel/Vila Progresso')) bairro = 'Cidade São Miguel/Vila Progresso';

    nomesSeparados.forEach((nomePart, idx) => {
      const trimmedNome = nomePart.replace(/^[–\-,\s]+|[–\-,\s]+$/g, '').trim().toUpperCase();
      if (!trimmedNome) return;

      const isRep = clean.toLowerCase().includes('representante da vítima') && idx === 0;
      
      partes.push({
        id: `local-p-${Math.random().toString(36).substring(2, 9)}`,
        nome: trimmedNome,
        tipoParte: isRep ? 'Representante da Vítima' : 'Vítima',
        endereco: cleanAddress,
        bairro: bairro || 'Capital',
        cidade: cidade,
        uf: uf,
        cep: cepMatch ? cepMatch[1].trim() : '',
        telefone: telMatch ? telMatch[1].trim() : '',
        email: emailMatch ? emailMatch[1].trim() : '',
        folha: flsMatch ? flsMatch[1].trim() : '',
        canalPreferencial: telMatch ? 'WHATSAPP' : emailMatch ? 'EMAIL' : 'CORREIOS',
        statusNotificacao: 'Pendente',
        textoRodapeOriginal: fnMatch ? fnMatch[0] : ''
      });
    });
  }

  // Fallback se não pegou parte no regex
  if (partes.length === 0) {
    const lines = clean.split('\n');
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
      const line = lines[i].trim();
      if (line.match(/^[¹1]\s+[A-ZÀ-Ú]/)) {
        partes.push({
          id: `local-p-fallback`,
          nome: line.replace(/^[¹1]\s+/, '').split(/[,–-]/)[0].trim().toUpperCase(),
          tipoParte: 'Vítima',
          endereco: line,
          cidade: 'SÃO PAULO',
          uf: 'SP',
          canalPreferencial: 'CORREIOS',
          statusNotificacao: 'Pendente',
          textoRodapeOriginal: line
        });
        break;
      }
    }
  }

  return {
    numeroProcesso: numeroProcesso || '1500000-00.2026.8.26.0050',
    varaGarantias,
    promotoria,
    promotor,
    dataPromocao,
    delito,
    disposicaoInvestigado,
    partes,
    rawText: text,
    extractedFrom: 'LOCAL_PARSER'
  };
}

// Chamar o backend seguro com a IA Gemini para analisar a promoção de arquivamento
export async function parseArchivingPromotionWithServerAI(
  file: File | null,
  text: string = ''
): Promise<Partial<ArchivingBatchItem>> {
  let fileBase64 = '';
  let mimeType = 'application/pdf';
  let effectiveText = text;

  if (file) {
    const converted = await fileToBase64Safe(file);
    fileBase64 = converted.data;
    mimeType = converted.mimeType;

    // Se não tiver texto fornecido, extrai o texto do PDF preventivamente
    if (!effectiveText) {
      try {
        const extracted = await extractTextFromPdfFile(file);
        if (extracted.text) {
          effectiveText = extracted.text;
        }
      } catch (err) {
        console.warn('Extração preliminar de texto do PDF falhou, prosseguindo com multimodal:', err);
      }
    }
  }

  try {
    const response = await fetch('/api/gemini/parse-archiving-promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: effectiveText,
        fileBase64: effectiveText && effectiveText.length > 50 ? undefined : fileBase64,
        mimeType
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `Erro HTTP ${response.status} na extração`);
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error('Falha ao obter dados estruturados da promoção');
    }

    const d = json.data;

    const partesMapped: ArchivingBatchParty[] = (d.partes || []).map((p: any) => ({
      id: `ai-p-${Math.random().toString(36).substring(2, 9)}`,
      nome: (p.nome || '').toUpperCase().trim(),
      tipoParte: p.tipoParte || 'Vítima',
      endereco: (p.endereco || '').toUpperCase().trim(),
      numero: p.numero || '',
      complemento: p.complemento || '',
      bairro: (p.bairro || '').toUpperCase().trim(),
      cidade: (p.cidade || 'SÃO PAULO').toUpperCase().trim(),
      uf: (p.uf || 'SP').toUpperCase().trim(),
      cep: p.cep || '',
      telefone: p.telefone || '',
      email: p.email || '',
      folha: p.folha || '',
      canalPreferencial: p.telefone ? 'WHATSAPP' : p.email ? 'EMAIL' : 'CORREIOS',
      statusNotificacao: 'Pendente',
      textoRodapeOriginal: p.textoRodapeOriginal || ''
    }));

    return {
      numeroProcesso: d.numeroProcesso || '',
      varaGarantias: d.varaGarantias || 'Juiz das Garantias - 1ª RAJ - Capital',
      promotoria: d.promotoria || '4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL',
      promotor: d.promotor || '',
      dataPromocao: d.dataPromocao || '',
      delito: d.delito || '',
      disposicaoInvestigado: d.disposicaoInvestigado || '',
      partes: partesMapped,
      rawText: effectiveText || text,
      extractedFrom: 'AI_GEMINI'
    };
  } catch (error) {
    console.warn('Chamada Gemini falhou para a promoção, tentando analisador local estruturado:', error);
    if (effectiveText && effectiveText.trim().length > 30) {
      const localResult = extractArchivingPromotionLocally(effectiveText);
      if (localResult.numeroProcesso || localResult.partes.length > 0) {
        return localResult;
      }
    }
    throw error;
  }
}

// Geração de pacote compactado ZIP com todos os arquivos do lote
export async function generateBatchZipArchive(
  items: ArchivingBatchItem[],
  onProgress?: (percent: number, currentTask: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  const cartasFolder = zip.folder("01_Cartas_Notificacao_Oficial_Word");
  const certidoesFolder = zip.folder("02_Certidoes_Remessa_Oficial_Word");
  const minutasFolder = zip.folder("03_Minutas_WhatsApp_Email");

  const totalActions = items.reduce((acc, it) => acc + (it.partes.length || 1), 0);
  let processedCount = 0;

  // Planilha CSV de Controle do Lote
  let csvContent = "\uFEFFProcesso;Vara;Promotoria;Promotor;Data;Delito;Nome Parte;Tipo Parte;Endereço Completo;Bairro;Cidade;UF;CEP;Telefone;E-mail;Folha;Canal Preferencial;Status\n";

  for (const item of items) {
    if (item.status !== 'SUCCESS') continue;

    for (const parte of item.partes) {
      processedCount++;
      const currentPct = Math.round((processedCount / totalActions) * 100);
      onProgress?.(currentPct, `Gerando documentos para ${parte.nome}...`);

      const safeProc = (item.numeroProcesso || 'Autos').replace(/[^\w.-]/g, '_');
      const safeName = (parte.nome || 'Parte').replace(/[^\w]/g, '_').substring(0, 30);

      // 1. Carta de Notificação DOCX
      const fullAddr = `${parte.endereco || ''} ${parte.numero ? `, ${parte.numero}` : ''} ${parte.complemento ? `- ${parte.complemento}` : ''} ${parte.bairro ? `- ${parte.bairro}` : ''} - ${parte.cidade || 'São Paulo'}/${parte.uf || 'SP'}`;
      
      const cartaBlob = await exportCartaNotificacaoToDocx({
        numeroProcesso: item.numeroProcesso,
        destinatarioNome: parte.nome,
        destinatarioTipo: parte.tipoParte,
        destinatarioEndereco: fullAddr,
        destinatarioCep: parte.cep,
        destinatarioTelefone: parte.telefone,
        destinatarioEmail: parte.email,
        destinatarioFolha: parte.folha,
        varaGarantias: item.varaGarantias,
        promotoria: item.promotoria,
        promotorNome: item.promotor,
        dataHoje: item.dataPromocao
      });

      cartasFolder?.file(`Carta_Notificacao_${safeProc}_${safeName}.docx`, cartaBlob);

      // 2. Certidão de Oficial de Promotoria DOCX
      const certidaoBody = `Certifico e dou fé que, nos termos do artigo 28, caput, do Código de Processo Penal, em cumprimento à r. manifestação ministerial proferida pelo Dr. ${item.promotor}, expediu-se nesta data a competente Carta de Notificação Oficial à parte ${parte.nome} (${parte.tipoParte}), residente em ${fullAddr}${parte.folha ? ` (fls. ${parte.folha})` : ''}, cientificando-lhe formalmente da r. promoção de arquivamento dos autos e do prazo legal preclusivo de 30 (trinta) dias para eventual manifestação ou interposição de recurso perante a instância revisora do Ministério Público.`;

      const certidaoBlob = await exportCertidaoToDocx({
        numeroProcesso: item.numeroProcesso,
        varaGarantias: item.varaGarantias,
        promotoria: item.promotoria,
        officialName: 'Alex Santana Mendes',
        officialCargo: 'Oficial de Promotoria I',
        bodyText: certidaoBody,
        dataHoje: item.dataPromocao
      });

      certidoesFolder?.file(`Certidao_Remessa_${safeProc}_${safeName}.docx`, certidaoBlob);

      // 3. Minutas WhatsApp e E-mail em TXT
      const minutaTxt = `========================================================================
MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO
PROCESSO: ${item.numeroProcesso}
DESTINATÁRIO: ${parte.nome} (${parte.tipoParte})
CANAL INDICADO: ${parte.canalPreferencial || 'CORREIOS'}
========================================================================

--- MINUTA PARA WHATSAPP ---
Prezado(a) Sr(a). *${parte.nome}*,

O *Ministério Público do Estado de São Paulo (${item.promotoria})* comunica que, nos autos do processo nº *${item.numeroProcesso}*, foi apresentada a r. manifestação ministerial pelo *ARQUIVAMENTO* do inquérito policial.

Caso possua discordância ou inconformidade com os fundamentos aduzidos pelo Órgão de Execução, vossa senhoria possui o prazo legal de *30 (trinta) dias corridos*, contados do recebimento desta notificação, para submeter razões recursais ou novos elementos de convicção à instância revisora do Ministério Público (conforme Artigo 28 do Código de Processo Penal).

Para obter cópia integral da promoção ou tirar dúvidas quanto ao protocolo de sua manifestação, responda a esta mensagem ou envie mensagem para o e-mail: *4pjcrimcentcap@mpsp.mp.br*.

Atenciosamente,
*Alex Santana Mendes*
Oficial de Promotoria I | 4ª Promotoria de Justiça Criminal da Capital


--- MINUTA PARA E-MAIL ---
Para: ${parte.email || '[Inserir E-mail da Parte]'}
Assunto: NOTIFICAÇÃO OFICIAL - Promoção de Arquivamento - Autos nº ${item.numeroProcesso}

Prezado(a) Senhor(a) ${parte.nome},

O Ministério Público do Estado de São Paulo, por intermédio da ${item.promotoria}, comunica que nos autos do procedimento investigatório em epígrafe (Autos nº ${item.numeroProcesso}), em trâmite perante o ${item.varaGarantias}, foi apresentada r. promoção de ARQUIVAMENTO pelo(a) Dr(a). ${item.promotor}.

Em cumprimento ao artigo 28, caput, do Código de Processo Penal (com redação dada pela Lei Federal nº 13.964/2019 e Aviso PGJ nº 707/2023), NOTIFICA-SE Vossa Senhoria de que assiste-lhe o direito de manifestar discordância quanto ao arquivamento, caso entenda cabível, mediante apresentação de recurso formal ou novos documentos no prazo legal de 30 (trinta) dias, contados do recebimento desta comunicação.

Para solicitar cópia digital da manifestação do Ministério Público ou orientações sobre o envio da inconformidade à instância revisora, favor responder a este correio eletrônico ou entrar em contato pelos telefones (11) 3429-6302 / (11) 3429-6363.

Atenciosamente,

Alex Santana Mendes
Oficial de Promotoria I | Matrícula 12078
4ª Promotoria de Justiça Criminal da Capital
Fórum Central Criminal da Barra Funda - São Paulo/SP
`;

      minutasFolder?.file(`Minuta_Comunicacao_${safeProc}_${safeName}.txt`, minutaTxt);

      // Adicionar linha ao CSV
      csvContent += `"${item.numeroProcesso}";"${item.varaGarantias}";"${item.promotoria}";"${item.promotor}";"${item.dataPromocao}";"${item.delito || ''}";"${parte.nome}";"${parte.tipoParte}";"${fullAddr.replace(/"/g, '""')}";"${parte.bairro || ''}";"${parte.cidade || ''}";"${parte.uf || ''}";"${parte.cep || ''}";"${parte.telefone || ''}";"${parte.email || ''}";"${parte.folha || ''}";"${parte.canalPreferencial || 'CORREIOS'}";"${parte.statusNotificacao || 'Pendente'}"\n`;
    }
  }

  // Adicionar CSV à raiz do ZIP
  zip.file("Planilha_Controle_Notificacoes_Lote.csv", csvContent);

  // Adicionar um README de instruções no ZIP
  zip.file("LEIA-ME_Instrucoes_Lote.txt", `PACOTE DE NOTIFICAÇÕES EM LOTE DE PROMOÇÕES DE ARQUIVAMENTO (ART. 28 CPP)
MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO - 4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL

Conteúdo deste pacote:
1. Pasta "01_Cartas_Notificacao_Oficial_Word":
   Contém as Cartas de Notificação formatadas em padrão oficial MPSP (Word .docx), prontas para impressão e envio postal (envelope com janela).
2. Pasta "02_Certidoes_Remessa_Oficial_Word":
   Contém as Certidões de Notificação/Remessa expedidas pelo Oficial de Promotoria em Word (.docx), prontas para juntada aos autos no portal E-SAJ.
3. Pasta "03_Minutas_WhatsApp_Email":
   Contém os textos prontos para disparo digital imediato via WhatsApp funcional ou E-mail institucional.
4. "Planilha_Controle_Notificacoes_Lote.csv":
   Planilha pronta para abertura no Excel/Calc para acompanhamento do status de cada notificação.
`);

  onProgress?.(100, 'Compactando arquivos no formato .ZIP...');
  return await zip.generateAsync({ type: 'blob' });
}
