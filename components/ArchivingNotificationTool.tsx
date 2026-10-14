
import React, { useState, useMemo, useEffect } from 'react';
import { Person, PromotoriaDef } from '../types';
import { Search, Gavel, User, Mail, MessageCircle, Truck, Printer, Copy, CheckCircle, Trash2, Edit3, X, MapPin, BadgeCheck, FileStack, Plus, PlusCircle, LayoutList, BellRing, Send, Save, ArrowLeft, FileText, Loader2, FileSpreadsheet, Download, Sparkles, Clipboard, Building2, CalendarDays, HelpCircle, Archive, Upload, FileSignature, Image as ImageIcon, Files, FolderPlus, FolderOpen, Users, CheckCircle2, Circle, Paperclip, Fingerprint, Phone, Zap } from 'lucide-react';
import { aiClient, Type } from "../utils/geminiClient";
import { PDFDocument } from 'pdf-lib';
import { SmtBookmarkletModal } from './SmtBookmarkletModal';

interface ArchivingNotificationToolProps {
  promotorias: PromotoriaDef[];
  onOpenHelp?: () => void;
  initialDocView?: 'CERTIDAO' | 'CARTA' | 'PROMOCAO';
  initialTab?: 'DADOS' | 'PROMOCAO' | 'INTIMACAO' | 'CERTIDAO' | 'MERGE';
  initialViewMode?: 'LIST' | 'REGISTER' | 'WORK' | 'BATCH';
}

// --- New Types for Process Management ---
interface ArchivedProcess {
  id: string;
  numero: string;
  promotor: string;
  cargo: string;
  partes: Person[];
  status: 'PENDENTE' | 'CONCLUIDO';
  createdAt: string;
}

const MOCK_PROCESSES: ArchivedProcess[] = [
  {
    id: '1',
    numero: '1533496-19.2025.8.26.0050',
    promotor: 'Margareth Ferraz França',
    cargo: '79º Promotor de Justiça',
    status: 'PENDENTE',
    createdAt: new Date().toISOString(),
    partes: [
      { id: 'p1', nome: 'LETICIA ALVES FERREIRA DE ARAUJO', tipoParte: 'Vítima', statusIntimacao: 'Pendente', folha: '99', telefone: '(11) 96084-4410', email: 'email@example.com', endereco: 'RUA TONI GAUDIO', numero: '584', bairro: 'ANHANGUERA', cidade: 'S.PAULO', complemento: 'CASA', cep: '05266-170' } as Person
    ]
  }
];

const ArchivingNotificationTool: React.FC<ArchivingNotificationToolProps> = ({ 
  promotorias, 
  onOpenHelp,
  initialDocView,
  initialTab,
  initialViewMode
}) => {
  // --- Database State ---
  const [processes, setProcesses] = useState<ArchivedProcess[]>(() => {
    try {
      const saved = localStorage.getItem('mpsp_processes');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Erro ao carregar processos salvos:", e);
    }
    return MOCK_PROCESSES;
  });
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);
  
  // --- View Mode State ---
  const [viewMode, setViewMode] = useState<'LIST' | 'REGISTER' | 'WORK' | 'BATCH'>(() => {
    if (initialViewMode) return initialViewMode;
    return 'LIST';
  });
  const [isSmtModalOpen, setIsSmtModalOpen] = useState(false);

  // --- Registration Form State ---
  const [regData, setRegData] = useState({
    numero: '',
    promotor: '',
    cargo: '',
  });

  // --- Cadastro Rápido States ---
  const [registerType, setRegisterType] = useState<'TRADICIONAL' | 'RAPIDO'>('RAPIDO');
  const [fastRegData, setFastRegData] = useState({
    numero: '',
    cargo: '',
    promotor: '',
    pastedImage: null as string | null,
    partyText: '',
    folha: '',
  });
  const [fastPromoFile, setFastPromoFile] = useState<File | null>(null);
  const [isProcessingFast, setIsProcessingFast] = useState(false);

  // --- Process Edit Form State ---
  const [isEditingProcess, setIsEditingProcess] = useState(false);
  const [editProcessData, setEditProcessData] = useState({
    id: '',
    numero: '',
    promotor: '',
    cargo: '',
  });

  // --- Existing States (Mapped to Active Context) ---
  const [processoAtivo, setProcessoAtivo] = useState('');
  const [dipoInfo, setDipoInfo] = useState('1ª RAJ – Capital - Juiz das Garantias');
  
  // --- Promoção State ---
  const [promotionText, setPromotionText] = useState('');
  const [isPromotionLoading, setIsPromotionLoading] = useState(false);
  const [promoFiles, setPromoFiles] = useState<File[]>([]);
  const [isDraggingPromo, setIsDraggingPromo] = useState(false);
  
  // --- Merge State ---
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [isDraggingMerge, setIsDraggingMerge] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isBlankCertidao, setIsBlankCertidao] = useState(false);

  // --- State de Seleção e Edição (Legacy adapted) ---
  const [selectedParteId, setSelectedParteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Person>>({});
  const [aiInput, setAiInput] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [extractionFile, setExtractionFile] = useState<File | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'DADOS' | 'PROMOCAO' | 'INTIMACAO' | 'CERTIDAO' | 'MERGE'>(() => {
    if (initialTab) return initialTab;
    return 'DADOS';
  });
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'CORREIOS'>('CORREIOS');
  const [copied, setCopied] = useState(false);
  const [docView, setDocView] = useState<'CERTIDAO' | 'CARTA' | 'PROMOCAO'>(initialDocView || 'CERTIDAO');
  const [showPdfModal, setShowPdfModal] = useState(false);

  // --- Batch State ---
  const [batchCargo, setBatchCargo] = useState('');
  const [batchPromotor, setBatchPromotor] = useState('');
  const [batchChannel, setBatchChannel] = useState<'CORREIOS' | 'WHATSAPP' | 'EMAIL'>('CORREIOS');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchItems, setBatchItems] = useState<Array<{
    id: string;
    file: File;
    fileName: string;
    processo: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';
    victimData?: any;
    errorMsg?: string;
  }>>([]);

  // --- Derived States ---
  const activeProcess = useMemo(() => processes.find(p => p.id === activeProcessId), [processes, activeProcessId]);
  const activeParties = useMemo(() => activeProcess?.partes || [], [activeProcess]);
  const selectedParte = useMemo(() => activeParties.find(p => p.id === selectedParteId) || null, [activeParties, selectedParteId]);

  // --- Effects ---
  useEffect(() => {
    try {
      localStorage.setItem('mpsp_processes', JSON.stringify(processes));
    } catch (e) {
      console.error("Erro ao salvar processos no localStorage:", e);
    }
  }, [processes]);

  useEffect(() => {
    if (activeProcess) {
      setProcessoAtivo(activeProcess.numero);
    }
  }, [activeProcess]);

  useEffect(() => {
    if (selectedParte) {
      setFormData({ ...selectedParte });
      setAiInput('');
      setPastedImage(null);
      setExtractionFile(null);
    } else if (!isCreating) {
      setFormData({});
    }
  }, [selectedParte, isCreating]);

  // --- CRUD Handlers ---
  const handleOpenEditProcess = (proc: ArchivedProcess) => {
    setEditProcessData({
      id: proc.id,
      numero: proc.numero,
      promotor: proc.promotor,
      cargo: proc.cargo,
    });
    setIsEditingProcess(true);
  };

  const handleSaveProcessEdit = () => {
    if (!editProcessData.numero || !editProcessData.promotor) {
        return alert("Preencha os dados do processo.");
    }
    setProcesses(prev => prev.map(p => p.id === editProcessData.id ? { 
        ...p, 
        numero: editProcessData.numero, 
        promotor: editProcessData.promotor, 
        cargo: editProcessData.cargo 
    } : p));
    setIsEditingProcess(false);
  };

  const handleDeleteProcess = (processId: string) => {
    if (confirm("Tem certeza de que deseja excluir este processo? Todos os dados vinculados a ele serão perdidos definitivamente.")) {
        setProcesses(prev => prev.filter(p => p.id !== processId));
        if (activeProcessId === processId) {
            setActiveProcessId(null);
            setSelectedParteId(null);
            setIsCreating(false);
        }
    }
  };

  const handleDeleteParty = (partyId: string) => {
    if (confirm("Tem certeza de que deseja excluir esta parte?")) {
        setProcesses(prev => prev.map(proc => {
            if (proc.id === activeProcessId) {
                return {
                    ...proc,
                    partes: proc.partes.filter(p => p.id !== partyId)
                };
            }
            return proc;
        }));
        if (selectedParteId === partyId) {
            setSelectedParteId(null);
            setIsCreating(false);
        }
    }
  };

  // --- Registration Logic ---
  const getPromotorForDate = (cargoLabel: string) => {
    const promotoria = promotorias.find(p => p.label === cargoLabel);
    if (!promotoria) return "";
    const today = new Date().getDate();
    const entry = promotoria.schedule.find(s => today >= s.start && today <= s.end);
    return entry ? entry.name : (promotoria.schedule[0]?.name || "");
  };

  const handleRegisterProcess = () => {
    if (!regData.numero || !regData.promotor) return alert("Preencha os dados do processo.");
    const newProcess: ArchivedProcess = {
      id: crypto.randomUUID(),
      numero: regData.numero,
      promotor: regData.promotor,
      cargo: regData.cargo,
      partes: [], // Initial empty parties list
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };
    setProcesses(prev => [newProcess, ...prev]);
    setActiveProcessId(newProcess.id);
    setViewMode('LIST');
    setRegData({ numero: '', promotor: '', cargo: '' });
  };

  const handleProcessFastRegistration = async () => {
    if (!fastRegData.numero) {
      alert("Por favor, preencha o número do processo.");
      return;
    }
    if (!fastRegData.cargo) {
      alert("Por favor, selecione o cargo.");
      return;
    }

    setIsProcessingFast(true);

    try {
      const ai = aiClient;
      let extractedPartiesList: any[] = [];
      let cleanedPromoText = "";

      // Helper para converter File em Base64
      const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
      };

      // Tarefas paralelas para imagem/texto e PDF
      const tasks: Promise<any>[] = [];

      // Tarefa 1: Extração da qualificação de partes via IA (se houver imagem ou texto)
      if (fastRegData.pastedImage || fastRegData.partyText.trim()) {
        const partyExtractionTask = (async () => {
          try {
            const parts: any[] = [];
            if (fastRegData.pastedImage) {
              parts.push({ 
                inlineData: { 
                  mimeType: "image/png", 
                  data: fastRegData.pastedImage.split(',')[1] 
                } 
              });
              parts.push({ text: "Analise esta imagem que contém dados de até DUAS partes envolvidas (ex: Vítima 1 e Vítima 2 ou Investigados) e extraia os dados de cada uma (Nome Completo, CEP, Endereço, Bairro, Cidade, Estado/UF, Telefone/WhatsApp, CPF, RG, E-mail, Folha, Tipo de Parte). Retorne estritamente um JSON com a chave 'partes' sendo uma lista com até 2 objetos de partes encontradas." });
            } else {
              parts.push({ 
                text: `Analise as seguintes informações de qualificação de parte e extraia os dados de até DUAS partes envolvidas (ex: Parte 1 e Parte 2): Nome Completo, CEP, Endereço (rua, avenida etc), Número, Complemento, Bairro, Cidade, Estado/UF, Telefone/WhatsApp, CPF, RG, E-mail, Folha se houver. Classifique se é 'Vítima' ou 'Investigado'. Padronize valores de texto em CAIXA ALTA. Texto: "${fastRegData.partyText}"` 
              });
            }

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [{ parts }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    partes: {
                      type: Type.ARRAY,
                      description: "Lista de até 2 partes extraídas",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          endereco: { type: Type.STRING },
                          numero: { type: Type.STRING },
                          complemento: { type: Type.STRING },
                          bairro: { type: Type.STRING },
                          cidade: { type: Type.STRING },
                          uf: { type: Type.STRING },
                          cep: { type: Type.STRING },
                          email: { type: Type.STRING },
                          telefone: { type: Type.STRING },
                          cpf: { type: Type.STRING },
                          rg: { type: Type.STRING },
                          folha: { type: Type.STRING },
                          tipoParte: { type: Type.STRING, enum: ['Vítima', 'Investigado', 'Representante da Vítima'] }
                        }
                      }
                    }
                  }
                }
              }
            });

            if (response.text) {
              const parsed = JSON.parse(response.text);
              if (parsed && Array.isArray(parsed.partes) && parsed.partes.length > 0) {
                extractedPartiesList = parsed.partes.slice(0, 2);
              } else if (parsed && parsed.nome) {
                extractedPartiesList = [parsed];
              }
            }
          } catch (partyErr) {
            console.warn("Extração de partes via IA encontrou limitação momentânea:", partyErr);
          }
        })();
        tasks.push(partyExtractionTask);
      }

      // Tarefa 2: Extração e formatação da Promoção de Arquivamento (se houver PDF)
      if (fastPromoFile) {
        const promoExtractionTask = (async () => {
          try {
            const parts: any[] = [];
            const base64 = await convertFileToBase64(fastPromoFile);
            const mimeType = fastPromoFile.type || 'application/pdf';
            parts.push({ inlineData: { data: base64, mimeType } });
            parts.push({ text: "Limpe e formate este texto de promoção de arquivamento. Remova margens, rodapés, cabeçalhos, número de folhas, assinaturas digitais repetitivas e junte os parágrafos. Remova qualquer formatação Markdown (como **negrito** ou asteriscos). Retorne apenas o texto limpo, corrido e bem estruturado." });

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [{ parts }],
            });

            const responseText = response.text || "";
            cleanedPromoText = responseText.replace(/\*\*/g, '').replace(/^"|"$/g, '').trim();
          } catch (promoErr) {
            console.warn("Extração do PDF de promoção encontrou limitação momentânea:", promoErr);
          }
        })();
        tasks.push(promoExtractionTask);
      }

      // Aguarda as tarefas concluírem em paralelo (sem que uma bloqueie a outra)
      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }

      // 3. Criação do processo e vinculação de dados de até 2 partes
      const calculatedPromotor = getPromotorForDate(fastRegData.cargo);
      const newProcessId = crypto.randomUUID();
      const newParties: Person[] = [];

      if (extractedPartiesList.length > 0) {
        extractedPartiesList.forEach((extractedParty: any) => {
          if (extractedParty && (extractedParty.nome || extractedParty.cpf || extractedParty.rg)) {
            const partyObj: Person = {
              id: crypto.randomUUID(),
              nome: (extractedParty.nome || "PARTE QUALIFICADA").toUpperCase(),
              tipoParte: (extractedParty.tipoParte || "Vítima") as any,
              statusIntimacao: 'Pendente',
              folha: fastRegData.folha || extractedParty.folha || "",
              telefone: extractedParty.telefone || "",
              email: extractedParty.email || "",
              endereco: (extractedParty.endereco || "").toUpperCase(),
              numero: extractedParty.numero || "",
              bairro: (extractedParty.bairro || "").toUpperCase(),
              cidade: (extractedParty.cidade || "").toUpperCase(),
              complemento: (extractedParty.complemento || "").toUpperCase(),
              uf: (extractedParty.uf || "SP").toUpperCase(),
              cep: extractedParty.cep ? maskCEP(extractedParty.cep) : "",
              cpf: extractedParty.cpf || "",
              rg: extractedParty.rg || "",
            };
            newParties.push(partyObj);
          }
        });
      }

      // Fallback caso não tenha extraído com sucesso
      if (newParties.length === 0) {
        const fallbackName = "PARTE " + (fastRegData.folha ? "FLS. " + fastRegData.folha : "QUALIFICADA");
        const partyObj: Person = {
          id: crypto.randomUUID(),
          nome: fallbackName,
          tipoParte: "Vítima",
          statusIntimacao: 'Pendente',
          folha: fastRegData.folha || "",
          telefone: "",
          email: "",
          endereco: "",
          numero: "",
          bairro: "",
          cidade: "SÃO PAULO",
          complemento: "",
          uf: "SP",
          cep: "",
          cpf: "",
          rg: "",
        };
        newParties.push(partyObj);
      }

      const newProcess: ArchivedProcess = {
        id: newProcessId,
        numero: fastRegData.numero,
        promotor: calculatedPromotor || fastRegData.promotor || "Promotor de Justiça",
        cargo: fastRegData.cargo,
        partes: newParties,
        status: 'PENDENTE',
        createdAt: new Date().toISOString()
      };

      setProcesses(prev => [newProcess, ...prev]);
      setActiveProcessId(newProcessId);

      if (cleanedPromoText) {
        setPromotionText(cleanedPromoText);
      }

      const firstPartyId = newParties.length > 0 ? newParties[0].id : null;
      if (firstPartyId) {
        setSelectedParteId(firstPartyId);
        setFormData(newParties[0]);
      } else {
        setSelectedParteId(null);
        setFormData({});
      }

      // Reset
      setFastRegData({
        numero: '',
        cargo: '',
        promotor: '',
        pastedImage: null,
        partyText: '',
        folha: '',
      });
      setFastPromoFile(null);

      // Redireciona para visualização
      setViewMode('WORK');
      setActiveTab('CERTIDAO');

      if (extractedPartiesList.length > 0 || cleanedPromoText) {
        alert("Processo e dados processados com sucesso via IA e salvos!");
      } else {
        alert("Processo cadastrado e salvo com sucesso! Você pode revisar e complementar os dados na tela de trabalho.");
      }

    } catch (err: any) {
      console.error(err);
      alert("Erro ao processar cadastro rápido: " + (err?.message || "Tente novamente"));
    } finally {
      setIsProcessingFast(false);
    }
  };

  const updateProcessStatus = (id: string, status: 'PENDENTE' | 'CONCLUIDO') => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const updatePartyStatus = (parteId: string, status: string) => {
    if (!activeProcessId) return;
    setProcesses(prev => prev.map(proc => {
      if (proc.id === activeProcessId) {
        return {
          ...proc,
          partes: proc.partes.map(p => p.id === parteId ? { ...p, statusIntimacao: status as any } : p)
        };
      }
      return proc;
    }));
  };

  // --- Existing Logic (Adapted) ---
  const maskCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
  };

  const savePartyDirect = (partyData: Partial<Person>) => {
    const targetId = partyData.id || selectedParteId;
    if (!activeProcessId || !targetId) return;
    setProcesses(prev => prev.map(proc => {
      if (proc.id === activeProcessId) {
        const exists = proc.partes.some(p => p.id === targetId);
        if (exists) {
          return {
            ...proc,
            partes: proc.partes.map(p => p.id === targetId ? { ...p, ...partyData, id: targetId } as Person : p)
          };
        } else if (partyData.nome) {
          return {
            ...proc,
            partes: [...proc.partes, { ...partyData, id: targetId } as Person]
          };
        }
      }
      return proc;
    }));
  };

  const handleInputChange = (field: keyof Person, value: string) => {
    let formatted = value;
    if (field === 'cep') formatted = maskCEP(value);
    if (['nome', 'endereco', 'bairro', 'cidade', 'complemento', 'mae', 'pai'].includes(field)) {
        formatted = formatted.toUpperCase();
    }
    setFormData(prev => {
      const next = { ...prev, [field]: formatted };
      savePartyDirect(next);
      return next;
    });
  };

  const handleFetchCep = async () => {
    const cep = formData.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;
    
    setIsCepLoading(true);
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
            alert("CEP não encontrado.");
        } else {
            // NOTA: Complemento removido da atualização automática para preservar dados do usuário
            setFormData(prev => {
                const next = {
                    ...prev,
                    endereco: data.logradouro?.toUpperCase(),
                    bairro: data.bairro?.toUpperCase(),
                    cidade: data.localidade?.toUpperCase(),
                    uf: data.uf?.toUpperCase(),
                };
                savePartyDirect(next);
                return next;
            });
        }
    } catch (e) {
        console.error("Erro ao buscar CEP", e);
    } finally {
        setIsCepLoading(false);
    }
  };

  const handleSaveParte = () => {
    if (!formData.nome || !activeProcessId) return alert("Erro ao salvar: Nome é obrigatório.");
    
    let newId = formData.id;
    if (!newId && isCreating) {
        newId = crypto.randomUUID();
    }

    const partyToSave = { ...formData, id: newId } as Person;

    // Update the party inside the process list
    setProcesses(prev => prev.map(proc => {
        if (proc.id === activeProcessId) {
            const exists = proc.partes.find(p => p.id === partyToSave.id);
            if (exists) {
                return { ...proc, partes: proc.partes.map(p => p.id === partyToSave.id ? partyToSave : p) };
            } else {
                return { ...proc, partes: [...proc.partes, partyToSave] };
            }
        }
        return proc;
    }));

    if (isCreating) {
        setIsCreating(false);
        if (newId) setSelectedParteId(newId);
    }
    setActiveTab('PROMOCAO');
  };

  // --- Handlers Auxiliares (Paste, Drag, AI) ---
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => { if (event.target?.result) setPastedImage(event.target.result as string); };
            if (blob) reader.readAsDataURL(blob);
            return;
        }
    }
  };

  const handleFastPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => { 
                if (event.target?.result) {
                    setFastRegData(prev => ({ ...prev, pastedImage: event.target!.result as string }));
                } 
            };
            if (blob) reader.readAsDataURL(blob);
            return;
        }
    }
  };

  // --- Extração Inteligente de Boletim de Ocorrência (Polícia Civil de SP / RDO / Plantão) ---
  const parseBoletimLocal = (rawText: string): Partial<Person> => {
    const text = (rawText || '').replace(/\r/g, '');
    const result: Partial<Person> = {};

    // 1. Tipo da Parte (Vítima, Investigado, Representante da Vítima)
    if (/^\s*(?:v[íi]tima|ofendido)\b/im.test(text) || /\b(?:qualifica[çc][ãa]o da v[íi]tima)\b/i.test(text)) {
      result.tipoParte = 'Vítima';
    } else if (/^\s*(?:investigado|indiciado|autor|r[ée]u|autor dos fatos|averiguado)\b/im.test(text)) {
      result.tipoParte = 'Investigado';
    } else if (/^\s*(?:representante|advogado|testemunha)\b/im.test(text)) {
      result.tipoParte = 'Representante da Vítima';
    }

    // 2. Nome
    const nomeMatch = text.match(/Nome:\s*([^\n\r,;]+)/i) || 
                      text.match(/(?:nome completo|indiciado|v[íi]tima|qualificado\(a\)):\s*([^\n\r,;]+)/i);
    if (nomeMatch) {
      result.nome = nomeMatch[1].trim().toUpperCase();
    }

    // 3. RG
    const rgMatch = text.match(/RG:\s*([0-9A-Za-z.\s/-]+?)(?:,|- SP|Exibiu|CPF|Natural|Nacionalidade|\n|$)/i);
    if (rgMatch) {
      result.rg = rgMatch[1].trim();
    }

    // 4. CPF (permite quebra de linha após "CPF:")
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

    // 7. Endereço Estruturado (Polícia Civil SP)
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

      // Isola logradouro, número, complemento e bairro
      let prefix = fullEnd;
      prefix = prefix.replace(/,\s*CEP\s*[\d.-]+\s*-\s*[A-Za-zÀ-ÿ.\s]+-\s*[A-Z]{2}\s*$/i, '');
      prefix = prefix.replace(/\s*CEP\s*[\d.-]+\s*-\s*[A-Za-zÀ-ÿ.\s]+-\s*[A-Z]{2}\s*$/i, '');
      prefix = prefix.replace(/\s*-\s*[A-Za-zÀ-ÿ.\s]+-\s*[A-Z]{2}\s*$/i, '');

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

    return result;
  };

  const handleSmartExtraction = async () => {
    if (!aiInput.trim() && !pastedImage && !extractionFile) {
        alert("Cole um texto, imagem ou selecione um arquivo para extrair.");
        return;
    }
    setIsAiLoading(true);

    // 1. Aplica o parser local imediatamente em caso de texto para zero latência
    const rawText = aiInput.trim();
    const localExtracted = rawText ? parseBoletimLocal(rawText) : {};
    if (Object.keys(localExtracted).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...localExtracted,
        cep: localExtracted.cep ? maskCEP(localExtracted.cep) : prev.cep,
      }));
    }

    try {
      let imageBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (extractionFile) {
        imageBase64 = await fileToBase64(extractionFile);
        mimeType = extractionFile.type;
      } else if (pastedImage) {
        imageBase64 = pastedImage.split(',')[1];
        mimeType = 'image/png';
      }

      // Tenta a API do servidor /api/gemini/parse-party
      const res = await fetch('/api/gemini/parse-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          imageBase64,
          mimeType,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const ext = json.data;
          setFormData(prev => ({
            ...prev,
            ...ext,
            cep: ext.cep ? maskCEP(ext.cep) : prev.cep,
            telefone: ext.telefone || prev.telefone,
            cpf: ext.cpf || prev.cpf,
          }));
        }
      } else {
        // Fallback no client via aiClient caso o endpoint falhe
        if (aiClient && (imageBase64 || rawText)) {
          const parts: any[] = [];
          if (imageBase64) {
            parts.push({ inlineData: { mimeType: mimeType || 'image/png', data: imageBase64 } });
          }
          parts.push({
            text: `Analise este Boletim de Ocorrência / Autos e extraia em JSON: nome, tipoParte (Vítima ou Investigado), folha, cpf, rg, dataNascimento, endereco, numero, complemento, bairro, cidade, uf, cep, telefone, email.\nTexto: "${rawText}"`,
          });
          const response = await aiClient.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [{ parts }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  tipoParte: { type: Type.STRING },
                  folha: { type: Type.STRING },
                  cpf: { type: Type.STRING },
                  rg: { type: Type.STRING },
                  dataNascimento: { type: Type.STRING },
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
              },
            },
          });
          const clientExtracted = JSON.parse(response.text || '{}');
          setFormData(prev => ({
            ...prev,
            ...clientExtracted,
            cep: clientExtracted.cep ? maskCEP(clientExtracted.cep) : prev.cep,
          }));
        }
      }

      setPastedImage(null);
      setAiInput('');
      setExtractionFile(null);
    } catch (error) {
      console.warn('Extração via IA falhou, mas dados locais foram preservados:', error);
      // Se já extraiu localmente, não exibe erro ao usuário pois o formulário já foi preenchido
      if (Object.keys(localExtracted).length === 0) {
        alert('Não foi possível extrair dados da imagem/arquivo.');
      } else {
        setPastedImage(null);
        setAiInput('');
        setExtractionFile(null);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- PDF & Docs Handlers ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  // --- Batch Handlers ---
  const extractProcessoFromFilename = (filename: string): string => {
    const match = filename.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
    if (match) return match[0];
    return filename.replace(/\.pdf$/i, '');
  };

  const addBatchItems = (files: File[]) => {
    const newItems = files.map(file => {
      const processo = extractProcessoFromFilename(file.name);
      return {
        id: crypto.randomUUID(),
        file,
        fileName: file.name,
        processo,
        status: 'PENDING' as const
      };
    });
    setBatchItems(prev => [...prev, ...newItems]);
  };

  const clearBatch = () => {
    setBatchFiles([]);
    setBatchItems([]);
  };

  const removeBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(it => it.id !== id));
  };

  const generateCertidaoHtml = (
    processo: string,
    victimData: any,
    channel: 'CORREIOS' | 'WHATSAPP' | 'EMAIL',
    foroInfoOverride?: string
  ) => {
    const partiesList = Array.isArray(victimData) ? victimData : [victimData];
    const isMulti = partiesList.length > 1;
    const date = new Date().toLocaleDateString('pt-BR');
    const forum = foroInfoOverride || dipoInfo;
    const officialName = "Alex Santana Mendes";
    const officialCargo = "Oficial de Promotoria I";

    let bodyContent = "";

    if (isMulti) {
      const partiesText = partiesList.map((p, idx) => {
        const flText = p.folha ? ` (fls. ${p.folha})` : '';
        const fullAddress = `${p.endereco || ''}, ${p.numero || 'S/N'}${p.complemento ? ` ${p.complemento}` : ''} - ${p.bairro || ''} - ${p.cidade || ''}-${p.uf || 'SP'}${flText}`.toUpperCase();
        let modo = "";
        if (channel === 'EMAIL') {
          modo = `via e-mail (${p.email || '___'})`;
        } else if (channel === 'WHATSAPP') {
          modo = `via WhatsApp (${p.telefone || '___'})`;
        } else {
          modo = `via Carta de Notificação enviada ao endereço ${fullAddress}`;
        }
        return `<b>${idx + 1}) ${p.nome || 'PARTE'}</b> (${p.tipoParte || 'Vítima'}${flText}), ${modo}`;
      }).join(';<br/>');

      bodyContent = `
        <p style="text-align: justify; text-indent: 2.0cm; font-family: 'Aptos', Arial, sans-serif; font-size: 14.5px; line-height: 2.0; margin-bottom: 20px; color: #000; word-break: break-word;">
            Certifico e dou fé que, no dia ${date}, procedi com a comunicação às partes qualificadas nos autos:
        </p>
        <div style="margin: -10px 0 25px 1cm; font-family: 'Aptos', Arial, sans-serif; font-size: 13.5px; line-height: 1.8; color: #000;">
            ${partiesText}.
        </div>
        <p style="text-align: justify; text-indent: 2.0cm; font-family: 'Aptos', Arial, sans-serif; font-size: 14.5px; line-height: 2.0; margin-bottom: 35px; color: #000; word-break: break-word;">
            Com comprovantes de postagem eletrônica em anexo, referentes ao arquivamento do inquérito policial nº ${processo}.
        </p>
      `;
    } else {
      const single = partiesList[0] || {};
      const flText = single.folha ? ` (fl.${single.folha})` : '';
      const fullAddress = `${single.endereco || ''}, ${single.numero || 'S/N'}${single.complemento ? ` ${single.complemento}` : ''} - ${single.bairro || ''} - ${single.cidade || ''}-${single.uf || 'SP'}${flText}`.toUpperCase();
      let textoMeio = "";
      if (channel === 'EMAIL') {
          textoMeio = `através de correio eletrônico (e-mail) encaminhado ao endereço ${single.email || '___'}`;
      } else if (channel === 'WHATSAPP') {
          textoMeio = `através de aplicativo de mensagem (WhatsApp) no número ${single.telefone || '___'}`;
      } else {
          textoMeio = `através de Carta de Notificação de Arquivamento enviada ao endereço ${fullAddress}`;
      }

      bodyContent = `
        <p style="text-align: justify; text-indent: 2.0cm; font-family: 'Aptos', Arial, sans-serif; font-size: 14.5px; line-height: 2.0; margin-bottom: 35px; color: #000; word-break: break-word;">
            Certifico e dou fé que, no dia ${date}, procedi com a comunicação a <span style="text-transform: uppercase;"><b>${single.nome || 'PARTE'}</b></span> (${single.tipoParte || 'Vítima'}), através de ${textoMeio}, com comprovante de postagem eletrônica em anexo, referente ao arquivamento do inquérito policial nº ${processo}.
        </p>
      `;
    }

    return `
      <div class="a4-page" style="width: 210mm; height: 297mm; padding: 25mm 20mm 20mm 25mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; position: relative; font-family: 'Aptos', Arial, sans-serif; color: black; line-height: 1.5; text-align: left;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-bottom: 2.5px double #c00000; padding-bottom: 12px; margin-bottom: 30px; font-family: 'Aptos', Arial, sans-serif;">
            <tr>
              <td align="left" valign="middle" style="padding-bottom: 8px;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="padding-right: 12px;">
                      <span style="font-family: 'Aptos', Arial, sans-serif; font-size: 32px; font-weight: 950; letter-spacing: -2px; line-height: 1; display: inline-block;">
                        <span style="color: #000000; font-weight: 900;">MP</span><span style="color: #c00000; font-weight: 900;">SP</span>
                      </span>
                    </td>
                    <td valign="middle" style="border-left: 1.5px solid #a0a0a0; padding-left: 12px; line-height: 1.2;">
                      <span style="font-size: 9px; font-weight: bold; color: #111111; letter-spacing: 0.2px; display: block; font-family: 'Aptos', Arial, sans-serif;">MINISTÉRIO PÚBLICO</span>
                      <span style="font-size: 8px; font-weight: 500; color: #555555; letter-spacing: 0.2px; display: block; font-family: 'Aptos', Arial, sans-serif;">DO ESTADO DE SÃO PAULO</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" valign="middle" style="text-align: right; font-family: 'Aptos', Arial, sans-serif; line-height: 1.35; font-size: 11px; font-weight: bold; color: #111111; padding-left: 15px; border-left: 2px solid #c00000; padding-bottom: 8px;">
                4ª PROMOTORIA DE JUSTIÇA<br/>CRIMINAL DA CAPITAL
              </td>
            </tr>
          </table>

          <div class="content" style="font-family: 'Aptos', Arial, sans-serif; flex: 1;">
              <h3 style="text-align: center; font-family: 'Aptos', Arial, sans-serif; font-weight: bold; font-size: 14.5px; margin: 20px 0 35px 0; letter-spacing: 0.5px; text-transform: uppercase; color: #000;">
                  CERTIDÃO DE OFICIAL DE PROMOTORIA
              </h3>
              
              <div style="font-family: 'Aptos', Arial, sans-serif; font-size: 13px; line-height: 1.5; font-weight: bold; text-align: left; margin-bottom: 40px; color: #000;">
                  Autos: ${processo}<br/>
                  ${forum}
              </div>

              ${bodyContent}

              <p style="text-align: justify; text-indent: 2.0cm; font-family: 'Aptos', Arial, sans-serif; font-size: 14.5px; line-height: 2.0; margin-bottom: 35px; color: #000; word-break: break-word;">
                  Para Constar eu ${officialName} (Assinatura Eletrônica), ${officialCargo}, de matrícula 12078, realizei a digitação e a emissão desta certidão.
              </p>
          </div>

          <div class="footer" style="margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 12px; text-align: center; font-size: 9.5px; color: #444444; line-height: 1.4; font-family: 'Aptos', Arial, sans-serif;">
            Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br/>
            Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
          </div>
      </div>
    `;
  };

  const downloadCertidaoPdf = (processo: string, victimData: any, channel: any) => {
    const htmlContent = generateCertidaoHtml(processo, victimData, channel);
    const fileName = `Certidao_${(victimData.nome || 'Parte').split(' ')[0]}_${processo}`;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("O seu navegador bloqueou a abertura de uma nova janela para o PDF. Por favor, libere os pop-ups.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          
          @page {
            size: A4;
            margin: 0 !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 210mm !important;
            height: 297mm !important;
            font-family: 'Aptos', Arial, sans-serif;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-page {
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 25mm 20mm 20mm 25mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            display: flex;
            flex-direction: column;
            position: relative;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .a4-page * {
            font-family: 'Aptos', Arial, sans-serif !important;
          }

          .content {
            flex: 1;
            font-family: 'Aptos', Arial, sans-serif !important;
          }

          .footer {
            margin-top: auto;
            border-top: 1.5px solid #c00000;
            padding-top: 12px;
            text-align: center;
            font-size: 9.5px;
            color: #444444;
            line-height: 1.4;
            font-family: 'Aptos', Arial, sans-serif !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadSmtCsv = (processo: string, victimData: any) => {
    const cep = (victimData.cep || '').replace(/\D/g, '');
    const addressParts = (victimData.endereco || '').split(' ');
    let tipoLog = '';
    let logradouro = victimData.endereco || '';
    
    if (addressParts.length > 1) {
        tipoLog = addressParts[0];
        logradouro = addressParts.slice(1).join(' ');
    }

    const row = [
        '', // 0
        victimData.nome || '', // 1
        '', // 2
        '', // 3
        '', // 4
        '', // 5
        cep, // 6
        tipoLog, // 7
        logradouro, // 8
        victimData.bairro || '', // 9
        victimData.cidade || '', // 10
        victimData.uf || 'SP', // 11
        'N', // 12
        victimData.complemento || '', // 13
        victimData.numero || '', // 14
        `PROCESSO:${processo}`, // 15
        ''
    ].join(';');

    const csvContent = "\uFEFF" + row;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SMT_${(victimData.nome || 'SEM_NOME').split(' ')[0]}_${processo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMultiCertidaoPdf = (processo: string, parties: any[], channel: any) => {
    if (!parties || parties.length === 0) return;
    const pagesHtml = parties.map(p => generateCertidaoHtml(processo, p, channel, dipoInfo)).join('<div style="page-break-before: always; break-before: page;"></div>');
    const fileName = `Certidoes_${processo}`;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("O seu navegador bloqueou a abertura de uma nova janela para o PDF. Por favor, libere os pop-ups.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          @page { size: A4; margin: 0 !important; }
          html, body {
            margin: 0 !important; padding: 0 !important;
            background: #ffffff !important; color: #000000 !important;
            width: 210mm !important; font-family: 'Aptos', Arial, sans-serif;
            overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .a4-page {
            box-shadow: none !important; width: 210mm !important; height: 297mm !important;
            padding: 25mm 20mm 20mm 25mm !important; box-sizing: border-box !important;
            background: #ffffff !important; display: flex; flex-direction: column;
            position: relative; page-break-after: always; break-after: page;
          }
          .a4-page * { font-family: 'Aptos', Arial, sans-serif !important; }
          .content { flex: 1; font-family: 'Aptos', Arial, sans-serif !important; }
          .footer {
            margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 12px;
            text-align: center; font-size: 9.5px; color: #444444; line-height: 1.4;
            font-family: 'Aptos', Arial, sans-serif !important;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadMultiSmtCsv = (processo: string, parties: any[]) => {
    if (!parties || parties.length === 0) return;
    parties.forEach((p, idx) => {
      setTimeout(() => {
        downloadSmtCsv(processo, p);
      }, idx * 350);
    });
  };

  const downloadPromotionWord = (processo: string, htmlContent: string) => {
    const fileName = `Promocao_Arquivamento_${processo}.doc`;

    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Promocao_${processo}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          @page {
            size: 210mm 297mm;
            margin: 25mm 20mm 20mm 25mm;
          }
          body {
            font-family: 'Aptos', Arial, sans-serif;
            font-size: 12pt;
            line-height: 2.0;
            color: #000000;
          }
          p {
            text-align: justify;
            text-indent: 2.0cm;
            margin-bottom: 12pt;
          }
        </style>
      </head>
      <body>
        <div style="font-family: 'Aptos', Arial, sans-serif; font-size: 12pt; line-height: 2.0; text-align: justify;">
          ${htmlContent || "Nenhuma promoção formatada ainda."}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlString], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printVectorPromotionPdf = (processo: string, htmlContent: string) => {
    const fileName = `Promocao_Arquivamento_${processo}`;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("O seu navegador bloqueou a abertura de uma nova janela para o PDF. Por favor, libere os pop-ups.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          
          @page {
            size: A4;
            margin: 0 !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 210mm !important;
            font-family: 'Aptos', Arial, sans-serif;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-page {
            box-shadow: none !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 25mm 20mm 20mm 25mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            display: flex;
            flex-direction: column;
            position: relative;
          }

          .a4-page * {
            font-family: 'Aptos', Arial, sans-serif !important;
          }

          .content {
            flex: 1;
            font-family: 'Aptos', Arial, sans-serif !important;
            font-size: 12pt;
            line-height: 2.0;
            text-align: justify;
          }
          
          p {
            text-align: justify;
            text-indent: 2.0cm;
            margin-bottom: 12pt;
            line-height: 2.0;
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <div class="content">
            ${htmlContent || "Nenhuma promoção formatada ainda."}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleStartBatchProcessing = async () => {
    if (batchItems.length === 0) return;
    if (!batchCargo) {
      alert("Por favor, selecione o cargo antes de processar.");
      return;
    }
    setIsProcessingBatch(true);
    
    const ai = aiClient;
    
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status === 'SUCCESS') continue;
      
      setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'PROCESSING' } : it));
      
      try {
        const base64 = await fileToBase64(item.file);
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{
            parts: [
              { inlineData: { mimeType: item.file.type, data: base64 } },
              { text: `Este documento é uma Promoção de Arquivamento de autos de inquérito policial.
                       Por favor, analise as páginas do documento e execute as seguintes ações:
                       
                       1. No rodapé ou nas notas de rodapé da última página, localizam-se as informações detalhadas da vítima (nome completo, endereço com número, complemento, bairro, cidade, UF, CEP, telefone/celular, email e folhas/fls). Extraia essa informação de forma estruturada.
                       Exemplos de rodapé:
                       - '1 ADRIANA MORAES MEIRA, Endereço: RUA RAUL BISPO DOS SANTOS, 201, A - MANDAQUI, CEP 02635150 - S.PAULO - SP Contato: Celular: (11) 951966987– fls. 5' 
                         Deves extrair: Nome: ADRIANA MORAES MEIRA, Endereço: RUA RAUL BISPO DOS SANTOS, Número: 201, Complemento: A, Bairro: MANDAQUI, CEP: 02635150, Cidade: SÃO PAULO, UF: SP, Telefone: (11) 951966987, Folha: 5
                       - '1 EDVÂNIA JANDIRA LOURENÇO NORTO DA SILVA, Endereço: Rua Maestro Cardim, 1218, 1218, - Bela Vista, CEP 01323901 - S.PAULO - SP Contato: Celular: (11) 917696809...'
                         Deves extrair: Nome: EDVÂNIA JANDIRA LOURENÇO NORTO DA SILVA, Endereço: Rua Maestro Cardim, Número: 1218, Bairro: Bela Vista, CEP: 01323901, Cidade: SÃO PAULO, UF: SP, Telefone: (11) 917696809, Folha: 13
                       Padronize os nomes, endereços e bairros em CAIXA ALTA (letras maiúsculas).
                       
                       2. Extraia o texto integral da promoção de arquivamento preservando sua formatação original (parágrafos, termos em negrito, listagens, etc.). Limpe cabeçalhos repetitivos do topo da página e os rodapés institucionais/números de páginas, mantendo a íntegra do texto jurídico. Retorne o texto estruturado em formato HTML básico (usando tags como <p> para parágrafos, <b> para termos em negrito, <ul>/<li> para listas, e <br/> se necessário) para preservar fielmente a formatação original do arquivamento do documento.
                       
                       Retorne obrigatoriamente um objeto JSON válido, seguindo o esquema estruturado de forma estrita.` }
            ]
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                endereco: { type: Type.STRING },
                numero: { type: Type.STRING },
                complemento: { type: Type.STRING },
                bairro: { type: Type.STRING },
                cidade: { type: Type.STRING },
                uf: { type: Type.STRING },
                cep: { type: Type.STRING },
                email: { type: Type.STRING },
                telefone: { type: Type.STRING },
                cpf: { type: Type.STRING },
                rg: { type: Type.STRING },
                folha: { type: Type.STRING },
                tipoParte: { type: Type.STRING, enum: ['Vítima', 'Investigado', 'Representante da Vítima'] },
                cleanPromotionText: { type: Type.STRING }
              },
              required: ["nome", "cleanPromotionText"]
            }
          }
        });
        
        const result = JSON.parse(response.text || "{}");
        
        const newProcId = crypto.randomUUID();
        const newParteId = crypto.randomUUID();
        
        const newProcess: ArchivedProcess = {
          id: newProcId,
          numero: item.processo,
          promotor: batchPromotor || getPromotorForDate(batchCargo),
          cargo: batchCargo,
          status: 'PENDENTE',
          createdAt: new Date().toISOString(),
          partes: [{
            id: newParteId,
            nome: result.nome || 'Parte Extraída',
            folha: result.folha || '',
            nacionalidade: 'Brasileira',
            cpf: result.cpf || '',
            rg: result.rg || '',
            pai: '',
            mae: '',
            dataNascimento: '',
            endereco: result.endereco || '',
            numero: result.numero || 'S/N',
            complemento: result.complemento || '',
            bairro: result.bairro || '',
            cidade: result.cidade || 'SÃO PAULO',
            uf: result.uf || 'SP',
            cep: result.cep || '',
            telefone: result.telefone || '',
            email: result.email || '',
            tipoParte: result.tipoParte || 'Vítima',
            statusIntimacao: 'Pendente'
          }]
        };
        
        setProcesses(prev => [newProcess, ...prev]);
        
        setBatchItems(prev => prev.map(it => it.id === item.id ? { 
          ...it, 
          status: 'SUCCESS',
          victimData: {
            ...result,
            cleanPromotionText: result.cleanPromotionText
          }
        } : it));
        
      } catch (err: any) {
        console.error("Batch error for item:", item.fileName, err);
        setBatchItems(prev => prev.map(it => it.id === item.id ? { 
          ...it, 
          status: 'ERROR',
          errorMsg: err.message || "Erro desconhecido" 
        } : it));
      }
    }
    
    setIsProcessingBatch(false);
  };

  const handleDragOverPromo = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingPromo(true); };
  const handleDragLeavePromo = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingPromo(false); };
  const handleDropPromo = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingPromo(false);
      if (e.dataTransfer.files) setPromoFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFormatPromotion = async () => {
    if (promoFiles.length === 0) return;
    setIsPromotionLoading(true);
    try {
      const ai = aiClient;
      const parts: any[] = [];
      for (const file of promoFiles) {
        const base64 = await fileToBase64(file);
        parts.push({ inlineData: { data: base64, mimeType: file.type } });
      }
      const instruction = "Limpe e formate este texto jurídico. Remova margens, rodapés, números de página e junte parágrafos. Remova qualquer formatação Markdown (como **negrito**). Quero apenas o texto limpo, corrido e bem formatado.";
      parts.push({ text: instruction });
      
      let cleanText = "";
      
      try {
        const response = await ai.models.generateContent({ model: 'gemini-3.8-flash', contents: [{ parts }] });
        cleanText = response.text || "";
      } catch (err) {
        console.warn("Falha no Gemini Flash:", err);
      }

      // Post-process text
      cleanText = cleanText.replace(/\*\*/g, '').replace(/^"|"$/g, '').trim();
      setPromotionText(cleanText);
      setActiveTab('INTIMACAO');
    } catch (error) { 
        console.error("Format Error:", error);
        alert("Erro ao formatar. Verifique se o arquivo é válido."); 
    } finally { 
        setIsPromotionLoading(false); 
    }
  };

  const handleDragOverMerge = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingMerge(true); };
  const handleDragLeaveMerge = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingMerge(false); };
  const handleDropMerge = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingMerge(false);
      if (e.dataTransfer.files) setMergeFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleMergePDFs = async () => {
    if (mergeFiles.length < 2) return alert("Selecione 2+ arquivos.");
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of mergeFiles) {
        const fileBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Unificado_${processoAtivo || 'Doc'}.pdf`;
      link.click();
    } catch (e) { alert("Erro ao unir PDFs."); } finally { setIsMerging(false); }
  };

  const handleDownloadSMT = () => { 
    if (activeParties.length > 1) {
      downloadMultiSmtCsv(processoAtivo || 'PROCESSO', activeParties);
      return;
    }
    // Format based on user request: ;NOME;;;;;CEP;TIPO_LOG;LOGRADOURO;BAIRRO;CIDADE;UF;N;COMPLEMENTO;NUMERO;PROCESSO:XXXX;
    
    const cep = (formData.cep || '').replace(/\D/g, '');
    
    // Simple heuristic to split address type and name
    // Assumes first word is type (RUA, AV, ALAMEDA, etc.)
    const addressParts = (formData.endereco || '').split(' ');
    let tipoLog = '';
    let logradouro = formData.endereco || '';
    
    if (addressParts.length > 1) {
        tipoLog = addressParts[0];
        logradouro = addressParts.slice(1).join(' ');
    }

    const row = [
        '', // 0
        formData.nome || '', // 1
        '', // 2
        '', // 3
        '', // 4
        '', // 5
        cep, // 6
        tipoLog, // 7
        logradouro, // 8
        formData.bairro || '', // 9
        formData.cidade || '', // 10
        formData.uf || 'SP', // 11
        'N', // 12 - Fixed value based on example
        formData.complemento || '', // 13
        formData.numero || '', // 14
        `PROCESSO:${processoAtivo || ''}`, // 15
        '' // Trailing empty for semicolon
    ].join(';');
    
    // Prefix UTF-8 BOM to make Excel read accents (á, é, í, õ, ç) perfectly in Portuguese
    const csvContent = "\uFEFF" + row;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SMT_${(formData.nome || 'SEM_NOME').split(' ')[0]}_${processoAtivo || 'PROCESSO'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    setShowPdfModal(true);
  };

  const handleDownloadLegacyPDF = () => {
    const element = document.querySelector('.printable-content');
    const titleSuffix = docView === 'CERTIDAO' 
      ? 'Certidao' 
      : docView === 'CARTA' 
      ? 'Carta_Notificacao' 
      : 'Promocao_Arquivamento';
    const fileName = `${titleSuffix}_${(formData.nome || 'Parte').split(' ')[0]}_${(processoAtivo || 'Autos')}`;

    if (element && (window as any).html2pdf) {
        const opt = {
            margin: 0,
            filename: `${fileName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2.5, 
                useCORS: true, 
                letterRendering: true,
                backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        (window as any).html2pdf().set(opt).from(element).save();
    } else {
        handlePrintVectorPDF();
    }
    setShowPdfModal(false);
  };

  const handlePrintVectorPDF = () => {
    const titleSuffix = docView === 'CERTIDAO' 
      ? 'Certidao' 
      : docView === 'CARTA' 
      ? 'Carta_Notificacao' 
      : 'Promocao_Arquivamento';
    const fileName = `${titleSuffix}_${(formData.nome || 'Parte').split(' ')[0]}_${(processoAtivo || 'Autos')}`;
    
    let contentHtml = "";
    if (docView === 'CERTIDAO') {
      if (activeParties.length > 1) {
        contentHtml = activeParties.map(p => generateCertidaoHtml(processoAtivo || '', p, channel, dipoInfo)).join('<div style="page-break-before: always; break-before: page;"></div>');
      } else {
        contentHtml = certidaoTemplate;
      }
    } else if (docView === 'CARTA') {
      contentHtml = cartaNotificacaoTemplate;
    } else {
      contentHtml = `
        <div class="a4-page">
          <div class="content" style="font-family: 'Aptos', sans-serif;">
            <div style="font-size: 12pt; text-justify: justify; white-space: pre-wrap; line-height: 2.0; color: #000000; padding: 20px;">
              ${promotionText || "Nenhuma promoção formatada ainda."}
            </div>
          </div>
        </div>
      `;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("O seu navegador bloqueou a abertura de uma nova janela para o PDF. Por favor, libere os pop-ups ou clique no botão 'Baixar / Imprimir' abrindo o aplicativo em uma nova aba (no topo direito da tela).");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          
          @page {
            size: A4;
            margin: 0 !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 210mm !important;
            height: 297mm !important;
            font-family: 'Aptos', Arial, sans-serif;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .a4-page {
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 25mm 20mm 20mm 25mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            display: flex;
            flex-direction: column;
            position: relative;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .a4-page * {
            font-family: 'Aptos', Arial, sans-serif !important;
          }

          .content {
            flex: 1;
            font-family: 'Aptos', Arial, sans-serif !important;
          }

          .footer {
            margin-top: auto;
            border-top: 1.5px solid #c00000;
            padding-top: 12px;
            text-align: center;
            font-size: 9.5px;
            color: #444444;
            line-height: 1.4;
            font-family: 'Aptos', Arial, sans-serif !important;
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
    setShowPdfModal(false);
  };

  const handleDownloadWord = () => {
    const titleSuffix = docView === 'CERTIDAO' 
      ? 'Certidao' 
      : docView === 'CARTA' 
      ? 'Carta_Notificacao' 
      : 'Promocao_Arquivamento';
    const fileName = `${titleSuffix}_${(formData.nome || 'Parte').split(' ')[0]}_${(processoAtivo || 'Autos')}.doc`;

    let contentHtml = "";

    if (docView === 'CERTIDAO') {
      contentHtml = certidaoTemplate;
    } else if (docView === 'CARTA') {
      contentHtml = cartaNotificacaoTemplate;
    } else {
      contentHtml = `
        <div style="font-family: 'Aptos', Arial, sans-serif; font-size: 12pt; line-height: 2.0; text-align: justify; white-space: pre-wrap;">
          ${promotionText || "Nenhuma promoção formatada ainda."}
        </div>
      `;
    }

    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${titleSuffix}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          @page {
            size: A4;
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
          }
          body {
            font-family: 'Aptos', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
            background-color: #ffffff;
          }
          * {
            font-family: 'Aptos', Arial, sans-serif !important;
          }
          .a4-page {
            width: 100%;
          }
          .header {
            border-bottom: 2px solid #c00000;
            padding-bottom: 8px;
            margin-bottom: 30px;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 9px;
            text-align: center;
            color: #555555;
          }
          .recipient-label-box {
            border: 1px solid #ccc;
            padding: 12px;
            margin-bottom: 15px;
            background-color: #fcfcfc;
          }
          .metadata-grid {
            margin-bottom: 15px;
            padding: 8px;
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
          }
          .metadata-item {
            margin-bottom: 5px;
          }
          .metadata-label {
            font-size: 8pt;
            color: #4a5568;
            font-weight: bold;
          }
          .metadata-value {
            font-size: 10pt;
            color: #1a202c;
          }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlString], {
      type: 'application/msword;charset=utf-8'
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Templates ---
  const whatsappTemplate = useMemo(() => {
    if (!formData.nome) return '';
    return `Prezado(a) Sr(a). *${formData.nome}*,\n\nO *Ministério Público do Estado de São Paulo (4ª Promotoria de Justiça Criminal da Capital)* comunica que, nos autos do processo nº *${processoAtivo || '____________________'}*, foi apresentada a r. manifestação pelo arquivamento do feito.\n\nCaso possua inconformidade com os fundamentos do arquivamento, vossa senhoria possui o prazo legal de *30 (trinta) dias*, contados do recebimento desta notificação, para submeter razões ou novos elementos de convicção à instância revisora do Ministério Público (nos termos do Artigo 28, caput, do Código de Processo Penal).\n\nPara esclarecimentos sobre o teor do pronunciamento ou orientações de protocolo de vossa manifestação, responda a este canal ou envie e-mail para: *4pjcrimcentcap@mpsp.mp.br*.\n\nAtenciosamente,\n*Alex Santana Mendes*\nOficial de Promotoria I\n4ª Promotoria de Justiça Criminal do Capital`;
  }, [formData, processoAtivo]);

  const emailTemplate = useMemo(() => {
    if (!formData.nome) return '';
    return `Assunto: NOTIFICAÇÃO OFICIAL - Promoção de Arquivamento de Autos - Processo nº ${processoAtivo || '____________________'}\n\nPrezado(a) Sr(a). ${formData.nome},\n\nO Ministério Público do Estado de São Paulo, por intermédio da 4ª Promotoria de Justiça Criminal da Capital, comunica que, nos autos do processo em epígrafe (nº ${processoAtivo || '____________________'}), foi devidamente ofertada a promoção de arquivamento do inquérito policial.\n\nEm conformidade com o disposto no artigo 28, caput, do Código de Processo Penal (redação outorgada pela Lei nº 13.964/19), cientifica-se vossa senhoria de que assiste-lhe o direito de manifestar discordância with o teor do arquivamento, se assim entender cabível, mediante apresentação de recurso escrito ou novos elementos de convicção no prazo legal de 30 (trinta) dias, a contar da data de recebimento desta cientificação.\n\nCaso necessite de cópia digital da promoção ministerial ou deseje instruções complementares referentes ao procedimento de envio para a instância revisora, solicitamos contatar a Serventia enviando resposta a este correio eletrônico.\n\nAtenciosamente,\n\nAlex Santana Mendes\nOficial de Promotoria I | 4ª Promotoria de Justiça Criminal da Capital\nFórum Criminal da Barra Funda – São Paulo/SP\nE-mail: 4pjcrimcentcap@mpsp.mp.br | Telefones: (11) 3429-6302`;
  }, [formData, processoAtivo]);

  const certidaoTemplate = useMemo(() => {
    if (isBlankCertidao) {
      return generateCertidaoHtml('_________________________', { nome: '________________________________________', tipoParte: '_________' }, channel, '________________________________________');
    }
    if (activeParties && activeParties.length > 1) {
      return generateCertidaoHtml(processoAtivo || '1533496-19.2025.8.26.0050', activeParties, channel, dipoInfo);
    }
    const displayData = formData.nome ? formData : {
      nome: 'FULANO DE TAL',
      tipoParte: 'Vítima',
      endereco: 'RUA DA CONSOLAÇÃO',
      numero: '100',
      bairro: 'CENTRO',
      cidade: 'SÃO PAULO',
      uf: 'SP',
      email: 'vitima@email.com',
      telefone: '(11) 98765-4321'
    };
    return generateCertidaoHtml(processoAtivo || '1533496-19.2025.8.26.0050', displayData, channel, dipoInfo);
  }, [formData, activeParties, processoAtivo, dipoInfo, channel, isBlankCertidao]);

  const cartaNotificacaoTemplate = useMemo(() => {
    if (!formData.nome && !isBlankCertidao) return '';
    const flText = formData.folha ? ` (fl.${formData.folha})` : '';
    const fullAddress = `${formData.endereco || ''}, ${formData.numero || 'S/N'} ${formData.complemento ? `- ${formData.complemento}` : ''} - ${formData.bairro || ''} - ${formData.cidade || ''}/${formData.uf || 'SP'}${flText}`.toUpperCase();
    const date = new Date().toLocaleDateString('pt-BR');
    
    const processNumber = isBlankCertidao ? '_________________________' : processoAtivo;
    const personName = isBlankCertidao ? '________________________________________' : formData.nome;
    const personType = isBlankCertidao ? '_________' : (formData.tipoParte || 'Vítima');
    const foroText = isBlankCertidao ? '________________________________________' : dipoInfo;
    const certDate = isBlankCertidao ? '____/____/____' : date;
    const hashUnico = `MP-${(processoAtivo || '000000').replace(/\D/g, '').substring(0, 8)}-${String(Math.abs(personName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))).substring(0, 4)}`;
    
    const promotorName = isBlankCertidao ? '____________________________' : (activeProcess?.promotor || '_____');
    const cargoTitle = isBlankCertidao ? '____________________________' : (activeProcess?.cargo || '_____');

    const isCorreios = channel === 'CORREIOS';
    const boxMargin = isCorreios ? '12px' : '24px';
    const gridMargin = isCorreios ? '12px' : '20px';
    const pMargin = isCorreios ? '8px animate-tight-margin' : '15px';
    const topMarginSig = isCorreios ? '12px' : '24px';

    return `
      <div class="a4-page">
          <!-- Cabeçalho em Tabela - Perfeito para PDF e Word -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-bottom: 2.5px double #c00000; padding-bottom: 12px; margin-bottom: 24px; font-family: Arial, sans-serif;">
            <tr>
              <td align="left" valign="middle" style="padding-bottom: 8px;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="padding-right: 12px;">
                      <span style="font-family: Arial, sans-serif; font-size: 32px; font-weight: 950; letter-spacing: -2px; line-height: 1; display: inline-block;">
                        <span style="color: #000000; font-weight: 900;">MP</span><span style="color: #c00000; font-weight: 900;">SP</span>
                      </span>
                    </td>
                    <td valign="middle" style="border-left: 1.5px solid #a0a0a0; padding-left: 12px; line-height: 1.2;">
                      <span style="font-size: 9px; font-weight: bold; color: #111111; letter-spacing: 0.2px; display: block; font-family: Arial, sans-serif;">MINISTÉRIO PÚBLICO</span>
                      <span style="font-size: 8px; font-weight: 500; color: #555555; letter-spacing: 0.2px; display: block; font-family: Arial, sans-serif;">DO ESTADO DE SÃO PAULO</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" valign="middle" style="text-align: right; font-family: Arial, sans-serif; line-height: 1.35; font-size: 11px; font-weight: bold; color: #111111; padding-left: 15px; border-left: 2px solid #c00000; padding-bottom: 8px;">
                4ª PROMOTORIA DE JUSTIÇA<br/>CRIMINAL DA CAPITAL
              </td>
            </tr>
          </table>

          <div class="content flex flex-col justify-between h-full" style="font-family: Arial, sans-serif;">
              <div>
                  <h3 class="title" style="text-align: center; font-family: Arial, sans-serif; font-weight: bold; font-size: 14.5px; margin-bottom: 16px; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">CARTA DE NOTIFICAÇÃO OFICIAL</h3>
                  
                  <!-- Bloco de Endereço do Destinatário (Perfeito para Envelope com Janela) -->
                  <table width="100%" cellpadding="12" cellspacing="0" style="width: 100%; border: 1px solid #cccccc; margin-bottom: ${boxMargin}; border-radius: 4px; background-color: #fcfcfc; font-family: Arial, sans-serif;">
                    <tr>
                      <td align="left" style="text-align: left;">
                        <div style="font-size: 7.5px; text-transform: uppercase; color: #555555; font-weight: bold; margin-bottom: 4px; font-family: Arial, sans-serif; letter-spacing: 0.5px;">Destinatário / Endereço de Correspondência:</div>
                        <div style="font-size: 12.5px; font-weight: bold; color: #000000; font-family: Arial, sans-serif; text-transform: uppercase;">${personName}</div>
                        <div style="font-size: 10.5px; color: #222222; margin-top: 4px; font-family: Arial, sans-serif; line-height: 1.4;">
                            ${isBlankCertidao ? '__________________________________' : fullAddress}<br/>
                            CEP: ${isBlankCertidao ? '________-___' : (formData.cep || '___________')}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Tabela de Informações de Processo -->
                  <table width="100%" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-bottom: ${gridMargin}; background-color: #f8fafc; font-family: Arial, sans-serif;">
                    <tr>
                      <td width="50%" valign="top" style="border: 1px solid #e2e8f0; width: 50%;">
                        <div style="font-size: 7.5px; font-weight: bold; color: #4a5568; text-transform: uppercase;">Número do Processo (Autos)</div>
                        <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #1a202c; margin-top: 3px;">${processNumber}</div>
                      </td>
                      <td width="50%" valign="top" style="border: 1px solid #e2e8f0; width: 50%;">
                        <div style="font-size: 7.5px; font-weight: bold; color: #b91c1c; text-transform: uppercase;">Prazo de Oposição</div>
                        <div style="font-size: 11px; font-weight: bold; color: #b91c1c; margin-top: 3px;">30 (TRINTA) DIAS CORRIDOS</div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" valign="top" style="border: 1px solid #e2e8f0;">
                        <div style="font-size: 7.5px; font-weight: bold; color: #4a5568; text-transform: uppercase;">Unidade Judicial / Órgão do DIPO</div>
                        <div style="font-size: 10.5px; color: #1a202c; margin-top: 3px;">${foroText}</div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" valign="top" style="border: 1px solid #e2e8f0;">
                        <div style="font-size: 7.5px; font-weight: bold; color: #4a5568; text-transform: uppercase;">Membro do Ministério Público Responsável</div>
                        <div style="font-size: 11px; color: #1a202c; margin-top: 3px;"><b>${promotorName}</b> (${cargoTitle})</div>
                      </td>
                    </tr>
                  </table>

                  <p class="cert-text" style="font-size: 12.5px; line-height: 1.5; text-indent: 1.8cm; margin-bottom: ${pMargin}; text-align: justify; word-break: break-word;">
                      Prezado(a) Senhor(a),
                  </p>
                  
                  <p class="cert-text" style="font-size: 12.5px; line-height: 1.5; text-indent: 1.8cm; margin-bottom: ${pMargin}; text-align: justify; word-break: break-word;">
                      Comunico a Vossa Senhoria que, na qualidade de <b>${personType}</b> nos autos do procedimento criminal indicado em epígrafe, foi apresentada r. promoção de <b>ARQUIVAMENTO</b> do inquérito policial/feito pelo Ministério Público.
                  </p>

                  <p class="cert-text" style="font-size: 12.5px; line-height: 1.5; text-indent: 1.8cm; margin-bottom: ${pMargin}; text-align: justify; word-break: break-word;">
                      Caso possua discordância em relação aos fundamentos aduzidos pelo Órgão de Execução para o arquivamento, cientifica-se Vossa Senhoria de que vigora o <b>prazo legal de 30 (trinta) dias</b>, contados do efetivo recebimento desta notificação, para submeter suas razões recursais ou novos elementos de convicção à instância revisora competente do Ministério Público, em estrita observância ao disposto no artigo 28, <i>caput</i>, do Código de Processo Penal (com a redação outorgada pela Lei Federal nº 13.964/19).
                  </p>

                  <p class="cert-text" style="font-size: 12.5px; line-height: 1.5; text-indent: 1.8cm; margin-bottom: ${isCorreios ? '10px' : '15px'}; text-align: justify; word-break: break-word;">
                      Para orientações sobre protocolo de razões, obtenção de cópias do pronunciamento ministerial ou dúvidas conexas, responda a este canal oficial ou envie correspondência eletrônica para: <b>4pjcrimcentcap@mpsp.mp.br</b>.
                  </p>
                  
                  <!-- Local, data e Assinatura em Tabela para compatibilidade Word -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: ${topMarginSig}; font-family: Arial, sans-serif;">
                    <tr>
                      <td align="left" valign="bottom" style="font-size: 11px; font-style: italic; color: #333333; padding-bottom: 4px;">
                        São Paulo, ${certDate}.
                      </td>
                      <td align="right" valign="bottom" style="text-align: right; padding-bottom: 4px;">
                        <table cellpadding="0" cellspacing="0" border="0" align="right" style="text-align: center;">
                          <tr>
                            <td align="center" style="border-top: 1px dashed #444444; width: 230px; padding-top: 6px; font-size: 9.5px; line-height: 1.4; font-family: Arial, sans-serif;">
                              <b>ALEX SANTANA MENDES</b><br/>
                              Oficial de Promotoria I<br/>
                              4ª Promotoria de Justiça Criminal
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
              </div>

              <!-- Recibo AR Integrado se Carta Física (Correios) -->
              ${channel === 'CORREIOS' ? `
              <div class="ar-receipt-stub" style="border-top: 2.5px dashed #aaaaaa; margin-top: 24px; padding-top: 14px; font-family: Arial, sans-serif;">
                  <div style="text-align: center; font-size: 8px; color: #666666; font-weight: bold; margin-bottom: 8px; letter-spacing: 1.5px;">- - - - - - - - Recibo de Entrega Oficial (Aviso de Recebimento - AR) - - - - - - - -</div>
                  <table width="100%" cellpadding="10" cellspacing="0" style="width: 100%; border: 1.5px dashed #666666; background-color: #fafafa; border-radius: 4px; font-family: Arial, sans-serif;">
                    <tr>
                      <td colspan="3" style="border-bottom: 1px solid #dddddd; padding-bottom: 6px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="left" style="font-size: 10px; font-weight: bold; color: #c00000; font-family: Arial, sans-serif;">MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</td>
                            <td align="right" style="font-family: monospace; font-size: 10px; font-weight: bold; text-align: right;">Autos nº: ${processNumber}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" style="font-size: 9px; line-height: 1.4; color: #222222; text-align: justify;">
                        Atesto o recebimento da presente notificação e a ciência irrevogável dos termos do arquivamento e do prazo legal de manifestação.
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" style="font-size: 9px; font-weight: bold; color: #000000; padding-top: 4px; text-transform: uppercase;">
                        <b>Destinatário:</b> ${personName} (${personType})
                      </td>
                    </tr>
                    <tr style="height: 35px;">
                      <td width="50%" valign="bottom" style="border-bottom: 1.5px solid #000000; width: 50%;"></td>
                      <td width="25%" valign="bottom" align="center" style="border-bottom: 1.5px solid #000000; width: 25%; font-size: 9px; color: #aaaaaa; text-align: center; padding-bottom: 2px;">____/____/2026</td>
                      <td width="25%" valign="bottom" align="center" style="border-bottom: 1.5px solid #000000; width: 25%; font-size: 9px; color: #aaaaaa; text-align: center; padding-bottom: 2px;">RG nº:</td>
                    </tr>
                    <tr>
                      <td style="font-size: 7.5px; color: #555555; font-weight: bold; padding-top: 4px;">ASSINATURA DO DESTINATÁRIO / RECEBEDOR</td>
                      <td align="center" style="font-size: 7.5px; color: #555555; font-weight: bold; text-align: center; padding-top: 4px;">DATA DO RECEBIMENTO</td>
                      <td align="center" style="font-size: 7.5px; color: #555555; font-weight: bold; text-align: center; padding-top: 4px;">NÚMERO DO DOCUMENTO</td>
                    </tr>
                  </table>
              </div>
              ` : `
              <!-- Rodapé de Autenticidade Digital se Online -->
              <table width="100%" cellpadding="10" cellspacing="0" style="width: 100%; border: 1px solid #10b981; border-radius: 5px; background-color: #f0fdf4; font-family: Arial, sans-serif; font-size: 9px; color: #065f46; margin-top: 30px;">
                <tr>
                  <td align="left" style="line-height: 1.45;">
                    <b>DOCUMENTO OFICIAL NOTIFICATÓRIO ASSINADO DIGITALMENTE</b><br/>
                    Assinado eletronicamente sob conformidade jurídica MPSP. Chave de Validação: <b>${hashUnico}</b>
                  </td>
                  <td align="right" valign="middle" style="width: 100px; text-align: right; padding-left: 10px;">
                     <span style="font-size: 8px; color: #047857; font-weight: bold; border: 1.5px solid #10b981; padding: 4px 8px; border-radius: 3px; text-transform: uppercase; background-color: #ffffff; display: inline-block;">FÉ PÚBLICA</span>
                  </td>
                </tr>
              </table>
              `}
          </div>

          <div class="footer" style="margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 12px; text-align: center; font-size: 9.5px; color: #444444; line-height: 1.4; font-family: Arial, sans-serif;">
            Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br/>
            Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
          </div>
      </div>
    `;
  }, [formData, processoAtivo, dipoInfo, channel, isBlankCertidao, activeProcess]);

  const inputClass = "w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";
  const sidebarInputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder-slate-600";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      <style>{`
        /* Configuração de visualização em tela para simular papel */
        @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');

        .a4-page {
            width: 210mm;
            height: 297mm;
            padding: 25mm 20mm 20mm 25mm; /* Alinhado perfeitamente com as margens originais do DOCX */
            background: white !important;
            display: flex;
            flex-direction: column;
            margin: auto;
            color: #000000 !important;
            font-family: 'Aptos', 'Inter', 'Arial', 'Helvetica', sans-serif !important;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
            box-sizing: border-box;
            overflow: hidden;
            position: relative;
        }

        .a4-page * {
            font-family: 'Aptos', 'Inter', 'Arial', 'Helvetica', sans-serif !important;
        }

        /* Watermark Central */
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-25deg);
            opacity: 0.045;
            pointer-events: none;
            width: 140mm;
            height: 140mm;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Header Styling */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2.5px double #c00000;
            padding-bottom: 12px;
            margin-bottom: 25px;
            position: relative;
            z-index: 10;
        }

        .header-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-legal-text {
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-left: 1.5px solid #a0a0a0;
            padding-left: 12px;
        }

        .org-gov {
            font-size: 10px;
            font-weight: 800;
            color: #111111;
            letter-spacing: 0.2px;
            font-family: 'Arial', sans-serif;
            line-height: 1.2;
        }

        .org-sub {
            font-size: 7.5px;
            font-weight: 600;
            color: #555555;
            letter-spacing: 0.8px;
            font-family: 'Arial', sans-serif;
            line-height: 1.2;
            margin-top: 1px;
        }

        .promotoria-text {
            text-align: right;
            font-weight: 500;
            font-size: 10px;
            line-height: 1.3;
            color: #222;
            font-family: 'Arial', sans-serif;
        }

        .promotoria-text b {
            color: #c00000;
            font-size: 11px;
        }

        /* Content Styling */
        .content {
            flex: 1;
            color: #000000 !important;
            position: relative;
            z-index: 10;
        }

        h3.title {
            text-align: center;
            font-weight: 700;
            margin-bottom: 22px;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 0.8px;
            color: #000000;
            font-family: 'Arial', sans-serif;
        }

        /* Metadata Grid Style */
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 12px;
            border: 1px solid #ddd;
            padding: 12px 14px;
            background-color: #fafafa;
            margin-bottom: 20px;
            border-radius: 4px;
            font-family: 'Arial', sans-serif;
        }

        .metadata-item {
            display: flex;
            flex-direction: column;
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 4px;
        }

        .metadata-item.md-span-2 {
            grid-column: span 2;
        }

        .metadata-item:last-child, .metadata-item:nth-last-child(2) {
            border-bottom: none;
        }

        .metadata-label {
            font-size: 8px;
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 1px;
        }

        .metadata-value {
            font-size: 10.5px;
            color: #111;
            font-weight: 500;
            line-height: 1.3;
        }

        .cert-text {
            text-align: justify;
            text-indent: 2.25cm;
            margin-bottom: 10px;
            font-size: 13px;
            line-height: 1.7;
            color: #111111 !important;
        }

        .cert-date-block {
            text-align: right;
            margin-top: 15px;
            margin-bottom: 25px;
            font-size: 12.5px;
            font-style: italic;
        }

        /* Digital Signature block */
        .digital-signer-block {
            border: 1px solid #10b981;
            border-radius: 5px;
            background-color: #f0fdf4;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-family: 'Arial', sans-serif;
            max-width: 100%;
        }

        .signer-badge-icon {
            color: #059669;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .signer-details {
            flex-grow: 1;
            font-size: 9.5px;
            color: #065f46;
            line-height: 1.35;
        }

        .signer-details b {
            color: #047857;
            font-size: 10px;
        }

        .signer-qr {
            width: 46px;
            height: 46px;
            background-color: white;
            border: 1px dashed #10b981;
            padding: 1px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Footer Styling */
        .footer {
            margin-top: auto;
            border-top: 1.5px solid #c00000;
            padding-top: 10px;
            text-align: center;
            font-size: 9.5px;
            color: #444;
            line-height: 1.4;
            font-family: 'Arial', sans-serif;
            position: relative;
            z-index: 10;
        }

        /* Configuração de Impressão */
        @media print {
            @page { 
                margin: 0 !important; 
                size: A4; 
            }
            html, body { 
                background: white !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                color: #000000 !important; 
                width: 210mm !important;
                height: 297mm !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            
            /* Remove fundos escuros e bordas de todos os wrappers pais no React para impressão limpa */
            #root, main, .flex, .flex-1, .bg-slate-950, .bg-slate-900, .bg-gray-100 {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: auto !important;
                height: auto !important;
            }

            body * { 
                visibility: hidden !important; 
            }
            
            .printable-content, .printable-content * { 
                visibility: visible !important; 
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
            }
            
            .printable-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: #000000 !important;
                display: block !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            
            .a4-page {
                box-shadow: none !important;
                width: 210mm !important; 
                height: 297mm !important;
                padding: 25mm 20mm 20mm 25mm !important; /* Margens perfeitas iguais ao modelo Docx original */
                margin: 0 !important;
                color: #000000 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                background: white !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            
            .no-print { display: none !important; }
        }
      `}</style>

      {/* --- SIDEBAR: PROCESS LIST --- */}
      <div className="w-[350px] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-20 no-print">
        <div className="p-6 bg-slate-950 border-b border-slate-800 space-y-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-600 rounded-lg text-white"><LayoutList size={20}/></div>
              <div><h2 className="font-bold text-slate-100 uppercase tracking-tight">Arquivamentos</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Controle de Processos</p></div>
           </div>
           <button onClick={() => { setRegisterType('RAPIDO'); setViewMode('REGISTER'); setActiveProcessId(null); setSelectedParteId(null); setIsCreating(false); }} className="w-full py-3 bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/50 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all">
              <FolderPlus size={16}/> Novo Processo
           </button>
           <button onClick={() => { setViewMode('BATCH'); setActiveProcessId(null); setSelectedParteId(null); setIsCreating(false); }} className={`w-full py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all border ${viewMode === 'BATCH' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}>
              <Files size={16}/> Notificação em Lote
           </button>
           <button onClick={() => setIsSmtModalOpen(true)} className="w-full py-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm" title="Abrir código do Favorito / Bookmarklet para Autopreencher e Extrair dados do SMT Correios">
              <Zap size={14} className="text-yellow-400" /> Favorito SMT Correios
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
           <div className="px-2 mb-1 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processos ({processes.length})</span>
           </div>
           {processes
             .sort((a, b) => {
                // Sort Pending First, then Concluded
                if (a.status === b.status) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                return a.status === 'PENDENTE' ? -1 : 1;
             })
             .map(proc => (
              <div key={proc.id} className="relative group">
                <button 
                   onClick={() => { setActiveProcessId(proc.id); setViewMode('LIST'); setSelectedParteId(null); setIsCreating(false); }} 
                   className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${activeProcessId === proc.id ? 'bg-slate-800 border-rose-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                   <div className={`absolute left-0 top-0 w-1 h-full ${proc.status === 'CONCLUIDO' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                   <div className="flex justify-between items-start mb-2 pr-12">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{new Date(proc.createdAt).toLocaleDateString()}</span>
                       {proc.status === 'CONCLUIDO' && <CheckCircle2 size={14} className="text-green-500"/>}
                   </div>
                   <h4 className={`font-black text-sm truncate uppercase mb-1 pr-12 ${activeProcessId === proc.id ? 'text-rose-400' : 'text-slate-200'}`}>{proc.numero}</h4>
                   <p className="text-[10px] text-slate-500 truncate font-medium pr-12">{proc.promotor}</p>
                </button>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shadow-xl">
                   <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenEditProcess(proc); }} 
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar Processo"
                   >
                      <Edit3 size={14} />
                   </button>
                   <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteProcess(proc.id); }} 
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Excluir Processo"
                   >
                      <Trash2 size={14} />
                   </button>
                </div>
              </div>
           ))}
        </div>
      </div>

      {/* --- MAIN AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        
        {/* VIEW 0: BATCH NOTIFICATIONS */}
        {viewMode === 'BATCH' && (
           <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center bg-slate-950">
              <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-100 uppercase tracking-tight flex items-center gap-3">
                      <Files size={28} className="text-amber-500" />
                      Notificação de Arquivamento em Lote
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Faça o upload de múltiplos arquivos PDF de promoção de arquivamento. O sistema extrairá os dados das vítimas do rodapé e o número do processo automaticamente.
                    </p>
                  </div>
                </div>

                {/* Configuration Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cargo Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Selecione o Cargo *</label>
                      <select
                        value={batchCargo}
                        onChange={(e) => {
                          const cargo = e.target.value;
                          setBatchCargo(cargo);
                          setBatchPromotor(getPromotorForDate(cargo));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-rose-500 transition-colors text-sm"
                      >
                        <option value="">Selecione um cargo...</option>
                        {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                      {batchPromotor && (
                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                          Promotor ativo hoje: <b className="text-slate-300">{batchPromotor}</b>
                        </p>
                      )}
                    </div>

                    {/* Channel Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Canal de Notificação Padrão</label>
                      <div className="flex gap-2">
                        {[{ id: 'CORREIOS', label: 'Correios (AR)', icon: <Truck size={16}/> }, 
                          { id: 'WHATSAPP', label: 'WhatsApp', icon: <MessageCircle size={16}/> }, 
                          { id: 'EMAIL', label: 'E-mail', icon: <Mail size={16}/> }].map(ch => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setBatchChannel(ch.id as any)}
                            className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${batchChannel === ch.id ? 'bg-amber-600/20 text-amber-400 border-amber-500/50' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-750'}`}
                          >
                            {ch.icon} {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingBatch(true); }}
                  onDragLeave={() => setIsDraggingBatch(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingBatch(false);
                    if (e.dataTransfer.files) {
                      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
                      if (files.length > 0) {
                        setBatchFiles(prev => [...prev, ...files]);
                        addBatchItems(files);
                      }
                    }
                  }}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all ${isDraggingBatch ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}
                >
                  <input 
                    type="file" 
                    multiple 
                    id="batch-file-input" 
                    accept="application/pdf" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        setBatchFiles(prev => [...prev, ...files]);
                        addBatchItems(files);
                      }
                    }}
                  />
                  <label htmlFor="batch-file-input" className="cursor-pointer space-y-4 block">
                    <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-slate-800 text-slate-400">
                      <Upload size={24} className="animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-200 font-bold">Arraste e solte as Promoções de Arquivamento aqui</p>
                      <p className="text-xs text-slate-500">ou clique para selecionar os arquivos PDF em seu computador</p>
                    </div>
                  </label>
                </div>

                {/* Batch Items Table */}
                {batchItems.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                      <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm flex items-center gap-2">
                        <FolderOpen size={18} className="text-slate-400" />
                        Fila de Processamento ({batchItems.length} {batchItems.length === 1 ? 'documento' : 'documentos'})
                      </h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={clearBatch}
                          disabled={isProcessingBatch}
                          className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          Limpar Tudo
                        </button>
                        <button
                          onClick={handleStartBatchProcessing}
                          disabled={isProcessingBatch || !batchCargo}
                          className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center gap-2 shadow-lg"
                        >
                          {isProcessingBatch ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                          {isProcessingBatch ? 'Processando...' : 'Iniciar Processamento'}
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {batchItems.map((item, index) => (
                        <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-slate-600 bg-slate-950 border border-slate-800 w-6 h-6 rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-300 truncate" title={item.fileName}>
                                {item.fileName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-slate-500">
                                  Processo: <b className="text-slate-400">{item.processo}</b>
                                </span>
                                {item.victimData?.nome && (
                                  <>
                                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                    <span className="text-[10px] font-bold text-green-500">
                                      Vítima: {item.victimData.nome}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* STATUS INDICATOR */}
                            {item.status === 'PENDING' && (
                              <span className="text-[10px] font-bold uppercase bg-slate-950 text-slate-500 px-2 py-1 rounded-md border border-slate-800">
                                Na fila
                              </span>
                            )}
                            {item.status === 'PROCESSING' && (
                              <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1.5">
                                <Loader2 size={10} className="animate-spin" /> Extraindo
                              </span>
                            )}
                            {item.status === 'ERROR' && (
                              <span className="text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md border border-rose-500/20" title={item.errorMsg}>
                                Erro
                              </span>
                            )}
                            {item.status === 'SUCCESS' && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* DOWNLOAD RESULTS */}
                                <button
                                  onClick={() => downloadCertidaoPdf(item.processo, item.victimData, batchChannel)}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Imprimir Certidão de Oficial de Promotoria em formato PDF Vetorial (Nítido, Editável, Selecionável)"
                                >
                                  <Download size={10} /> Certidão (PDF Vetorial)
                                </button>
                                <button
                                  onClick={() => downloadSmtCsv(item.processo, item.victimData)}
                                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Baixar Planilha de Postagem Eletrônica dos Correios (SMT)"
                                >
                                  <FileSpreadsheet size={10} /> SMT (CSV)
                                </button>
                                <button
                                  onClick={() => downloadPromotionWord(item.processo, item.victimData?.cleanPromotionText || '')}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Baixar Promoção de Arquivamento formatada para Word (.doc)"
                                >
                                  <FileText size={10} /> Promoção (Word)
                                </button>
                                <button
                                  onClick={() => printVectorPromotionPdf(item.processo, item.victimData?.cleanPromotionText || '')}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                  title="Imprimir Promoção de Arquivamento em PDF Vetorial com formatação original"
                                >
                                  <Download size={10} /> Promoção (PDF Vetorial)
                                </button>
                              </div>
                            )}

                            {!isProcessingBatch && (
                              <button 
                                onClick={() => removeBatchItem(item.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-950 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
           </div>
        )}

        {/* VIEW 1: REGISTRATION FORM */}
        {viewMode === 'REGISTER' && (
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex justify-center">
               <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-300">
                  <div className="text-center">
                     <div className="w-16 h-16 bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                        {registerType === 'RAPIDO' ? <Sparkles size={32} className="text-rose-500 animate-pulse"/> : <FolderPlus size={32} className="text-rose-500"/>}
                     </div>
                     <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Novo Arquivamento</h2>
                     <p className="text-slate-500 text-sm">Selecione o método de cadastro de processo e partes.</p>
                  </div>

                  {/* REGISTRATION TYPE TOGGLE */}
                  <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-full">
                     <button 
                       type="button"
                       onClick={() => setRegisterType('RAPIDO')} 
                       className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${registerType === 'RAPIDO' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       <Sparkles size={16} /> Cadastro Rápido Inteligente (IA)
                     </button>
                     <button 
                       type="button"
                       onClick={() => setRegisterType('TRADICIONAL')} 
                       className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${registerType === 'TRADICIONAL' ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       <User size={16} /> Cadastro Tradicional (Manual)
                     </button>
                  </div>

                  {registerType === 'RAPIDO' ? (
                     /* BRAND NEW CADASTRO RÁPIDO */
                     <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className={labelClass}>Número dos Autos (Processo) *</label>
                              <input 
                                 type="text" 
                                 value={fastRegData.numero} 
                                 onChange={(e) => setFastRegData({...fastRegData, numero: e.target.value})} 
                                 className={inputClass} 
                                 placeholder="0000000-00.0000.0.00.0000" 
                                 autoFocus 
                              />
                           </div>
                           <div>
                              <label className={labelClass}>Cargo *</label>
                              <select 
                                 value={fastRegData.cargo} 
                                 onChange={(e) => {
                                     const newCargo = e.target.value;
                                     const newPromotor = getPromotorForDate(newCargo);
                                     setFastRegData({...fastRegData, cargo: newCargo, promotor: newPromotor});
                                 }} 
                                 className={inputClass}
                              >
                                 <option value="">Selecione...</option>
                                 {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                              </select>
                           </div>

                           {/* PRINT COM DADOS DA PARTE / TEXTO + FOLHA */}
                           <div className="md:col-span-2 border border-slate-800/80 bg-slate-950/40 p-6 rounded-2xl space-y-4">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                                 <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={14} /> Print ou Texto com Dados da Parte
                                 </label>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fls. (Campo de Folha):</span>
                                    <input 
                                       type="text" 
                                       value={fastRegData.folha} 
                                       onChange={(e) => setFastRegData({...fastRegData, folha: e.target.value})} 
                                       placeholder="ex: 05" 
                                       className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-rose-400 focus:outline-none focus:border-rose-500 w-24 text-center placeholder-slate-700 font-bold"
                                    />
                                 </div>
                              </div>
                              
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                 Cole o print da qualificação da parte (Ctrl+V) no campo esquerdo ou cole as informações em formato texto no campo direito.
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {/* Paste Screenshot area */}
                                 <div 
                                    onPaste={handleFastPaste}
                                    className="relative group border border-dashed border-slate-800 hover:border-rose-500/50 rounded-xl p-4 bg-slate-900/50 min-h-[140px] flex flex-col justify-center items-center transition-all cursor-pointer"
                                 >
                                    {fastRegData.pastedImage ? (
                                       <div className="relative w-full h-full min-h-[120px] flex flex-col items-center justify-center">
                                          <img src={fastRegData.pastedImage} alt="Print da Parte" className="max-h-24 object-contain rounded-lg border border-slate-700 shadow-md" referrerPolicy="no-referrer" />
                                          <span className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Imagem Colada</span>
                                          <button 
                                             type="button"
                                             onClick={(e) => { e.stopPropagation(); setFastRegData({...fastRegData, pastedImage: null}); }} 
                                             className="absolute top-1 right-1 p-1 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-slate-700 shadow"
                                             title="Remover Imagem"
                                          >
                                             <X size={14} />
                                          </button>
                                       </div>
                                    ) : (
                                       <div className="text-center space-y-2 pointer-events-none">
                                          <ImageIcon size={24} className="mx-auto text-slate-600 group-hover:text-rose-400 transition-colors" />
                                          <p className="text-xs font-bold text-slate-400">Clique para focar e Cole o Print (Ctrl+V)</p>
                                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Colar captura de tela da parte</p>
                                       </div>
                                    )}
                                 </div>

                                 {/* Alternative party text area */}
                                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col justify-between min-h-[140px]">
                                    <textarea 
                                       value={fastRegData.partyText} 
                                       onChange={(e) => setFastRegData({...fastRegData, partyText: e.target.value})} 
                                       placeholder="OU Digite/Cole as informações em texto plano..." 
                                       className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 resize-none flex-1 outline-none custom-scrollbar"
                                    />
                                    {fastRegData.partyText && (
                                       <div className="flex justify-end pt-2 border-t border-slate-800/50">
                                          <button 
                                             type="button"
                                             onClick={() => setFastRegData({...fastRegData, partyText: ''})} 
                                             className="text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase tracking-widest transition-colors"
                                          >
                                             Limpar Texto
                                          </button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* PROMOÇÃO DE ARQUIVAMENTO (UPLOAD PDF) */}
                           <div className="md:col-span-2 border border-slate-800/80 bg-slate-950/40 p-6 rounded-2xl space-y-3">
                              <label className="block text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                 <Archive size={14} /> Promoção de Arquivamento (PDF)
                              </label>
                              
                              <label 
                                 className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 transition-all text-center"
                                 onDragOver={(e) => { e.preventDefault(); }}
                                 onDrop={(e) => {
                                   e.preventDefault();
                                   if (e.dataTransfer.files?.[0]) setFastPromoFile(e.dataTransfer.files[0]);
                                 }}
                              >
                                 <Upload size={20} className="text-slate-600 mb-2" />
                                 {fastPromoFile ? (
                                    <div className="space-y-1">
                                       <p className="text-xs font-bold text-indigo-400 max-w-[450px] truncate">{fastPromoFile.name}</p>
                                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{(fastPromoFile.size/1024/1024).toFixed(2)} MB • Arraste para alternar</p>
                                    </div>
                                 ) : (
                                    <div className="space-y-1 z-10 p-2">
                                       <p className="text-xs font-bold text-slate-400">Arraste ou Selecione o PDF da Promoção de Arquivamento</p>
                                       <p className="text-[9px] text-slate-600 uppercase tracking-widest">O documento será limpo e formatado automaticamente pela IA</p>
                                    </div>
                                 )}
                                 <input 
                                    type="file" 
                                    accept="application/pdf" 
                                    className="hidden" 
                                    onChange={(e) => { if (e.target.files?.[0]) setFastPromoFile(e.target.files[0]); }} 
                                 />
                              </label>
                           </div>
                        </div>

                        <button 
                           type="button"
                           onClick={handleProcessFastRegistration} 
                           disabled={isProcessingFast}
                           className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 disabled:cursor-not-allowed transition-all"
                        >
                           {isProcessingFast ? (
                              <>
                                 <Loader2 size={18} className="animate-spin" /> Processando Inteligente via IA...
                              </>
                           ) : (
                              <>
                                 <Sparkles size={18} /> Processar Cadastro e Salvar
                              </>
                           )}
                        </button>
                     </div>
                  ) : (
                     /* TRADITIONAL REGISTRATION FORM */
                     <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2"><label className={labelClass}>Número do Processo</label><input type="text" value={regData.numero} onChange={(e) => setRegData({...regData, numero: e.target.value})} className={inputClass} placeholder="0000000-00.0000.0.00.0000" autoFocus /></div>
                           <div>
                               <label className={labelClass}>Cargo</label>
                               <select 
                                   value={regData.cargo} 
                                   onChange={(e) => {
                                       const newCargo = e.target.value;
                                       const newPromotor = getPromotorForDate(newCargo);
                                       setRegData({...regData, cargo: newCargo, promotor: newPromotor});
                                   }} 
                                   className={inputClass}
                               >
                                   <option value="">Selecione...</option>
                                   {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                               </select>
                           </div>
                           <div><label className={labelClass}>Promotor</label><input type="text" value={regData.promotor} onChange={(e) => setRegData({...regData, promotor: e.target.value})} className={inputClass} placeholder="Automático" /></div>
                        </div>

                        <button onClick={handleRegisterProcess} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2">
                           <Save size={18} /> Cadastrar Processo
                        </button>
                     </div>
                  )}
               </div>
            </div>
        )}

        {/* VIEW 2 & 3: PROCESS DASHBOARD & WORKSPACE */}
        {viewMode !== 'REGISTER' && activeProcess && (
            <>
               {/* Context Header */}
               <div className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold border border-slate-700">
                        <FolderOpen size={20}/>
                     </div>
                     <div>
                        <h2 className="text-lg font-black text-slate-100 tracking-tight">{activeProcess.numero}</h2>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                           <span>{activeProcess.promotor}</span>
                           <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                           <span>{activeProcess.cargo}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={() => handleOpenEditProcess(activeProcess)} 
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-700 transition-all flex items-center gap-2"
                        title="Editar dados deste processo"
                     >
                        <Edit3 size={14}/> Editar
                     </button>
                     <button 
                        onClick={() => handleDeleteProcess(activeProcess.id)} 
                        className="px-4 py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 rounded-lg text-xs font-bold uppercase tracking-widest border border-rose-900/40 transition-all flex items-center gap-2 mr-2"
                        title="Excluir este processo"
                     >
                        <Trash2 size={14}/> Excluir
                     </button>
                     <button onClick={() => updateProcessStatus(activeProcess.id, activeProcess.status === 'PENDENTE' ? 'CONCLUIDO' : 'PENDENTE')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${activeProcess.status === 'CONCLUIDO' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-amber-900/20 text-amber-400 border-amber-900/50'}`}>
                        {activeProcess.status === 'CONCLUIDO' ? <CheckCircle2 size={16}/> : <Circle size={16}/>} {activeProcess.status}
                     </button>
                  </div>
               </div>

               {/* Process Dashboard (List of Parties) */}
               {!selectedParteId && !isCreating ? (
                  <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                     <div className="max-w-4xl mx-auto">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16}/> Partes Envolvidas</h3>
                        <div className="grid gap-3">
                           {activeProcess.partes.map(p => (
                              <button 
                                key={p.id} 
                                onClick={() => { setSelectedParteId(p.id); setViewMode('WORK'); setActiveTab('DADOS'); }}
                                className="w-full bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-4 rounded-xl flex items-center justify-between group transition-all"
                              >
                                 <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${p.statusIntimacao === 'Concluído' ? 'bg-green-900/20 text-green-500' : 'bg-slate-800 text-slate-400'}`}>
                                       {p.nome.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                       <h4 className="font-bold text-slate-200 group-hover:text-rose-400 transition-colors">{p.nome}</h4>
                                       <p className="text-xs text-slate-500">{p.tipoParte}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${p.statusIntimacao === 'Concluído' ? 'bg-green-900/20 text-green-500' : 'bg-slate-950 text-slate-500'}`}>
                                       {p.statusIntimacao}
                                    </span>
                                    <ArrowLeft size={16} className="text-slate-600 rotate-180 group-hover:translate-x-1 transition-transform"/>
                                 </div>
                              </button>
                           ))}
                           <button onClick={() => { setViewMode('WORK'); setIsCreating(true); setSelectedParteId(null); setActiveTab('DADOS'); setFormData({}); }} className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-700 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all">
                              <Plus size={16}/> Adicionar Outra Parte
                           </button>
                        </div>
                     </div>
                  </div>
               ) : (
                  // WORKSPACE (Tabs)
                  <>
                    <div className="bg-slate-900 border-b border-slate-800 px-8 pt-4 flex gap-4 overflow-x-auto no-print sticky top-0 z-10 custom-scrollbar">
                       <button onClick={() => { setSelectedParteId(null); setIsCreating(false); }} className="flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white mr-4 border-r border-slate-800 pr-4">
                          <ArrowLeft size={16}/> Voltar
                       </button>
                       {[
                         { id: 'DADOS', label: '1. Dados', icon: <User size={16}/> },
                         { id: 'PROMOCAO', label: '2. Promoção', icon: <Archive size={16}/> },
                         { id: 'INTIMACAO', label: '3. Intimação', icon: <Send size={16}/> },
                         { id: 'CERTIDAO', label: '4. Documentos', icon: <FileSignature size={16}/> },
                         { id: 'MERGE', label: '5. Unir Docs', icon: <Files size={16}/> },
                       ].map((tab: any) => (
                         <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all relative shrink-0 ${activeTab === tab.id ? 'text-rose-500' : 'text-slate-500 hover:text-slate-300'}`}>
                            {tab.icon} {tab.label}{activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 rounded-t-full"></div>}
                         </button>
                       ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-950">
                      <div className="max-w-5xl mx-auto">
                        {/* --- TAB CONTENT (Reuse existing render logic) --- */}
                        {activeTab === 'DADOS' && (
                          <div className="animate-in slide-in-from-bottom-4 space-y-6">
                             {/* Existing DADOS tab content logic... reused */}
                             <div className="bg-amber-950/20 border border-amber-900/40 p-6 rounded-2xl mb-6 shadow-lg">
                                <div className="flex items-center gap-2 mb-3"><Sparkles className="text-amber-500" size={18}/><h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Extração Inteligente</h3></div>
                                <div className="flex gap-2 relative">
                                   {/* File Input for Extraction */}
                                   <label className="flex items-center justify-center p-3 bg-slate-900 border border-amber-900/50 hover:border-amber-500 rounded-xl cursor-pointer transition-colors">
                                      <Upload size={16} className="text-amber-500" />
                                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => { if (e.target.files?.[0]) setExtractionFile(e.target.files[0]); }} />
                                   </label>
                                   
                                   {/* Input Area */}
                                   <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
                                       {extractionFile ? (
                                           <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/30 px-3 py-1 rounded-lg w-full">
                                               <Paperclip size={12}/> {extractionFile.name}
                                               <button onClick={() => setExtractionFile(null)} className="ml-auto hover:text-white"><X size={12}/></button>
                                           </div>
                                       ) : pastedImage ? (
                                           <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/30 px-3 py-1 rounded-lg w-full">
                                               <ImageIcon size={12}/> Imagem Colada
                                               <button onClick={() => setPastedImage(null)} className="ml-auto hover:text-white"><X size={12}/></button>
                                           </div>
                                       ) : (
                                           <textarea 
                                               value={aiInput} 
                                               onChange={(e) => setAiInput(e.target.value)} 
                                               onPaste={handlePaste} 
                                               onKeyDown={(e) => {
                                                   if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                       e.preventDefault();
                                                       handleSmartExtraction();
                                                   }
                                               }}
                                               placeholder="Cole dados da parte (Boletim de Ocorrência / RDO, texto, imagem ou PDF)... Pressione Ctrl+Enter para extrair" 
                                               className="w-full bg-transparent text-xs text-slate-200 resize-none h-10 outline-none placeholder-slate-500"
                                           />
                                       )}
                                   </div>
                                   
                                   <button onClick={handleSmartExtraction} disabled={isAiLoading} className="bg-amber-600 hover:bg-amber-500 text-white px-6 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2">{isAiLoading ? <Loader2 className="animate-spin"/> : <Clipboard size={16}/>} Extrair</button>
                                </div>
                             </div>
                             
                             <div className="bg-white p-8 rounded-lg shadow-xl border border-slate-200 relative">
                                <div className="grid grid-cols-12 gap-x-6 gap-y-4">
                                     {activeParties.length > 0 && (
                                         <div className="col-span-12 flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-2 shadow-md overflow-x-auto no-scrollbar">
                                            <div className="flex items-center gap-2">
                                               <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-2 flex items-center gap-1.5 shrink-0">
                                                  <Users size={14} /> Partes ({activeParties.length}):
                                               </span>
                                               {activeParties.map((p, idx) => (
                                                  <button
                                                     key={p.id}
                                                     type="button"
                                                     onClick={() => {
                                                        savePartyDirect(formData);
                                                        setIsCreating(false);
                                                        setSelectedParteId(p.id);
                                                        setFormData(p);
                                                     }}
                                                     className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0 ${
                                                        selectedParteId === p.id && !isCreating
                                                           ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50'
                                                           : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                                     }`}
                                                  >
                                                     <span>Parte {idx + 1}/{activeParties.length}:</span>
                                                     <span className="max-w-[150px] truncate">{p.nome || 'Sem Nome'}</span>
                                                  </button>
                                               ))}
                                            </div>
                                            <button
                                               type="button"
                                               onClick={() => {
                                                  setIsCreating(true);
                                                  setSelectedParteId(null);
                                                  setFormData({ tipoParte: 'Vítima' });
                                               }}
                                               className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 border border-slate-700 ml-3 transition-colors"
                                            >
                                               <Plus size={14} /> Adicionar Parte
                                            </button>
                                         </div>
                                     )}
                                     <div className="col-span-12 md:col-span-6"><label className={labelClass}>Nome Completo *</label><input type="text" value={formData.nome || ''} onChange={(e) => handleInputChange('nome', e.target.value)} className={inputClass}/></div>
                                    <div className="col-span-12 md:col-span-3"><label className={labelClass}>Tipo</label><select value={formData.tipoParte || 'Vítima'} onChange={(e) => setFormData({...formData, tipoParte: e.target.value as any})} className={inputClass}><option value="Vítima">Vítima</option><option value="Investigado">Investigado</option></select></div>
                                    <div className="col-span-12 md:col-span-3"><label className={labelClass}>Fls.</label><input type="text" value={formData.folha || ''} onChange={(e) => handleInputChange('folha', e.target.value)} className={inputClass} placeholder="00"/></div>
                                    
                                    <div className="col-span-12 md:col-span-4 relative">
                                        <label className={labelClass}>CEP</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={formData.cep || ''} 
                                                onChange={(e) => handleInputChange('cep', e.target.value)} 
                                                onBlur={handleFetchCep}
                                                className={`${inputClass} pr-10`} 
                                                placeholder="00000-000"
                                            />
                                            <button 
                                                onClick={handleFetchCep} 
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-700"
                                                disabled={isCepLoading}
                                            >
                                                {isCepLoading ? <Loader2 size={18} className="animate-spin"/> : <Search size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-6"><label className={labelClass}>Endereço</label><input type="text" value={formData.endereco || ''} onChange={(e) => handleInputChange('endereco', e.target.value)} className={inputClass}/></div>
                                    <div className="col-span-12 md:col-span-2"><label className={labelClass}>Número</label><input type="text" value={formData.numero || ''} onChange={(e) => handleInputChange('numero', e.target.value)} className={inputClass}/></div>
                                    
                                    <div className="col-span-12 md:col-span-4"><label className={labelClass}>Bairro</label><input type="text" value={formData.bairro || ''} onChange={(e) => handleInputChange('bairro', e.target.value)} className={inputClass}/></div>
                                    <div className="col-span-12 md:col-span-4"><label className={labelClass}>Cidade</label><input type="text" value={formData.cidade || ''} onChange={(e) => handleInputChange('cidade', e.target.value)} className={inputClass}/></div>
                                    <div className="col-span-12 md:col-span-4"><label className={labelClass}>Complemento</label><input type="text" value={formData.complemento || ''} onChange={(e) => handleInputChange('complemento', e.target.value)} className={inputClass}/></div>

                                    <div className="col-span-12 border-t border-slate-100 my-2"></div>

                                    <div className="col-span-12 md:col-span-6"><label className={labelClass}>Telefone / WhatsApp</label><div className="relative"><Phone size={14} className="absolute left-3 top-3 text-slate-400"/><input type="text" value={formData.telefone || ''} onChange={(e) => handleInputChange('telefone', e.target.value)} className={`${inputClass} pl-9`} placeholder="(11) 90000-0000"/></div></div>
                                    <div className="col-span-12 md:col-span-6"><label className={labelClass}>E-mail</label><div className="relative"><Mail size={14} className="absolute left-3 top-3 text-slate-400"/><input type="text" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} className={`${inputClass} pl-9`} placeholder="email@exemplo.com"/></div></div>
                                </div>
                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => selectedParte && updatePartyStatus(selectedParte.id, 'Concluído')} disabled={!selectedParte} className="text-green-600 font-bold text-xs uppercase hover:underline flex items-center gap-1 disabled:text-gray-400"><CheckCircle2 size={14}/> Marcar como Concluído</button>
                                        {selectedParte && (
                                            <button 
                                                onClick={() => { handleDeleteParty(selectedParte.id); }} 
                                                className="text-rose-600 hover:text-rose-800 font-bold text-xs uppercase flex items-center gap-1 ml-4"
                                                title="Excluir esta parte permanentemente"
                                            >
                                                <Trash2 size={14}/> Excluir Parte
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={handleSaveParte} className="px-10 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-xs shadow-lg hover:bg-rose-500 flex items-center gap-2"><Save size={18} /> Salvar e Continuar</button>
                                </div>
                             </div>
                          </div>
                        )}
                        
                        {activeTab === 'PROMOCAO' && (
                           <div className="animate-in slide-in-from-bottom-4 space-y-6">
                              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-6">
                                 <h3 className="text-xl font-bold text-slate-100 uppercase">Promoção de Arquivamento</h3>
                                 <label onDrop={handleDropPromo} onDragOver={handleDragOverPromo} onDragLeave={handleDragLeavePromo} className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isDraggingPromo ? 'border-rose-500 bg-rose-900/20' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'}`}>
                                    <Upload className="mb-2 text-slate-500"/>
                                    <span className="text-xs font-bold uppercase text-slate-500">Arraste PDF/IMG</span>
                                    <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files && setPromoFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                                 </label>
                                 {promoFiles.length > 0 && (
                                     <div className="flex flex-wrap gap-2 justify-center">
                                         {promoFiles.map((f, i) => (
                                             <div key={i} className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                                                 <span className="text-xs text-slate-300 max-w-[200px] truncate">{f.name}</span>
                                                 <button onClick={() => setPromoFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-500"><X size={12}/></button>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                                 
                                 {isPromotionLoading && (
                                     <div className="w-full max-w-md mx-auto bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
                                         <div className="h-full bg-rose-500 animate-pulse w-full"></div>
                                     </div>
                                 )}

                                 <button onClick={handleFormatPromotion} disabled={isPromotionLoading || promoFiles.length === 0} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs shadow-lg flex items-center gap-2 mx-auto hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                    {isPromotionLoading ? <Loader2 className="animate-spin"/> : <Sparkles size={16}/>} Formatar
                                 </button>
                              </div>
                           </div>
                        )}

                        {activeTab === 'INTIMACAO' && (
                           <div className="space-y-8 animate-in slide-in-from-bottom-4">
                              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-fit">
                                 {[{ id: 'CORREIOS', label: 'Correios', icon: <Truck size={16}/> }, { id: 'WHATSAPP', label: 'WhatsApp', icon: <MessageCircle size={16}/> }, { id: 'EMAIL', label: 'E-mail', icon: <Mail size={16}/> }].map(ch => (
                                   <button key={ch.id} onClick={() => setChannel(ch.id as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${channel === ch.id ? 'bg-slate-800 text-slate-100 shadow-md' : 'text-slate-500 hover:text-slate-400'}`}>
                                      {ch.icon} {ch.label}
                                   </button>
                                 ))}
                              </div>
                              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                                 <div className="bg-slate-950 p-6 rounded-2xl text-slate-300 text-sm leading-relaxed border border-slate-800 italic">"{channel === 'WHATSAPP' ? whatsappTemplate : emailTemplate}"</div>
                                 <div className="flex gap-4 mt-6">
                                     <button onClick={() => {navigator.clipboard.writeText(channel==='WHATSAPP'?whatsappTemplate:emailTemplate); setCopied(true); setTimeout(()=>setCopied(false),2000)}} className="bg-slate-800 text-white py-3 px-6 rounded-xl font-bold uppercase text-xs flex items-center gap-2">
                                         {copied ? <CheckCircle size={16}/> : <Copy size={16}/>} Copiar
                                     </button>
                                     <button onClick={() => setActiveTab('CERTIDAO')} className="bg-rose-600 text-white py-3 px-10 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg ml-auto hover:bg-rose-500 transition-all">Próximo <ArrowLeft size={16} className="rotate-180"/></button>
                                 </div>
                              </div>
                           </div>
                        )}

                        {activeTab === 'CERTIDAO' && (
                           <div className="space-y-6 animate-in slide-in-from-bottom-4">
                              {activeParties.length > 1 && (docView === 'CERTIDAO' || docView === 'CARTA') && (
                                 <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-md">
                                    <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                                       <User size={14}/> Parte do Documento:
                                    </span>
                                    <div className="flex gap-2">
                                       {activeParties.map((p, idx) => (
                                          <button
                                             key={p.id}
                                             onClick={() => { setSelectedParteId(p.id); setFormData(p); }}
                                             className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${selectedParteId === p.id ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                                          >
                                             <span>Parte {idx + 1}:</span> {p.nome}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              <div className="flex items-center gap-6">
                                <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-fit flex-wrap gap-1">
                                   <button onClick={() => setDocView('CERTIDAO')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${docView === 'CERTIDAO' ? 'bg-slate-800 text-rose-400 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Certidão Notificação</button>
                                   <button onClick={() => setDocView('CARTA')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${docView === 'CARTA' ? 'bg-slate-800 text-amber-400 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Carta de Notificação</button>
                                   <button onClick={() => setDocView('PROMOCAO')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${docView === 'PROMOCAO' ? 'bg-slate-800 text-indigo-400 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Promoção</button>
                                </div>
                                {(docView === 'CERTIDAO' || docView === 'CARTA') && (
                                  <div className="flex bg-slate-200 p-1 rounded-lg shadow-inner">
                                    <button 
                                      onClick={() => setIsBlankCertidao(false)}
                                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${!isBlankCertidao ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                      Preenchido
                                    </button>
                                    <button 
                                      onClick={() => setIsBlankCertidao(true)}
                                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${isBlankCertidao ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                      Em Branco
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="bg-gray-100 p-4 rounded-xl shadow-2xl overflow-auto w-full min-h-[600px] flex justify-center">
                                 {docView === 'CERTIDAO' ? (
                                     <div className="printable-content" dangerouslySetInnerHTML={{ __html: certidaoTemplate }} />
                                 ) : docView === 'CARTA' ? (
                                      <div className="printable-content" dangerouslySetInnerHTML={{ __html: cartaNotificacaoTemplate }} />
                                 ) : (
                                     <div className="relative group">
                                         <button 
                                             onClick={() => {navigator.clipboard.writeText(promotionText); setCopied(true); setTimeout(()=>setCopied(false),2000)}} 
                                             className="absolute top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-lg hover:bg-slate-700 transition-all z-10 opacity-0 group-hover:opacity-100 no-print"
                                         >
                                             {copied ? <CheckCircle size={14}/> : <Copy size={14}/>} {copied ? 'Copiado!' : 'Copiar Texto'}
                                         </button>
                                         <div className="p-16 font-serif text-[12pt] text-justify leading-relaxed whitespace-pre-wrap selection:bg-yellow-200 printable-content bg-white w-[210mm] min-h-[297mm] text-black">
                                             {promotionText || "Nenhuma promoção formatada ainda."}
                                         </div>
                                     </div>
                                 )}
                              </div>
                              <div className="flex gap-4">
                                 <button onClick={handleDownloadSMT} className="flex-1 bg-yellow-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-yellow-500 transition-all">
                                    <FileSpreadsheet size={20} /> {activeParties.length > 1 ? `CSV SMT (${activeParties.length} SMTs)` : 'CSV SMT'}
                                 </button>
                                 <button 
                                    onClick={() => setIsSmtModalOpen(true)}
                                    className="px-4 bg-slate-900 hover:bg-indigo-950 text-indigo-400 hover:text-indigo-300 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs border border-indigo-500/30 shadow-xl flex items-center justify-center gap-2 transition-all"
                                    title="Abrir Favorito / Bookmarklet para Autopreencher e Extrair dados do formulário do SMT"
                                 >
                                    <Zap size={18} className="text-yellow-400" />
                                    <span className="hidden sm:inline">Favorito SMT</span>
                                 </button>
                                 {(docView === 'CERTIDAO' || docView === 'CARTA') && (
                                    <button onClick={handleDownloadWord} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all"><FileText size={20} /> Baixar Word</button>
                                 )}
                                 <button onClick={handleDownloadPDF} className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-rose-500 transition-all">
                                    <Download size={20} /> {activeParties.length > 1 && docView === 'CERTIDAO' ? `Baixar/Imprimir ${activeParties.length} Certidões (PDF)` : 'Baixar PDF'}
                                 </button>
                              </div>
                           </div>
                        )}

                        {activeTab === 'MERGE' && (
                           <div className="animate-in slide-in-from-bottom-4 space-y-6">
                             <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 text-center">
                                <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Unir Documentos PDF</h3>
                                <label onDrop={handleDropMerge} onDragOver={handleDragOverMerge} onDragLeave={handleDragLeaveMerge} className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isDraggingMerge ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'}`}>
                                   <Upload className="mb-2 text-slate-600" />
                                   <span className="text-xs font-bold uppercase text-slate-500">Arraste os PDFs</span>
                                   <input type="file" multiple className="hidden" accept="application/pdf" onChange={(e) => e.target.files && setMergeFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                                </label>
                                {mergeFiles.length > 0 && (
                                     <div className="flex flex-wrap gap-2 justify-center">
                                         {mergeFiles.map((f, i) => (
                                             <div key={i} className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                                                 <span className="text-xs text-slate-300 max-w-[200px] truncate">{f.name}</span>
                                                 <button onClick={() => setMergeFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-500"><X size={12}/></button>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                                <button onClick={handleMergePDFs} className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold uppercase text-xs shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50 hover:bg-indigo-500 transition-all">
                                   {isMerging ? <Loader2 className="animate-spin"/> : <Files size={16}/>} Unir PDF
                                </button>
                             </div>
                           </div>
                        )}

                      </div>
                    </div>
                  </>
               )}
            </>
        )}

        {!activeProcess && viewMode === 'LIST' && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-800"><BellRing size={32} className="text-slate-700" /></div>
                <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tight">Controle de Arquivamento</h3>
                <p className="text-sm mt-2">Selecione um processo ou crie um novo.</p>
            </div>
        )}

         {/* EDIT PROCESS MODAL */}
         {isEditingProcess && (
           <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
             <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                 <div className="flex items-center gap-2">
                   <Edit3 size={18} className="text-rose-500" />
                   <h3 className="font-bold text-slate-100 uppercase tracking-tight text-lg">Editar Processo</h3>
                 </div>
                 <button 
                   onClick={() => setIsEditingProcess(false)}
                   className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                 >
                   <X size={18} />
                 </button>
               </div>
 
               <div className="space-y-4">
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Número do Processo</label>
                   <input 
                     type="text" 
                     value={editProcessData.numero} 
                     onChange={(e) => setEditProcessData({...editProcessData, numero: e.target.value})} 
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                     placeholder="0000000-00.0000.0.00.0000"
                   />
                 </div>
 
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cargo</label>
                   <select 
                     value={editProcessData.cargo} 
                     onChange={(e) => {
                       const newCargo = e.target.value;
                       const newPromotor = getPromotorForDate(newCargo);
                       setEditProcessData({...editProcessData, cargo: newCargo, promotor: newPromotor});
                     }} 
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                   >
                     <option value="">Selecione...</option>
                     {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                   </select>
                 </div>
 
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Promotor</label>
                   <input 
                     type="text" 
                     value={editProcessData.promotor} 
                     onChange={(e) => setEditProcessData({...editProcessData, promotor: e.target.value})} 
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                     placeholder="Nome do Promotor"
                   />
                 </div>
               </div>
 
               <div className="flex gap-3 pt-4 border-t border-slate-800">
                 <button 
                   onClick={() => setIsEditingProcess(false)}
                   className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors border border-slate-800"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSaveProcessEdit}
                   className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-colors shadow-lg shadow-rose-900/20"
                 >
                   Salvar Alterações
                 </button>
               </div>
             </div>
           </div>
         )}
  
         {/* SELECTABLE / VECTOR PDF DOWNLOAD MODAL */}
         {showPdfModal && (
           <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
             <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                 <div className="flex items-center gap-2">
                   <Download size={22} className="text-rose-500 animate-pulse" />
                   <h3 className="font-bold text-slate-100 uppercase tracking-tight text-lg">Baixar Documento PDF</h3>
                 </div>
                 <button 
                   onClick={() => setShowPdfModal(false)}
                   className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                 >
                   <X size={18} />
                 </button>
               </div>

               <div className="space-y-6">
                 <p className="text-sm text-slate-300 leading-relaxed">
                   Escolha o formato de geração do seu documento PDF. Para uso oficial, <span className="text-green-400 font-semibold">recomendamos a Opção 1 (Vetorial)</span> pela qualidade e acessibilidade do arquivo.
                 </p>

                 {/* Opção 1: PDF Vetorial */}
                 <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-green-500/30 transition-all space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold uppercase text-green-400 bg-green-500/10 px-3 py-1 rounded-full text-center">Opção 1 • Recomendada</span>
                     <span className="text-[10px] text-slate-500 font-semibold">Texto Selecionável • Aptos</span>
                   </div>
                   <h4 className="font-bold text-slate-100 text-sm">PDF Vetorial de Alta Resolução (Texto Selecionável)</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">
                     Esta opção abre o documento em uma janela dedicada e ativa o diálogo de impressão do navegador. Basta selecionar <b>"Salvar como PDF"</b> na tela que se abrirá. O PDF resultante será 100% vetorial, com fontes originais ultra nítidas e textos totalmente copiáveis/pesquisáveis.
                   </p>
                   <button 
                     onClick={handlePrintVectorPDF}
                     className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                   >
                     <Printer size={16} /> Gerar PDF Vetorial (Oficial)
                   </button>
                 </div>

                 {/* Opção 2: PDF Rápido / Imagem */}
                 <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-slate-750 transition-all space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-bold uppercase text-slate-400 bg-slate-500/10 px-3 py-1 rounded-full text-center">Opção 2 • Alternativa</span>
                     <span className="text-[10px] text-slate-500 font-semibold">Exige zero cliques</span>
                   </div>
                   <h4 className="font-bold text-slate-200 text-sm">PDF Instantâneo em Formato de Imagem</h4>
                   <p className="text-xs text-slate-500 leading-relaxed">
                     Gera e inicia o download direto do PDF de forma automatizada sem abrir outras guias. No entanto, o arquivo se comportará como uma imagem digitalizada, não permitindo copiar o texto diretamente e podendo possuir leve variação de nitidez.
                   </p>
                   <button 
                     onClick={handleDownloadLegacyPDF}
                     className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold uppercase text-xs tracking-widest transition-all border border-slate-700 flex items-center justify-center gap-2"
                   >
                     <Download size={16} /> Baixar PDF Tradicional
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

         <SmtBookmarkletModal 
           isOpen={isSmtModalOpen} 
           onClose={() => setIsSmtModalOpen(false)} 
         />
       </div>
     </div>
   );
 };

export default ArchivingNotificationTool;
