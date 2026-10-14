
import React, { useState, useMemo, useEffect } from 'react';
import { PromotoriaDef, CaseData } from '../types';
import { Mail, Copy, CheckCircle, FileText, Send, AlertTriangle, Sparkles, Loader2, Bot, Upload, X, Paperclip, Trash2, Printer, Settings, MapPin, User, Building2 } from 'lucide-react';
import { fileToBase64Safe } from '../utils/pdfHelper';

type OficioTemplate = 'GERAL_DP' | 'INQUERITO_APARTADO' | 'URGENCIA_IC' | 'CORREGEDORIA' | 'PEDIDO_COPIAS_JUIZO' | 'GAESP_ABUSO';
type GenerationMode = 'TEMPLATE' | 'AI';

interface OficioToolProps {
  promotorias: PromotoriaDef[];
  caseData?: CaseData;
}

const OficioTool: React.FC<OficioToolProps> = ({ promotorias, caseData }) => {
  // --- Global State ---
  const [mode, setMode] = useState<GenerationMode>('TEMPLATE');
  const [cargo, setCargo] = useState(caseData?.cargo || '');
  const [processo, setProcesso] = useState(caseData?.numeroProcesso || '');
  const [numeroOficio, setNumeroOficio] = useState('');

  // Update on caseData change
  useEffect(() => {
    if (caseData?.numeroProcesso) setProcesso(caseData.numeroProcesso);
    if (caseData?.cargo) setCargo(caseData.cargo);
  }, [caseData]);
  
  // --- Template State ---
  const [template, setTemplate] = useState<OficioTemplate>('GERAL_DP');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [orgaoNome, setOrgaoNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [emailOrgao, setEmailOrgao] = useState('');
  
  // --- AI State ---
  const [iaInstrucao, setIaInstrucao] = useState('');
  const [iaContexto, setIaContexto] = useState(''); // Mantido para compatibilidade, mas focado nos arquivos
  const [iaFiles, setIaFiles] = useState<File[]>([]);
  const [iaBody, setIaBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // --- UI State ---
  const [copied, setCopied] = useState(false);

  // --- Helpers ---
  const selectedPromotoria = useMemo(() => 
    promotorias.find(p => p.label === cargo), [cargo, promotorias]);

  const promotorName = useMemo(() => {
    if (!selectedPromotoria || selectedPromotoria.schedule.length === 0) return "";
    return selectedPromotoria.schedule[0].name;
  }, [selectedPromotoria]);

  const handleGenerateIA = async () => {
    if (!iaInstrucao.trim()) {
        alert("Por favor, forneça uma instrução para a IA.");
        return;
    }

    setIsGenerating(true);
    setIaBody('');

    try {
        const filesPayload: Array<{ mimeType: string, data: string, name: string }> = [];

        for (const file of iaFiles) {
            const { data: base64Data, mimeType } = await fileToBase64Safe(file);
            filesPayload.push({
                mimeType,
                data: base64Data,
                name: file.name
            });
        }

        let promptInstruction = '';
        if (iaFiles.length > 0) {
            promptInstruction += "CONTEXTO (Documentos Anexos): Utilize as informações dos documentos anexados como base factual prioritária.\n\n";
        }

        promptInstruction += `Você é um Assistente Jurídico Sênior do Ministério Público de São Paulo.
Sua tarefa é redigir o CORPO DE TEXTO de um ofício formal.

NÃO inclua cabeçalho nem rodapé de assinatura (eu já adiciono isso automaticamente). Gere apenas os parágrafos do corpo do texto.

DADOS DO DESTINATÁRIO (Se aplicável):
- Órgão: ${orgaoNome}
- Responsável: ${destinatarioNome}

SUA MISSÃO (INSTRUÇÃO DO PROMOTOR):
"${iaInstrucao}"

REGRAS:
1. Vocativo adequado (Excelentíssimo Senhor, Senhor Delegado, etc).
2. Linguagem formal, técnica e IMPESSOAL.
3. Use tags HTML básicas para formatar (<p>, <b>, <br>).
4. Finalize com o fecho protocolar (ex: "Aproveito o ensejo para renovar protestos...").`;

        const response = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: promptInstruction,
                files: filesPayload
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na geração: status ${response.status}`);
        }

        const data = await response.json();
        setIaBody(data.text || "Erro ao gerar texto.");
    } catch (error) {
        console.error(error);
        setIaBody("Ocorreu um erro ao gerar o ofício. Verifique sua conexão e tente novamente.");
    } finally {
        setIsGenerating(false);
    }
  };

  const processFiles = (newFiles: File[]) => {
    const totalSize = [...iaFiles, ...newFiles].reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
        alert("O limite total de arquivos é 25MB.");
        return;
    }
    setIaFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const generatedContent = useMemo(() => {
    const header = `
      <div style="margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #666;">Ministério Público do Estado de São Paulo</p>
                <p style="font-size: 16px; font-weight: bold; margin-top: 5px;">Ofício nº ${numeroOficio || '____'}/${new Date().getFullYear().toString().slice(-2)} - 4ª PJCrim</p>
                <p style="font-size: 12px; margin-top: 2px;"><b>Autos nº:</b> ${processo || '________________'}</p>
            </div>
            <div style="text-align: right; font-size: 12px;">
                <p>São Paulo, ${new Date().toLocaleDateString('pt-BR')}.</p>
            </div>
        </div>
      </div>
    `;

    const footerAssinatura = `
      <div style="margin-top: 60px; page-break-inside: avoid;">
        <div style="text-align: center; margin-bottom: 30px;">
            <p style="margin-bottom: 5px;">________________________________________________</p>
            <p style="font-weight: bold; text-transform: uppercase; font-size: 14px;">${promotorName || 'NOME DO PROMOTOR'}</p>
            <p style="font-size: 12px;">${cargo || 'Promotor(a) de Justiça'}</p>
        </div>
        
        <div style="font-size: 10px; color: #555; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
            <p style="font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Destinatário:</p>
            <p><b>Ao:</b> ${orgaoNome || '________________'}</p>
            ${destinatarioNome ? `<p><b>A/C:</b> ${destinatarioNome}</p>` : ''}
            <p>${endereco || 'Endereço não informado'}</p>
            ${emailOrgao ? `<p><b>E-mail:</b> ${emailOrgao}</p>` : ''}
        </div>
      </div>
    `;

    let body = "";
    if (mode === 'AI') {
        body = iaBody || "<p style='color:#999; font-style: italic; text-align: center; margin-top: 40px;'>O texto gerado pela Inteligência Artificial aparecerá aqui...</p>";
    } else {
        // Template Logic Switch
        switch (template) {
            case 'GERAL_DP':
                body = `<p><b>Senhor(a) Delegado(a),</b></p><br><p>Requisito a Vossa Senhoria a instauração de Inquérito Policial para apuração dos fatos narrados nas peças de informação anexas.</p><p>Solicito, outrossim, que os autos sejam relatados e devolvidos a esta Promotoria de Justiça no prazo legal de 30 (trinta) dias.</p><br><p>Aproveito o ensejo para renovar protestos de estima e consideração.</p>`;
                break;
            case 'URGENCIA_IC':
                body = `<p><b>Senhor(a) Perito(a),</b></p><br><p>Solicito, com <b>URGÊNCIA</b>, a remessa a esta Promotoria de Justiça do Laudo Pericial referente à requisição nº [NÚMERO], expedida em [DATA].</p><p>Trata-se de diligência imprescindível para a formação da opinio delicti.</p><br><p>Atenciosamente,</p>`;
                break;
            default:
                body = `<p><b>Excelentíssimo Senhor,</b></p><br><p>Conteúdo do modelo selecionado (${template}) será inserido aqui.</p><br><p>Atenciosamente,</p>`;
        }
    }

    return `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.6; text-align: justify; padding: 0 10px;">
        ${header}
        ${body}
        ${footerAssinatura}
      </div>
    `;
  }, [numeroOficio, processo, promotorName, cargo, mode, template, orgaoNome, destinatarioNome, endereco, emailOrgao, iaBody]);

  const inputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-600 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* SIDEBAR: Controls */}
      <div className="w-[450px] bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl">
        
        {/* 1. Header & Common Fields */}
        <div className="p-6 border-b border-slate-800 space-y-4 bg-slate-900">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg text-white shadow-lg shadow-red-900/20"><Mail size={20} /></div>
                <div>
                    <h2 className="font-bold uppercase tracking-tight text-slate-100">Gerador de Ofícios</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Editor Oficial</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Processo</label>
                    <input type="text" value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="0000000-00..." className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Nº Ofício</label>
                    <input type="text" value={numeroOficio} onChange={(e) => setNumeroOficio(e.target.value)} placeholder="000/24" className={inputClass} />
                </div>
            </div>
            <div>
                <label className={labelClass}>Cargo / Promotor</label>
                <select value={cargo} onChange={(e) => setCargo(e.target.value)} className={inputClass}>
                    <option value="">Selecione o Cargo...</option>
                    {promotorias.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
            </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="flex p-1 mx-6 mt-4 bg-slate-950 rounded-xl border border-slate-800">
            <button onClick={() => setMode('TEMPLATE')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'TEMPLATE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <FileText size={14}/> Modelos Padrão
            </button>
            <button onClick={() => setMode('AI')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'AI' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-slate-500 hover:text-slate-300'}`}>
                <Sparkles size={14}/> Redator IA
            </button>
        </div>

        {/* 3. Specific Forms Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            {/* Destinatário (Common to both but contextually placed) */}
            <div className="space-y-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Building2 size={16}/> 
                    <span className="text-xs font-bold uppercase tracking-widest">Dados do Destinatário</span>
                </div>
                <input type="text" placeholder="Nome do Órgão (Ex: IIRGD)" value={orgaoNome} onChange={(e) => setOrgaoNome(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Nome da Pessoa (A/C)" value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Endereço Completo" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
                <input type="text" placeholder="E-mail Institucional" value={emailOrgao} onChange={(e) => setEmailOrgao(e.target.value)} className={inputClass} />
            </div>

            {mode === 'TEMPLATE' ? (
                <div className="space-y-3">
                    <label className={labelClass}>Selecione o Modelo</label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: 'GERAL_DP', label: 'Requisição de Inquérito (DP)' },
                            { id: 'URGENCIA_IC', label: 'Cobrança de Laudo (IC)' },
                            { id: 'INQUERITO_APARTADO', label: 'Inquérito Apartado' },
                            { id: 'CORREGEDORIA', label: 'Ofício Corregedoria' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTemplate(t.id as OficioTemplate)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left ${template === t.id ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                            >
                                {t.label}
                                {template === t.id && <CheckCircle size={14} />}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div>
                        <label className={labelClass}>Instrução para a IA</label>
                        <textarea 
                            value={iaInstrucao} 
                            onChange={(e) => setIaInstrucao(e.target.value)} 
                            placeholder="Ex: Cobre o laudo com urgência pois o réu está preso e o prazo vence dia 20..." 
                            className={`${inputClass} h-32 resize-none`} 
                        />
                    </div>

                    <div className="space-y-2">
                        <label className={labelClass}>Anexos de Contexto (Opcional)</label>
                        <label 
                            onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files))}}
                            className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDragging ? 'border-violet-500 bg-violet-900/20' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'}`}
                        >
                            <Upload size={20} className={`mb-2 ${isDragging ? 'text-violet-400' : 'text-slate-600 group-hover:text-violet-400'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDragging ? 'text-violet-400' : 'text-slate-600 group-hover:text-violet-400'}`}>
                                {isDragging ? 'Solte para anexar' : 'PDFs ou Imagens'}
                            </span>
                            <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={handleFileSelect} />
                        </label>
                        
                        {iaFiles.length > 0 && (
                            <div className="space-y-1">
                                {iaFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Paperclip size={12} className="text-violet-500"/>
                                            <span className="text-[10px] text-slate-300 truncate w-40">{f.name}</span>
                                        </div>
                                        <button onClick={() => setIaFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-500"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={handleGenerateIA} disabled={isGenerating} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2 transition-all">
                        {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16}/>} Gerar Texto
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* MAIN AREA: Preview */}
      <div className="flex-1 bg-slate-950 p-10 overflow-y-auto flex flex-col items-center custom-scrollbar relative">
        <div className="w-full max-w-[210mm] relative animate-in zoom-in duration-500">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex gap-2 no-print z-20">
                <button 
                    onClick={() => {navigator.clipboard.writeText(generatedContent); setCopied(true); setTimeout(()=>setCopied(false), 2000)}} 
                    className={`bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all ${copied ? 'text-green-400 border-green-500' : ''}`}
                >
                    {copied ? <CheckCircle size={14}/> : <Copy size={14}/>} {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button 
                    onClick={() => { const printWindow = window.open('', '_blank'); printWindow?.document.write(generatedContent); printWindow?.document.close(); printWindow?.print(); }} 
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-900/30 transition-all"
                >
                    <Printer size={14}/> Imprimir
                </button>
            </div>

            {/* A4 Paper Simulation */}
            <div className="bg-white shadow-2xl min-h-[297mm] p-[10mm] sm:p-[20mm] relative">
                <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
            </div>
        </div>
      </div>

    </div>
  );
};

export default OficioTool;
