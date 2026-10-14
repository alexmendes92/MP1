import React, { useState } from 'react';
import { 
  Upload, 
  Gavel, 
  Copy, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  Paperclip, 
  MapPin, 
  User, 
  FileText, 
  Fingerprint,
  Eye,
  RefreshCw,
  Check,
  X,
  FileSpreadsheet,
  Plus,
  AlertTriangle,
  Sparkles,
  Download
} from 'lucide-react';
import { fileToBase64Safe } from '../utils/pdfHelper';

interface ExtractedData {
  numeroProcesso: string;
  nomeParte: string;
  cpf: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  estaPreso: string | boolean;
}

const normalizeExtractedData = (raw: any): ExtractedData => {
  if (!raw || typeof raw !== 'object') {
    return {
      numeroProcesso: '',
      nomeParte: '',
      cpf: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      estaPreso: 'Não',
    };
  }
  return {
    numeroProcesso: String(raw.numeroProcesso || '').trim(),
    nomeParte: String(raw.nomeParte || '').trim(),
    cpf: String(raw.cpf || '').trim(),
    cep: String(raw.cep || '').trim(),
    endereco: String(raw.endereco || '').trim(),
    numero: String(raw.numero || '').trim(),
    complemento: String(raw.complemento || '').trim(),
    estaPreso: typeof raw.estaPreso === 'boolean'
      ? (raw.estaPreso ? 'Sim' : 'Não')
      : String(raw.estaPreso || '').trim(),
  };
};

interface BatchItem {
  id: string;
  fileName: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'failed';
  data?: ExtractedData;
  error?: string;
}

const MultaPenalTool: React.FC = () => {
  // Mode selection: 'individual' or 'lote'
  const [mode, setMode] = useState<'individual' | 'lote'>('individual');
  
  // Single mode states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Batch mode states
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState<BatchItem | null>(null);
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);

  // Extract single mode
  const handleExtract = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    
    try {
      const filesPayload: Array<{ mimeType: string; data: string; name: string }> = [];
      for (const file of files) {
        const { data, mimeType } = await fileToBase64Safe(file);
        filesPayload.push({ data, mimeType, name: file.name });
      }

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          prompt: "Analise estas certidões de multa penal e extraia os dados consolidados do devedor/sentenciado. Extraia separadamente o nome do sentenciado, CPF, CEP, endereço (logradouro como rua, avenida, etc.), número do endereço, complemento (caso exista), o número do processo criminal e se ele está preso. Retorne estritamente um JSON com os campos: numeroProcesso, nomeParte, cpf, cep, endereco, numero, complemento, estaPreso.",
          config: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${res.status}`);
      }

      const resData = await res.json();
      setData(normalizeExtractedData(JSON.parse(resData.text || "{}")));
    } catch (err) {
      console.error(err);
      setError("Falha ao processar os documentos.");
    } finally {
      setLoading(false);
    }
  };

  // Batch process execution (sequential)
  const handleProcessBatch = async () => {
    if (batchProcessing || batchItems.length === 0) return;
    setBatchProcessing(true);

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status === 'success') continue;

      setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'processing' } : it));

      try {
        const { data: base64, mimeType } = await fileToBase64Safe(item.file);
        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [{ data: base64, mimeType, name: item.file.name }],
            prompt: "Analise esta certidão de multa penal e extraia os dados consolidados do devedor/sentenciado. Extraia separadamente o nome do sentenciado, CPF, CEP, endereço (logradouro como rua, avenida, etc.), número do endereço, complemento (caso exista), o número do processo criminal e se ele está preso. Retorne estritamente um JSON com os campos: numeroProcesso, nomeParte, cpf, cep, endereco, numero, complemento, estaPreso.",
            config: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!res.ok) {
          throw new Error(`Erro na API: ${res.status}`);
        }

        const resData = await res.json();
        const parsedData = normalizeExtractedData(JSON.parse(resData.text || "{}"));
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'success', data: parsedData } : it));
      } catch (err) {
        console.error(err);
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'failed', error: "Erro na extração de dados" } : it));
      }
    }

    setBatchProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addBatchFiles(Array.from(e.target.files));
    }
  };

  const addBatchFiles = (uploadedFiles: File[]) => {
    const newItems: BatchItem[] = uploadedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      file: file,
      status: 'pending'
    }));
    setBatchItems(prev => [...prev, ...newItems]);
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const removeBatchItem = (id: string) => setBatchItems(prev => prev.filter(it => it.id !== id));

  const downloadFile = (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
      alert("Não foi possível iniciar o download do arquivo.");
    }
  };

  const getReuPresoStatus = (estaPreso?: string | boolean | any): string => {
    if (estaPreso === null || estaPreso === undefined) return 'Não';
    if (typeof estaPreso === 'boolean') {
      return estaPreso ? 'Sim' : 'Não';
    }
    const lower = String(estaPreso).toLowerCase().trim();
    if (
      lower === 'true' ||
      lower === '1' ||
      lower.includes('sim') ||
      lower.includes('preso') ||
      lower.includes('custodiado') ||
      lower.includes('detido')
    ) {
      return 'Sim';
    }
    return 'Não';
  };

  const getCpfNaoInformadoStatus = (cpf?: string | any): string => {
    if (!cpf) return 'Sim';
    const str = String(cpf);
    const clean = str.replace(/\D/g, '').trim();
    if (clean.length === 11) return 'Não';
    const lower = str.toLowerCase().trim();
    if (
      clean === '' ||
      lower.includes('não') ||
      lower.includes('nao') ||
      lower.includes('sem') ||
      lower.includes('n/a') ||
      lower.includes('ausente') ||
      lower.includes('desconhecido') ||
      lower.includes('não informado') ||
      lower.includes('nao informado') ||
      lower === '-'
    ) {
      return 'Sim';
    }
    return 'Não';
  };

  const buildFullFichaText = (d: ExtractedData): string => {
    const reuPreso = getReuPresoStatus(d.estaPreso);
    const cpfNaoInformado = getCpfNaoInformadoStatus(d.cpf);

    return [
      `Nome: ${d.nomeParte || '-'}`,
      `CPF: ${d.cpf || 'Não informado'}`,
      `Reu Preso: ${reuPreso}`,
      `CPF não Informado: ${cpfNaoInformado}`,
      `CEP: ${d.cep || '-'}`,
      `Endereço: ${d.endereco || '-'}${d.numero ? `, ${d.numero}` : ''}`,
      d.complemento ? `Complemento: ${d.complemento}` : null,
      `Processo: ${d.numeroProcesso || '-'}`
    ].filter(Boolean).join('\n');
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text || '').then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const exportBatchToCSV = () => {
    const successItems = batchItems.filter(item => item.status === 'success' && item.data);
    if (successItems.length === 0) return;

    const headers = [
      "Nome do Sentenciado", 
      "CPF", 
      "CPF não Informado",
      "Reu Preso",
      "CEP", 
      "Endereço", 
      "Número", 
      "Complemento", 
      "Número do Processo"
    ];

    const rows = successItems.map(item => {
      const d = item.data!;
      return [
        d.nomeParte || "",
        d.cpf || "",
        getCpfNaoInformadoStatus(d.cpf),
        getReuPresoStatus(d.estaPreso),
        d.cep || "",
        d.endereco || "",
        d.numero || "",
        d.complemento || "",
        d.numeroProcesso || ""
      ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`);
    });

    // BOM character to enforce UTF-8 in Excel
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Extração_Multa_Penal_Lote_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const DataField = ({ label, value, id, icon: Icon }: { label: string, value: string, id: string, icon?: any }) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between group hover:border-purple-300 transition-all">
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon size={12} className="text-purple-500" />}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-sm font-bold text-slate-800 truncate select-all">{value || '-'}</p>
        </div>
        <button 
            onClick={() => copyToClipboard(value, id)}
            className={`p-2 rounded-lg transition-all ml-2 ${copiedField === id ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-300'}`}
            title={`Copiar ${label}`}
        >
            {copiedField === id ? <CheckCircle size={16} /> : <Copy size={16} />}
        </button>
    </div>
  );

  // Compute batch statistics
  const totalBatch = batchItems.length;
  const processedBatch = batchItems.filter(i => i.status === 'success').length;
  const failedBatch = batchItems.filter(i => i.status === 'failed').length;
  const pendingBatch = batchItems.filter(i => i.status === 'pending').length;
  const processingBatch = batchItems.filter(i => i.status === 'processing').length;

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      {/* SIDEBAR */}
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-8 flex flex-col gap-6 shadow-xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg text-white shadow-lg shadow-purple-600/20"><Gavel size={20} /></div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-slate-100">Multa Penal</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Extração Multi-Documento</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => setMode('individual')}
            className={`py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${mode === 'individual' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Individual
          </button>
          <button 
            onClick={() => setMode('lote')}
            className={`py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${mode === 'lote' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Em Lote
          </button>
        </div>

        {/* MODE: INDIVIDUAL */}
        {mode === 'individual' && (
          <div className="space-y-6">
            <label 
                onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files) setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])}}
                className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-slate-800 hover:bg-slate-800'}`}
            >
                <Upload size={24} className="text-purple-500 animate-bounce" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arraste a Certidão</span>
                <span className="text-[9px] text-slate-600 uppercase">PDF ou Imagem</span>
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
            </label>

            {files.length > 0 && (
                <div className="space-y-2 animate-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Arquivo Carregado ({files.length})</span>
                      <button onClick={() => setFiles([])} className="text-[9px] font-bold text-red-500 hover:underline">LIMPAR</button>
                    </div>
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px]">
                            <span className="text-slate-300 truncate w-40 font-mono" title={f.name}>{f.name}</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => downloadFile(f)} 
                                title="Baixar Arquivo PDF" 
                                className="text-slate-400 hover:text-purple-400 p-1 rounded hover:bg-slate-900 transition-colors"
                              >
                                <Download size={14}/>
                              </button>
                              <button 
                                onClick={() => removeFile(i)} 
                                title="Remover" 
                                className="text-slate-500 hover:text-red-500 p-1 rounded hover:bg-slate-900 transition-colors"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={handleExtract} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mt-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all">
                        {loading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Iniciar Extração
                    </button>
                </div>
            )}
          </div>
        )}

        {/* MODE: LOTE */}
        {mode === 'lote' && (
          <div className="space-y-6 flex flex-col flex-1 overflow-hidden">
            <label 
                onDragOver={(e) => {e.preventDefault(); setIsDraggingBatch(true)}}
                onDragLeave={() => setIsDraggingBatch(false)}
                onDrop={(e) => {
                  e.preventDefault(); 
                  setIsDraggingBatch(false); 
                  if(e.dataTransfer.files) {
                    addBatchFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDraggingBatch ? 'border-purple-500 bg-purple-900/20' : 'border-slate-800 hover:bg-slate-800'}`}
            >
                <Upload size={24} className="text-purple-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arraste múltiplos arquivos</span>
                <span className="text-[9px] text-slate-600 uppercase">Fila de processamento</span>
                <input type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={handleBatchFileUpload} />
            </label>

            {batchItems.length > 0 && (
              <div className="flex flex-col flex-1 overflow-hidden min-h-0 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Fila de Documentos ({batchItems.length})</span>
                  <button 
                    onClick={() => {
                      if (!batchProcessing) setBatchItems([]);
                    }} 
                    disabled={batchProcessing}
                    className="text-[9px] font-bold text-red-500 hover:underline disabled:opacity-50"
                  >
                    LIMPAR FILA
                  </button>
                </div>
                
                {/* Scrollable item list in sidebar */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                  {batchItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 bg-slate-950 border rounded-xl text-[10px] transition-all ${
                        item.status === 'processing' ? 'border-purple-500/50 bg-purple-950/20' :
                        item.status === 'success' ? 'border-emerald-950 bg-emerald-950/10' :
                        item.status === 'failed' ? 'border-rose-950 bg-rose-950/10' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {item.status === 'processing' ? (
                          <Loader2 size={12} className="text-purple-500 animate-spin flex-shrink-0" />
                        ) : item.status === 'success' ? (
                          <Check size={12} className="text-emerald-500 flex-shrink-0" />
                        ) : item.status === 'failed' ? (
                          <X size={12} className="text-rose-500 flex-shrink-0" />
                        ) : (
                          <Paperclip size={12} className="text-slate-500 flex-shrink-0" />
                        )}
                        <span className="text-slate-300 truncate font-mono flex-1">{item.fileName}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <button 
                          onClick={() => downloadFile(item.file)}
                          title="Baixar PDF Original"
                          className="text-slate-500 hover:text-purple-400 p-1 rounded hover:bg-slate-900 transition-colors"
                        >
                          <Download size={12}/>
                        </button>
                        {!batchProcessing && (
                          <button 
                            onClick={() => removeBatchItem(item.id)} 
                            title="Remover"
                            className="text-slate-600 hover:text-red-500 p-1 rounded hover:bg-slate-900 transition-colors"
                          >
                            <X size={12}/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <button 
                    onClick={handleProcessBatch} 
                    disabled={batchProcessing || batchItems.every(i => i.status === 'success')} 
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-40 transition-all"
                  >
                    {batchProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={14}/>
                        Processando ({processedBatch + failedBatch}/{totalBatch})
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14}/>
                        {batchItems.some(i => i.status === 'failed') ? "Re-tentar Falhas" : "Processar Multas em Lote"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 bg-slate-950 p-12 overflow-y-auto flex flex-col items-center justify-start custom-scrollbar relative">
        
        {/* VIEW 1: INDIVIDUAL EXTRACTION VIEW */}
        {mode === 'individual' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            {!data && !loading && (
              <div className="text-center space-y-4 max-w-sm animate-in fade-in zoom-in duration-700">
                 <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-slate-800">
                    <Gavel size={40} className="text-purple-500" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Extração de Multa</h3>
                 <p className="text-slate-500 text-sm">Carregue uma certidão de multa penal para extrair os dados estruturados do devedor.</p>
              </div>
            )}
            
            {loading && (
              <div className="text-center space-y-4">
                <Loader2 className="animate-spin text-purple-500 mx-auto" size={48} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Analisando documento com IA...</p>
              </div>
            )}
            
            {data && (
               <div className="w-full max-w-3xl bg-white p-10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom border-t-8 border-purple-600">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b pb-6 border-slate-100">
                      <div>
                          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Dados Extraídos</h2>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Certidão de Multa Penal</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          {files[0] && (
                            <button
                              onClick={() => downloadFile(files[0])}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-slate-200"
                              title="Baixar Arquivo PDF Original"
                            >
                              <Download size={14} className="text-purple-600" />
                              Baixar PDF
                            </button>
                          )}
                          <button
                            onClick={() => copyToClipboard(buildFullFichaText(data), 'ind-all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                              copiedField === 'ind-all'
                                ? 'bg-green-600 text-white'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                            }`}
                            title="Copiar Todas as Informações"
                          >
                            {copiedField === 'ind-all' ? <CheckCircle size={14} /> : <Copy size={14} />}
                            {copiedField === 'ind-all' ? 'Copiado!' : 'Copiar Ficha'}
                          </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                          <DataField id="nome" label="Nome do Sentenciado" value={data.nomeParte} icon={User} />
                      </div>
                      <div>
                          <DataField id="cpf" label="CPF" value={data.cpf} icon={Fingerprint} />
                      </div>
                      <div>
                          <DataField id="cpf-nao-informado" label="CPF não Informado" value={getCpfNaoInformadoStatus(data.cpf)} icon={Fingerprint} />
                      </div>
                      <div>
                          <DataField id="reu-preso" label="Reu Preso" value={getReuPresoStatus(data.estaPreso)} icon={Gavel} />
                      </div>
                      <div>
                          <DataField id="cep" label="CEP" value={data.cep} icon={MapPin} />
                      </div>
                      <div className="md:col-span-2">
                          <DataField id="endereco" label="Endereço" value={data.endereco} icon={MapPin} />
                      </div>
                      <div>
                          <DataField id="numero" label="Número" value={data.numero} icon={MapPin} />
                      </div>
                      <div>
                          <DataField id="complemento" label="Complemento" value={data.complemento} icon={MapPin} />
                      </div>
                      <div className="md:col-span-2">
                          <DataField id="proc" label="Número do Processo" value={data.numeroProcesso} icon={FileText} />
                      </div>
                  </div>

                  <div className="mt-10 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button onClick={() => setData(null)} className="text-xs font-bold text-slate-400 hover:text-purple-600 uppercase tracking-widest transition-colors">
                          Nova Extração
                      </button>
                      {files[0] && (
                        <span className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                          {files[0].name}
                        </span>
                      )}
                  </div>
               </div>
            )}
          </div>
        )}

        {/* VIEW 2: BATCH (EM LOTE) VIEW */}
        {mode === 'lote' && (
          <div className="w-full flex-1 flex flex-col">
            {batchItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center space-y-4 max-w-sm animate-in fade-in zoom-in duration-700">
                   <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-slate-800">
                      <FileSpreadsheet size={40} className="text-purple-500" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Extração Em Lote</h3>
                   <p className="text-slate-500 text-sm">Arraste múltiplos arquivos de multa penal na coluna da esquerda para realizar a extração massiva automática.</p>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-6 animate-in fade-in duration-500">
                {/* Stats Header Bar */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Painel de Lote</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Status da Fila de Multa Penal</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={exportBatchToCSV}
                      disabled={processedBatch === 0}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/10 transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <FileSpreadsheet size={16} />
                      Exportar Excel (CSV)
                    </button>
                    <button 
                      onClick={() => {
                        if (!batchProcessing) setBatchItems([]);
                      }}
                      disabled={batchProcessing}
                      className="px-5 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-40"
                    >
                      Limpar Lote
                    </button>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total de Arquivos</span>
                    <h4 className="text-3xl font-black text-slate-100 mt-1">{totalBatch}</h4>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Sucesso</span>
                    <h4 className="text-3xl font-black text-emerald-400 mt-1">{processedBatch}</h4>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Falhas</span>
                    <h4 className="text-3xl font-black text-rose-400 mt-1">{failedBatch}</h4>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Aguardando / Fila</span>
                    <h4 className="text-3xl font-black text-amber-400 mt-1">{pendingBatch + processingBatch}</h4>
                  </div>
                </div>

                {/* Large Batch Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Documento</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Sentenciado</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">CPF</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">CPF não Informado</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Reu Preso</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Cidade / UF / CEP</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Processo</th>
                        <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {batchItems.map((item) => {
                        const d = item.data;
                        const cpfNaoInf = d ? getCpfNaoInformadoStatus(d.cpf) : '-';
                        const reuPreso = d ? getReuPresoStatus(d.estaPreso) : '-';

                        return (
                          <tr 
                            key={item.id} 
                            className={`group transition-all ${
                              item.status === 'processing' ? 'bg-purple-900/5' :
                              item.status === 'success' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-850'
                            }`}
                          >
                            {/* File name / icon */}
                            <td className="p-4 max-w-[170px] truncate">
                              <div className="flex items-center gap-2.5">
                                <FileText size={16} className={item.status === 'success' ? 'text-purple-400' : 'text-slate-500'} />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-200 font-semibold truncate font-mono">{item.fileName}</p>
                                  <p className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">
                                    {(item.file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Sentenciado Name */}
                            <td className="p-4">
                              {d ? (
                                <p className="text-xs text-slate-100 font-bold uppercase tracking-tight truncate max-w-[140px]">{d.nomeParte}</p>
                              ) : item.status === 'processing' ? (
                                <span className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold uppercase tracking-wider"><Loader2 size={10} className="animate-spin" /> Analisando...</span>
                              ) : item.status === 'failed' ? (
                                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10}/> Falhou</span>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Aguardando...</span>
                              )}
                            </td>

                            {/* CPF */}
                            <td className="p-4 font-mono text-xs text-slate-300">
                              {d ? d.cpf || '-' : '-'}
                            </td>

                            {/* CPF não Informado? */}
                            <td className="p-4">
                              {d ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                  cpfNaoInf === 'Sim'
                                    ? 'bg-amber-950/40 text-amber-400 border-amber-900/50'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                  {cpfNaoInf}
                                </span>
                              ) : '-'}
                            </td>

                            {/* Reu Preso? */}
                            <td className="p-4">
                              {d ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                  reuPreso === 'Sim'
                                    ? 'bg-red-950/40 text-red-400 border-red-900/50'
                                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                                }`}>
                                  {reuPreso}
                                </span>
                              ) : '-'}
                            </td>

                            {/* Localization (CEP / Address / Details) */}
                            <td className="p-4 text-xs text-slate-400 max-w-[180px] truncate">
                              {d ? (
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-300">{d.endereco || '-'}, {d.numero || '-'}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">CEP: {d.cep || '-'}</p>
                                </div>
                              ) : '-'}
                            </td>

                            {/* Process Number */}
                            <td className="p-4 font-mono text-xs text-slate-300">
                              {d ? d.numeroProcesso || '-' : '-'}
                            </td>

                            {/* Actions column */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Action 1: Download uploaded PDF */}
                                <button 
                                  onClick={() => downloadFile(item.file)}
                                  className="p-2 bg-slate-800 text-slate-300 hover:text-purple-300 rounded-lg hover:bg-slate-700 transition-all"
                                  title="Baixar PDF Original do Upload"
                                >
                                  <Download size={14} />
                                </button>

                                {d && (
                                  <>
                                    {/* Action 2: View extracted details */}
                                    <button 
                                      onClick={() => setSelectedBatchItem(item)}
                                      className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-all"
                                      title="Ver Detalhes do Sentenciado"
                                    >
                                      <Eye size={14} />
                                    </button>

                                    {/* Action 3: Copy full formatted sheet with Reu Preso and CPF não Informado */}
                                    <button 
                                      onClick={() => {
                                        const formatted = buildFullFichaText(d);
                                        copyToClipboard(formatted, item.id);
                                      }}
                                      className={`p-2 rounded-lg transition-all ${copiedField === item.id ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                      title="Copiar Ficha Completa (inclui Réu Preso e CPF não Informado)"
                                    >
                                      {copiedField === item.id ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: BATCH ITEM DETAILED VIEW (FICHA COMPLETA) */}
      {selectedBatchItem && selectedBatchItem.data && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gavel className="text-purple-500" size={18} />
                <h3 className="font-bold text-slate-100 uppercase tracking-tight text-sm">Visualizar Detalhes Extraídos</h3>
              </div>
              <button 
                onClick={() => setSelectedBatchItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document details body */}
            <div className="p-8">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100 mb-6">
                <div>
                  <h4 className="font-mono text-xs text-slate-400 truncate max-w-[320px]" title={selectedBatchItem.fileName}>
                    Arquivo: {selectedBatchItem.fileName}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Dados Consolidados da Multa</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getReuPresoStatus(selectedBatchItem.data.estaPreso) === 'Sim' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                  {getReuPresoStatus(selectedBatchItem.data.estaPreso) === 'Sim' ? 'Sentenciado Preso' : 'Sentenciado Solto'}
                </span>
              </div>

              {/* Exact Fields in Specific Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <DataField id="modal-nome" label="Nome do Sentenciado" value={selectedBatchItem.data.nomeParte} icon={User} />
                </div>
                <div>
                  <DataField id="modal-cpf" label="CPF" value={selectedBatchItem.data.cpf} icon={Fingerprint} />
                </div>
                <div>
                  <DataField id="modal-cpf-nao-informado" label="CPF não Informado" value={getCpfNaoInformadoStatus(selectedBatchItem.data.cpf)} icon={Fingerprint} />
                </div>
                <div>
                  <DataField id="modal-reu-preso" label="Reu Preso" value={getReuPresoStatus(selectedBatchItem.data.estaPreso)} icon={Gavel} />
                </div>
                <div>
                  <DataField id="modal-cep" label="CEP" value={selectedBatchItem.data.cep} icon={MapPin} />
                </div>
                <div className="md:col-span-2">
                  <DataField id="modal-endereco" label="Endereço" value={selectedBatchItem.data.endereco} icon={MapPin} />
                </div>
                <div>
                  <DataField id="modal-numero" label="Número" value={selectedBatchItem.data.numero} icon={MapPin} />
                </div>
                <div>
                  <DataField id="modal-complemento" label="Complemento" value={selectedBatchItem.data.complemento} icon={MapPin} />
                </div>
                <div className="md:col-span-2">
                  <DataField id="modal-proc" label="Número do Processo" value={selectedBatchItem.data.numeroProcesso} icon={FileText} />
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadFile(selectedBatchItem.file)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all"
                  title="Baixar Arquivo PDF Original"
                >
                  <Download size={14} className="text-purple-600" />
                  Baixar PDF Original
                </button>

                <button 
                  onClick={() => {
                    const d = selectedBatchItem.data!;
                    const formatted = buildFullFichaText(d);
                    copyToClipboard(formatted, 'modal-all');
                  }}
                  className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all border ${
                    copiedField === 'modal-all' 
                      ? 'bg-green-100 border-green-200 text-green-700' 
                      : 'bg-purple-600 hover:bg-purple-500 border-transparent text-white shadow-md shadow-purple-600/20'
                  }`}
                >
                  {copiedField === 'modal-all' ? (
                    <>
                      <CheckCircle size={14} />
                      Ficha Copiada!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar Ficha Completa
                    </>
                  )}
                </button>
              </div>

              <button 
                onClick={() => setSelectedBatchItem(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
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

export default MultaPenalTool;
