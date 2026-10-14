import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Copy,
  Check,
  Search,
  AlertCircle,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowLeft,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Archive,
  Eye,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCheck,
  Layers,
  FileCode,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { BatchNiItem, BatchNiPerson } from '../types';
import { extractTextFromPdfFile, fileToBase64Safe, isPdfFile } from '../utils/pdfHelper';
import {
  SAMPLE_BATCH_NI_CASES,
  parseBatchNiText,
  generateNiSubject,
  generateNiHtml,
  generateNiPlainText,
  generateNiBatchZip,
  extractPersonFromSnippet
} from '../utils/batchNiParser';
import {
  exportPesquisaNiToDocx,
  exportConsolidatedPesquisaNiToDocx,
  downloadDocxBlob
} from '../utils/docxExport';

interface BatchNiResearchToolProps {
  onBack: () => void;
  onLoadCaseToSingleScreen?: (item: BatchNiItem) => void;
}

export const BatchNiResearchTool: React.FC<BatchNiResearchToolProps> = ({ onBack, onLoadCaseToSingleScreen }) => {
  // Configurações do MPSP
  const [promotor, setPromotor] = useState('Leonardo D’Angelo Vargas Pereira');
  const [cargo, setCargo] = useState('71º PJ.');
  const [cargoCode, setCargoCode] = useState('C.71');
  const [promotoria, setPromotoria] = useState('4ª Promotoria de Justiça Criminal da Capital');

  // Dados do Lote
  const [items, setItems] = useState<BatchNiItem[]>([]);
  const [rawTextInput, setRawTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'resultados'>('upload');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Modo de exibição no painel direito: 'fields' (campos extraídos editáveis) ou 'preview' (minuta oficial)
  const [rightPanelTab, setRightPanelTab] = useState<'fields' | 'preview'>('fields');
  const [extractSnippetText, setExtractSnippetText] = useState('');
  const [snippetPastedImage, setSnippetPastedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    sizeKb: number;
  } | null>(null);
  const [batchPastedImage, setBatchPastedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    sizeKb: number;
  } | null>(null);
  const [isExtractingSnippet, setIsExtractingSnippet] = useState(false);
  const [showSnippetExtractor, setShowSnippetExtractor] = useState(false);

  // Estados de Processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtro e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'Vítima' | 'Réu' | 'Testemunha' | 'Investigado' | 'URGENTE'>('ALL');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modal de Edição
  const [editingItem, setEditingItem] = useState<BatchNiItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega os 10 casos reais do documento enviado pelo usuário
  const handleLoadSample = () => {
    setItems(SAMPLE_BATCH_NI_CASES);
    setActiveTab('resultados');
    if (SAMPLE_BATCH_NI_CASES.length > 0) {
      setSelectedItemId(SAMPLE_BATCH_NI_CASES[0].id);
      setExpandedCardId(SAMPLE_BATCH_NI_CASES[0].id);
    }
    showToast('Exemplo com os 10 processos reais carregado com sucesso!');
  };

  // Funções de Formatação de Campos
  const formatCPF = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return nums.replace(/^(\d{3})(\d+)/, '$1.$2');
    if (nums.length <= 9) return nums.replace(/^(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return nums.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  };

  const formatRG = (val: string) => {
    const raw = val.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 10);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return raw.replace(/^(\d{2})(\d+)/, '$1.$2');
    if (raw.length <= 8) return raw.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    return numsToRg(raw);
  };

  const numsToRg = (raw: string) => {
    return raw.replace(/^(\d{2})(\d{3})(\d{3})([0-9X])/, '$1.$2.$3-$4');
  };

  const formatDate = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return nums.replace(/^(\d{2})(\d+)/, '$1/$2');
    return nums.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
  };

  // Atualiza um campo direto do processo selecionado
  const updateSelectedItemField = (field: keyof BatchNiItem, value: any) => {
    if (!selectedItemId) return;
    setItems(prev =>
      prev.map(it => (it.id === selectedItemId ? { ...it, [field]: value } : it))
    );
  };

  // Atualiza um campo de uma parte específica do processo selecionado
  const updateSelectedPartyField = (partyId: string, field: keyof BatchNiPerson, value: any) => {
    if (!selectedItemId) return;
    setItems(prev =>
      prev.map(it => {
        if (it.id !== selectedItemId) return it;
        return {
          ...it,
          partes: it.partes.map(p => (p.id === partyId ? { ...p, [field]: value } : p)),
        };
      })
    );
  };

  // Adiciona nova parte aos campos do processo selecionado
  const addPartyToSelectedItem = () => {
    if (!selectedItemId) return;
    const newPerson: BatchNiPerson = {
      id: `p-${Date.now()}`,
      nome: '',
      tipoParte: 'Vítima',
      folha: '01',
      nacionalidade: 'Brasileiro',
      cpf: '',
      rg: '',
      pai: '',
      mae: '',
      dataNascimento: '',
      endereco: '',
      telefone: '',
      email: '',
      mandadoNumero: ''
    };
    setItems(prev =>
      prev.map(it => {
        if (it.id !== selectedItemId) return it;
        return { ...it, partes: [...it.partes, newPerson] };
      })
    );
    showToast('Nova parte adicionada aos campos deste processo!');
  };

  // Remove parte dos campos do processo selecionado
  const removePartyFromSelectedItem = (partyId: string) => {
    if (!selectedItemId) return;
    setItems(prev =>
      prev.map(it => {
        if (it.id !== selectedItemId) return it;
        if (it.partes.length <= 1) {
          showToast('O processo deve conter ao menos 1 parte qualificada.');
          return it;
        }
        return { ...it, partes: it.partes.filter(p => p.id !== partyId) };
      })
    );
    showToast('Parte removida dos campos.');
  };

  // Extrai texto ou imagem colada diretamente para preencher os campos do processo selecionado
  const handleSnippetPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setSnippetPastedImage({
              base64: ev.target?.result as string,
              mimeType: file.type || 'image/png',
              previewUrl: URL.createObjectURL(file),
              sizeKb: Math.round(file.size / 1024),
            });
            showToast('Imagem colada com sucesso no extrator! Clique em Preencher.');
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const handleBatchTextPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setBatchPastedImage({
              base64: ev.target?.result as string,
              mimeType: file.type || 'image/png',
              previewUrl: URL.createObjectURL(file),
              sizeKb: Math.round(file.size / 1024),
            });
            showToast('Print / Imagem colada com sucesso! Clique em Extrair.');
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const handleExtractSnippetToFields = async () => {
    if ((!extractSnippetText.trim() && !snippetPastedImage) || !selectedItemId) {
      showToast('Por favor, cole o texto ou imagem de documento para extrair.');
      return;
    }
    setIsExtractingSnippet(true);
    try {
      const resp = await fetch('/api/gemini/parse-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: extractSnippetText,
          imageBase64: snippetPastedImage?.base64,
          mimeType: snippetPastedImage?.mimeType
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.data) {
          const d = json.data;
          setItems(prev => prev.map(it => {
            if (it.id !== selectedItemId) return it;
            const updatedPartes = [...it.partes];
            if (updatedPartes.length > 0) {
              updatedPartes[0] = {
                ...updatedPartes[0],
                nome: d.nome || updatedPartes[0].nome,
                folha: d.folha || updatedPartes[0].folha,
                nacionalidade: d.nacionalidade || updatedPartes[0].nacionalidade,
                cpf: d.cpf || updatedPartes[0].cpf,
                rg: d.rg || updatedPartes[0].rg,
                pai: d.pai || updatedPartes[0].pai,
                mae: d.mae || updatedPartes[0].mae,
                dataNascimento: d.dataNascimento || updatedPartes[0].dataNascimento,
              };
            }
            return { ...it, partes: updatedPartes };
          }));
          showToast('Campos preenchidos com sucesso a partir da extração IA!');
          setExtractSnippetText('');
          setSnippetPastedImage(null);
          setShowSnippetExtractor(false);
          setIsExtractingSnippet(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro na extração de pessoa:', e);
    }

    // Fallback: local heuristic se houver texto
    if (extractSnippetText.trim()) {
      const localRes = extractPersonFromSnippet(extractSnippetText, 0);
      setItems(prev => prev.map(it => {
        if (it.id !== selectedItemId) return it;
        const updatedPartes = [...it.partes];
        if (updatedPartes.length > 0) {
          updatedPartes[0] = {
            ...updatedPartes[0],
            nome: localRes.nome || updatedPartes[0].nome,
            folha: localRes.folha || updatedPartes[0].folha,
            nacionalidade: localRes.nacionalidade || updatedPartes[0].nacionalidade,
            cpf: localRes.cpf || updatedPartes[0].cpf,
            rg: localRes.rg || updatedPartes[0].rg,
            pai: localRes.pai || updatedPartes[0].pai,
            mae: localRes.mae || updatedPartes[0].mae,
            dataNascimento: localRes.dataNascimento || updatedPartes[0].dataNascimento,
            endereco: localRes.endereco || updatedPartes[0].endereco,
            telefone: localRes.telefone || updatedPartes[0].telefone,
            email: localRes.email || updatedPartes[0].email,
          };
        }
        return { ...it, partes: updatedPartes };
      }));
      showToast('Campos preenchidos com sucesso via analisador de texto!');
      setExtractSnippetText('');
      setSnippetPastedImage(null);
      setShowSnippetExtractor(false);
    } else {
      showToast('Não foi possível identificar os dados na imagem. Verifique a nitidez.');
    }
    setIsExtractingSnippet(false);
  };

  // Processa arquivo ou texto via Gemini com Fallback local
  const processDocumentText = async (text: string, base64Data?: string, mimeType?: string) => {
    setIsProcessing(true);
    setStatusMessage('Analisando documento e qualificações com IA Gemini...');

    try {
      const response = await fetch('/api/gemini/parse-batch-ni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text || undefined,
          fileBase64: (text && text.length > 50) ? undefined : (base64Data || undefined),
          mimeType: mimeType || undefined,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data && Array.isArray(json.data.casos) && json.data.casos.length > 0) {
          const parsedCases: BatchNiItem[] = json.data.casos.map((c: any, index: number) => ({
            id: `case-${Date.now()}-${index}`,
            numeroProcesso: c.numeroProcesso || '0000000-00.0000.8.26.0000',
            vara: c.vara || '16ª Vara Criminal do Foro Central Criminal Barra Funda',
            cargo: cargo,
            promotor: promotor,
            dataAudiencia: c.dataAudiencia || undefined,
            urgente: Boolean(c.urgente),
            status: 'SUCESSO',
            partes: (c.partes || []).map((p: any, pIdx: number) => ({
              id: `p-${Date.now()}-${index}-${pIdx}`,
              nome: p.nome || `PARTE ${pIdx + 1}`,
              tipoParte: p.tipoParte || 'Vítima',
              folha: p.folha || '01',
              nacionalidade: p.nacionalidade || 'Brasileiro',
              rg: p.rg || '',
              cpf: p.cpf || '',
              pai: p.pai || '',
              mae: p.mae || '',
              dataNascimento: p.dataNascimento || '',
              endereco: p.endereco || '',
              telefone: p.telefone || '',
              email: p.email || '',
              mandadoNumero: p.mandadoNumero || '',
            })),
          }));

          setItems(parsedCases);
          setActiveTab('resultados');
          if (parsedCases.length > 0) {
            setSelectedItemId(parsedCases[0].id);
            setExpandedCardId(parsedCases[0].id);
          }
          showToast(`${parsedCases.length} processos identificados com sucesso via Gemini!`);
          setIsProcessing(false);
          setStatusMessage(null);
          return;
        }
      }
    } catch (err) {
      console.warn('Falha na chamada Gemini, acionando analisador local:', err);
    }

    // Fallback: Analisador Heurístico Local
    setStatusMessage('Processando via analisador estruturado local...');
    const localParsed = parseBatchNiText(text, promotor, cargo);
    if (localParsed.length > 0) {
      setItems(localParsed);
      setActiveTab('resultados');
      setSelectedItemId(localParsed[0].id);
      setExpandedCardId(localParsed[0].id);
      showToast(`${localParsed.length} processos segmentados com sucesso!`);
    } else {
      showToast('Nenhum processo foi identificado no conteúdo.');
    }

    setIsProcessing(false);
    setStatusMessage(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPdfFile(file)) {
      setStatusMessage('Extraindo camada de texto do arquivo PDF...');
      setIsProcessing(true);
      try {
        const [textResult, base64Result] = await Promise.all([
          extractTextFromPdfFile(file),
          fileToBase64Safe(file),
        ]);

        if (textResult.text) {
          setRawTextInput(textResult.text);
        }
        await processDocumentText(textResult.text, base64Result.data, 'application/pdf');
      } catch (err: any) {
        console.error('Erro no processamento do PDF:', err);
        showToast('Erro ao processar o arquivo PDF. Tente colar o texto manualmente.');
        setIsProcessing(false);
        setStatusMessage(null);
      }
    } else {
      const reader = new FileReader();
      reader.onload = async () => {
        const text = reader.result as string;
        setRawTextInput(text);
        await processDocumentText(text);
      };
      reader.readAsText(file);
    }
  };

  // Exportar ZIP Completo
  const handleExportZip = async () => {
    if (items.length === 0) return;
    setIsGeneratingZip(true);
    try {
      const blob = await generateNiBatchZip(items, promotoria, promotor, cargo);
      downloadDocxBlob(blob, `MPSP_Pesquisas_NI_Lote_${Date.now()}.zip`);
      showToast('Pacote ZIP gerado e baixado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao compilar o arquivo ZIP.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // Exportar DOCX Consolidado
  const handleExportConsolidatedDocx = async () => {
    if (items.length === 0) return;
    try {
      const blob = await exportConsolidatedPesquisaNiToDocx({
        items,
        promotoriaName: promotoria,
        promotorName: promotor,
        cargoStr: cargo,
      });
      downloadDocxBlob(blob, `MPSP_Pesquisas_NI_Consolidado_${items.length}_Casos.docx`);
      showToast('Documento Word Consolidado baixado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar documento Word consolidado.');
    }
  };

  // Exportar DOCX Individual
  const handleExportSingleDocx = async (item: BatchNiItem) => {
    try {
      const blob = await exportPesquisaNiToDocx({
        item,
        promotoriaName: promotoria,
        promotorName: promotor,
        cargoStr: cargo,
      });
      downloadDocxBlob(blob, `Pesquisa_NI_${item.numeroProcesso}.docx`);
      showToast(`Word do processo ${item.numeroProcesso} baixado com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar documento Word.');
    }
  };

  // Copiar E-mail / SIS
  const handleCopyEmail = (item: BatchNiItem) => {
    const text = generateNiPlainText(item, promotoria, promotor, cargo);
    const subject = generateNiSubject(item, cargoCode);
    const full = `ASSUNTO: ${subject}\n\n${text}`;
    navigator.clipboard.writeText(full);
    showToast(`Assunto e texto do processo ${item.numeroProcesso} copiados!`);
  };

  // Filtragem dos itens
  const filteredItems = items.filter(item => {
    const matchSearch =
      searchTerm === '' ||
      item.numeroProcesso.includes(searchTerm) ||
      item.partes.some(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cpf && p.cpf.includes(searchTerm)) ||
        (p.rg && p.rg.includes(searchTerm))
      );

    if (!matchSearch) return false;

    if (filterRole === 'ALL') return true;
    if (filterRole === 'URGENTE') return item.urgente;
    return item.partes.some(p => p.tipoParte === filterRole);
  });

  const selectedItem = items.find(it => it.id === selectedItemId) || items[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in text-sm font-medium">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Barra Institucional */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center px-2 py-0.5 rounded bg-red-700 text-white font-extrabold text-xs tracking-wider">
                MPSP
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Pesquisa de NI em Lote (SIS / Antecedentes)
                </h1>
                <p className="text-xs text-slate-500">
                  Automação de múltiplos mandados de intimação e citação para localização de pessoas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
            >
              <Sparkles className="w-4 h-4 text-red-600" />
              Carregar Exemplo (10 Casos)
            </button>
            {items.length > 0 && (
              <button
                onClick={() => {
                  setItems([]);
                  setRawTextInput('');
                  setActiveTab('upload');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Limpar lote atual"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Configurações Institucionais Rápidas */}
        <div className="bg-slate-100/80 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              {/* Presets Rápidos de Cargo / Promotor */}
              <div className="flex items-center gap-1.5 border-r border-slate-300 pr-3">
                <span className="font-semibold text-slate-500 text-[11px] uppercase">Cargos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCargoCode('C.71');
                    setCargo('71º PJ.');
                    setPromotor("Leonardo D'Angelo Vargas Pereira");
                    showToast("Cargo 71 selecionado: Leonardo D'Angelo Vargas Pereira");
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all border ${
                    cargoCode === 'C.71' || cargo.includes('71')
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border-slate-300'
                  }`}
                  title="C.71 - Leonardo D'Angelo Vargas Pereira"
                >
                  C.71 (71º PJ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCargoCode('C.79');
                    setCargo('79º PJ.');
                    setPromotor('Margareth Ferraz França');
                    showToast('Cargo 79 selecionado: Margareth Ferraz França');
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all border ${
                    cargoCode === 'C.79' || cargo.includes('79')
                      ? 'bg-red-700 text-white border-red-700 shadow-xs ring-1 ring-red-400'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border-slate-300'
                  }`}
                  title="C.79 - Margareth Ferraz França"
                >
                  C.79 (Margareth Ferraz França)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Promotor:</span>
                <input
                  type="text"
                  value={promotor}
                  onChange={e => setPromotor(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-red-500 text-slate-800"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Cargo:</span>
                <input
                  type="text"
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs w-24 focus:ring-1 focus:ring-red-500 text-slate-800"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Cód. Assunto:</span>
                <input
                  type="text"
                  value={cargoCode}
                  onChange={e => setCargoCode(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs w-20 focus:ring-1 focus:ring-red-500 text-slate-800"
                />
              </div>
            </div>
            <div className="text-slate-500 hidden md:block">
              {items.length > 0 ? (
                <span className="text-emerald-700 font-medium">
                  ● {items.length} processos carregados ({items.reduce((acc, it) => acc + it.partes.length, 0)} partes)
                </span>
              ) : (
                'Aguardando envio de arquivo ou texto com mandados'
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navegação entre Abas */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            1. Enviar Documento / Mandados
          </button>
          <button
            onClick={() => setActiveTab('resultados')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'resultados'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Resultados e Exportação em Lote
            {items.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* ABA 1: UPLOAD / ENTRADA */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload de Arquivo PDF */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-bold">
                      PDF
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Upload de Arquivo PDF com Mandados</h2>
                      <p className="text-xs text-slate-500">
                        Envie o PDF contendo múltiplos mandados de intimação, despachos ou relatórios criminais
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-red-50/20 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-red-600 mx-auto mb-3 transition-colors" />
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      Clique para selecionar ou arraste o arquivo PDF aqui
                    </p>
                    <p className="text-xs text-slate-500">
                      Suporta documentos com múltiplos processos, partes e audiências
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Processamento com IA Gemini MPSP</span>
                  <button
                    onClick={handleLoadSample}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Testar com os 10 casos reais
                  </button>
                </div>
              </div>

              {/* Colar Texto Bruto */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Ou Cole o Texto dos Mandados</h2>
                      <p className="text-xs text-slate-500">
                        Copie e cole o texto contendo número de processos, qualificações, audiências e partes
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={rawTextInput}
                    onChange={e => setRawTextInput(e.target.value)}
                    onPaste={handleBatchTextPaste}
                    placeholder="Cole o texto aqui OU pressione Ctrl+V para colar um print / imagem de documento...
Exemplo:
Mandado nº: 050.2026/180194-0
Processo nº: 1519377-68.2026.8.26.0454
Audiência: 09/11/2026 às 13:15h
Vítima: LUCAS BIOCALTTI DE PAULA SOUZA, RG 50548354, CPF 335.736.418-22..."
                    className="w-full h-44 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 resize-none"
                  />

                  {/* Preview da Imagem Colada no Lote */}
                  {batchPastedImage && (
                    <div className="mt-2.5 p-2 bg-slate-100 border border-red-300 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img 
                          src={batchPastedImage.previewUrl} 
                          alt="Documento colado" 
                          className="w-12 h-12 object-cover rounded-lg border border-slate-300 bg-white" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                            <span className="truncate">Imagem colada (Print de Mandado)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {batchPastedImage.sizeKb} KB • Pronto para processamento com OCR IA
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setBatchPastedImage(null)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Remover imagem"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Aceita texto colado ou prints colados com <b>Ctrl+V</b>. Extrai e preenche todos os campos estruturados.</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    disabled={(!rawTextInput.trim() && !batchPastedImage) || isProcessing}
                    onClick={() => processDocumentText(rawTextInput, batchPastedImage?.base64, batchPastedImage?.mimeType)}
                    className="px-5 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processando e preenchendo campos...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Extrair e Preencher nos Campos {batchPastedImage ? 'da Imagem' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Banner de Ajuda e Recursos */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Como funciona a automação de pesquisa de NI em lote
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Este módulo extrai automaticamente os números de processo, varas criminais, datas de audiência, urgências
                (como réu preso) e qualificação completa de cada pessoa (nome, RG, CPF, filiação paterna e materna, data de
                nascimento, telefone e endereço). Em seguida, gera os documentos oficiais em formato Word (.docx), minutas
                de e-mail prontas para envio ao SIS/NI e planilhas de controle.
              </p>
            </div>
          </div>
        )}

        {/* ABA 2: RESULTADOS E EXPORTAÇÃO */}
        {activeTab === 'resultados' && (
          <div>
            {items.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">Nenhum processo carregado</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Envie um arquivo PDF, cole o texto na aba anterior ou utilize o exemplo com 10 casos reais.
                </p>
                <button
                  onClick={handleLoadSample}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Carregar Exemplo de 10 Casos
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ações em Lote e Resumo de Métricas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold">
                      <span>{items.length} Processos</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                      <span>{items.reduce((acc, it) => acc + it.partes.length, 0)} Pessoas Qualificadas</span>
                    </div>
                    {items.some(it => it.urgente) && (
                      <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>{items.filter(it => it.urgente).length} Urgentes (Réu Preso)</span>
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação em Lote */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={isGeneratingZip}
                      onClick={handleExportZip}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                      title="Baixar pacote ZIP contendo arquivos Word individuais, minutas de e-mail e planilha"
                    >
                      {isGeneratingZip ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Gerando ZIP...
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          Baixar Pacote Completo (.ZIP)
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleExportConsolidatedDocx}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-300 flex items-center gap-1.5"
                      title="Baixar um único arquivo Word com todas as pesquisas compiladas"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      DOCX Consolidado
                    </button>

                    <button
                      onClick={async () => {
                        let csv = 'Processo;Parte;Papel;CPF;RG;Data_Nascimento;Pai;Mae;Telefone;Email;Audiencia;Urgente;Endereco\n';
                        items.forEach(item => {
                          item.partes.forEach(p => {
                            csv += `"${item.numeroProcesso}";"${p.nome}";"${p.tipoParte || ''}";"${p.cpf || ''}";"${p.rg || ''}";"${p.dataNascimento || ''}";"${p.pai || ''}";"${p.mae || ''}";"${p.telefone || ''}";"${p.email || ''}";"${item.dataAudiencia || ''}";"${item.urgente ? 'SIM' : 'NÃO'}";"${(p.endereco || '').replace(/"/g, '""')}"\n`;
                          });
                        });
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                        downloadDocxBlob(blob, `Controle_Pesquisas_NI_${items.length}_Processos.csv`);
                        showToast('Planilha CSV de controle baixada!');
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-300 flex items-center gap-1.5"
                      title="Exportar tabela de controle para Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Planilha Excel
                    </button>
                  </div>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por número do processo, nome da parte, CPF ou RG..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(['ALL', 'Vítima', 'Réu', 'Testemunha', 'Investigado', 'URGENTE'] as const).map(role => (
                      <button
                        key={role}
                        onClick={() => setFilterRole(role)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          filterRole === role
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {role === 'ALL' ? 'Todos' : role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Duas Colunas: Lista à Esquerda e Visualizador à Direita */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Coluna Esquerda: Lista de Processos */}
                  <div className="lg:col-span-6 space-y-3 max-h-[750px] overflow-y-auto pr-1">
                    {filteredItems.map((item, idx) => {
                      const isSelected = selectedItemId === item.id;
                      const isExpanded = expandedCardId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`bg-white rounded-xl border transition-all ${
                            isSelected
                              ? 'border-red-600 shadow-md ring-1 ring-red-600'
                              : 'border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* Cabeçalho do Card */}
                          <div
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setExpandedCardId(isExpanded ? null : item.id);
                            }}
                            className="p-4 cursor-pointer flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                                  {idx + 1}. {item.numeroProcesso}
                                </span>
                                {item.urgente && (
                                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    Urgente
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {item.vara}
                              </p>
                              {item.dataAudiencia && (
                                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-red-600" />
                                  Audiência: {item.dataAudiencia}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {item.partes.length} {item.partes.length === 1 ? 'parte' : 'partes'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Resumo das partes */}
                          <div className="px-4 pb-3 pt-0">
                            <div className="flex flex-wrap gap-1.5">
                              {item.partes.map(p => (
                                <span
                                  key={p.id}
                                  className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1"
                                >
                                  <User className="w-3 h-3 text-slate-500" />
                                  <b className="font-semibold">{p.nome}</b>
                                  <span className="text-slate-500 text-[10px]">({p.tipoParte || 'Parte'})</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Botões de Ação do Card */}
                          <div className="bg-slate-50 px-4 py-2.5 rounded-b-xl border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyEmail(item);
                              }}
                              className="text-xs font-semibold text-slate-700 hover:text-red-700 flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copiar E-mail / SIS
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  setRightPanelTab('fields');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold flex items-center gap-1"
                                title="Visualizar e editar campos extraídos deste processo"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                Campos
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(JSON.parse(JSON.stringify(item)));
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
                                title="Abrir em modal de edição rápida"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportSingleDocx(item);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5 text-red-600" />
                                Word (.docx)
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Coluna Direita: Editor de Campos Extraídos e Pré-visualizador da Minuta */}
                  <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between sticky top-24 max-h-[85vh] overflow-y-auto">
                    {selectedItem ? (
                      <div className="space-y-4">
                        {/* Header do Painel Direito com Abas de Visualização */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-extrabold text-red-700 uppercase tracking-wider">
                                {rightPanelTab === 'fields' ? '📝 Campos Extraídos' : '📄 Minuta SIS / NI'}
                              </span>
                              {selectedItem.urgente && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Urgente
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 font-mono">
                              {selectedItem.numeroProcesso || 'Processo sem número'}
                            </h3>
                          </div>

                          {/* Seletor de Modo: Campos vs Minuta */}
                          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setRightPanelTab('fields')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                rightPanelTab === 'fields'
                                  ? 'bg-white text-red-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Campos ({selectedItem.partes.length} {selectedItem.partes.length === 1 ? 'parte' : 'partes'})
                            </button>
                            <button
                              type="button"
                              onClick={() => setRightPanelTab('preview')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                rightPanelTab === 'preview'
                                  ? 'bg-white text-red-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Minuta Oficial
                            </button>
                          </div>
                        </div>

                        {/* Barra de Ações Rápidas */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(selectedItem)}
                              className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Copiar texto formatado para envio por e-mail ou SIS/NI"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Texto
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportSingleDocx(selectedItem)}
                              className="px-2.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Baixar solicitação deste processo em Word .docx"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Word (.docx)
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {onLoadCaseToSingleScreen && (
                              <button
                                type="button"
                                onClick={() => onLoadCaseToSingleScreen(selectedItem)}
                                className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Carregar os dados deste processo no formulário individual de Pesquisa de NI"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir no Formulário
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowSnippetExtractor(!showSnippetExtractor)}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Extrair dados de um texto para este processo"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              {showSnippetExtractor ? 'Ocultar Extração' : 'Extrair p/ Campos'}
                            </button>
                          </div>
                        </div>

                        {/* Módulo de Extração de Texto Rápida para o Processo Selecionado */}
                        {showSnippetExtractor && (
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                Extrair e preencher campos deste processo com texto ou print colado:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSnippetExtractor(false);
                                  setSnippetPastedImage(null);
                                }}
                                className="text-amber-700 hover:text-amber-900 text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            <textarea
                              value={extractSnippetText}
                              onChange={e => setExtractSnippetText(e.target.value)}
                              onPaste={handleSnippetPaste}
                              placeholder="Cole aqui o texto do mandado OU dê Ctrl+V para colar um print/imagem de documento..."
                              className="w-full h-20 p-2.5 bg-white border border-amber-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                            />

                            {/* Preview da Imagem Colada no Extrator */}
                            {snippetPastedImage && (
                              <div className="p-2 bg-amber-100/80 border border-amber-300 rounded-lg flex items-center justify-between gap-3 animate-in fade-in">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <img 
                                    src={snippetPastedImage.previewUrl} 
                                    alt="Snippet colado" 
                                    className="w-10 h-10 object-cover rounded-md border border-amber-400 bg-white" 
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-900">
                                      <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Imagem colada do mandado / documento</span>
                                    </div>
                                    <p className="text-[10px] text-amber-700">
                                      {snippetPastedImage.sizeKb} KB • Pronto para extrair e preencher campos
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => setSnippetPastedImage(null)}
                                  className="p-1 text-amber-700 hover:text-red-700 hover:bg-amber-200 rounded transition-colors cursor-pointer"
                                  title="Remover imagem"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="text-[10px] text-amber-800">
                                💡 Dica: Pode colar prints de tela com <b>Ctrl+V</b> diretamente nesta caixa.
                              </span>
                              <button
                                type="button"
                                disabled={(!extractSnippetText.trim() && !snippetPastedImage) || isExtractingSnippet}
                                onClick={handleExtractSnippetToFields}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                {isExtractingSnippet ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Extraindo dados...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Preencher Campos Automaticamente {snippetPastedImage ? 'com Imagem' : ''}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* CONTEÚDO DA ABA SELECIONADA */}
                        {rightPanelTab === 'fields' ? (
                          <div className="space-y-4">
                            {/* Bloco 1: Informações do Processo */}
                            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-red-600" />
                                  Dados do Processo Judicial
                                </span>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selectedItem.urgente)}
                                    onChange={e => updateSelectedItemField('urgente', e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold text-slate-700">
                                    Réu Preso / Urgente
                                  </span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Número do Processo (CNJ):
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.numeroProcesso}
                                    onChange={e => updateSelectedItemField('numeroProcesso', e.target.value)}
                                    placeholder="0000000-00.0000.8.26.0000"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Data e Horário da Audiência:
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.dataAudiencia || ''}
                                    onChange={e => updateSelectedItemField('dataAudiencia', e.target.value)}
                                    placeholder="Ex: 09/11/2026 às 13:15h"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Vara Criminal / Foro:
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedItem.vara || ''}
                                    onChange={e => updateSelectedItemField('vara', e.target.value)}
                                    placeholder="Ex: 16ª Vara Criminal do Foro Central Criminal Barra Funda"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Bloco 2: Partes Qualificadas nos Autos */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-red-600" />
                                  Partes a Pesquisar ({selectedItem.partes.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={addPartyToSelectedItem}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Adicionar Outra Parte
                                </button>
                              </div>

                              {selectedItem.partes.map((p, pIdx) => (
                                <div
                                  key={p.id || `parte-${pIdx}`}
                                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3"
                                >
                                  {/* Topo do Card da Parte */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                                        {pIdx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800">
                                        {p.nome || 'Parte Sem Nome'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={p.tipoParte || 'Vítima'}
                                        onChange={e => updateSelectedPartyField(p.id, 'tipoParte', e.target.value)}
                                        className="text-[11px] font-bold bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-slate-700 cursor-pointer"
                                      >
                                        <option value="Vítima">Vítima</option>
                                        <option value="Réu">Réu</option>
                                        <option value="Testemunha">Testemunha</option>
                                        <option value="Investigado">Investigado</option>
                                        <option value="Outros">Outros</option>
                                      </select>
                                      {selectedItem.partes.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removePartyFromSelectedItem(p.id)}
                                          className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                                          title="Remover esta parte"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Grade de Campos da Parte */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                                    <div className="md:col-span-9">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Nome Completo:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.nome}
                                        onChange={e => updateSelectedPartyField(p.id, 'nome', e.target.value.toUpperCase())}
                                        placeholder="NOME COMPLETO"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-3">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Folha (Fls.):
                                      </label>
                                      <input
                                        type="text"
                                        value={p.folha || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'folha', e.target.value)}
                                        placeholder="Ex: 01"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-4">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        CPF:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.cpf || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'cpf', formatCPF(e.target.value))}
                                        placeholder="000.000.000-00"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-4">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        RG:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.rg || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'rg', formatRG(e.target.value))}
                                        placeholder="00.000.000-0"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-4">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Data de Nascimento:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.dataNascimento || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'dataNascimento', formatDate(e.target.value))}
                                        placeholder="DD/MM/AAAA"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-6">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Filiação Paterna (Pai):
                                      </label>
                                      <input
                                        type="text"
                                        value={p.pai || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'pai', e.target.value.toUpperCase())}
                                        placeholder="NOME DO PAI"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-6">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Filiação Materna (Mãe):
                                      </label>
                                      <input
                                        type="text"
                                        value={p.mae || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'mae', e.target.value.toUpperCase())}
                                        placeholder="NOME DA MÃE"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-12">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Endereço Completo nos Autos:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.endereco || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'endereco', e.target.value)}
                                        placeholder="Rua, número, complemento, bairro, cidade/UF"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-4">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Telefone / Contatos:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.telefone || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'telefone', e.target.value)}
                                        placeholder="(11) 90000-0000"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-4">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        E-mail:
                                      </label>
                                      <input
                                        type="email"
                                        value={p.email || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'email', e.target.value)}
                                        placeholder="email@exemplo.com"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>

                                    <div className="md:col-span-4">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Mandado nº:
                                      </label>
                                      <input
                                        type="text"
                                        value={p.mandadoNumero || ''}
                                        onChange={e => updateSelectedPartyField(p.id, 'mandadoNumero', e.target.value)}
                                        placeholder="050.2026/000000-0"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Rodapé Informativo */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                                <CheckCheck className="w-4 h-4 text-emerald-600" />
                                Campos sincronizados automaticamente com a minuta e exportações.
                              </span>
                              <button
                                type="button"
                                onClick={() => setRightPanelTab('preview')}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                              >
                                Ver Minuta Formatada →
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ABA DA MINUTA OFICIAL */
                          <div className="space-y-4">
                            {/* Banner de atalho para editar campos */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-amber-800">
                                💡 Visualizando formato oficial MPSP. Para alterar qualificações, processo ou datas:
                              </span>
                              <button
                                type="button"
                                onClick={() => setRightPanelTab('fields')}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                Editar nos Campos
                              </button>
                            </div>

                            {/* Assunto do E-mail */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Assunto Recomendado:</span>
                              <p className="text-xs font-mono font-bold text-slate-800">
                                {generateNiSubject(selectedItem, cargoCode)}
                              </p>
                            </div>

                            {/* Corpo Renderizado HTML no padrão oficial */}
                            <div
                              className="prose prose-sm max-w-none text-xs bg-white rounded-xl p-4 border border-slate-200 overflow-x-auto"
                              dangerouslySetInnerHTML={{
                                __html: generateNiHtml(selectedItem, promotoria, promotor, cargo),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-400">
                        <Eye className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">Selecione um processo na lista ao lado para ver e editar seus campos.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE EDIÇÃO DE PROCESSO / PARTES */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Editar Processo e Qualificações</h3>
                <p className="text-xs text-slate-500">{editingItem.numeroProcesso}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Processo nº (CNJ):</label>
                  <input
                    type="text"
                    value={editingItem.numeroProcesso}
                    onChange={e => setEditingItem({ ...editingItem, numeroProcesso: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Audiência:</label>
                  <input
                    type="text"
                    value={editingItem.dataAudiencia || ''}
                    placeholder="Ex: 09/11/2026 às 13:15h"
                    onChange={e => setEditingItem({ ...editingItem, dataAudiencia: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vara Judicial:</label>
                <input
                  type="text"
                  value={editingItem.vara}
                  onChange={e => setEditingItem({ ...editingItem, vara: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgente-check"
                  checked={editingItem.urgente}
                  onChange={e => setEditingItem({ ...editingItem, urgente: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="urgente-check" className="font-semibold text-slate-800 cursor-pointer">
                  Marcar como Urgente (Réu Preso / Tramitação prioritária)
                </label>
              </div>

              {/* Partes */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 uppercase text-[11px]">Partes Identificadas:</span>
                  <button
                    onClick={() => {
                      const newParty: BatchNiPerson = {
                        id: `p-${Date.now()}`,
                        nome: 'NOVA PARTE',
                        tipoParte: 'Vítima',
                        folha: '01',
                        nacionalidade: 'Brasileiro',
                      };
                      setEditingItem({
                        ...editingItem,
                        partes: [...editingItem.partes, newParty],
                      });
                    }}
                    className="text-red-700 hover:text-red-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Parte
                  </button>
                </div>

                <div className="space-y-3">
                  {editingItem.partes.map((p, pIdx) => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Parte {pIdx + 1}</span>
                        {editingItem.partes.length > 1 && (
                          <button
                            onClick={() => {
                              setEditingItem({
                                ...editingItem,
                                partes: editingItem.partes.filter((_, idx) => idx !== pIdx),
                              });
                            }}
                            className="text-red-600 hover:text-red-800 font-semibold text-[11px]"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-500 font-semibold block">Nome Completo:</label>
                          <input
                            type="text"
                            value={p.nome}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].nome = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Papel:</label>
                          <select
                            value={p.tipoParte || 'Vítima'}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].tipoParte = e.target.value as any;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          >
                            <option value="Vítima">Vítima</option>
                            <option value="Réu">Réu</option>
                            <option value="Testemunha">Testemunha</option>
                            <option value="Investigado">Investigado</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">CPF:</label>
                          <input
                            type="text"
                            value={p.cpf || ''}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].cpf = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">RG:</label>
                          <input
                            type="text"
                            value={p.rg || ''}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].rg = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Data Nasc.:</label>
                          <input
                            type="text"
                            value={p.dataNascimento || ''}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].dataNascimento = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Folha:</label>
                          <input
                            type="text"
                            value={p.folha || ''}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].folha = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Pai:</label>
                          <input
                            type="text"
                            value={p.pai || ''}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].pai = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">Mãe:</label>
                          <input
                            type="text"
                            value={p.mae || ''}
                            onChange={e => {
                              const updated = [...editingItem.partes];
                              updated[pIdx].mae = e.target.value;
                              setEditingItem({ ...editingItem, partes: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block">Endereço:</label>
                        <input
                          type="text"
                          value={p.endereco || ''}
                          onChange={e => {
                            const updated = [...editingItem.partes];
                            updated[pIdx].endereco = e.target.value;
                            setEditingItem({ ...editingItem, partes: updated });
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setItems(items.map(it => (it.id === editingItem.id ? editingItem : it)));
                  setEditingItem(null);
                  showToast('Alterações salvas com sucesso!');
                }}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
