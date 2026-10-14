import React, { useState, useRef } from 'react';
import { Person, CaseData, PromotoriaDef } from '../types';
import { 
  X, Upload, FileText, CheckCircle2, AlertCircle, Calendar, Gavel, 
  Users, Check, Trash2, Edit3, Save, Sparkles, Loader2, ArrowRight, ShieldAlert,
  HelpCircle, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { isPdfFile, extractTextFromPdfFile, fileToBase64Safe } from '../utils/pdfHelper';
import { MandadoParty, MandadoParseResult, parseMandadoDocument } from '../utils/mandadoParser';
import { formatCPF, formatRG, extractDateOnly, calculateUrgencyFromAudiencia } from '../utils/niRulesHelper';

interface MandadoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterParties: (parties: Person[], caseUpdates: Partial<CaseData>) => void;
  onLoadIntoActiveForm?: (person: Person, caseUpdates: Partial<CaseData>) => void;
  promotorias?: PromotoriaDef[];
  currentCaseData?: CaseData;
}

export const MandadoUploadModal: React.FC<MandadoUploadModalProps> = ({
  isOpen,
  onClose,
  onRegisterParties,
  onLoadIntoActiveForm,
  promotorias,
  currentCaseData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dados extraídos do Mandado
  const [parseResult, setParseResult] = useState<MandadoParseResult | null>(null);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [partyDraft, setPartyDraft] = useState<MandadoParty | null>(null);
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Processa arquivo(s) PDF de mandado
  const handleFiles = async (files: FileList | File[]) => {
    const pdfFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (isPdfFile(f)) {
        pdfFiles.push(f);
      }
    }

    if (pdfFiles.length === 0) {
      setErrorMsg('Por favor, selecione arquivos no formato PDF (Mandado de Intimação).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let combinedText = '';
      const names: string[] = [];

      for (const file of pdfFiles) {
        names.push(file.name);
        // 1. Extração do texto nativo via pdfHelper / backend
        const extractRes = await extractTextFromPdfFile(file);
        if (extractRes.text) {
          combinedText += `\n\n--- INÍCIO DOCUMENTO: ${file.name} ---\n${extractRes.text}`;
        } else {
          // Tenta ler via base64 para o endpoint do servidor
          const b64 = await fileToBase64Safe(file);
          const serverRes = await fetch('/api/gemini/parse-mandado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: b64.data, fileName: file.name }),
          });
          if (serverRes.ok) {
            const data = await serverRes.json();
            if (data.success && data.data) {
              setParseResult(data.data);
              setProcessedFileNames([file.name]);
              setIsLoading(false);
              return;
            }
          }
        }
      }

      if (!combinedText.trim()) {
        throw new Error('Não foi possível extrair texto do(s) arquivo(s) PDF.');
      }

      // 2. Chama endpoint especializado no servidor com fallback para o motor local
      let finalResult: MandadoParseResult | null = null;
      try {
        const resp = await fetch('/api/gemini/parse-mandado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: combinedText, fileName: names.join(', ') }),
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.data) {
            finalResult = json.data;
          }
        }
      } catch (netErr) {
        console.warn('Endpoint parse-mandado indisponível, usando parser local:', netErr);
      }

      // Fallback determinístico local 100% garantido
      if (!finalResult) {
        finalResult = parseMandadoDocument(combinedText, names.join(', '), promotorias);
      }

      // Garante que apenas as partes a serem intimadas (isPrimary / com documentos) comecem marcadas por padrão
      if (finalResult && finalResult.partes) {
        const hasPrimary = finalResult.partes.some(p => p.isPrimary);
        finalResult.partes = finalResult.partes.map(p => ({
          ...p,
          isSelected: hasPrimary ? (p.isPrimary === true) : true
        }));
      }

      setParseResult(finalResult);
      setProcessedFileNames(names);
    } catch (err: any) {
      console.error('Erro ao processar mandado:', err);
      setErrorMsg(err?.message || 'Falha ao processar o arquivo do mandado de intimação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const toggleSelectParty = (id: string) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      partes: parseResult.partes.map(p => 
        p.id === id ? { ...p, isSelected: !p.isSelected } : p
      ),
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      partes: parseResult.partes.map(p => ({ ...p, isSelected: select })),
    });
  };

  const startEditParty = (party: MandadoParty) => {
    setEditingPartyId(party.id);
    setPartyDraft({ ...party });
  };

  const cancelEditParty = () => {
    setEditingPartyId(null);
    setPartyDraft(null);
  };

  const saveEditParty = () => {
    if (!parseResult || !partyDraft) return;
    setParseResult({
      ...parseResult,
      partes: parseResult.partes.map(p => (p.id === partyDraft.id ? partyDraft : p)),
    });
    setEditingPartyId(null);
    setPartyDraft(null);
  };

  const removeParty = (id: string) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      partes: parseResult.partes.filter(p => p.id !== id),
    });
  };

  const addNewBlankParty = () => {
    if (!parseResult) return;
    const newP: MandadoParty = {
      id: `p-${crypto.randomUUID().slice(0, 8)}`,
      nome: 'NOVA PARTE',
      folha: parseResult.folha || '01',
      cpf: '',
      rg: '',
      pai: '',
      mae: '',
      dataNascimento: '',
      nacionalidade: 'Brasileiro',
      tipoParte: 'Vítima',
      isSelected: true,
      isPrimary: false,
    };
    setParseResult({
      ...parseResult,
      partes: [...parseResult.partes, newP],
    });
    startEditParty(newP);
  };

  const selectedParties = parseResult?.partes.filter(p => p.isSelected) || [];

  // Confirmação: Cadastra as partes selecionadas e atualiza o cabeçalho
  const handleConfirmRegistration = () => {
    if (!parseResult || selectedParties.length === 0) {
      alert('Selecione pelo menos 1 parte para cadastrar.');
      return;
    }

    // Converte MandadoParty para o tipo Person da aplicação
    const newPeople: Person[] = selectedParties.map(p => ({
      id: crypto.randomUUID(),
      nome: p.nome.trim().toUpperCase(),
      folha: p.folha || parseResult.folha || '01',
      cpf: p.cpf ? formatCPF(p.cpf) : '',
      rg: p.rg ? formatRG(p.rg) : '',
      pai: p.pai ? p.pai.trim() : '',
      mae: p.mae ? p.mae.trim() : '',
      dataNascimento: p.dataNascimento ? p.dataNascimento.trim() : '',
      nacionalidade: p.nacionalidade || 'Brasileiro',
      tipoParte: p.tipoParte,
      endereco: p.endereco,
      telefone: p.telefone,
      email: p.email,
    }));

    // Prepara atualizações do Caso
    const caseUpdates: Partial<CaseData> = {};
    if (parseResult.numeroProcesso) {
      caseUpdates.numeroProcesso = parseResult.numeroProcesso;
    }
    if (parseResult.cargo) {
      caseUpdates.cargo = parseResult.cargo;
    }
    if (parseResult.promotor) {
      caseUpdates.promotor = parseResult.promotor;
    }
    if (parseResult.dataAudiencia) {
      caseUpdates.dataAudiencia = parseResult.dataAudiencia; // Strictly DD/MM/AAAA (sem horário)
      const urg = calculateUrgencyFromAudiencia(parseResult.dataAudiencia);
      caseUpdates.urgente = urg.urgente;
    }

    onRegisterParties(newPeople, caseUpdates);
    onClose();
  };

  // Carrega a parte selecionada diretamente no formulário ativo
  const handleLoadToForm = () => {
    if (!parseResult || selectedParties.length === 0) {
      alert('Selecione uma parte para carregar no formulário ativo.');
      return;
    }

    const primaryOrFirst = selectedParties.find(p => p.isPrimary) || selectedParties[0];
    const targetPerson: Person = {
      id: crypto.randomUUID(),
      nome: primaryOrFirst.nome.trim().toUpperCase(),
      folha: primaryOrFirst.folha || parseResult.folha || '01',
      cpf: primaryOrFirst.cpf ? formatCPF(primaryOrFirst.cpf) : '',
      rg: primaryOrFirst.rg ? formatRG(primaryOrFirst.rg) : '',
      pai: primaryOrFirst.pai ? primaryOrFirst.pai.trim() : '',
      mae: primaryOrFirst.mae ? primaryOrFirst.mae.trim() : '',
      dataNascimento: primaryOrFirst.dataNascimento ? primaryOrFirst.dataNascimento.trim() : '',
      nacionalidade: primaryOrFirst.nacionalidade || 'Brasileiro',
      tipoParte: primaryOrFirst.tipoParte,
      endereco: primaryOrFirst.endereco,
      telefone: primaryOrFirst.telefone,
      email: primaryOrFirst.email,
    };

    const caseUpdates: Partial<CaseData> = {};
    if (parseResult.numeroProcesso) caseUpdates.numeroProcesso = parseResult.numeroProcesso;
    if (parseResult.cargo) caseUpdates.cargo = parseResult.cargo;
    if (parseResult.promotor) caseUpdates.promotor = parseResult.promotor;
    if (parseResult.dataAudiencia) {
      caseUpdates.dataAudiencia = parseResult.dataAudiencia;
      const urg = calculateUrgencyFromAudiencia(parseResult.dataAudiencia);
      caseUpdates.urgente = urg.urgente;
    }

    if (onLoadIntoActiveForm) {
      onLoadIntoActiveForm(targetPerson, caseUpdates);
    } else {
      onRegisterParties([targetPerson], caseUpdates);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Upload de Mandado de Intimação</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pesquisa N.I
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extração automática dos autos, partes, folhas, audiência e vínculo Vara/Cargo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Alertas e Mensagens */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Área de Dropzone de Arquivo */}
          {!parseResult && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-amber-400 bg-amber-500/10' 
                  : 'border-slate-700 bg-slate-950/40 hover:border-amber-500/60 hover:bg-slate-800/40'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(e.target.files);
                  }
                }}
              />
              
              {isLoading ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <Loader2 size={36} className="text-amber-400 animate-spin" />
                  <p className="text-sm font-bold text-slate-200">Processando e extraindo dados do Mandado...</p>
                  <p className="text-xs text-slate-400">Identificando Autos, Vara, Audiência e Partes a serem intimadas...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                    <Upload size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 mb-1">
                    Arraste o arquivo PDF do Mandado de Intimação aqui
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mb-4">
                    Suporta mandados individuais ou múltiplos (vítimas, réus, testemunhas).
                    Extração automática de <b>Autos</b>, <b>Partes</b>, <b>Fls</b>, <b>Audiência (sem horário)</b> e <b>Cargo</b>.
                  </p>
                  <button 
                    type="button"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} /> Selecionar PDF do Computador
                  </button>
                </>
              )}
            </div>
          )}

          {/* Dica de Regras e Mapeamento de Cargo */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Gavel size={14} /> Regras Oficiais de Extração &amp; Vínculo de Cargo
              </span>
              <span className="text-[10px] text-slate-400">Padrão TJSP 8.26 / 4ª PJ Criminal</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">• 19ª Vara Criminal:</span>
                <span className="text-slate-200 font-semibold">Cargo 71</span>
                <span className="text-slate-400 text-[10px]">(Leonardo D'Angelo)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">• 16ª Vara Criminal:</span>
                <span className="text-slate-200 font-semibold">Cargo 79</span>
                <span className="text-slate-400 text-[10px]">(Margareth Ferraz)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">• Audiência:</span>
                <span className="text-slate-200 font-semibold">Apenas a data (DD/MM/AAAA)</span>
                <span className="text-slate-400 text-[10px]">- horário é desconsiderado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">• Urgência:</span>
                <span className="text-slate-200 font-semibold">≤ 30 dias = Urgente</span>
                <span className="text-slate-400 text-[10px]">&gt; 30 dias = Normal</span>
              </div>
            </div>
          </div>

          {/* Painel de Resultados Extraídos */}
          {parseResult && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Resumo do Caso & Cabeçalho Detectado */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Dados Processuais Extraídos do Mandado
                  </span>
                  <button
                    onClick={() => {
                      setParseResult(null);
                      setProcessedFileNames([]);
                    }}
                    className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Enviar outro mandado
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Autos / Processo */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Autos (Processo TJSP)
                    </span>
                    <input 
                      type="text" 
                      value={parseResult.numeroProcesso || ''}
                      onChange={(e) => setParseResult({ ...parseResult, numeroProcesso: e.target.value })}
                      placeholder="0000000-00.0000.8.26.0000"
                      className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Vara & Cargo */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Vara / Cargo MPSP
                    </span>
                    <div className="text-xs font-bold text-slate-200">
                      {parseResult.vara ? (
                        <div className="space-y-0.5">
                          <span className="text-amber-400">{parseResult.vara}</span>
                          <span className="block text-[11px] text-emerald-300 font-mono">
                            ➔ {parseResult.cargo || 'Não definido'}
                          </span>
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          value={parseResult.cargo || ''}
                          onChange={(e) => setParseResult({ ...parseResult, cargo: e.target.value })}
                          placeholder="Ex: 71º Promotor de Justiça"
                          className="w-full bg-slate-950 text-slate-100 text-xs px-2 py-1.5 rounded border border-slate-700 outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Data da Audiência (apenas data) */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Data Audiência (Sem Hora)
                      </span>
                      {parseResult.urgente && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Urgente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={parseResult.dataAudiencia || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const cleanDate = extractDateOnly(val);
                          const urg = calculateUrgencyFromAudiencia(cleanDate);
                          setParseResult({ 
                            ...parseResult, 
                            dataAudiencia: cleanDate,
                            urgente: urg.urgente,
                            urgenteMotivo: urg.label,
                            diffDays: urg.diffDays
                          });
                        }}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                        className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-amber-500"
                      />
                    </div>
                    {parseResult.urgenteMotivo && (
                      <span className="block text-[9.5px] text-slate-400 mt-1 truncate">
                        {parseResult.urgenteMotivo}
                      </span>
                    )}
                  </div>

                  {/* Folhas (Fls) */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Folhas dos Autos (Fls.)
                    </span>
                    <input 
                      type="text" 
                      value={parseResult.folha || ''}
                      onChange={(e) => setParseResult({ ...parseResult, folha: e.target.value })}
                      placeholder="164"
                      className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-amber-500"
                    />
                  </div>

                </div>
              </div>

              {/* Lista de Partes Extraídas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Partes Identificadas no Mandado ({parseResult.partes.length})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      Selecionar Todas
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAll(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      Desmarcar Todas
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={addNewBlankParty}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={12} /> Adicionar Parte
                    </button>
                  </div>
                </div>

                {parseResult.partes.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                    Nenhuma parte individual identificada automaticamente. Clique em "Adicionar Parte" para inserir manualmente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parseResult.partes.map((party) => {
                      const isEditing = editingPartyId === party.id;
                      return (
                        <div
                          key={party.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            party.isSelected 
                              ? 'bg-slate-950/90 border-amber-500/40 ring-1 ring-amber-500/20' 
                              : 'bg-slate-950/40 border-slate-800 opacity-60'
                          }`}
                        >
                          {isEditing && partyDraft ? (
                            /* Modo Edição Inline da Parte */
                            <div className="space-y-3 p-1">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <span className="text-xs font-bold text-amber-400">Editando Dados da Parte</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={cancelEditParty}
                                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-md transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={saveEditParty}
                                    className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors flex items-center gap-1"
                                  >
                                    <Save size={12} /> Salvar
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="md:col-span-2">
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nome Completo</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.nome}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, nome: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Papel Processual</label>
                                  <select 
                                    value={partyDraft.tipoParte}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, tipoParte: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100"
                                  >
                                    <option value="Vítima">Vítima</option>
                                    <option value="Investigado">Réu / Investigado</option>
                                    <option value="Representante da Vítima">Testemunha / Repr.</option>
                                    <option value="Outros">Outros</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">CPF</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.cpf}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, cpf: formatCPF(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">RG</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.rg}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, rg: formatRG(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nascimento</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.dataNascimento}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, dataNascimento: e.target.value })}
                                    placeholder="DD/MM/AAAA"
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Folhas (Fls.)</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.folha}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, folha: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100 font-mono"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nome da Mãe</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.mae}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, mae: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nome do Pai</label>
                                  <input 
                                    type="text" 
                                    value={partyDraft.pai}
                                    onChange={(e) => setPartyDraft({ ...partyDraft, pai: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Endereço Completo</label>
                                <input 
                                  type="text" 
                                  value={partyDraft.endereco || ''}
                                  onChange={(e) => setPartyDraft({ ...partyDraft, endereco: e.target.value })}
                                  className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-slate-100 text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            /* Visualização Normal do Card da Parte */
                            <div className="flex items-start gap-3">
                              {/* Checkbox de Seleção */}
                              <input 
                                type="checkbox"
                                checked={party.isSelected}
                                onChange={() => toggleSelectParty(party.id)}
                                className="mt-1 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer"
                              />

                              {/* Dados da Parte */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h5 className="font-bold text-sm text-slate-100">
                                    {party.nome}
                                  </h5>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    party.tipoParte === 'Vítima'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : party.tipoParte === 'Investigado'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}>
                                    {party.tipoParte}
                                  </span>
                                  {party.isPrimary && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      Intimando Principal
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Fls. {party.folha || parseResult.folha || '01'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-400">
                                  <div>
                                    <span className="text-slate-500">CPF:</span>{' '}
                                    <span className="text-slate-200 font-mono">{party.cpf || 'Não informado'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">RG:</span>{' '}
                                    <span className="text-slate-200 font-mono">{party.rg || 'Não informado'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Nascimento:</span>{' '}
                                    <span className="text-slate-200">{party.dataNascimento || 'Não informado'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Mãe:</span>{' '}
                                    <span className="text-slate-300">{party.mae || 'Não informada'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Pai:</span>{' '}
                                    <span className="text-slate-300">{party.pai || 'Não informado'}</span>
                                  </div>
                                  {party.endereco && (
                                    <div className="sm:col-span-2 md:col-span-3 truncate" title={party.endereco}>
                                      <span className="text-slate-500">Endereço:</span>{' '}
                                      <span className="text-slate-300">{party.endereco}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Ações Rápidas no Card */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditParty(party)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Editar dados desta parte"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeParty(party.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Remover da lista"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer com Ações */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {parseResult && (
              <span>
                <b>{selectedParties.length}</b> de <b>{parseResult.partes.length}</b> parte(s) selecionada(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {parseResult && selectedParties.length > 0 && (
              <>
                {selectedParties.length === 1 && (
                  <button
                    type="button"
                    onClick={handleLoadToForm}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-600/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Carrega no formulário lateral da Pesquisa N.I"
                  >
                    <Edit3 size={14} /> Carregar no Formulário
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmRegistration}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-amber-900/40 flex items-center gap-2 cursor-pointer"
                >
                  <Check size={16} /> Cadastrar {selectedParties.length} Parte(s) no Caso
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
