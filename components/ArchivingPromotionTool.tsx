
import React, { useState } from 'react';
import { Upload, Archive, Copy, CheckCircle, Loader2, AlertCircle, Trash2, FileText, Paperclip } from 'lucide-react';
import { fileToBase64Safe } from '../utils/pdfHelper';

const ArchivingPromotionTool: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleExtract = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setExtractedText(null);
    
    try {
      const filesPayload: Array<{ mimeType: string; data: string; name: string }> = [];

      for (const file of files) {
        const { data, mimeType } = await fileToBase64Safe(file);
        filesPayload.push({ data, mimeType, name: file.name });
      }

      const prompt = `
        Atue como um Assistente Jurídico especializado em tratamento de documentos.
        
        TAREFA:
        Extrair, unificar e limpar o texto das páginas anexadas (Peça de Promoção de Arquivamento).
        
        REGRAS DE LIMPEZA RIGOROSAS:
        1. IGNORE completamente as margens laterais verticais que contêm assinaturas digitais, hashes ou carimbos (ex: "Assinado digitalmente por...", "Processo nº..."). O texto principal está no centro.
        2. REMOVA cabeçalhos e rodapés repetitivos de cada página (números de página, logos, endereços de rodapé).
        3. CORRIJA a quebra de linhas: Se uma frase termina no meio da linha e continua na próxima, junte-as. Mantenha apenas as quebras de parágrafo reais.
        4. O objetivo é ter um texto fluído e limpo para ser colado em um novo documento Word.
        
        SAÍDA:
        Apenas o texto jurídico limpo, sem comentários adicionais.
      `;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          prompt
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${res.status}`);
      }

      const resData = await res.json();
      setExtractedText(resData.text || "");
    } catch (err) {
      console.error(err);
      setError("Falha ao processar os arquivos. Verifique se são PDFs válidos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-8 flex flex-col gap-6 shadow-xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700 rounded-lg text-white"><Archive size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-slate-100">Arquivamento</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Limpeza e Extração</p>
          </div>
        </div>

        <label 
            onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])}}
            className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragging ? 'border-slate-500 bg-slate-800' : 'border-slate-800 hover:bg-slate-800'}`}
        >
            <Upload size={24} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-4">Upload de Múltiplos PDFs/IMGs</span>
            <input type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={(e) => {if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])}} />
        </label>

        {files.length > 0 && (
            <div className="space-y-2">
                {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px]">
                        <span className="text-slate-400 truncate w-48">{f.name}</span>
                        <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                ))}
                <button onClick={handleExtract} disabled={loading} className="w-full bg-slate-100 hover:bg-white text-slate-900 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mt-2">
                    {loading ? <Loader2 className="animate-spin" size={14}/> : <FileText size={14}/>} Extrair Texto Limpo
                </button>
            </div>
        )}
        
        {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-400 text-xs">
                <AlertCircle size={16} />
                {error}
            </div>
        )}
      </div>

      <div className="flex-1 bg-slate-950 p-12 overflow-y-auto flex flex-col items-center custom-scrollbar relative">
        {!extractedText && !loading && (
          <div className="text-center space-y-4 max-w-sm mt-20 opacity-50">
             <Archive size={48} className="mx-auto text-slate-500" />
             <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Área de Visualização</h3>
             <p className="text-slate-500 text-sm">O texto extraído e limpo de múltiplas peças aparecerá aqui em formato de documento contínuo, pronto para cópia.</p>
          </div>
        )}
        
        {loading && (
            <div className="flex flex-col items-center justify-center mt-20 gap-4">
                <Loader2 className="animate-spin text-slate-500" size={48} />
                <p className="text-slate-500 text-sm animate-pulse">Lendo documentos, removendo margens e unificando texto...</p>
            </div>
        )}
        
        {extractedText && (
          <div className="w-full max-w-4xl flex flex-col gap-4 animate-in slide-in-from-bottom">
             <div className="flex justify-end sticky top-0 z-10">
                <button 
                    onClick={handleCopy} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg transition-all ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'}`}
                >
                    {copied ? <CheckCircle size={16}/> : <Copy size={16}/>}
                    {copied ? 'Copiado!' : 'Copiar Texto'}
                </button>
             </div>
             <div className="bg-white p-16 shadow-2xl rounded-sm text-black font-serif text-[12pt] leading-relaxed whitespace-pre-wrap selection:bg-yellow-200 selection:text-black">
                {extractedText}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivingPromotionTool;
