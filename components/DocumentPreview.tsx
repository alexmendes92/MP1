
import React, { useMemo, useState } from 'react';
import { CaseData, Person } from '../types';
import { Copy, CheckCircle, FilePlus2, FileText, ArrowRight } from 'lucide-react';
import { formatRG, formatCPF, extractDateOnly, formatStandardNiOutput } from '../utils/niRulesHelper';

interface DocumentPreviewProps {
  caseData: CaseData;
  people: Person[];
  onReset?: () => void;
  onNavigateToJuntada?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ caseData, people, onReset, onNavigateToJuntada }) => {
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [isPreviewBlank, setIsPreviewBlank] = useState(false);
  const [hasReset, setHasReset] = useState(false);

  const handleResetClick = () => {
    if (onReset) {
      onReset();
      setHasReset(true);
      setTimeout(() => setHasReset(false), 2200);
    }
  };

  // Extrai o número do cargo para o sufixo (C.XX)
  const cargoCode = useMemo(() => {
    if (!caseData.cargo || isPreviewBlank) return "";
    const match = caseData.cargo.match(/\d+/);
    return match ? `(C.${match[0]})` : "";
  }, [caseData.cargo, isPreviewBlank]);

  // Formata o cargo para exibição limpa (ex: "71º PJ.")
  const cargoFormatted = useMemo(() => {
    if (!caseData.cargo || isPreviewBlank) return "";
    const match = caseData.cargo.match(/\d+/);
    if (match) {
      return `${match[0]}º PJ.`;
    }
    return caseData.cargo;
  }, [caseData.cargo, isPreviewBlank]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateString;
  };

  const subjectLine = useMemo(() => {
    const proc = isPreviewBlank ? '0000000-00.0000.8.26.0000' : (caseData.numeroProcesso || '0000000-00.0000.8.26.0000');
    return `Pesquisa - Autos - ${proc} ${cargoCode}`.trim();
  }, [caseData.numeroProcesso, cargoCode, isPreviewBlank]);

  const generatedContent = useMemo(() => {
    const renderPersonTemplate = (p: Partial<Person>) => `
      <ul style="list-style-type: disc; margin-left: 28px; margin-top: 0; margin-bottom: 24px; padding-left: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #111827;">
        <li style="margin-bottom: 5px;"><b>Nome:</b> ${p.nome || '________________'} - (Fls. ${p.folha || '____'})</li>
        <li style="margin-bottom: 5px;"><b>Nacionalidade:</b> ${p.nacionalidade || 'Brasileiro'}</li>
        <li style="margin-bottom: 5px;"><b>CPF:</b> ${p.cpf ? formatCPF(p.cpf) : '________________'}</li>
        <li style="margin-bottom: 5px;"><b>RG:</b> ${p.rg ? formatRG(p.rg) : '________________'}</li>
        <li style="margin-bottom: 5px;"><b>Pai:</b> ${p.pai || '________________'}</li>
        <li style="margin-bottom: 5px;"><b>Mãe:</b> ${p.mae || '________________'}</li>
        <li style="margin-bottom: 5px;"><b>Data de Nascimento:</b> ${p.dataNascimento ? formatDate(p.dataNascimento) : '____/____/____'}</li>
      </ul>
    `;

    const listItems = isPreviewBlank 
      ? renderPersonTemplate({}) 
      : people.length > 0 
        ? people.map(p => renderPersonTemplate(p)).join('')
        : '<p style="color: #64748b; font-style: italic; margin-left: 28px; margin-bottom: 24px;">Adicione uma ou mais partes no painel lateral...</p>';

    const processNumber = isPreviewBlank ? '________________' : (caseData.numeroProcesso || '________________');
    const promotorName = isPreviewBlank 
      ? '________________' 
      : (caseData.promotor || (caseData.cargo?.includes('79') ? 'Margareth Ferraz França' : caseData.cargo?.includes('71') ? "Leonardo D'Angelo Vargas Pereira" : '________________'));
    const cargoDisplay = isPreviewBlank 
      ? '________________' 
      : (cargoFormatted || (caseData.cargo?.includes('79') ? '79º PJ.' : caseData.cargo?.includes('71') ? '71º PJ.' : caseData.cargo) || '________________');
    const dataAudiencia = isPreviewBlank ? 'Não designada' : extractDateOnly(caseData.dataAudiencia);
    const prioridadeText = caseData.urgente ? 'Urgente' : 'Normal';

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111827; line-height: 1.6; font-size: 14px; max-width: 720px; margin: 0 auto;">
        
        <!-- METADADOS DO PROCESSO, AUDIÊNCIA E PROMOTOR -->
        <div style="margin-bottom: 24px; font-size: 14px; line-height: 1.8; color: #111827;">
          <div><b>Autos:</b> ${processNumber}</div>
          <div><b>Data Audiência:</b> ${dataAudiencia} | <b>Prioridade:</b> ${prioridadeText}</div>
          <div><b>Promotor:</b> ${promotorName} | <b>Cargo:</b> ${cargoDisplay}</div>
        </div>

        <!-- LISTA DE PARTES PESQUISADAS -->
        <div style="margin-bottom: 28px;">
          ${listItems}
        </div>

      </div>
    `;
  }, [caseData, people, cargoFormatted, isPreviewBlank]);

  const plainTextContent = useMemo(() => {
    return formatStandardNiOutput(
      {
        numeroProcesso: isPreviewBlank ? '________________' : caseData.numeroProcesso,
        cargo: isPreviewBlank ? '________________' : (cargoFormatted || caseData.cargo),
        promotor: isPreviewBlank ? '________________' : caseData.promotor,
        dataAudiencia: isPreviewBlank ? 'Não designada' : caseData.dataAudiencia,
        urgente: caseData.urgente
      },
      isPreviewBlank 
        ? [{ nome: '', folha: '', cpf: '', rg: '', dataNascimento: '', nacionalidade: 'Brasileiro', pai: '', mae: '' }] 
        : people
    );
  }, [caseData, people, cargoFormatted, isPreviewBlank]);

  const handleCopy = () => {
    const htmlBlob = new Blob([generatedContent], { type: 'text/html' });
    const textBlob = new Blob([plainTextContent], { type: 'text/plain' });
    
    navigator.clipboard.write([
        new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
        })
    ]).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Falha ao copiar:', err);
      // Fallback
      navigator.clipboard.writeText(plainTextContent).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    });
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subjectLine).then(() => {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
      {/* Barra de Título Superior */}
      <div className="bg-slate-900 py-3.5 px-6 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="font-bold text-white uppercase text-xs tracking-wider">Visualização do E-mail / Pesquisa NI</h3>
          </div>
          
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button 
              onClick={() => setIsPreviewBlank(false)}
              className={`px-3 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${!isPreviewBlank ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Preenchido
            </button>
            <button 
              onClick={() => setIsPreviewBlank(true)}
              className={`px-3 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${isPreviewBlank ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Em Branco
            </button>
          </div>
        </div>
        
        {/* Assunto rápido */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySubject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95"
            title="Copiar linha de assunto para o Outlook"
          >
            {copiedSubject ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
            <span>{copiedSubject ? 'Assunto Copiado!' : 'Copiar Assunto'}</span>
          </button>
        </div>
      </div>

      {/* Simulação de Cabeçalho do Outlook / E-mail */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 text-xs space-y-1.5 text-slate-600">
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <span className="text-slate-400 w-16 uppercase font-bold text-[10px] tracking-wider">Assunto:</span>
          <span className="bg-white px-2.5 py-1 rounded border border-slate-200 font-mono text-xs flex-1 truncate text-slate-800">
            {subjectLine}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 w-16 uppercase font-bold text-[10px] tracking-wider">De:</span>
          <span className="text-slate-700">Alex Santana Mendes &lt;alexmendes@mpsp.mp.br&gt;</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 w-16 uppercase font-bold text-[10px] tracking-wider">Para:</span>
          <span className="text-slate-700">Núcleo de Investigação &lt;nucleo.inv@mpsp.mp.br&gt;</span>
        </div>
      </div>

      {/* Área de Conteúdo do Documento */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-100/70 flex flex-col items-center custom-scrollbar">
        <div className="w-full max-w-[760px] bg-white shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-slate-200/80 rounded-xl p-8 md:p-12 min-h-[560px] transition-all text-slate-900">
          <div 
            className="prose prose-slate max-w-none font-sans"
            dangerouslySetInnerHTML={{ __html: generatedContent }}
          />
        </div>
      </div>

      {/* Ações Inferiores */}
      <div className="bg-white p-4 md:p-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-xs text-slate-500">
          Formato otimizado para colar no <b>Outlook</b>, <b>Word</b> ou <b>Webmail</b> com formatação intacta.
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onReset && (
            <button 
              type="button"
              onClick={handleResetClick}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-sm ${
                hasReset
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'border-slate-300 hover:border-red-400 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700'
              }`}
              title="Iniciar novo processo e limpar campos"
            >
              {hasReset ? (
                <>
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span>Campos Limpos!</span>
                </>
              ) : (
                <>
                  <FilePlus2 size={16} className="text-red-600" />
                  <span>Novo Processo</span>
                </>
              )}
            </button>
          )}

          {onNavigateToJuntada && (
            <button
              type="button"
              onClick={onNavigateToJuntada}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-rose-200 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all transform active:scale-95 shadow-sm"
              title="Gerar Requerimento / Termo de Juntada desta pesquisa para o processo"
            >
              <FileText size={15} className="text-rose-600" />
              <span>Requerimento de Juntada</span>
              <ArrowRight size={13} className="text-rose-600" />
            </button>
          )}

          <button 
            onClick={handleCopy}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold text-sm transition-all transform active:scale-95 ${
              copied 
                ? 'bg-green-600 text-white ring-2 ring-green-600/30' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? 'Copiado para o Clipboard!' : 'Copiar E-mail Formatado'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
    