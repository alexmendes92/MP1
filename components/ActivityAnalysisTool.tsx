import React, { useState } from 'react';
import { Activity } from '../types';
import { BrainCircuit, Upload, Send, FileText, Loader2, Sparkles, Copy, CheckCircle, AlertCircle, X, ChevronLeft, Paperclip, Trash2 } from 'lucide-react';
import { aiClient } from "../utils/geminiClient";

interface ActivityAnalysisToolProps {
  activity: Activity | null;
  onBack: () => void;
}

const ActivityAnalysisTool: React.FC<ActivityAnalysisToolProps> = ({ activity, onBack }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!activity) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8">
        <div className="text-center space-y-4">
           <AlertCircle size={48} className="text-red-500 mx-auto" />
           <h2 className="text-2xl font-bold">Nenhuma Atividade Selecionada</h2>
           <p className="text-slate-500">Volte para a lista de atividades e selecione uma para análise.</p>
           <button onClick={onBack} className="bg-slate-800 px-6 py-2 rounded-xl text-white">Voltar</button>
        </div>
      </div>
    );
  }

  const processFiles = (newFiles: File[]) => {
    const totalSize = [...files, ...newFiles].reduce((acc, f) => acc + f.size, 0);
    
    if (totalSize > 20 * 1024 * 1024) {
      alert("O tamanho total dos anexos não pode exceder 20MB.");
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResponse('');

    try {
      const ai = aiClient;
      const parts: any[] = [];

      // Add activity context
      const activityContext = `
        DADOS DA ATIVIDADE EM ANÁLISE:
        - Processo: ${activity.numeroProcesso}
        - Tipo de Atividade: ${activity.tipo}
        - Cargo/Promotoria: ${activity.cargo}
        - Promotor(a) Designado(a): ${activity.promotor}
        - Observações Originais: ${activity.observacao || 'Nenhuma'}
      `;
      parts.push({ text: activityContext });

      // Add files
      for (const file of files) {
        const base64Data = await fileToBase64(file);
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        });
      }

      // Add user instruction
      parts.push({ text: `INSTRUÇÃO DO USUÁRIO: ${prompt || 'Forneça uma análise estratégica completa desta atividade com base nos documentos anexados.'}` });

      const result = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: "Você é um Consultor Jurídico Sênior do Ministério Público. Sua missão é analisar a atividade fornecida e os documentos anexos para sugerir estratégias processuais, identificar teses de acusação, apontar nulidades ou diligências faltantes. Seja técnico, formal e objetivo.",
          thinkingConfig: { thinkingBudget: 2048 }
        }
      });

      setResponse(result.text || "Não foi possível gerar análise.");
    } catch (error) {
      console.error(error);
      setResponse("Erro ao processar análise. Verifique os arquivos e a conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      {/* Sidebar - Context and Upload */}
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
           <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase">
             <ChevronLeft size={16} /> Voltar
           </button>
           <div className="flex items-center gap-2">
              <BrainCircuit className="text-violet-500" size={20} />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">Análise Estratégica</span>
           </div>
        </div>

        {/* Activity Summary Card */}
        <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl space-y-3">
           <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Processo nº</p>
              <h3 className="text-lg font-black text-slate-100">{activity.numeroProcesso}</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tipo</p>
                 <span className="text-xs font-bold text-slate-300">{activity.tipo}</span>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">{activity.status.replace('_', ' ')}</span>
              </div>
           </div>
           <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Destinatário</p>
              <p className="text-xs font-bold text-violet-400">{activity.promotor}</p>
           </div>
        </div>

        {/* Multiple File Upload */}
        <div className="space-y-4">
           <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anexos para a IA (PDF/IMG)</label>
           <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all group ${isDragging ? 'border-violet-500 bg-violet-900/20' : 'border-slate-700 bg-slate-950 hover:bg-slate-900'}`}
           >
              <Upload className={`mb-2 ${isDragging ? 'text-violet-400' : 'text-slate-500 group-hover:text-violet-500'}`} size={24} />
              <span className={`text-xs font-bold ${isDragging ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {isDragging ? 'Solte para anexar' : 'Anexar Documentos'}
              </span>
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
           </label>

           {files.length > 0 && (
              <div className="space-y-2">
                 {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-xl border border-slate-700 animate-in slide-in-from-top-2">
                       <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip size={14} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-300 truncate">{f.name}</span>
                       </div>
                       <button onClick={() => removeFile(i)} className="p-1 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                 ))}
              </div>
           )}
        </div>

        {/* Extra Instruction */}
        <div className="flex flex-col flex-1">
           <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instrução Específica</label>
           <textarea 
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-600 resize-none text-slate-200"
             placeholder="O que a IA deve buscar nos documentos?"
           />
        </div>

        <button 
           onClick={handleAnalyze}
           disabled={isLoading}
           className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-800 text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-violet-900/20 transition-all flex items-center justify-center gap-2"
        >
           {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
           {isLoading ? 'Analisando...' : 'Iniciar Análise Estratégica'}
        </button>
      </div>

      {/* Main Analysis Display */}
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center">
         {!response && !isLoading && (
            <div className="mt-20 text-center max-w-md animate-in fade-in duration-700">
               <div className="w-24 h-24 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <BrainCircuit size={48} className="text-violet-500" />
               </div>
               <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight mb-4">Núcleo de Inteligência</h2>
               <p className="text-slate-500 text-sm leading-relaxed">
                  Esta ferramenta cruza os dados da atividade com os documentos anexados para fornecer uma visão estratégica 360º. Carregue as peças do processo e clique em iniciar.
               </p>
            </div>
         )}

         {isLoading && (
            <div className="w-full max-w-4xl mt-10 space-y-8 animate-pulse">
               <div className="h-10 w-48 bg-slate-900 rounded-full"></div>
               <div className="space-y-4">
                  <div className="h-4 w-full bg-slate-900 rounded-full"></div>
                  <div className="h-4 w-full bg-slate-900 rounded-full"></div>
                  <div className="h-4 w-3/4 bg-slate-900 rounded-full"></div>
               </div>
               <div className="h-[400px] w-full bg-slate-900 rounded-3xl"></div>
            </div>
         )}

         {response && (
            <div className="w-full max-w-4xl flex flex-col gap-6 animate-in slide-in-from-bottom duration-500">
               <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md py-4 z-20">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-violet-900/40 text-violet-400 rounded-lg"><Sparkles size={18}/></div>
                     <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">Parecer Estratégico</h2>
                  </div>
                  <button 
                    onClick={handleCopy}
                    className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado!' : 'Copiar Análise'}
                  </button>
               </div>

               <div className="bg-slate-900 shadow-2xl border border-slate-800 rounded-3xl p-10 text-slate-300 leading-relaxed text-justify whitespace-pre-wrap font-serif text-[1.1rem]">
                  {response}
               </div>

               <div className="py-10 text-center">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Confidencial - Uso Interno Ministério Público</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default ActivityAnalysisTool;