import JSZip from 'jszip';
import { BatchNiItem, BatchNiPerson } from '../types';
import { exportPesquisaNiToDocx, exportConsolidatedPesquisaNiToDocx } from './docxExport';
import { 
  extractNiCompleteData,
  extractPersonFromSnippet as extractPersonFromSnippetCore,
  formatStandardNiOutput,
  extractCargoPromotor, 
  extractDataAudiencia, 
  extractFolhas, 
  cleanPartyName, 
  calculateUrgencyFromAudiencia,
  formatRG,
  formatCPF,
  extractDateOnly
} from './niRulesHelper';

// Os 10 casos reais presentes no documento de exemplo enviado pelo usuário
export const SAMPLE_BATCH_NI_CASES: BatchNiItem[] = [
  {
    id: 'case-ni-1',
    numeroProcesso: '1519377-68.2026.8.26.0454',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '09/11/2026 às 13:15h',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-1',
        nome: 'LUCAS BIOCALTTI DE PAULA SOUZA',
        tipoParte: 'Vítima',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '50548354',
        cpf: '335.736.418-22',
        pai: 'RICARDO DE PAULA SOUZA',
        mae: 'IVANI BIOCALTTI RODRIGUEZ',
        dataNascimento: '10/08/1996',
        endereco: 'RUA SOUSA LIMA, 274, CASA 3, SANTA CECILIA, CEP 01153-020, São Paulo - SP',
        mandadoNumero: '050.2026/180194-0'
      }
    ]
  },
  {
    id: 'case-ni-2',
    numeroProcesso: '0063582-38.2011.8.26.0050',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '14/09/2026 às 13:15h',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-2',
        nome: 'PAULINE SOARES LELIS',
        tipoParte: 'Testemunha',
        folha: '01',
        nacionalidade: 'Brasileira',
        rg: '355680713',
        pai: 'JOVENTINO FERRAZ LELIS',
        mae: 'MARIA DO SOCORRO SOARES',
        dataNascimento: '12/05/1990',
        telefone: '(11) 5722-9398 / (11) 2964-7746',
        endereco: 'Rua Conto de Areia, 202, APTO. 33 - B, CONJUNTO HABITACIONAL, CEP 08474-220, São Paulo - SP'
      }
    ]
  },
  {
    id: 'case-ni-3',
    numeroProcesso: '1523280-47.2025.8.26.0228',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-3',
        nome: 'VINÍCIUS PEREIRA DA SILVA MOTA',
        tipoParte: 'Réu',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '63921913',
        cpf: '546.088.938-31',
        pai: 'EVERSON MOTA',
        mae: 'ELIANE PEREIRA DA SILVA',
        dataNascimento: '21/01/2006',
        telefone: '(11) 96650-9234',
        endereco: 'Rua Monge de Frise, 804, Jardim Sabia II, CEP 04856-540, São Paulo - SP'
      }
    ]
  },
  {
    id: 'case-ni-4',
    numeroProcesso: '0084396-61.2017.8.26.0050',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '14/10/2026 às 14:45h (Audiência Virtual ANPP)',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-4',
        nome: 'TIAGO LOURENÇO DA SILVA',
        tipoParte: 'Réu',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '44660706',
        cpf: '399.847.468-44',
        pai: 'SEVERINO FRANCISCO DA SILVA',
        mae: 'MARTA MARIA LOURENÇO DA SILVA',
        dataNascimento: '20/12/1982',
        telefone: '(11) 95901-1630 / (11) 94847-8778',
        email: 'tiagolourencosilva00@gmail.com',
        endereco: 'Travessa Paracelsus, 48, Casa 1, Jardim Sao Gabriel, CEP 03939-050, São Paulo - SP'
      }
    ]
  },
  {
    id: 'case-ni-5',
    numeroProcesso: '1501286-24.2021.8.26.0156',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '03/12/2026 às 14:00h',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-5',
        nome: 'JULIANA DOS SANTOS REFUNDINI',
        tipoParte: 'Vítima',
        folha: '01',
        nacionalidade: 'Brasileira',
        rg: '44533384',
        pai: 'VALDECIR TADEU REFUNDINI',
        mae: 'MARIA APARECIDA DOS SANTOS REFUNDINI',
        dataNascimento: '31/12/1994',
        endereco: 'Rua Elisabete Bardon, 8A, CASA 2, Parque America, CEP 04822-340, São Paulo - SP'
      }
    ]
  },
  {
    id: 'case-ni-6',
    numeroProcesso: '1521691-84.2026.8.26.0454',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '18/11/2026 às 14:00h',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-6a',
        nome: 'YGOR DA CUNHA VERAS',
        tipoParte: 'Vítima',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '37619326',
        cpf: '421.615.228-76',
        pai: 'ANDERSON DOS SANTOS VERAS',
        mae: 'MARIA REGINALDA CUNHA VERAS',
        dataNascimento: '28/01/2001',
        endereco: 'Rua Pablo Picasso, 80, Agua Branca, CEP 05036-160, São Paulo - SP'
      },
      {
        id: 'p-ni-6b',
        nome: 'GUILHERME GABRIEL DUARTE SANTOS',
        tipoParte: 'Réu',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '56625794',
        cpf: '531.408.458-98',
        pai: 'ANTONIO CARLOS DE SOUSA SANTOS',
        mae: 'LUZIANA BARBOSA DUARTE MANOEL',
        dataNascimento: '04/05/2007',
        endereco: 'Rua Batista Fergusio, 01, VIELA JOSE SANTANA - 1A, Vila Cardoso Franco, CEP 03978-180, São Paulo - SP'
      }
    ]
  },
  {
    id: 'case-ni-7',
    numeroProcesso: '1517277-42.2026.8.26.0228',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '21/10/2026 às 15:00h',
    urgente: true,
    observacao: 'Réu Preso / Tramitação prioritária',
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-7',
        nome: 'CARMEM FONSECA',
        tipoParte: 'Vítima',
        folha: '01',
        nacionalidade: 'Brasileira',
        telefone: '(11) 94970-2555',
        endereco: 'Largo Senador Raul Cardoso, 100, Vila Clementino, CEP 04021-070, São Paulo - SP',
        mandadoNumero: '050.2026/224385-9'
      }
    ]
  },
  {
    id: 'case-ni-8',
    numeroProcesso: '1518084-19.2023.8.26.0050',
    vara: 'Plantão / Vara Criminal',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-8',
        nome: 'ARICSON MARCOS DA SILVA LEITE',
        tipoParte: 'Investigado',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '58480938',
        cpf: '480.957.448-24',
        pai: 'ANDRE MARCOS DA SILVA LEITE',
        mae: 'KATIA CIRLENE HENRIQUE DA SILVA',
        dataNascimento: '09/10/2001'
      }
    ]
  },
  {
    id: 'case-ni-9',
    numeroProcesso: '1539662-82.2026.8.26.0454',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    dataAudiencia: '15/09/2026 às 15:00h',
    urgente: false,
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-9',
        nome: 'RONALDO MUNIZ RODRIGUES',
        tipoParte: 'Vítima',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '0220412820',
        cpf: '160.310.618-99',
        pai: 'LIVERCINIO PAULINO RODRIGUES',
        mae: 'MARIA NILDA MUNIZ RODRIGUES',
        dataNascimento: '24/07/1972',
        endereco: 'Rua Tupiratins, 14, Vila Taquari, CEP 08230-230, São Paulo - SP'
      }
    ]
  },
  {
    id: 'case-ni-10',
    numeroProcesso: '1540191-57.2023.8.26.0050',
    vara: '16ª Vara Criminal do Foro Central Criminal Barra Funda',
    urgente: true,
    observacao: 'Tramitação prioritária / Confidencial',
    status: 'SUCESSO',
    partes: [
      {
        id: 'p-ni-10',
        nome: 'MATHEUS RODRIGUES DA SILVA',
        tipoParte: 'Réu',
        folha: '01',
        nacionalidade: 'Brasileiro',
        rg: '39743965',
        cpf: '493.351.798-33',
        pai: 'LUIZ AVELINO DA SILVA',
        mae: 'JOSEFA RODRIGUES DOS SANTOS',
        dataNascimento: '08/10/2001',
        email: 'TEUZYN@LIVE.COM',
        endereco: 'R DA FLORESTA, 93, P TAIPAS, CEP 02987-120, São Paulo - SP',
        mandadoNumero: '050.2026/115866-1'
      }
    ]
  }
];

// Parser local com heurísticas jurídicas avançadas para textos com múltiplos processos
export function parseBatchNiText(rawText: string, defaultPromotor?: string, defaultCargo?: string): BatchNiItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Localiza todos os processos CNJ no texto
  const cnjRegex = /\b(\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4})\b/g;
  const matches: { processo: string; index: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = cnjRegex.exec(rawText)) !== null) {
    matches.push({ processo: m[1], index: m.index });
  }

  if (matches.length === 0) {
    // Caso não encontre nenhum processo CNJ, tenta criar um registro único com o texto total
    return [parseSingleBlock(rawText, '0000000-00.0000.8.26.0000', defaultPromotor, defaultCargo)];
  }

  const items: BatchNiItem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const block = rawText.slice(startIndex, endIndex);

    const item = parseSingleBlock(block, current.processo, defaultPromotor, defaultCargo);
    items.push(item);
  }

  return items;
}

function parseSingleBlock(block: string, processo: string, defaultPromotor?: string, defaultCargo?: string): BatchNiItem {
  // Executa o motor central refatorado de extração de dados N.I
  const extracted = extractNiCompleteData(block);

  let vara = '16ª Vara Criminal do Foro Central Criminal Barra Funda';
  const varaMatch = block.match(/(\d+ª\s*Vara\s*Criminal[^\n,]+)/i);
  if (varaMatch) {
    vara = varaMatch[1].trim();
  }

  const assignedCargo = extracted.cargo || defaultCargo || '71º Promotor de Justiça';
  const assignedPromotor = extracted.promotor || defaultPromotor || "Leonardo D'Angelo Vargas Pereira";
  const dataAudiencia = extracted.dataAudiencia || '';
  let urgente = extracted.urgente ?? false;

  // Se houver menção expressa a réu preso ou urgência extrema
  if (!urgente && /r[ée]u preso|urgente|tramita[çc][ãa]o priorit[áa]ria|cust[óo]dia/i.test(block)) {
    urgente = true;
  }

  const partes: BatchNiPerson[] = (extracted.partes && extracted.partes.length > 0)
    ? extracted.partes.map(p => ({
        id: p.id || `p-${crypto.randomUUID().slice(0, 8)}`,
        nome: p.nome,
        tipoParte: p.tipoParte || 'Vítima',
        folha: p.folha || '01',
        nacionalidade: p.nacionalidade || 'Brasileiro',
        cpf: p.cpf || '',
        rg: p.rg || '',
        pai: p.pai || '',
        mae: p.mae || '',
        dataNascimento: p.dataNascimento || '',
        endereco: p.endereco || '',
        telefone: p.telefone || '',
        email: p.email || '',
        mandadoNumero: p.mandadoNumero || ''
      }))
    : [{
        id: `p-${crypto.randomUUID().slice(0, 8)}`,
        nome: extracted.nome || 'PARTE IDENTIFICADA NOS AUTOS',
        tipoParte: 'Vítima',
        folha: extracted.folha || '01',
        nacionalidade: extracted.nacionalidade || 'Brasileiro',
        cpf: extracted.cpf || '',
        rg: extracted.rg || '',
        pai: extracted.pai || '',
        mae: extracted.mae || '',
        dataNascimento: extracted.dataNascimento || '',
        endereco: '',
        telefone: '',
        email: '',
        mandadoNumero: ''
      }];

  return {
    id: `item-${crypto.randomUUID()}`,
    numeroProcesso: extracted.numeroProcesso || processo,
    vara,
    cargo: assignedCargo,
    promotor: assignedPromotor,
    dataAudiencia: dataAudiencia || undefined,
    urgente,
    status: 'SUCESSO',
    partes,
    rawText: block.slice(0, 2000)
  };
}

export function extractPersonFromSnippet(snippet: string, idx: number = 0): BatchNiPerson {
  const p = extractPersonFromSnippetCore(snippet, '01', idx);
  return {
    id: p.id || `p-${crypto.randomUUID().slice(0, 8)}`,
    nome: p.nome,
    tipoParte: p.tipoParte || 'Vítima',
    folha: p.folha || '01',
    nacionalidade: p.nacionalidade || 'Brasileiro',
    cpf: p.cpf || '',
    rg: p.rg || '',
    pai: p.pai || '',
    mae: p.mae || '',
    dataNascimento: p.dataNascimento || '',
    endereco: p.endereco || '',
    telefone: p.telefone || '',
    email: p.email || '',
    mandadoNumero: p.mandadoNumero || ''
  };
}

export function generateNiSubject(item: BatchNiItem, cargoCode: string = 'C.71'): string {
  const cCode = cargoCode ? `(${cargoCode.startsWith('C.') ? cargoCode : 'C.' + cargoCode})` : '(C.71)';
  return `Pesquisa - Autos - ${item.numeroProcesso} ${cCode}`.trim();
}

export function generateNiHtml(
  item: BatchNiItem,
  promotoriaName: string = '4ª Promotoria de Justiça Criminal da Capital',
  promotorName: string = 'Leonardo D’Angelo Vargas Pereira',
  cargoStr: string = '71º PJ.'
): string {
  const dataAud = item.dataAudiencia ? item.dataAudiencia : 'Não designada';
  const prioridade = item.urgente ? 'Urgente (Prioritário)' : 'Normal';

  const partesHtml = item.partes.map((p, idx) => `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 700; color: #b91c1c; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        <span>●</span> <span>PARTE ${idx + 1}: ${p.nome || 'NÃO QUALIFICADO'} ${p.tipoParte ? `[${p.tipoParte.toUpperCase()}]` : ''}</span>
      </div>
      <ul style="list-style-type: disc; margin-left: 24px; margin-top: 0; margin-bottom: 0; padding-left: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13.5px; line-height: 1.7; color: #111827;">
        <li style="margin-bottom: 5px; color: #0f172a;"><b style="color: #1e293b;">Nome:</b> <span style="font-weight: 600; color: #b91c1c;">${p.nome || '________________'}</span> - (Fls. ${p.folha || '____'}) ${p.tipoParte ? `<span style="background: #e2e8f0; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #334155;">${p.tipoParte}</span>` : ''}</li>
        <li style="margin-bottom: 5px;"><b style="color: #1e293b;">Nacionalidade:</b> ${p.nacionalidade || 'Brasileiro'}</li>
        <li style="margin-bottom: 5px;"><b style="color: #1e293b;">CPF:</b> <span style="font-family: monospace; font-weight: 600;">${p.cpf || '________________'}</span></li>
        <li style="margin-bottom: 5px;"><b style="color: #1e293b;">RG:</b> <span style="font-family: monospace; font-weight: 600;">${p.rg || '________________'}</span></li>
        <li style="margin-bottom: 5px;"><b style="color: #1e293b;">Pai:</b> ${p.pai || '________________'}</li>
        <li style="margin-bottom: 5px;"><b style="color: #1e293b;">Mãe:</b> ${p.mae || '________________'}</li>
        <li style="margin-bottom: 5px;"><b style="color: #1e293b;">Data de Nascimento:</b> ${p.dataNascimento || '____/____/____'}</li>
        ${p.endereco ? `<li style="margin-bottom: 5px;"><b style="color: #1e293b;">Endereço nos autos:</b> ${p.endereco}</li>` : ''}
        ${p.telefone ? `<li style="margin-bottom: 5px;"><b style="color: #1e293b;">Telefone/Contato:</b> ${p.telefone}</li>` : ''}
        ${p.email ? `<li style="margin-bottom: 5px;"><b style="color: #1e293b;">E-mail:</b> ${p.email}</li>` : ''}
        ${p.mandadoNumero ? `<li style="margin-bottom: 5px;"><b style="color: #1e293b;">Mandado nº:</b> ${p.mandadoNumero}</li>` : ''}
      </ul>
    </div>
  `).join('');

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111827; line-height: 1.6; font-size: 14px; max-width: 720px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <!-- CABEÇALHO MPSP -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
        <tr>
          <td align="center" style="border: 2px solid #b91c1c; border-radius: 8px; padding: 10px 24px; background-color: #ffffff; text-align: center;">
            <span style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 800; letter-spacing: 0.12em; color: #111827; text-transform: uppercase;">
              PESQUISA DE LOCALIZAÇÃO
            </span>
          </td>
        </tr>
      </table>

      <!-- METADADOS -->
      <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.8; color: #111827; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
        <div><b>Autos:</b> <span style="font-family: monospace; font-weight: 700; color: #b91c1c;">${item.numeroProcesso}</span></div>
        <div><b>Data Audiência:</b> ${dataAud} | <b>Prioridade:</b> ${prioridade}</div>
        <div><b>Promotor:</b> ${promotorName} | <b>Cargo:</b> ${cargoStr}</div>
        <div><b>Órgão:</b> ${promotoriaName}</div>
      </div>

      <!-- PARTES -->
      <div style="margin-bottom: 24px;">
        ${partesHtml}
      </div>

      <!-- FECHAMENTO INSTITUCIONAL -->
      <div style="margin-top: 24px; font-size: 14px; color: #111827;">
        <p style="margin-bottom: 16px;">Atenciosamente,</p>
        
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px; font-family: 'Segoe UI', Arial, sans-serif;">
          <tr>
            <td valign="middle" style="padding-right: 12px; border-right: 2px solid #cbd5e1;">
              <span style="font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #0f172a;">MP</span><span style="font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #c00000;">SP</span>
            </td>
            <td valign="middle" style="padding-left: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2;">MINISTÉRIO PÚBLICO</div>
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2;">DO ESTADO DE SÃO PAULO</div>
            </td>
          </tr>
        </table>
        <div style="font-size: 12px; color: #475569; line-height: 1.5;">
          <b>${promotoriaName.toUpperCase()}</b><br/>
          Av. Dr. Abraão Ribeiro, 313 – Barra Funda – São Paulo/SP
        </div>
      </div>
    </div>
  `;
}

export function generateNiPlainText(
  item: BatchNiItem,
  promotoriaName: string = '4ª Promotoria de Justiça Criminal da Capital',
  promotorName: string = 'Leonardo D’Angelo Vargas Pereira',
  cargoStr: string = '71º PJ.'
): string {
  return formatStandardNiOutput(
    {
      numeroProcesso: item.numeroProcesso,
      cargo: item.cargo || cargoStr,
      promotor: item.promotor || promotorName,
      dataAudiencia: item.dataAudiencia,
      urgente: item.urgente
    },
    item.partes
  );
}

// Gera pacote ZIP completo com todos os arquivos
export async function generateNiBatchZip(
  items: BatchNiItem[],
  promotoriaName: string = '4ª Promotoria de Justiça Criminal da Capital',
  promotorName: string = 'Leonardo D’Angelo Vargas Pereira',
  cargoStr: string = '71º PJ.'
): Promise<Blob> {
  const zip = new JSZip();

  const folderWord = zip.folder('01_Pesquisas_NI_Word_Docx');
  const folderTxt = zip.folder('02_Textos_Email_SIS_NI');

  // 1. Gera DOCX e TXT individuais para cada processo
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cleanProc = item.numeroProcesso.replace(/[^\d]/g, '') || `item-${i + 1}`;
    const primaryName = item.partes[0]?.nome ? `_${item.partes[0].nome.replace(/[^A-Za-z0-9]/g, '_').slice(0, 25)}` : '';
    const baseFileName = `Pesquisa_NI_${item.numeroProcesso}${primaryName}`;

    // DOCX individual
    try {
      const docxBlob = await exportPesquisaNiToDocx({
        item,
        promotoriaName,
        promotorName,
        cargoStr
      });
      folderWord?.file(`${baseFileName}.docx`, docxBlob);
    } catch (e) {
      console.error(`Erro ao gerar DOCX para ${item.numeroProcesso}:`, e);
    }

    // Texto de E-mail / SIS
    const plainText = generateNiPlainText(item, promotoriaName, promotorName, cargoStr);
    const subject = generateNiSubject(item, cargoStr);
    const emailFileContent = `ASSUNTO DO E-MAIL: ${subject}\n\nCORPO DA MENSAGEM:\n${plainText}`;
    folderTxt?.file(`${baseFileName}.txt`, emailFileContent);
  }

  // 2. Documento DOCX Consolidado com todas as pesquisas
  try {
    const consolidatedDocx = await exportConsolidatedPesquisaNiToDocx({
      items,
      promotoriaName,
      promotorName,
      cargoStr
    });
    zip.file('03_Pesquisas_NI_Lote_Consolidado.docx', consolidatedDocx);
  } catch (e) {
    console.error('Erro ao gerar DOCX consolidado:', e);
  }

  // 3. Planilha CSV de Controle
  let csv = 'Processo;Parte;Papel;CPF;RG;Data_Nascimento;Pai;Mae;Telefone;Email;Audiencia;Urgente;Endereco\n';
  items.forEach(item => {
    item.partes.forEach(p => {
      csv += `"${item.numeroProcesso}";"${p.nome}";"${p.tipoParte || ''}";"${p.cpf || ''}";"${p.rg || ''}";"${p.dataNascimento || ''}";"${p.pai || ''}";"${p.mae || ''}";"${p.telefone || ''}";"${p.email || ''}";"${item.dataAudiencia || ''}";"${item.urgente ? 'SIM' : 'NÃO'}";"${(p.endereco || '').replace(/"/g, '""')}"\n`;
    });
  });
  zip.file('Planilha_Controle_Pesquisas_NI.csv', '\uFEFF' + csv); // com BOM UTF-8 para o Excel

  // 4. Arquivo de Instruções
  const readme = `MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO
SISTEMA DE APOIO OPERACIONAL CRIMINAL - PESQUISA DE NI EM LOTE

Lote processado em: ${new Date().toLocaleString('pt-BR')}
Total de Processos: ${items.length}
Total de Partes: ${items.reduce((acc, it) => acc + it.partes.length, 0)}

PASTAS CONTIDAS NESTE ARQUIVO .ZIP:
1. "01_Pesquisas_NI_Word_Docx/": Contém 1 arquivo .docx oficial para cada processo/solicitação.
2. "02_Textos_Email_SIS_NI/": Minutas em texto puro prontas para copiar e colar no Outlook ou SIS/NI.
3. "03_Pesquisas_NI_Lote_Consolidado.docx": Todas as solicitações em um único arquivo do Word, separadas por quebras de página.
4. "Planilha_Controle_Pesquisas_NI.csv": Tabela estruturada para controle no Excel ou LibreOffice Calc.
`;
  zip.file('LEIA-ME_Instrucoes_Lote.txt', readme);

  return await zip.generateAsync({ type: 'blob' });
}
