
import React, { useState } from 'react';
import { Person, CaseData, PromotoriaDef } from '../types';
import { Plus, Trash2, Users, UserPlus, X, Sparkles, Loader2, ClipboardType, Image as ImageIcon, Upload, CheckCircle2, FileText, Pencil, Save, Edit3, Check, Calendar, Gavel, AlertCircle } from 'lucide-react';
import { extractTextFromPdfFile, fileToBase64Safe, isPdfFile } from '../utils/pdfHelper';
import { extractNiCompleteData, NiExtractedData, calculateUrgencyFromAudiencia, formatRG, formatCPF, extractDateOnly } from '../utils/niRulesHelper';
import { MandadoUploadModal } from './MandadoUploadModal';
import { parseMandadoDocument, isMandadoDocument } from '../utils/mandadoParser';

interface SidebarFormProps {
  onAddPerson: (person: Person) => void;
  people: Person[];
  onRemovePerson: (id: string) => void;
  onUpdatePerson?: (person: Person) => void;
  onUpdateCaseData?: (caseData: Partial<CaseData>) => void;
  caseData?: CaseData;
  promotorias?: PromotoriaDef[];
}

interface PastedImageState {
  base64: string;
  mimeType: string;
  previewUrl: string;
  sizeKb: number;
  name: string;
}

const SidebarForm: React.FC<SidebarFormProps> = ({ 
  onAddPerson, 
  people, 
  onRemovePerson, 
  onUpdatePerson,
  onUpdateCaseData,
  caseData,
  promotorias
}) => {
  const initialFormState = {
    folha: '',
    nome: '',
    dataNascimento: '',
    rg: '',
    cpf: '',
    mae: '',
    pai: '',
    nacionalidade: 'Brasileiro'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingModalPerson, setEditingModalPerson] = useState<Person | null>(null);
  const [caseSyncNotice, setCaseSyncNotice] = useState<string | null>(null);
  const [isMandadoModalOpen, setIsMandadoModalOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [pastedImage, setPastedImage] = useState<PastedImageState | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Manipulador para cadastro de 1 ou mais partes a partir do upload de Mandado de Intimação
  const handleRegisterMandadoParties = (newParties: Person[], caseUpdates: Partial<CaseData>) => {
    // 1. Cadastra cada parte selecionada
    newParties.forEach(p => {
      onAddPerson(p);
    });

    // 2. Se for 1 parte cadastrada, preenche o formulário para facilitar visualização imediata
    if (newParties.length === 1) {
      const single = newParties[0];
      setFormData({
        folha: single.folha || '',
        nome: single.nome || '',
        dataNascimento: single.dataNascimento || '',
        rg: single.rg || '',
        cpf: single.cpf || '',
        mae: single.mae || '',
        pai: single.pai || '',
        nacionalidade: single.nacionalidade || 'Brasileiro',
      });
    }

    // 3. Atualiza os dados do caso (Autos, Cargo, Promotor, Data Audiência sem horário, Urgência)
    if (onUpdateCaseData && Object.keys(caseUpdates).length > 0) {
      onUpdateCaseData(caseUpdates);
    }

    const items: string[] = [];
    if (caseUpdates.numeroProcesso) items.push(`Autos: ${caseUpdates.numeroProcesso}`);
    if (caseUpdates.cargo) items.push(`${caseUpdates.cargo}`);
    if (caseUpdates.dataAudiencia) items.push(`Audiência: ${caseUpdates.dataAudiencia}`);

    setCaseSyncNotice(`✓ ${newParties.length} parte(s) cadastrada(s) via Mandado! ${items.join(' • ')}`);
    setTimeout(() => setCaseSyncNotice(null), 9000);
  };

  const handleLoadIntoActiveForm = (person: Person, caseUpdates: Partial<CaseData>) => {
    setFormData({
      folha: person.folha || '',
      nome: person.nome || '',
      dataNascimento: person.dataNascimento || '',
      rg: person.rg || '',
      cpf: person.cpf || '',
      mae: person.mae || '',
      pai: person.pai || '',
      nacionalidade: person.nacionalidade || 'Brasileiro',
    });

    if (onUpdateCaseData && Object.keys(caseUpdates).length > 0) {
      onUpdateCaseData(caseUpdates);
    }

    setCaseSyncNotice(`✓ Dados do Mandado carregados no formulário ativo!`);
    setTimeout(() => setCaseSyncNotice(null), 7000);
  };

  const applyNiExtraction = (data: NiExtractedData) => {
    // 1. Preenche a Parte com as regras estritas de N.I
    setFormData(prev => ({
      ...prev,
      nome: data.nome || prev.nome,
      folha: data.folha || prev.folha || '01',
      cpf: data.cpf ? formatCPF(data.cpf) : prev.cpf,
      rg: data.rg ? formatRG(data.rg) : prev.rg,
      dataNascimento: data.dataNascimento ? formatDateInput(data.dataNascimento) : prev.dataNascimento,
      nacionalidade: data.nacionalidade || prev.nacionalidade || 'Brasileiro',
      mae: data.mae || prev.mae,
      pai: data.pai || prev.pai,
    }));

    // 2. Se houver Processo (TJSP 8.26), Cargo (C.71 / C.79), Audiência ou Urgência detectados, sincroniza com o CaseData
    if (onUpdateCaseData && (data.numeroProcesso || data.cargo || data.dataAudiencia || data.urgente !== undefined)) {
      const updates: Partial<CaseData> = {};
      const syncedItems: string[] = [];

      if (data.numeroProcesso) {
        updates.numeroProcesso = data.numeroProcesso;
        syncedItems.push(`Processo SAJ: ${data.numeroProcesso}`);
      }
      if (data.cargo) {
        updates.cargo = data.cargo;
        if (data.promotor) {
          updates.promotor = data.promotor;
        } else if (data.cargo.includes('79')) {
          updates.promotor = 'Margareth Ferraz França';
        } else if (data.cargo.includes('71')) {
          updates.promotor = "Leonardo D'Angelo Vargas Pereira";
        }
        syncedItems.push(`Cargo: ${data.cargo}`);
      }
      if (data.dataAudiencia) {
        updates.dataAudiencia = data.dataAudiencia;
        syncedItems.push(`Audiência: ${data.dataAudiencia}`);
      }
      if (data.urgente !== undefined) {
        updates.urgente = data.urgente;
        syncedItems.push(data.urgente ? '🚨 Urgente (≤ 30 dias)' : 'Prioridade Normal (> 30 dias)');
      } else if (data.dataAudiencia) {
        const urg = calculateUrgencyFromAudiencia(data.dataAudiencia);
        updates.urgente = urg.urgente;
        syncedItems.push(urg.urgente ? '🚨 Urgente (≤ 30 dias)' : 'Prioridade Normal (> 30 dias)');
      }

      onUpdateCaseData(updates);

      if (syncedItems.length > 0) {
        setCaseSyncNotice(`✓ Cabeçalho preenchido: ${syncedItems.join(' • ')}`);
        setTimeout(() => setCaseSyncNotice(null), 8000);
      }
    }
  };

  const validateCPF = (cpf: string) => {
    const strCPF = cpf.replace(/[^\d]+/g, '');
    if (strCPF === '') return true;
    if (strCPF.length !== 11) return false;
    if (["00000000000", "11111111111", "22222222222", "33333333333", "44444444444", "55555555555", "66666666666", "77777777777", "88888888888", "99999999999"].includes(strCPF)) return false;
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(10, 11))) return false;
    return true;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatRG = (value: string) => {
    const raw = value.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 9);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return raw.replace(/^(\d{2})(\d+)/, '$1.$2');
    if (raw.length <= 8) return raw.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    return raw.replace(/^(\d{2})(\d{3})(\d{3})([0-9X])/, '$1.$2.$3-$4');
  };

  const formatDateInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    // Aplica a máscara DD/MM/AAAA
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return numbers.replace(/(\d{2})(\d+)/, '$1/$2');
    return numbers.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    
    if (name === 'cpf') newValue = formatCPF(value);
    else if (name === 'rg') newValue = formatRG(value);
    else if (name === 'dataNascimento') newValue = formatDateInput(value);
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleClear = () => {
    setFormData(initialFormState);
    setEditingPersonId(null);
    setAiInput('');
    setPastedImage(null);
  };

  const handleStartEdit = (person: Person) => {
    setIsAiMode(false);
    setEditingPersonId(person.id);
    setFormData({
      folha: person.folha || '',
      nome: person.nome || '',
      dataNascimento: person.dataNascimento || '',
      rg: person.rg || '',
      cpf: person.cpf || '',
      mae: person.mae || '',
      pai: person.pai || '',
      nacionalidade: person.nacionalidade || 'Brasileiro'
    });
  };

  const handleCancelEdit = () => {
    handleClear();
  };

  const handleSaveEdit = () => {
    if (!formData.nome.trim()) return alert("O nome da parte é obrigatório.");
    if (!editingPersonId) return;

    const existingPerson = people.find(p => p.id === editingPersonId);
    const updatedPerson: Person = {
      ...(existingPerson || { id: editingPersonId }),
      ...formData,
      id: editingPersonId,
    };

    if (onUpdatePerson) {
      onUpdatePerson(updatedPerson);
    } else {
      // Fallback
      onRemovePerson(editingPersonId);
      onAddPerson(updatedPerson);
    }

    handleClear();
  };

  const handleSaveModalEdit = (updated: Person) => {
    if (!updated.nome.trim()) {
      alert("O nome da parte é obrigatório.");
      return;
    }
    if (onUpdatePerson) {
      onUpdatePerson(updated);
    } else {
      onRemovePerson(updated.id);
      onAddPerson(updated);
    }
    if (editingPersonId === updated.id) {
      handleClear();
    }
    setEditingModalPerson(null);
  };

  const handleAdd = () => {
    if (!formData.nome.trim()) return alert("O nome da parte é obrigatório.");
    const newPerson: Person = { id: crypto.randomUUID(), ...formData };
    onAddPerson(newPerson);
    handleClear();
  };

  const processUploadedFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo selecionado é muito grande (máximo 15MB).');
      return;
    }

    if (isPdfFile(file)) {
      setIsParsing(true);
      try {
        const [textResult, base64Result] = await Promise.all([
          extractTextFromPdfFile(file),
          fileToBase64Safe(file),
        ]);

        if (textResult.text) {
          setAiInput(textResult.text);
          // Se for Mandado de Intimação (TJSP), extrai rigorosamente os dados da Pessoa a ser intimada (ex: BRUNA)
          if (isMandadoDocument(textResult.text)) {
            const mandadoData = parseMandadoDocument(textResult.text, file.name, promotorias);
            if (mandadoData.partes && mandadoData.partes.length > 0) {
              const primary = mandadoData.partes[0];
              applyNiExtraction({
                nome: primary.nome,
                cpf: primary.cpf,
                rg: primary.rg,
                pai: primary.pai,
                mae: primary.mae,
                dataNascimento: primary.dataNascimento,
                nacionalidade: primary.nacionalidade,
                folha: primary.folha || mandadoData.folha,
                numeroProcesso: mandadoData.numeroProcesso,
                cargo: mandadoData.cargo,
                promotor: mandadoData.promotor,
                dataAudiencia: mandadoData.dataAudiencia,
                urgente: mandadoData.urgente,
                partes: mandadoData.partes.map(p => ({
                  id: p.id,
                  nome: p.nome,
                  folha: p.folha,
                  cpf: p.cpf,
                  rg: p.rg,
                  pai: p.pai,
                  mae: p.mae,
                  dataNascimento: p.dataNascimento,
                  nacionalidade: p.nacionalidade,
                  tipoParte: p.tipoParte,
                }))
              });
            }
          } else {
            // Auto-preenchimento local preliminar imediato seguindo as Regras de Pesquisa N.I
            const localExtracted = extractNiCompleteData(textResult.text, promotorias);
            if (localExtracted.nome || localExtracted.cpf || localExtracted.rg || localExtracted.numeroProcesso) {
              applyNiExtraction(localExtracted);
            }
          }
        }

        setPastedImage({
          base64: base64Result.data,
          mimeType: 'application/pdf',
          previewUrl: '',
          sizeKb: Math.round(file.size / 1024),
          name: file.name || 'Documento PDF anexado',
        });
      } catch (err) {
        console.error('Erro ao ler PDF no cadastro:', err);
      } finally {
        setIsParsing(false);
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP) ou documento PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPastedImage({
        base64,
        mimeType: file.type || 'image/png',
        previewUrl: URL.createObjectURL(file),
        sizeKb: Math.round(file.size / 1024),
        name: file.name || 'Captura de tela colada',
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processUploadedFile(file);
        }
        return;
      }
    }
  };

  const extractPersonLocalFallback = (text: string) => {
    return extractNiCompleteData(text, promotorias);
  };

  const handleAiParse = async () => {
    if (!aiInput.trim() && !pastedImage) return;
    setIsParsing(true);
    try {
      let extracted: any = null;

      try {
        const res = await fetch('/api/gemini/parse-person', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: aiInput,
            imageBase64: pastedImage?.base64,
            mimeType: pastedImage?.mimeType 
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            extracted = json.data;
          }
        }
      } catch (networkErr) {
        console.warn('Falha na chamada do servidor Gemini, acionando extração local:', networkErr);
      }

      // Aplica regras de pesquisa N.I com parser determinístico
      let niData = extractNiCompleteData(aiInput, promotorias);
      if (isMandadoDocument(aiInput)) {
        const mData = parseMandadoDocument(aiInput, undefined, promotorias);
        if (mData.partes && mData.partes.length > 0) {
          const primary = mData.partes[0];
          niData = {
            ...niData,
            nome: primary.nome,
            cpf: primary.cpf || niData.cpf,
            rg: primary.rg || niData.rg,
            pai: primary.pai || niData.pai,
            mae: primary.mae || niData.mae,
            dataNascimento: primary.dataNascimento || niData.dataNascimento,
            folha: primary.folha || mData.folha || niData.folha,
            numeroProcesso: mData.numeroProcesso || niData.numeroProcesso,
            cargo: mData.cargo || niData.cargo,
            promotor: mData.promotor || niData.promotor,
            dataAudiencia: mData.dataAudiencia || niData.dataAudiencia,
          };
        }
      }
      extracted = { ...(niData || {}), ...(extracted || {}) };

      // Se a IA poluiu o nome com itens a ignorar (FONE, CEP, COR, ENDEREÇO, ESTADO) ou falhou, usar nome limpo do parser N.I
      if (niData.nome) {
        if (!extracted.nome || /fone|tel|cep|cor|endereço|natural|estado/i.test(extracted.nome) || isMandadoDocument(aiInput)) {
          extracted.nome = niData.nome;
        }
      }
      if (niData.mae && (!extracted.mae || /fone|tel|cep|endereço/i.test(extracted.mae))) {
        extracted.mae = niData.mae;
      }
      if (niData.pai && (!extracted.pai || /fone|tel|cep|endereço/i.test(extracted.pai))) {
        extracted.pai = niData.pai;
      }
      if (niData.folha && niData.folha !== '01') {
        extracted.folha = niData.folha;
      }
      // Garante que Processo SAJ, Cargo e Data de Audiência sejam propagados
      if (niData.numeroProcesso && !extracted.numeroProcesso) extracted.numeroProcesso = niData.numeroProcesso;
      if (niData.cargo && !extracted.cargo) {
        extracted.cargo = niData.cargo;
        extracted.promotor = niData.promotor;
      }
      if (niData.dataAudiencia && !extracted.dataAudiencia) {
        extracted.dataAudiencia = niData.dataAudiencia;
        extracted.urgente = niData.urgente;
      }
      if (extracted.cargo && !extracted.promotor) {
        if (extracted.cargo.includes('79')) extracted.promotor = 'Margareth Ferraz França';
        else if (extracted.cargo.includes('71')) extracted.promotor = "Leonardo D'Angelo Vargas Pereira";
      }
      if (extracted.dataAudiencia && extracted.urgente === undefined) {
        const urg = calculateUrgencyFromAudiencia(extracted.dataAudiencia);
        extracted.urgente = urg.urgente;
      }

      if (extracted && (extracted.nome || extracted.cpf || extracted.rg || extracted.numeroProcesso || extracted.dataAudiencia || extracted.cargo)) {
        applyNiExtraction(extracted);

        // Se identificou múltiplas partes ou parte única com nome, adiciona à lista
        if (niData.partes && niData.partes.length > 1) {
          niData.partes.forEach(p => {
            onAddPerson({
              id: crypto.randomUUID(),
              nome: p.nome,
              folha: p.folha || '01',
              cpf: p.cpf ? formatCPF(p.cpf) : '',
              rg: p.rg ? formatRG(p.rg) : '',
              dataNascimento: p.dataNascimento ? formatDateInput(p.dataNascimento) : '',
              nacionalidade: p.nacionalidade || 'Brasileiro',
              mae: p.mae || '',
              pai: p.pai || '',
            });
          });
          handleClear();
        } else if (extracted.nome) {
          const personToAdd: Person = {
            id: editingPersonId || crypto.randomUUID(),
            nome: extracted.nome,
            folha: extracted.folha || '01',
            cpf: extracted.cpf ? formatCPF(extracted.cpf) : '',
            rg: extracted.rg ? formatRG(extracted.rg) : '',
            dataNascimento: extracted.dataNascimento ? formatDateInput(extracted.dataNascimento) : '',
            nacionalidade: extracted.nacionalidade || 'Brasileiro',
            mae: extracted.mae || '',
            pai: extracted.pai || '',
          };

          if (editingPersonId && onUpdatePerson) {
            onUpdatePerson(personToAdd);
            setEditingPersonId(null);
          } else {
            onAddPerson(personToAdd);
          }
          handleClear();
        }

        setIsAiMode(false);
        setAiInput('');
        setPastedImage(null);
      } else {
        alert("Não foi possível identificar os dados da pessoa ou processo no texto ou imagem informada. Verifique a nitidez ou preencha manualmente.");
      }
    } catch (error) { 
      console.error(error);
      alert("Erro ao processar dados da pessoa."); 
    } finally { 
      setIsParsing(false); 
    }
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-500 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full md:w-[380px] bg-slate-900 flex flex-col h-full border-r border-slate-800 shadow-2xl relative z-10">
      <div className="bg-slate-950 p-6 text-white overflow-hidden relative border-b border-slate-800">
        <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-amber-600 rounded-lg"><Users size={20} className="text-slate-950" /></div>
            <div>
                <h2 className="font-bold text-lg leading-tight uppercase tracking-tight">Pesquisa NI</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Cadastro de Partes</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserPlus size={16} className={editingPersonId ? 'text-amber-400' : 'text-amber-500'} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {editingPersonId ? 'Editar Parte' : 'Nova Parte'}
              </span>
              {editingPersonId && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Modo Edição
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsMandadoModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border bg-slate-800 border-amber-500/40 text-amber-400 hover:bg-amber-600 hover:text-white hover:border-amber-700 shadow-sm cursor-pointer"
                title="Cadastrar 1 ou mais partes via Upload de Mandado de Intimação (PDF)"
              >
                <FileText size={12} className="text-amber-400" />
                <span>Mandado (PDF)</span>
              </button>
              {!editingPersonId && (
                <button onClick={() => setIsAiMode(!isAiMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${isAiMode ? 'bg-amber-600 border-amber-700 text-white' : 'bg-slate-800 border-slate-700 text-amber-500 hover:bg-slate-700'}`}>
                  <Sparkles size={12} /> {isAiMode ? 'Fechar IA' : 'Modo IA'}
                </button>
              )}
            </div>
          </div>

          {/* Cartão de Atalho Rápido para Mandado de Intimação (Upload 1+ Partes) */}
          {!editingPersonId && !isAiMode && (
            <div 
              onClick={() => setIsMandadoModalOpen(true)}
              className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-600/40 hover:border-amber-500 rounded-xl flex items-center justify-between gap-3 cursor-pointer group transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200 truncate">
                      Upload Mandado de Intimação
                    </p>
                    <span className="text-[8.5px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      1+ Partes
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    Extrai Autos, 1+ Partes, Fls, Audiência e Cargo
                  </p>
                </div>
              </div>
              <div className="text-amber-400 text-xs font-bold shrink-0 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                <span>Importar</span> ➔
              </div>
            </div>
          )}

          {/* Aviso de Preenchimento Automático do Cabeçalho */}
          {caseSyncNotice && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block text-emerald-200">Cabeçalho Sincronizado:</span>
                <span className="text-[11px] text-emerald-300 break-words">{caseSyncNotice}</span>
              </div>
            </div>
          )}

          {isAiMode ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
              <div 
                onPaste={handlePaste}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const files = e.dataTransfer?.files;
                  if (files && files[0]) {
                    processUploadedFile(files[0]);
                  }
                }}
                className={`p-4 bg-amber-950/20 rounded-2xl border transition-colors ${
                  isDraggingOver ? 'border-amber-500 bg-amber-900/30' : 'border-amber-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ClipboardType size={12} /> Cole o texto, imagem ou PDF
                  </p>
                  <label 
                    className="cursor-pointer flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded-md border border-amber-800/40 transition-colors"
                    title="Anexar arquivo PDF ou imagem do computador"
                  >
                    <FileText size={11} />
                    <span>PDF / Imagem</span>
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf,image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          processUploadedFile(e.target.files[0]);
                        }
                      }} 
                    />
                  </label>
                </div>

                <textarea 
                  value={aiInput} 
                  onChange={(e) => setAiInput(e.target.value)} 
                  onPaste={handlePaste}
                  placeholder="Cole texto de denúncia, BO, mandado OU pressione Ctrl+V para colar um print / imagem de documento aqui..." 
                  className="w-full h-32 bg-slate-900 border border-amber-900/40 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-all placeholder:text-slate-500" 
                />

                {/* Pré-visualização da imagem colada */}
                {pastedImage && (
                  <div className="mt-2.5 p-2 bg-slate-900/95 border border-amber-500/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="relative shrink-0">
                        <img 
                          src={pastedImage.previewUrl} 
                          alt="Documento colado" 
                          className="w-14 h-14 object-cover rounded-lg border border-amber-700/60 bg-slate-950 shadow-xs" 
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                          <ImageIcon size={12} className="text-amber-400 shrink-0" />
                          <span className="truncate">Imagem colada (Print)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {pastedImage.sizeKb} KB • Pronta para extração
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setPastedImage(null)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Remover imagem colada"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Resumo visual das Regras de Pesquisa N.I */}
                <div className="mt-2.5 p-2 bg-slate-900/80 border border-slate-800 rounded-lg text-[10px] text-slate-300 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span>⚡ Regras de Pesquisa N.I:</span>
                    <span className="text-[9px] text-emerald-400 font-mono">ATIVAS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] text-slate-400">
                    <div>• <b>Prioridade:</b> ≤30d Urgente / &gt;30d Normal</div>
                    <div>• <b>Cargos:</b> C.71 (Leonardo) / C.79 (Margareth)</div>
                    <div>• <b>Folhas:</b> Fls## / Fl# / Folhas##</div>
                    <div>• <b>Parte:</b> 1º Nome (ignora Fone/CEP/Cor/End)</div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-amber-400/80 flex items-center gap-1 leading-tight">
                  <span>💡 <b>Dica rápida:</b> Cole mandado, despacho ou dê print (Win + Shift + S) e cole com <b>Ctrl+V</b>!</span>
                </div>

                <button 
                  onClick={handleAiParse} 
                  disabled={isParsing || (!aiInput.trim() && !pastedImage)} 
                  className="w-full mt-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isParsing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Extraindo dados com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Extrair Dados {pastedImage ? 'da Imagem' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {editingPersonId && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Pencil size={14} className="text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-amber-300 truncate">
                        Editando dados da parte
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Altere os campos e clique em Salvar Alterações
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[10px] uppercase font-bold text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors shrink-0"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1"><label className={labelClass}>Fls.</label><input type="text" name="folha" value={formData.folha} onChange={handleChange} className={inputClass} placeholder="00" /></div>
                <div className="col-span-3"><label className={labelClass}>Nome Completo *</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} className={inputClass} placeholder="Nome..." /></div>
              </div>
              
              {/* Campo de Data alterado para texto para permitir colar */}
              <div>
                <label className={labelClass}>Nascimento</label>
                <input 
                  type="text" 
                  name="dataNascimento" 
                  value={formData.dataNascimento} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>RG</label><input type="text" name="rg" value={formData.rg} onChange={handleChange} maxLength={12} className={inputClass} placeholder="00.000.000-X" /></div>
                <div><label className={labelClass}>CPF</label><input type="text" name="cpf" value={formData.cpf} onChange={handleChange} maxLength={14} className={inputClass} placeholder="000.000.000-00" /></div>
              </div>
              <div><label className={labelClass}>Mãe</label><input type="text" name="mae" value={formData.mae} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>Pai</label><input type="text" name="pai" value={formData.pai} onChange={handleChange} className={inputClass} /></div>
              <div className="flex gap-2 pt-2">
                {editingPersonId ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs uppercase transition-all border border-slate-700 flex items-center justify-center gap-1.5"
                    >
                      <X size={14} /> Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5"
                    >
                      <Save size={14} /> Salvar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase transition-all border border-slate-700"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-lg shadow-amber-900/40 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {people.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Partes Cadastradas ({people.length})
              </span>
              <span className="text-[10px] text-slate-500">
                Clique para editar
              </span>
            </div>
            <div className="space-y-2">
              {people.map(person => {
                const isCurrent = editingPersonId === person.id;
                return (
                  <div
                    key={person.id}
                    className={`p-3 rounded-xl flex items-center justify-between shadow-sm transition-all border group ${
                      isCurrent
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50'
                        : 'bg-slate-800/90 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      onClick={() => handleStartEdit(person)}
                      className="min-w-0 flex-1 cursor-pointer pr-2"
                      title="Clique para editar os dados desta parte no formulário"
                    >
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate transition-colors ${
                          isCurrent ? 'text-amber-300' : 'text-slate-200 group-hover:text-amber-400'
                        }`}>
                          {person.nome || 'Parte Sem Nome'}
                        </p>
                        {isCurrent && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                            Em edição
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="uppercase font-black text-slate-500 tracking-wider">
                          Fls. {person.folha || 'N/A'}
                        </span>
                        {person.cpf && (
                          <span className="font-mono text-slate-400">
                            • CPF: {person.cpf}
                          </span>
                        )}
                        {person.rg && (
                          <span className="font-mono text-slate-400">
                            • RG: {person.rg}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(person)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          isCurrent
                            ? 'text-amber-400 bg-amber-500/20'
                            : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700'
                        }`}
                        title="Editar no formulário"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModalPerson({ ...person })}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Abrir janela de edição completa"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePerson(person.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Remover parte"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição Completa da Parte */}
      {editingModalPerson && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Editar Dados da Parte</h3>
                  <p className="text-xs text-slate-400">Altere qualquer informação cadastral da pessoa qualificada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingModalPerson(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fls.</label>
                  <input
                    type="text"
                    value={editingModalPerson.folha || ''}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, folha: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    placeholder="00"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={editingModalPerson.nome}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, nome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-semibold"
                    placeholder="Nome completo..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CPF</label>
                  <input
                    type="text"
                    value={editingModalPerson.cpf || ''}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, cpf: formatCPF(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">RG</label>
                  <input
                    type="text"
                    value={editingModalPerson.rg || ''}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, rg: formatRG(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    placeholder="00.000.000-X"
                    maxLength={12}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data de Nascimento</label>
                  <input
                    type="text"
                    value={editingModalPerson.dataNascimento || ''}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, dataNascimento: formatDateInput(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nacionalidade</label>
                  <input
                    type="text"
                    value={editingModalPerson.nacionalidade || 'Brasileiro'}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, nacionalidade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Mãe</label>
                <input
                  type="text"
                  value={editingModalPerson.mae || ''}
                  onChange={(e) => setEditingModalPerson({ ...editingModalPerson, mae: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  placeholder="Nome da mãe..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pai</label>
                <input
                  type="text"
                  value={editingModalPerson.pai || ''}
                  onChange={(e) => setEditingModalPerson({ ...editingModalPerson, pai: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  placeholder="Nome do pai..."
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Endereço (opcional)</label>
                <input
                  type="text"
                  value={editingModalPerson.endereco || ''}
                  onChange={(e) => setEditingModalPerson({ ...editingModalPerson, endereco: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  placeholder="Rua, número, bairro..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editingModalPerson.telefone || ''}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, telefone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    placeholder="(11) 90000-0000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editingModalPerson.email || ''}
                    onChange={(e) => setEditingModalPerson({ ...editingModalPerson, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingModalPerson(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveModalEdit(editingModalPerson)}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-amber-900/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Mandado de Intimação */}
      <MandadoUploadModal
        isOpen={isMandadoModalOpen}
        onClose={() => setIsMandadoModalOpen(false)}
        onRegisterParties={handleRegisterMandadoParties}
        onLoadIntoActiveForm={handleLoadIntoActiveForm}
        promotorias={promotorias}
        currentCaseData={caseData}
      />
    </div>
  );
};

export default SidebarForm;
