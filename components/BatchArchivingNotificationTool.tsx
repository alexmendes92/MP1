import React, { useState, useMemo } from 'react';
import { 
  Upload, FileText, Download, CheckCircle2, AlertCircle, Trash2, Printer, 
  Sparkles, Mail, MessageCircle, Copy, ExternalLink, RefreshCw, 
  Eye, Edit3, Shield, Users, Filter, Search, ChevronRight,
  Send, Calendar, MapPin, Phone, Hash, BookOpen, Layers, X, Check, FileCheck
} from 'lucide-react';
import { ArchivingBatchItem, ArchivingBatchParty, PromotoriaDef } from '../types';
import { 
  SAMPLE_ARCHIVING_PDF_CASES, 
  parseArchivingPromotionWithServerAI, 
  extractArchivingPromotionLocally, 
  generateBatchZipArchive 
} from '../utils/batchArchivingParser';
import { 
  exportCartaNotificacaoToDocx, 
  exportCertidaoToDocx, 
  downloadDocxBlob 
} from '../utils/docxExport';

interface BatchArchivingNotificationToolProps {
  promotorias?: PromotoriaDef[];
  onNavigateToSingle?: () => void;
}

export const BatchArchivingNotificationTool: React.FC<BatchArchivingNotificationToolProps> = ({
  onNavigateToSingle
}) => {
  // Lista de itens no lote (inicia com os 5 exemplos reais dos PDFs fornecidos para teste instantâneo)
  const [batchItems, setBatchItems] = useState<ArchivingBatchItem[]>(() => {
    try {
      const saved = localStorage.getItem('mpsp_archiving_batch_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return SAMPLE_ARCHIVING_PDF_CASES;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WHATSAPP' | 'EMAIL' | 'CORREIOS'>('ALL');

  // Estado para visualização e edição de um item específico no modal
  const [selectedItem, setSelectedItem] = useState<ArchivingBatchItem | null>(null);
  const [selectedParty, setSelectedParty] = useState<ArchivingBatchParty | null>(null);
  const [docModalTab, setDocModalTab] = useState<'CARTA' | 'CERTIDAO' | 'WHATSAPP' | 'EMAIL' | 'EDIT'>('CARTA');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estado para progresso da geração de ZIP
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatusText, setZipStatusText] = useState('');

  // Salvar no localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('mpsp_archiving_batch_items', JSON.stringify(batchItems));
    } catch (e) {}
  }, [batchItems]);

  // Função para carregar os 5 casos de exemplo dos PDFs
  const handleLoadSamples = () => {
    setBatchItems(SAMPLE_ARCHIVING_PDF_CASES);
  };

  // Limpar todo o lote
  const handleClearBatch = () => {
    if (window.confirm("Deseja realmente limpar a fila de processos do lote?")) {
      setBatchItems([]);
    }
  };

  // Upload e processamento de arquivos PDF em lote
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsProcessing(true);
    setProcessingProgress(0);

    const newItems: ArchivingBatchItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const progressPercent = Math.round(((i + 1) / fileList.length) * 100);
      setProcessingProgress(progressPercent);
      setProcessingStatus(`Processando ${i + 1}/${fileList.length}: ${file.name}...`);

      const itemId = `batch-item-${Date.now()}-${i}`;
      
      try {
        // Tentar extração via API do servidor com IA Gemini
        const extracted = await parseArchivingPromotionWithServerAI(file, '');

        newItems.push({
          id: itemId,
          fileName: file.name,
          fileSize: file.size,
          status: 'SUCCESS',
          numeroProcesso: extracted.numeroProcesso || `15${Math.floor(100000 + Math.random() * 900000)}-00.2026.8.26.0050`,
          varaGarantias: extracted.varaGarantias || 'Juiz das Garantias - 1ª RAJ - Capital',
          promotoria: extracted.promotoria || '4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL',
          promotor: extracted.promotor || 'Leonardo D’Angelo Vargas Pereira',
          dataPromocao: extracted.dataPromocao || new Date().toLocaleDateString('pt-BR'),
          delito: extracted.delito || 'Inquérito Policial',
          disposicaoInvestigado: extracted.disposicaoInvestigado || 'Dispensa-se a intimação do investigado por falta de bens a restituir.',
          partes: (extracted.partes && extracted.partes.length > 0) ? extracted.partes : [
            {
              id: `p-fallback-${Date.now()}`,
              nome: 'VÍTIMA / PARTE QUALIFICADA',
              tipoParte: 'Vítima',
              endereco: 'Endereço constante nos autos',
              cidade: 'SÃO PAULO',
              uf: 'SP',
              canalPreferencial: 'CORREIOS',
              statusNotificacao: 'Pendente'
            }
          ],
          extractedFrom: 'PDF_IA'
        });
      } catch (err: any) {
        console.warn(`Falha na IA para ${file.name}, usando fallback local:`, err);
        
        // Fallback local caso a IA apresente erro
        const fallbackData = extractArchivingPromotionLocally(file.name, file.name);
        newItems.push({
          id: itemId,
          fileName: file.name,
          fileSize: file.size,
          status: 'SUCCESS',
          numeroProcesso: fallbackData.numeroProcesso || `15${Math.floor(100000 + Math.random() * 900000)}-00.2026.8.26.0050`,
          varaGarantias: fallbackData.varaGarantias || 'Juiz das Garantias - 1ª RAJ - Capital',
          promotoria: fallbackData.promotoria || '4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL',
          promotor: fallbackData.promotor || 'Leonardo D’Angelo Vargas Pereira',
          dataPromocao: fallbackData.dataPromocao || new Date().toLocaleDateString('pt-BR'),
          delito: fallbackData.delito || 'Inquérito Policial',
          disposicaoInvestigado: fallbackData.disposicaoInvestigado || 'Dispensa-se a intimação do investigado.',
          partes: fallbackData.partes && fallbackData.partes.length > 0 ? fallbackData.partes : [
            {
              id: `p-fallback-${Date.now()}`,
              nome: 'VÍTIMA IDENTIFICADA NO RODAPÉ',
              tipoParte: 'Vítima',
              endereco: 'Verificar autos e rodapé',
              cidade: 'SÃO PAULO',
              uf: 'SP',
              canalPreferencial: 'CORREIOS',
              statusNotificacao: 'Pendente'
            }
          ],
          extractedFrom: 'LOCAL_PARSER'
        });
      }
    }

    setBatchItems(prev => [...newItems, ...prev]);
    setIsProcessing(false);
    setProcessingStatus('');
    setProcessingProgress(0);
  };

  // Exclusão de um item
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBatchItems(prev => prev.filter(it => it.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
      setSelectedParty(null);
    }
  };

  // Abrir modal de visualização e edição de um item
  const handleOpenDocModal = (item: ArchivingBatchItem, party?: ArchivingBatchParty) => {
    setSelectedItem(item);
    setSelectedParty(party || item.partes[0] || null);
    setDocModalTab('CARTA');
  };

  // Atualizar dados da parte ou processo
  const handleUpdateParty = (updatedParty: ArchivingBatchParty) => {
    if (!selectedItem) return;
    setBatchItems(prev => prev.map(item => {
      if (item.id !== selectedItem.id) return item;
      return {
        ...item,
        partes: item.partes.map(p => p.id === updatedParty.id ? updatedParty : p)
      };
    }));
    setSelectedParty(updatedParty);
    setSelectedItem(prev => prev ? {
      ...prev,
      partes: prev.partes.map(p => p.id === updatedParty.id ? updatedParty : p)
    } : null);
  };

  // Copiar com feedback visual
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Baixar pacote completo em ZIP
  const handleDownloadFullZip = async () => {
    if (batchItems.length === 0) {
      alert("Nenhum processo no lote para exportar.");
      return;
    }

    setIsZipping(true);
    setZipProgress(0);

    try {
      const zipBlob = await generateBatchZipArchive(batchItems, (percent, text) => {
        setZipProgress(percent);
        setZipStatusText(text);
      });

      const today = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lote_Notificacoes_Arquivamento_MPSP_${today}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Erro ao gerar ZIP do lote:", error);
      alert("Erro ao gerar o arquivo compactado: " + (error.message || error));
    } finally {
      setIsZipping(false);
      setZipProgress(0);
      setZipStatusText('');
    }
  };

  // Exportar Planilha de Controle em CSV
  const handleExportCsv = () => {
    if (batchItems.length === 0) return;
    let csv = "\uFEFFProcesso;Vara;Promotoria;Promotor;Data;Delito;Nome Parte;Tipo Parte;Endereço;Bairro;Cidade;UF;CEP;Telefone;E-mail;Folha;Canal;Status\n";

    batchItems.forEach(item => {
      item.partes.forEach(p => {
        csv += `"${item.numeroProcesso}";"${item.varaGarantias}";"${item.promotoria}";"${item.promotor}";"${item.dataPromocao}";"${item.delito || ''}";"${p.nome}";"${p.tipoParte}";"${p.endereco}";"${p.bairro || ''}";"${p.cidade}";"${p.uf}";"${p.cep || ''}";"${p.telefone || ''}";"${p.email || ''}";"${p.folha || ''}";"${p.canalPreferencial || 'CORREIOS'}";"${p.statusNotificacao || 'Pendente'}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Planilha_Controle_Notificacoes_MPSP_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Impressão vetorial unificada de todas as cartas
  const handlePrintAllCartas = () => {
    if (batchItems.length === 0) return;

    let lettersHtml = '';

    batchItems.forEach(item => {
      item.partes.forEach(parte => {
        const fullAddress = `${parte.endereco || ''} ${parte.numero ? `, ${parte.numero}` : ''} ${parte.complemento ? `- ${parte.complemento}` : ''} ${parte.bairro ? `- ${parte.bairro}` : ''} - ${parte.cidade || 'SÃO PAULO'}/${parte.uf || 'SP'}`;

        lettersHtml += `
          <div class="a4-page">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-bottom: 2.5px double #c00000; padding-bottom: 12px; margin-bottom: 24px; font-family: Arial, sans-serif;">
              <tr>
                <td align="left" valign="middle">
                  <span style="font-size: 32px; font-weight: 900; color: #000000;">MP</span><span style="font-size: 32px; font-weight: 900; color: #c00000;">SP</span>
                  <span style="font-size: 9px; font-weight: bold; color: #111111; margin-left: 8px;">MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</span>
                </td>
                <td align="right" valign="middle" style="text-align: right; font-size: 10.5px; font-weight: bold; color: #111111; border-left: 2px solid #c00000; padding-left: 12px;">
                  ${item.promotoria.toUpperCase()}
                </td>
              </tr>
            </table>

            <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 18px; text-transform: uppercase;">
              CARTA DE NOTIFICAÇÃO OFICIAL
              <div style="font-size: 9px; font-weight: normal; color: #555; margin-top: 4px;">(Art. 28, caput, do Código de Processo Penal - Aviso PGJ nº 707/2023)</div>
            </div>

            <table width="100%" cellpadding="10" cellspacing="0" style="width: 100%; border: 1px solid #cccccc; margin-bottom: 16px; background-color: #fcfcfc;">
              <tr>
                <td>
                  <div style="font-size: 7.5px; text-transform: uppercase; color: #555555; font-weight: bold; margin-bottom: 4px;">Destinatário / Endereço de Correspondência:</div>
                  <div style="font-size: 12.5px; font-weight: bold; color: #000000; text-transform: uppercase;">${parte.nome}</div>
                  <div style="font-size: 10.5px; color: #222222; margin-top: 4px; line-height: 1.4;">
                    ${fullAddress}<br/>
                    ${parte.cep ? `CEP: ${parte.cep}` : ''} ${parte.folha ? ` | Ref: fls. ${parte.folha}` : ''}
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-bottom: 18px; background-color: #f8fafc;">
              <tr>
                <td width="50%" style="border: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5px; font-weight: bold; color: #4a5568;">NÚMERO DO PROCESSO (AUTOS)</div>
                  <div style="font-size: 11.5px; font-weight: bold; color: #1a202c; margin-top: 3px;">${item.numeroProcesso}</div>
                </td>
                <td width="50%" style="border: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5px; font-weight: bold; color: #b91c1c;">PRAZO DE OPOSIÇÃO / RECURSO</div>
                  <div style="font-size: 11.5px; font-weight: bold; color: #b91c1c; margin-top: 3px;">30 (TRINTA) DIAS CORRIDOS</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border: 1px solid #e2e8f0;">
                  <div style="font-size: 7.5px; font-weight: bold; color: #4a5568;">ÓRGÃO JUDICIAL / PROMOTOR RESPONSÁVEL</div>
                  <div style="font-size: 10.5px; color: #1a202c; margin-top: 3px;">${item.varaGarantias} — <b>${item.promotor}</b> (Promotor de Justiça)</div>
                </td>
              </tr>
            </table>

            <p style="font-size: 12px; line-height: 1.6; text-indent: 1.8cm; margin-bottom: 12px; text-align: justify;">
              Prezado(a) Senhor(a),
            </p>
            <p style="font-size: 12px; line-height: 1.6; text-indent: 1.8cm; margin-bottom: 12px; text-align: justify;">
              Comunico a Vossa Senhoria que, na qualidade de <b>${parte.tipoParte.toUpperCase()}</b> nos autos do procedimento criminal indicado em epígrafe (Autos nº ${item.numeroProcesso}), foi apresentada r. promoção ministerial de <b>ARQUIVAMENTO</b> do inquérito policial pelo Ministério Público do Estado de São Paulo.
            </p>
            <p style="font-size: 12px; line-height: 1.6; text-indent: 1.8cm; margin-bottom: 12px; text-align: justify;">
              Caso possua discordância ou inconformismo em relação aos fundamentos aduzidos para o arquivamento, cientifica-se Vossa Senhoria de que vigora o <b>prazo legal de 30 (trinta) dias</b>, contados do recebimento desta notificação, para submeter suas razões recursais ou novos elementos de convicção à instância revisora competente do Ministério Público, em observância ao disposto no artigo 28, <i>caput</i>, do Código de Processo Penal (com redação outorgada pela Lei nº 13.964/19).
            </p>
            <p style="font-size: 12px; line-height: 1.6; text-indent: 1.8cm; margin-bottom: 24px; text-align: justify;">
              Para esclarecimentos ou orientações sobre a forma de envio de suas razões, entre em contato com a Serventia pelo e-mail <b>4pjcrimcentcap@mpsp.mp.br</b> ou pelos telefones (11) 3429-6302 / (11) 3429-6363.
            </p>

            <div style="text-align: right; font-size: 12px; margin-bottom: 28px;">
              São Paulo, ${item.dataPromocao}.
            </div>

            <div style="text-align: center; font-size: 12px; margin-bottom: 20px;">
              <b>${item.promotor}</b><br/>
              Promotor de Justiça
            </div>

            <div class="footer" style="margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 8px; text-align: center; font-size: 9px; color: #555555;">
              Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br/>
              Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
            </div>
          </div>
          <div style="page-break-after: always; break-after: page;"></div>
        `;
      });
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, habilite a abertura de pop-ups no navegador para imprimir.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cartas_Notificacao_Lote_MPSP</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body {
            margin: 0; padding: 0; background: #fff; color: #000;
            font-family: Arial, sans-serif;
          }
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 25mm 20mm 20mm 25mm;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        ${lettersHtml}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Impressão vetorial unificada de todas as certidões de oficial de promotoria
  const handlePrintAllCertidoes = () => {
    if (batchItems.length === 0) return;

    let certsHtml = '';

    batchItems.forEach(item => {
      item.partes.forEach(parte => {
        const fullAddress = `${parte.endereco || ''} ${parte.numero ? `, ${parte.numero}` : ''} ${parte.complemento ? `- ${parte.complemento}` : ''} ${parte.bairro ? `- ${parte.bairro}` : ''} - ${parte.cidade || 'SÃO PAULO'}/${parte.uf || 'SP'}`;

        certsHtml += `
          <div class="a4-page">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-bottom: 2.5px double #c00000; padding-bottom: 12px; margin-bottom: 24px; font-family: Arial, sans-serif;">
              <tr>
                <td align="left" valign="middle">
                  <span style="font-size: 32px; font-weight: 900; color: #000000;">MP</span><span style="font-size: 32px; font-weight: 900; color: #c00000;">SP</span>
                  <span style="font-size: 9px; font-weight: bold; color: #111111; margin-left: 8px;">MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</span>
                </td>
                <td align="right" valign="middle" style="text-align: right; font-size: 10.5px; font-weight: bold; color: #111111; border-left: 2px solid #c00000; padding-left: 12px;">
                  ${item.promotoria.toUpperCase()}
                </td>
              </tr>
            </table>

            <div style="text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 24px; text-transform: uppercase;">
              CERTIDÃO DE REMESSA E INTIMAÇÃO (ART. 28 DO CPP)
            </div>

            <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">Autos: ${item.numeroProcesso}</div>
            <div style="font-size: 11px; color: #444; margin-bottom: 20px;">${item.varaGarantias}</div>

            <p style="font-size: 12px; line-height: 1.7; text-indent: 1.8cm; margin-bottom: 16px; text-align: justify;">
              <b>CERTIFICO E DOU FÉ</b> que, nos autos do procedimento criminal em epígrafe, em cumprimento à r. manifestação ministerial de arquivamento proferida pelo(a) Dr(a). <b>${item.promotor}</b> (Promotor(a) de Justiça), expediu-se nesta data a competente <b>CARTA DE NOTIFICAÇÃO OFICIAL</b> endereçada a:
            </p>

            <table width="100%" cellpadding="8" cellspacing="0" style="width: 100%; border: 1px solid #cbd5e1; margin-bottom: 18px; background-color: #f8fafc; font-size: 11px;">
              <tr>
                <td>
                  <b>Destinatário:</b> ${parte.nome} (${parte.tipoParte})<br/>
                  <b>Endereço Notificado:</b> ${fullAddress}<br/>
                  ${parte.cep ? `<b>CEP:</b> ${parte.cep} &nbsp;&nbsp;` : ''}
                  ${parte.telefone ? `<b>Telefone:</b> ${parte.telefone} &nbsp;&nbsp;` : ''}
                  ${parte.email ? `<b>E-mail:</b> ${parte.email} &nbsp;&nbsp;` : ''}
                  ${parte.folha ? `<b>Ref. Folhas:</b> fls. ${parte.folha}` : ''}
                </td>
              </tr>
            </table>

            <p style="font-size: 12px; line-height: 1.7; text-indent: 1.8cm; margin-bottom: 16px; text-align: justify;">
              Cientifica-se formalmente a referida parte de que assiste-lhe o <b>prazo legal de 30 (trinta) dias</b>, a contar da data de recebimento da respectiva correspondência/notificação, para a submissão de eventuais razões ou novos elementos de convicção à instância revisora competente do Ministério Público, na forma preconizada pelo artigo 28, <i>caput</i>, do Código de Processo Penal e Aviso PGJ nº 707/2023.
            </p>

            <p style="font-size: 12px; line-height: 1.7; text-indent: 1.8cm; margin-bottom: 24px; text-align: justify;">
              Para constar, eu <b>Alex Santana Mendes</b> (Assinatura Eletrônica), Oficial de Promotoria I, matrícula 12078, digitei e emiti a presente certidão.
            </p>

            <div style="text-align: right; font-size: 12px; margin-bottom: 28px;">
              São Paulo, ${item.dataPromocao}.
            </div>

            <div class="footer" style="margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 8px; text-align: center; font-size: 9px; color: #555555;">
              Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br/>
              Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
            </div>
          </div>
          <div style="page-break-after: always; break-after: page;"></div>
        `;
      });
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, habilite pop-ups para impressão.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certidoes_Remessa_Lote_MPSP</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body {
            margin: 0; padding: 0; background: #fff; color: #000;
            font-family: Arial, sans-serif;
          }
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 25mm 20mm 20mm 25mm;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        ${certsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Itens filtrados para a tabela
  const filteredItems = useMemo(() => {
    return batchItems.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.numeroProcesso.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.promotor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.delito?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partes.some(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || p.endereco.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'WHATSAPP') {
        return item.partes.some(p => Boolean(p.telefone));
      }
      if (filterType === 'EMAIL') {
        return item.partes.some(p => Boolean(p.email));
      }
      if (filterType === 'CORREIOS') {
        return item.partes.some(p => Boolean(p.endereco));
      }

      return true;
    });
  }, [batchItems, searchTerm, filterType]);

  // Contadores estatísticos
  const totalInqueritos = batchItems.length;
  const totalPartes = batchItems.reduce((acc, it) => acc + it.partes.length, 0);
  const totalComWhatsapp = batchItems.filter(it => it.partes.some(p => Boolean(p.telefone))).length;
  const totalComEmail = batchItems.filter(it => it.partes.some(p => Boolean(p.email))).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Barra de Título Superior */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
            <Layers size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Notificações de Arquivamento em Lote
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-950/80 text-red-300 border border-red-700/50">
                Art. 28 CPP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Recepção de promoções de arquivamento, extração de dados no rodapé e emissão em massa de Cartas, Certidões e Minutas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLoadSamples}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition shadow-sm"
            title="Carrega os 5 PDFs reais com as promoções de arquivamento fornecidas"
          >
            <Sparkles size={14} className="text-indigo-400" />
            Carregar 5 Casos de Exemplo (PDFs MPSP)
          </button>

          {onNavigateToSingle && (
            <button
              onClick={onNavigateToSingle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
            >
              <FileText size={14} />
              Gestão Individual
            </button>
          )}

          <button
            onClick={handleClearBatch}
            disabled={batchItems.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 transition disabled:opacity-40"
            title="Limpar todos os processos do lote"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1500px] w-full mx-auto space-y-6 flex-1">
        {/* Zona de Drop & Upload de Arquivos */}
        <div className="relative border-2 border-dashed border-slate-800 hover:border-red-500/60 rounded-2xl p-6 bg-slate-900/40 text-center transition-all group">
          <input
            type="file"
            multiple
            accept="application/pdf"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            disabled={isProcessing}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 rounded-full bg-slate-800/80 text-red-400 group-hover:scale-110 transition-transform">
              {isProcessing ? (
                <RefreshCw size={28} className="animate-spin text-red-400" />
              ) : (
                <Upload size={28} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {isProcessing ? processingStatus : "Solte aqui as Promoções de Arquivamento (PDFs Múltiplos)"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                A IA lerá os inquéritos, identificará o despacho final (item 2) e extrairá as qualificações e endereços das partes nas notas de rodapé.
              </p>
            </div>
            {isProcessing && (
              <div className="w-full max-w-md bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                <div 
                  className="bg-red-600 h-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <FileCheck size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{totalInqueritos}</div>
              <div className="text-xs text-slate-400 font-medium">Inquéritos no Lote</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <Users size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{totalPartes}</div>
              <div className="text-xs text-slate-400 font-medium">Partes a Intimar</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-green-950/60 text-green-400 border border-green-800/40">
              <MessageCircle size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{totalComWhatsapp}</div>
              <div className="text-xs text-slate-400 font-medium">Com Celular / WhatsApp</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
              <Mail size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{totalComEmail}</div>
              <div className="text-xs text-slate-400 font-medium">Com E-mail Registrado</div>
            </div>
          </div>
        </div>

        {/* Barra de Ações em Lote */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por parte, autos, promotor ou delito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${filterType === 'ALL' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('WHATSAPP')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${filterType === 'WHATSAPP' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Apenas casos com telefone no rodapé"
              >
                WhatsApp
              </button>
              <button
                onClick={() => setFilterType('EMAIL')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${filterType === 'EMAIL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Apenas casos com e-mail no rodapé"
              >
                E-mail
              </button>
            </div>
          </div>

          {/* Botões de Ação de Download em Lote */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadFullZip}
              disabled={isZipping || batchItems.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-md transition disabled:opacity-50"
              title="Gera arquivo .ZIP contendo todas as Cartas de Notificação (.docx), Certidões (.docx) e planilha CSV"
            >
              {isZipping ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              {isZipping ? `Compactando (${zipProgress}%)` : "Baixar Lote Completo (.ZIP)"}
            </button>

            <button
              onClick={handlePrintAllCartas}
              disabled={batchItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
              title="Gera PDF único com todas as Cartas de Notificação prontas para impressão em massa"
            >
              <Printer size={15} className="text-amber-400" />
              Imprimir Todas as Cartas
            </button>

            <button
              onClick={handlePrintAllCertidoes}
              disabled={batchItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
              title="Gera PDF único com todas as Certidões de Oficial para juntada aos autos"
            >
              <FileCheck size={15} className="text-blue-400" />
              Todas as Certidões
            </button>

            <button
              onClick={handleExportCsv}
              disabled={batchItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
              title="Exporta dados do lote para Excel/CSV"
            >
              <Download size={14} className="text-emerald-400" />
              Planilha CSV
            </button>
          </div>
        </div>

        {/* Status de compactação se houver */}
        {isZipping && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3 flex items-center gap-3 text-xs text-red-200 animate-pulse">
            <RefreshCw size={16} className="animate-spin text-red-400" />
            <span>{zipStatusText || "Processando documentos do lote..."}</span>
          </div>
        )}

        {/* Tabela e Lista de Casos do Lote */}
        {filteredItems.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-500 mb-3">
              <FileText size={32} />
            </div>
            <h3 className="text-base font-semibold text-white">Nenhuma promoção encontrada no lote</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Arraste promoções de arquivamento em PDF para a área acima ou clique no botão para carregar os 5 casos de exemplo reais.
            </p>
            <button
              onClick={handleLoadSamples}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition shadow"
            >
              Carregar Casos de Exemplo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item, index) => (
              <div 
                key={item.id}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition shadow-sm space-y-3.5"
              >
                {/* Linha de Cabeçalho do Processo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-red-400 bg-red-950/50 px-2.5 py-1 rounded border border-red-800/40">
                      {item.numeroProcesso}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {item.varaGarantias}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      {item.promotor}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      {item.dataPromocao}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.extractedFrom === 'EXEMPLO' && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                        PDF de Exemplo
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-950/30 transition"
                      title="Remover este processo do lote"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Delito e Disposição */}
                <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  {item.delito && (
                    <span className="font-semibold text-slate-200">
                      {item.delito}
                    </span>
                  )}
                  {item.disposicaoInvestigado && (
                    <span className="text-slate-400 italic">
                      — {item.disposicaoInvestigado}
                    </span>
                  )}
                </div>

                {/* Partes extraídas do Rodapé */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <Users size={12} className="text-red-400" />
                    Parte(s) a intimar conforme nota de rodapé:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.partes.map((parte) => (
                      <div 
                        key={parte.id}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wide">
                              {parte.nome}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300">
                              {parte.tipoParte}
                            </span>
                          </div>

                          <div className="mt-1.5 text-xs text-slate-400 space-y-0.5">
                            <div className="flex items-start gap-1.5">
                              <MapPin size={13} className="text-red-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {parte.endereco}
                                {parte.bairro ? ` - ${parte.bairro}` : ''}
                                {parte.cidade ? ` - ${parte.cidade}/${parte.uf}` : ''}
                                {parte.cep ? ` (CEP: ${parte.cep})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 pt-1 flex-wrap">
                              {parte.telefone && (
                                <span className="flex items-center gap-1 text-green-400 text-[11px] font-medium">
                                  <Phone size={11} />
                                  {parte.telefone}
                                </span>
                              )}
                              {parte.email && (
                                <span className="flex items-center gap-1 text-purple-400 text-[11px] font-medium">
                                  <Mail size={11} />
                                  {parte.email}
                                </span>
                              )}
                              {parte.folha && (
                                <span className="text-slate-500 text-[11px]">
                                  Ref: fls. {parte.folha}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões rápidos por parte */}
                        <div className="border-t border-slate-900 pt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenDocModal(item, parte)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition"
                            >
                              <Eye size={12} />
                              Ver Documentos
                            </button>

                            <button
                              onClick={async () => {
                                const fullAddr = `${parte.endereco || ''} ${parte.numero ? `, ${parte.numero}` : ''} ${parte.bairro ? `- ${parte.bairro}` : ''} - ${parte.cidade}/${parte.uf}`;
                                const blob = await exportCartaNotificacaoToDocx({
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
                                downloadDocxBlob(blob, `Carta_Notificacao_${item.numeroProcesso}_${parte.nome.split(' ')[0]}`);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
                              title="Baixar Carta de Notificação em Word (.docx)"
                            >
                              <Download size={12} />
                              Carta .docx
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {parte.telefone && (
                              <button
                                onClick={() => {
                                  const cleanPhone = parte.telefone?.replace(/\D/g, '');
                                  const msg = encodeURIComponent(`Prezado(a) Sr(a). ${parte.nome}, o Ministério Público de São Paulo comunica a r. promoção de arquivamento nos autos nº ${item.numeroProcesso}. Prazo de 30 dias para manifestação (Art. 28 CPP). Contato: 4pjcrimcentcap@mpsp.mp.br`);
                                  window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                                }}
                                className="p-1 rounded text-green-400 hover:bg-green-950/40 transition"
                                title="Abrir WhatsApp Web para notificação"
                              >
                                <MessageCircle size={14} />
                              </button>
                            )}
                            {parte.email && (
                              <button
                                onClick={() => {
                                  const subject = encodeURIComponent(`NOTIFICAÇÃO OFICIAL - Promoção de Arquivamento - Autos nº ${item.numeroProcesso}`);
                                  const body = encodeURIComponent(`Prezado(a) Sr(a). ${parte.nome},\n\nO Ministério Público de São Paulo comunica a r. promoção de arquivamento dos autos nº ${item.numeroProcesso}.\nPrazo de 30 dias para recurso (Art. 28 CPP).\n\nAtenciosamente,\n4ª Promotoria de Justiça Criminal da Capital`);
                                  window.open(`mailto:${parte.email}?subject=${subject}&body=${body}`, '_blank');
                                }}
                                className="p-1 rounded text-purple-400 hover:bg-purple-950/40 transition"
                                title="Disparar E-mail institucional"
                              >
                                <Mail size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pré-visualização e Edição de Documentos Oficiais */}
      {selectedItem && selectedParty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-red-500" />
                  Documentos de Notificação: {selectedParty.nome}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autos: {selectedItem.numeroProcesso} • {selectedItem.varaGarantias} • {selectedItem.promotor}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setSelectedParty(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Seletor de Abas do Modal */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2 text-xs font-medium">
              <button
                onClick={() => setDocModalTab('CARTA')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition ${docModalTab === 'CARTA' ? 'border-red-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <FileText size={14} />
                Carta de Notificação (Oficial A4)
              </button>
              <button
                onClick={() => setDocModalTab('CERTIDAO')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition ${docModalTab === 'CERTIDAO' ? 'border-red-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <FileCheck size={14} />
                Certidão de Oficial de Promotoria
              </button>
              <button
                onClick={() => setDocModalTab('WHATSAPP')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition ${docModalTab === 'WHATSAPP' ? 'border-green-500 text-green-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <MessageCircle size={14} />
                WhatsApp
              </button>
              <button
                onClick={() => setDocModalTab('EMAIL')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition ${docModalTab === 'EMAIL' ? 'border-purple-500 text-purple-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <Mail size={14} />
                E-mail
              </button>
              <button
                onClick={() => setDocModalTab('EDIT')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition ${docModalTab === 'EDIT' ? 'border-amber-500 text-amber-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <Edit3 size={14} />
                Editar Dados
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
              {/* ABA 1: CARTA DE NOTIFICAÇÃO OFICIAL */}
              {docModalTab === 'CARTA' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Padrão institucional para envelope com janela / correios</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const fullAddr = `${selectedParty.endereco || ''} ${selectedParty.numero ? `, ${selectedParty.numero}` : ''} ${selectedParty.bairro ? `- ${selectedParty.bairro}` : ''} - ${selectedParty.cidade}/${selectedParty.uf}`;
                          const blob = await exportCartaNotificacaoToDocx({
                            numeroProcesso: selectedItem.numeroProcesso,
                            destinatarioNome: selectedParty.nome,
                            destinatarioTipo: selectedParty.tipoParte,
                            destinatarioEndereco: fullAddr,
                            destinatarioCep: selectedParty.cep,
                            destinatarioTelefone: selectedParty.telefone,
                            destinatarioEmail: selectedParty.email,
                            destinatarioFolha: selectedParty.folha,
                            varaGarantias: selectedItem.varaGarantias,
                            promotoria: selectedItem.promotoria,
                            promotorNome: selectedItem.promotor,
                            dataHoje: selectedItem.dataPromocao
                          });
                          downloadDocxBlob(blob, `Carta_Notificacao_${selectedItem.numeroProcesso}_${selectedParty.nome.split(' ')[0]}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                      >
                        <Download size={14} />
                        Baixar Word (.docx)
                      </button>
                    </div>
                  </div>

                  {/* Layout A4 Visual Fiel */}
                  <div className="bg-white text-black p-8 rounded-lg shadow-xl border border-slate-300 font-sans text-xs space-y-4">
                    {/* Header */}
                    <div className="border-b-2 border-red-700 pb-2 flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-black text-black">MP</span>
                        <span className="text-2xl font-black text-red-600">SP</span>
                        <span className="text-[10px] font-bold text-slate-700 ml-2">MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</span>
                      </div>
                      <div className="text-right text-[10px] font-bold text-slate-800 border-l-2 border-red-700 pl-2">
                        {selectedItem.promotoria.toUpperCase()}
                      </div>
                    </div>

                    <div className="text-center font-bold text-sm tracking-wide uppercase pt-2">
                      CARTA DE NOTIFICAÇÃO OFICIAL
                      <div className="text-[9px] font-normal text-slate-600 mt-0.5">
                        (Art. 28, caput, do Código de Processo Penal - Aviso PGJ nº 707/2023)
                      </div>
                    </div>

                    {/* Caixa de Destinatário */}
                    <div className="border border-slate-300 bg-slate-50 p-3 rounded text-[11px] space-y-1">
                      <div className="text-[8px] font-bold text-slate-500 uppercase">Destinatário / Correspondência:</div>
                      <div className="font-bold text-xs uppercase">{selectedParty.nome}</div>
                      <div className="text-slate-700">
                        {selectedParty.endereco}
                        {selectedParty.bairro ? ` - ${selectedParty.bairro}` : ''}
                        {selectedParty.cidade ? ` - ${selectedParty.cidade}/${selectedParty.uf}` : ''}
                      </div>
                      {selectedParty.cep && <div className="text-slate-700 font-mono">CEP: {selectedParty.cep}</div>}
                    </div>

                    {/* Dados Processo */}
                    <div className="grid grid-cols-2 gap-2 border border-slate-200 bg-slate-50 p-2 text-[10px]">
                      <div>
                        <span className="text-slate-500 font-bold block">AUTOS Nº</span>
                        <span className="font-mono font-bold">{selectedItem.numeroProcesso}</span>
                      </div>
                      <div>
                        <span className="text-red-700 font-bold block">PRAZO RECURSAL</span>
                        <span className="font-bold text-red-700">30 (TRINTA) DIAS CORRIDOS</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-bold block">ÓRGÃO / PROMOTOR</span>
                        <span>{selectedItem.varaGarantias} — <b>{selectedItem.promotor}</b></span>
                      </div>
                    </div>

                    <p className="leading-relaxed indent-8 text-justify">
                      Prezado(a) Senhor(a),
                    </p>
                    <p className="leading-relaxed indent-8 text-justify">
                      Comunico a Vossa Senhoria que, na qualidade de <b>{selectedParty.tipoParte.toUpperCase()}</b> nos autos do procedimento criminal em epígrafe (Autos nº {selectedItem.numeroProcesso}), foi devidamente ofertada a r. promoção ministerial de <b>ARQUIVAMENTO</b> do inquérito policial.
                    </p>
                    <p className="leading-relaxed indent-8 text-justify">
                      Caso possua discordância ou inconformismo em relação aos fundamentos aduzidos pelo Órgão de Execução para o arquivamento, cientifica-se Vossa Senhoria de que vigora o <b>prazo legal de 30 (trinta) dias</b>, contados do recebimento desta notificação, para submeter suas razões recursais ou novos elementos de convicção à instância revisora competente do Ministério Público, em estrita observância ao artigo 28, <i>caput</i>, do Código de Processo Penal.
                    </p>
                    <p className="leading-relaxed indent-8 text-justify">
                      Para eventuais esclarecimentos quanto ao teor do arquivamento ou orientações para envio de suas razões recursais, solicitamos contatar a Serventia da 4ª Promotoria de Justiça Criminal da Capital por meio do e-mail <b>4pjcrimcentcap@mpsp.mp.br</b> ou pelos telefones (11) 3429-6302 / 3429-6363.
                    </p>

                    <div className="text-right pt-2">
                      São Paulo, {selectedItem.dataPromocao}.
                    </div>

                    <div className="text-center pt-3">
                      <b>{selectedItem.promotor}</b><br/>
                      Promotor de Justiça
                    </div>

                    <div className="border-t border-red-700 pt-2 text-center text-[8px] text-slate-500">
                      Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: CERTIDÃO DE OFICIAL */}
              {docModalTab === 'CERTIDAO' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Certidão para juntada aos autos no portal E-SAJ</span>
                    <button
                      onClick={async () => {
                        const fullAddr = `${selectedParty.endereco || ''} ${selectedParty.numero ? `, ${selectedParty.numero}` : ''} ${selectedParty.bairro ? `- ${selectedParty.bairro}` : ''} - ${selectedParty.cidade}/${selectedParty.uf}`;
                        const certidaoBody = `Certifico e dou fé que, nos termos do artigo 28, caput, do Código de Processo Penal, em cumprimento à r. manifestação ministerial proferida pelo Dr. ${selectedItem.promotor}, expediu-se nesta data a competente Carta de Notificação Oficial à parte ${selectedParty.nome} (${selectedParty.tipoParte}), residente em ${fullAddr}${selectedParty.folha ? ` (fls. ${selectedParty.folha})` : ''}, cientificando-lhe formalmente da r. promoção de arquivamento dos autos e do prazo legal preclusivo de 30 (trinta) dias para eventual manifestação perante a instância revisora do Ministério Público.`;

                        const blob = await exportCertidaoToDocx({
                          numeroProcesso: selectedItem.numeroProcesso,
                          varaGarantias: selectedItem.varaGarantias,
                          promotoria: selectedItem.promotoria,
                          officialName: 'Alex Santana Mendes',
                          officialCargo: 'Oficial de Promotoria I',
                          bodyText: certidaoBody,
                          dataHoje: selectedItem.dataPromocao
                        });
                        downloadDocxBlob(blob, `Certidao_Remessa_${selectedItem.numeroProcesso}_${selectedParty.nome.split(' ')[0]}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                    >
                      <Download size={14} />
                      Baixar Word (.docx)
                    </button>
                  </div>

                  <div className="bg-white text-black p-8 rounded-lg shadow-xl border border-slate-300 font-sans text-xs space-y-4">
                    <div className="border-b-2 border-red-700 pb-2 flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-black text-black">MP</span>
                        <span className="text-2xl font-black text-red-600">SP</span>
                        <span className="text-[10px] font-bold text-slate-700 ml-2">MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</span>
                      </div>
                      <div className="text-right text-[10px] font-bold text-slate-800 border-l-2 border-red-700 pl-2">
                        {selectedItem.promotoria.toUpperCase()}
                      </div>
                    </div>

                    <div className="text-center font-bold text-sm tracking-wide uppercase pt-2">
                      CERTIDÃO DE OFICIAL DE PROMOTORIA
                    </div>

                    <div className="font-bold text-xs">Autos: {selectedItem.numeroProcesso}</div>
                    <div className="text-slate-600">{selectedItem.varaGarantias}</div>

                    <p className="leading-relaxed indent-8 text-justify pt-2">
                      <b>CERTIFICO E DOU FÉ</b> que, nos autos do procedimento criminal em epígrafe, em cumprimento à r. manifestação ministerial proferida pelo(a) Dr(a). <b>{selectedItem.promotor}</b>, expediu-se nesta data a competente Carta de Notificação Oficial à parte <b>{selectedParty.nome}</b> ({selectedParty.tipoParte}), qualificada a fls. {selectedParty.folha || 'autos'}, residente em {selectedParty.endereco}{selectedParty.bairro ? `, ${selectedParty.bairro}` : ''}, cientificando-lhe formalmente da r. promoção de arquivamento dos autos e do prazo legal preclusivo de 30 (trinta) dias para eventual manifestação ou interposição de recurso perante a instância revisora do Ministério Público (Artigo 28 do CPP).
                    </p>

                    <p className="leading-relaxed indent-8 text-justify">
                      Para constar, eu <b>Alex Santana Mendes</b> (Assinatura Eletrônica), Oficial de Promotoria I, matrícula 12078, digitei e emiti a presente certidão.
                    </p>

                    <div className="text-right pt-3">
                      São Paulo, {selectedItem.dataPromocao}.
                    </div>

                    <div className="border-t border-red-700 pt-2 text-center text-[8px] text-slate-500 mt-6">
                      Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: WHATSAPP */}
              {docModalTab === 'WHATSAPP' && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                        <MessageCircle size={16} />
                        Mensagem Formatada para WhatsApp
                      </span>
                      <button
                        onClick={() => {
                          const txt = `Prezado(a) Sr(a). *${selectedParty.nome}*,\n\nO *Ministério Público do Estado de São Paulo (${selectedItem.promotoria})* comunica que, nos autos do processo nº *${selectedItem.numeroProcesso}*, foi apresentada a r. manifestação ministerial pelo *ARQUIVAMENTO* do feito.\n\nCaso possua inconformidade com os fundamentos do arquivamento, vossa senhoria possui o prazo legal de *30 (trinta) dias*, contados do recebimento desta notificação, para submeter razões à instância revisora do Ministério Público (Art. 28 do Código de Processo Penal).\n\nPara esclarecimentos sobre o teor do pronunciamento ou orientações de envio de sua manifestação, responda a este canal ou envie e-mail para: *4pjcrimcentcap@mpsp.mp.br*.\n\nAtenciosamente,\n*Alex Santana Mendes*\nOficial de Promotoria I\n4ª Promotoria de Justiça Criminal da Capital`;
                          handleCopy(txt, 'wa-modal');
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition"
                      >
                        {copiedKey === 'wa-modal' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        {copiedKey === 'wa-modal' ? 'Copiado!' : 'Copiar Texto'}
                      </button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 text-slate-300">
{`Prezado(a) Sr(a). *${selectedParty.nome}*,

O *Ministério Público do Estado de São Paulo (${selectedItem.promotoria})* comunica que, nos autos do processo nº *${selectedItem.numeroProcesso}*, foi apresentada a r. manifestação ministerial pelo *ARQUIVAMENTO* do feito.

Caso possua inconformidade com os fundamentos do arquivamento, vossa senhoria possui o prazo legal de *30 (trinta) dias*, contados do recebimento desta notificação, para submeter razões ou novos elementos à instância revisora do Ministério Público (conforme Art. 28 do Código de Processo Penal).

Para esclarecimentos sobre o teor do pronunciamento ou orientações de envio de sua manifestação, responda a este canal ou envie e-mail para: *4pjcrimcentcap@mpsp.mp.br*.

Atenciosamente,
*Alex Santana Mendes*
Oficial de Promotoria I | Matrícula 12078
4ª Promotoria de Justiça Criminal da Capital`}
                    </div>

                    {selectedParty.telefone && (
                      <button
                        onClick={() => {
                          const cleanPhone = selectedParty.telefone?.replace(/\D/g, '');
                          const msg = encodeURIComponent(`Prezado(a) Sr(a). *${selectedParty.nome}*,\n\nO *Ministério Público do Estado de São Paulo* comunica a r. promoção de arquivamento nos autos nº *${selectedItem.numeroProcesso}*. Prazo de 30 dias para recurso (Art. 28 CPP). Contato: 4pjcrimcentcap@mpsp.mp.br`);
                          window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                        }}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 transition"
                      >
                        <ExternalLink size={14} />
                        Disparar pelo WhatsApp Web ({selectedParty.telefone})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 4: E-MAIL */}
              {docModalTab === 'EMAIL' && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                        <Mail size={16} />
                        Minuta Oficial de Notificação por E-mail
                      </span>
                      <button
                        onClick={() => {
                          const txt = `Assunto: NOTIFICAÇÃO OFICIAL - Promoção de Arquivamento de Autos - Processo nº ${selectedItem.numeroProcesso}\n\nPrezado(a) Sr(a). ${selectedParty.nome},\n\nO Ministério Público do Estado de São Paulo comunica que, nos autos do processo em epígrafe (nº ${selectedItem.numeroProcesso}), foi devidamente ofertada a promoção ministerial de arquivamento do inquérito policial.\n\nCientifica-se vossa senhoria de que assiste-lhe o direito de manifestar inconformismo no prazo legal de 30 (trinta) dias (Art. 28 do CPP).\n\nAtenciosamente,\nAlex Santana Mendes\nOficial de Promotoria I | 4ª PJ Criminal da Capital`;
                          handleCopy(txt, 'mail-modal');
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition"
                      >
                        {copiedKey === 'mail-modal' ? <Check size={13} className="text-purple-400" /> : <Copy size={13} />}
                        {copiedKey === 'mail-modal' ? 'Copiado!' : 'Copiar Texto'}
                      </button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 text-slate-300">
{`Assunto: NOTIFICAÇÃO OFICIAL - Promoção de Arquivamento de Autos - Processo nº ${selectedItem.numeroProcesso}

Prezado(a) Sr(a). ${selectedParty.nome},

O Ministério Público do Estado de São Paulo, por intermédio da ${selectedItem.promotoria}, comunica que, nos autos do processo em epígrafe (nº ${selectedItem.numeroProcesso}), foi devidamente ofertada a promoção de arquivamento do inquérito policial pelo Dr. ${selectedItem.promotor}.

Em conformidade com o disposto no artigo 28, caput, do Código de Processo Penal, cientifica-se vossa senhoria de que assiste-lhe o direito de manifestar discordância com o teor do arquivamento, se assim entender cabível, mediante apresentação de recurso escrito ou novos elementos de convicção no prazo legal de 30 (trinta) dias, a contar da data de recebimento desta cientificação.

Caso necessite de cópia digital da promoção ministerial ou deseje instruções complementares referentes ao procedimento de envio para a instância revisora, solicitamos contatar a Serventia enviando resposta a este correio eletrônico.

Atenciosamente,

Alex Santana Mendes
Oficial de Promotoria I | Matrícula 12078
4ª Promotoria de Justiça Criminal da Capital
E-mail: 4pjcrimcentcap@mpsp.mp.br | Telefones: (11) 3429-6302`}
                    </div>

                    {selectedParty.email && (
                      <button
                        onClick={() => {
                          const subject = encodeURIComponent(`NOTIFICAÇÃO OFICIAL - Promoção de Arquivamento - Autos nº ${selectedItem.numeroProcesso}`);
                          const body = encodeURIComponent(`Prezado(a) Sr(a). ${selectedParty.nome},\n\nO Ministério Público do Estado de São Paulo comunica a r. promoção de arquivamento nos autos nº ${selectedItem.numeroProcesso}.\nPrazo de 30 dias para recurso (Art. 28 CPP).\n\nAtenciosamente,\n4ª Promotoria de Justiça Criminal da Capital`);
                          window.open(`mailto:${selectedParty.email}?subject=${subject}&body=${body}`, '_blank');
                        }}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-2 transition"
                      >
                        <ExternalLink size={14} />
                        Enviar E-mail pelo Aplicativo Padrão ({selectedParty.email})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 5: EDITAR DADOS */}
              {docModalTab === 'EDIT' && (
                <div className="space-y-4 max-w-xl mx-auto bg-slate-900 border border-slate-800 p-5 rounded-xl">
                  <h4 className="text-xs font-bold text-white uppercase">Edição de Qualificação e Endereço</h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={selectedParty.nome}
                        onChange={(e) => handleUpdateParty({ ...selectedParty, nome: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Tipo de Parte</label>
                        <select
                          value={selectedParty.tipoParte}
                          onChange={(e) => handleUpdateParty({ ...selectedParty, tipoParte: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                        >
                          <option value="Vítima">Vítima</option>
                          <option value="Representante da Vítima">Representante da Vítima</option>
                          <option value="Investigado">Investigado</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Folhas de Referência</label>
                        <input
                          type="text"
                          value={selectedParty.folha || ''}
                          onChange={(e) => handleUpdateParty({ ...selectedParty, folha: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                          placeholder="Ex: 05, 06, 02 e 473"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Endereço Completo</label>
                      <input
                        type="text"
                        value={selectedParty.endereco}
                        onChange={(e) => handleUpdateParty({ ...selectedParty, endereco: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Bairro</label>
                        <input
                          type="text"
                          value={selectedParty.bairro || ''}
                          onChange={(e) => handleUpdateParty({ ...selectedParty, bairro: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Cidade / UF</label>
                        <input
                          type="text"
                          value={`${selectedParty.cidade}/${selectedParty.uf}`}
                          onChange={(e) => {
                            const [c, u] = e.target.value.split('/');
                            handleUpdateParty({ ...selectedParty, cidade: c || 'SÃO PAULO', uf: u || 'SP' });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">CEP</label>
                        <input
                          type="text"
                          value={selectedParty.cep || ''}
                          onChange={(e) => handleUpdateParty({ ...selectedParty, cep: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Telefone / Celular</label>
                        <input
                          type="text"
                          value={selectedParty.telefone || ''}
                          onChange={(e) => handleUpdateParty({ ...selectedParty, telefone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">E-mail</label>
                        <input
                          type="email"
                          value={selectedParty.email || ''}
                          onChange={(e) => handleUpdateParty({ ...selectedParty, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                        />
                      </div>
                    </div>

                    {selectedParty.textoRodapeOriginal && (
                      <div>
                        <label className="text-slate-500 block mb-1">Texto Original da Nota de Rodapé</label>
                        <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400 font-mono italic">
                          {selectedParty.textoRodapeOriginal}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="border-t border-slate-800 px-6 py-3 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Oficial: Alex Santana Mendes (Matrícula 12078)
              </span>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setSelectedParty(null);
                }}
                className="px-4 py-1.5 rounded-lg font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchArchivingNotificationTool;
