import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Upload, Send, FileText, Loader2, Sparkles, Copy, CheckCircle, Paperclip, X, Trash2, Edit3, MessageSquare, Printer, Building2, Download, FileCode } from 'lucide-react';
import { exportCertidaoToDocx, downloadDocxBlob } from '../utils/docxExport';
import { fileToBase64Safe } from '../utils/pdfHelper';
import { CaseData } from '../types';

interface ProvidenciasToolProps {
  caseData?: CaseData;
}

const ProvidenciasTool: React.FC<ProvidenciasToolProps> = ({ caseData }) => {
  // Document Header Fields (MPSP Official Model)
  const [numeroProcesso, setNumeroProcesso] = useState(() => caseData?.numeroProcesso || '1512075-07.2024.8.26.0050');
  const [varaGarantias, setVaraGarantias] = useState('16ª Vara Criminal do Foro Central da Barra Funda');
  const [promotoria, setPromotoria] = useState(() => caseData?.cargo || '4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL');

  useEffect(() => {
    if (caseData?.numeroProcesso) {
      setNumeroProcesso(caseData.numeroProcesso);
    }
    if (caseData?.cargo) {
      setPromotoria(caseData.cargo);
    }
  }, [caseData]);
  const [officialName, setOfficialName] = useState('Alex Santana Mendes');
  const [officialCargo, setOfficialCargo] = useState('Oficial de Promotoria I');

  // Input States
  const [order, setOrder] = useState('Localizar endereço atualizado da vítima Fernando Carlos de Melo Junior para viabilizar sua intimação para audiência');
  const [action, setAction] = useState('Contato mantido via WhatsApp com a vítima no número (11) 97157-7778');
  const [response, setResponse] = useState('Vítima informou que não mora mais no endereço antigo e passou seu endereço atual: Rua Luísa Miller, nº 55, Casa 02, Jardim Missionária, São Paulo/SP, CEP 04430-360.');
  const [files, setFiles] = useState<File[]>([]);
  
  // Processing States
  const [generatedCertidao, setGeneratedCertidao] = useState(`Certifico e dou fé que, em cumprimento às determinações ministeriais nos autos em epígrafe visando à localização e qualificação da vítima FERNANDO CARLOS DE MELO JUNIOR para os devidos fins processuais e intimação para a Audiência de Instrução e Julgamento designada para o dia 02/12/2026 às 13h00, mantive contato direto com a vítima por meio do aplicativo WhatsApp através do terminal telefônico (11) 97157-7778.

Certifico que a vítima prestou esclarecimentos quanto ao aparelho celular apreendido e informou expressamente que não reside mais no endereço anteriormente cadastrado, fornecendo como seu endereço residencial atualizado (onde reside há cerca de dois anos) a Rua Luísa Miller, nº 55, Casa 02, Jardim Missionária, São Paulo/SP, CEP 04430-360.

Assim, lavro a presente certidão para constar nos autos o endereço atualizado da vítima a fim de possibilitar a expedição do competente mandado de intimação.`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(0);

  // Refinement Chat States
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Drag State
  const [isDragging, setIsDragging] = useState(false);

  const buildCleanBodyText = (text: string) => {
    if (!text) return '';
    let cleaned = text
      // Remove HTML tags like <center>, <b>, </b>, </center>, <p>, </p>, <br>, etc.
      .replace(/<[^>]*>/g, '')
      // Remove markdown bold/italics like ** or __ or ##
      .replace(/\*\*|__/g, '')
      .replace(/^#+\s*/gm, '')
      .trim();

    // Remove titles like CERTIDÃO, CERTIDÃO DE OFICIAL DE PROMOTORIA, etc. at start
    cleaned = cleaned
      .replace(/^(CERTIDÃO DE OFICIAL DE PROMOTORIA|CERTIDÃO DE DILIGÊNCIAS|CERTIDÃO)\s*/gi, '')
      .replace(/^Autos:\s*[\d\.\-\/]+\s*/gi, '')
      .replace(/^1ª RAJ[^\n]*\n?/gi, '')
      .replace(/^4ª PROMOTORIA[^\n]*\n?/gi, '')
      .trim();

    // Remove trailing fecho, dates, and sign-offs
    cleaned = cleaned
      .replace(/Era o que me cumpria certificar\.?\s*$/gi, '')
      .replace(/Para constar, eu[\s\S]*$/gi, '')
      .replace(/Eu, Alex Santana Mendes[\s\S]*$/gi, '')
      .replace(/São Paulo,\s*\d+[\s\S]*$/gi, '')
      .replace(/Era o que me cumpria certificar\.?\s*$/gi, '')
      .trim();

    return cleaned;
  };

  const generateMpspCertidaoHtml = (bodyText: string) => {
    const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const cleanText = buildCleanBodyText(bodyText);

    return `
      <div class="a4-page" style="width: 210mm; min-height: 297mm; padding: 25mm 20mm 20mm 25mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; position: relative; font-family: 'Aptos', Arial, sans-serif; color: black; line-height: 1.5; text-align: left; margin: 0 auto;">
          <!-- HEADER MPSP -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-bottom: 2.5px double #c00000; padding-bottom: 12px; margin-bottom: 25px; font-family: 'Aptos', Arial, sans-serif;">
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
                ${promotoria.toUpperCase()}
              </td>
            </tr>
          </table>

          <!-- CONTEÚDO -->
          <div class="content" style="font-family: 'Aptos', Arial, sans-serif; flex: 1;">
              <h3 style="text-align: center; font-family: 'Aptos', Arial, sans-serif; font-weight: bold; font-size: 14.5px; margin: 15px 0 30px 0; letter-spacing: 0.5px; text-transform: uppercase; color: #000;">
                  CERTIDÃO DE OFICIAL DE PROMOTORIA
              </h3>
              
              <div style="font-family: 'Aptos', Arial, sans-serif; font-size: 13px; line-height: 1.5; font-weight: bold; text-align: left; margin-bottom: 35px; color: #000;">
                  Autos: ${numeroProcesso}<br/>
                  ${varaGarantias}
              </div>

              <p style="text-align: justify; text-indent: 2.0cm; font-family: 'Aptos', Arial, sans-serif; font-size: 14.5px; line-height: 2.0; margin-bottom: 35px; color: #000; word-break: break-word;">
                  ${cleanText}
              </p>

              <p style="text-align: justify; text-indent: 2.0cm; font-family: 'Aptos', Arial, sans-serif; font-size: 14.5px; line-height: 2.0; margin-bottom: 35px; color: #000; word-break: break-word;">
                  Para constar, eu ${officialName} (Assinatura Eletrônica), ${officialCargo}, de matrícula 12078, realizei a digitação e a emissão desta certidão.
              </p>

              <p style="text-align: right; font-family: 'Aptos', Arial, sans-serif; font-size: 13.5px; margin-top: 40px; color: #000;">
                  São Paulo, ${dataHoje}.
              </p>
          </div>

          <!-- RODAPÉ MPSP -->
          <div class="footer" style="margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 12px; text-align: center; font-size: 9.5px; color: #444444; line-height: 1.4; font-family: 'Aptos', Arial, sans-serif;">
            Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br/>
            Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
          </div>
      </div>
    `;
  };

  const handlePrintSingle = () => {
    const htmlContent = generateMpspCertidaoHtml(generatedCertidao);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Habilite pop-ups para visualizar a impressão.");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certidao_${numeroProcesso}</title>
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; font-family: 'Aptos', Arial, sans-serif; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintTwoPartes = () => {
    const singleHtml = generateMpspCertidaoHtml(generatedCertidao);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Habilite pop-ups para visualizar a impressão.");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certidao_2Vias_${numeroProcesso}</title>
        <style>
          @import url('https://db.onlinewebfonts.com/c/62f939b693af4db89c6bd62c7dfdc589?family=Aptos');
          @page { size: A4 portrait; margin: 5mm; }
          body { margin: 0; padding: 0; background: #fff; font-family: 'Aptos', Arial, sans-serif; transform: scale(0.92); transform-origin: top center; }
          .cut-divider { border-top: 1.5px dashed #a0a0a0; margin: 20px 0; text-align: center; position: relative; }
          .cut-divider span { background: #fff; padding: 0 12px; font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; position: relative; top: -8px; }
        </style>
      </head>
      <body>
        <div>${singleHtml}</div>
        <div class="cut-divider"><span>Linha de Corte - 2ª Via</span></div>
        <div>${singleHtml}</div>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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

  const generateCertidao = async (instruction?: string) => {
    const isNewGeneration = !instruction;
    if (isNewGeneration) {
        if (!action.trim() && files.length === 0) {
            alert("Descreva a providência tomada ou anexe um documento.");
            return;
        }
        setIsGenerating(true);
    } else {
        setIsRefining(true);
    }

    try {
      const filesPayload: Array<{ mimeType: string; data: string; name: string }> = [];
      for (const file of files) {
        const { data, mimeType } = await fileToBase64Safe(file);
        filesPayload.push({ data, mimeType, name: file.name });
      }

      // Context Setup
      let context = `
      Você é um Oficial de Promotoria Sênior do Ministério Público de São Paulo.
      Sua tarefa é redigir o TEXTO DESCRITIVO E CERTIFICATÓRIO de uma CERTIDÃO DE PROVIDÊNCIAS formal para os autos (SISDIGITAL).
      
      INSTRUÇÕES DE FORMATAÇÃO:
      - O documento será automaticamente montado no papel oficial do MPSP (com cabeçalho da 4ª Promotoria de Justiça Criminal da Capital, Autos nº ${numeroProcesso}, ${varaGarantias}, fecho e rodapé MPSP).
      - NÂO inclua tags HTML como <center> ou <b>.
      - NÃO inclua títulos como CERTIDÃO ou CERTIDÃO DE OFICIAL DE PROMOTORIA.
      - NÃO inclua fechos ou assinaturas como "Era o que me cumpria certificar", datas ou "Eu, Alex Santana Mendes...".
      - Escreva APENAS os parágrafos do corpo da certidão, iniciando com "Certifico e dou fé que..." e relatando o que foi ordenado, a ação realizada e o resultado obtido de forma clara, formal e juridicamente precisa.
      
      DADOS INFORMADOS:
      - Ordem do Promotor: ${order || "Não especificada (Cota padrão)"}
      - Providência/Ação Tomada: ${action}
      - Resposta/Resultado Obtido: ${response || "Não houve resposta específica ou vide anexo."}
      `;

      if (!isNewGeneration) {
          context += `
          
          DOCUMENTO ATUAL:
          ${generatedCertidao}
          
          NOVA INSTRUÇÃO DE AJUSTE (REFINAMENTO):
          "${instruction}"
          
          Reescreva a certidão aplicando a instrução acima. Mantenha o tom formal.
          `;
      }

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          prompt: context
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${res.status}`);
      }

      const resData = await res.json();
      setGeneratedCertidao(resData.text || "Erro ao gerar certidão.");
      setChatInput('');

    } catch (error) {
      console.error(error);
      alert("Erro ao processar com a IA.");
    } finally {
      setIsGenerating(false);
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    const cleanBody = buildCleanBodyText(generatedCertidao);
    const fullText = `MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO\n${promotoria.toUpperCase()}\n\nCERTIDÃO DE OFICIAL DE PROMOTORIA\n\nAutos: ${numeroProcesso}\n${varaGarantias}\n\n${cleanBody}\n\nPara constar, eu ${officialName} (Assinatura Eletrônica), ${officialCargo}, de matrícula 12078, realizei a digitação e a emissão desta certidão.\n\nSão Paulo, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      const cleanBody = buildCleanBodyText(generatedCertidao);
      const blob = await exportCertidaoToDocx({
        numeroProcesso,
        varaGarantias,
        promotoria,
        officialName,
        officialCargo,
        bodyText: cleanBody
      });
      const safeFilename = `Certidao_Providencias_${numeroProcesso.replace(/[^a-zA-Z0-9]/g, '_')}`;
      downloadDocxBlob(blob, safeFilename);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar arquivo DOCX.");
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleReset = () => {
      if(confirm("Deseja limpar tudo?")) {
          setOrder('');
          setAction('');
          setResponse('');
          setFiles([]);
          setGeneratedCertidao('');
      }
  }

  const PRESETS_PROVIDENCIAS = [
    {
      label: 'Localização de Vítima / Endereço (WhatsApp)',
      category: 'Localização',
      order: 'Localizar endereço atualizado da vítima Fernando Carlos de Melo Junior para viabilizar sua intimação para audiência',
      action: 'Contato mantido via WhatsApp com a vítima no número (11) 97157-7778',
      response: 'Vítima informou que não mora mais no endereço antigo e passou seu endereço atual: Rua Luísa Miller, nº 55, Casa 02, Jardim Missionária, São Paulo/SP, CEP 04430-360.',
      certidaoText: `Certifico e dou fé que, em cumprimento às determinações ministeriais nos autos em epígrafe visando à localização e qualificação da vítima FERNANDO CARLOS DE MELO JUNIOR para os devidos fins processuais e intimação para a Audiência de Instrução e Julgamento designada para o dia 02/12/2026 às 13h00, mantive contato direto com a vítima por meio do aplicativo WhatsApp através do terminal telefônico (11) 97157-7778.

Certifico que a vítima prestou esclarecimentos quanto ao aparelho celular apreendido e informou expressamente que não reside mais no endereço anteriormente cadastrado, fornecendo como seu endereço residencial atualizado (onde reside há cerca de dois anos) a Rua Luísa Miller, nº 55, Casa 02, Jardim Missionária, São Paulo/SP, CEP 04430-360.

Assim, lavro a presente certidão para constar nos autos o endereço atualizado da vítima a fim de possibilitar a expedição do competente mandado de intimação.`
    },
    {
      label: 'Localização de Réu / Novo Endereço Confirmado',
      category: 'Localização',
      order: 'Localizar réu/investigado para ciência dos autos e citação',
      action: 'Contato telefônico e mensagem via WhatsApp no terminal informado nos autos',
      response: 'Réu atendeu, confirmou seus dados e informou residir na [ENDEREÇO ATUALIZADO].',
      certidaoText: `Certifico e dou fé que, em cumprimento à determinação ministerial, realizei contato com a parte investigada/ré [NOME DO RÉU], através do telefone [TELEFONE], oportunidade em que a mesma confirmou seus dados e indicou seu atual endereço residencial situado na [ENDEREÇO ATUALIZADO], possibilitando a expedição de mandado de citação/intimação.`
    },
    {
      label: 'Distribuição de ANPP (Execuções Criminais)',
      category: 'ANPP',
      order: 'Certificar a distribuição dos autos de execução do ANPP pela Promotoria de Justiça das Execuções Criminais',
      action: 'Consulta e conferência do protocolo/distribuição dos autos de Execução do ANPP',
      response: 'Acordo protocolado e distribuído sob o número informado para cumprimento e fiscalização.',
      certidaoText: `Certifico e dou fé que, segundo informado pela Promotoria de Justiça das Execuções Criminais da Capital o Acordo de Não Persecução Penal (ANPP) celebrado nestes autos em face de WELINGTON LEOCARDIO DOS SANTOS foi devidamente protocolado e distribuído sob o número 1559472-28.2025.8.26.0050 para fins de fiscalização e cumprimento.`
    },
    {
      label: 'Notificação Positiva de ANPP (WhatsApp/E-mail)',
      category: 'ANPP',
      order: 'Notificar o investigado acerca da proposta de Acordo de Não Persecução Penal',
      action: 'Envio da minuta/termo de ANPP e orientações de agendamento por WhatsApp/E-mail',
      response: 'Investigado recebeu os arquivos, acusou recebimento e informou que procurará advogado/Defensoria.',
      certidaoText: `Certifico e dou fé que notifiquei a parte investigada [NOME], via aplicativo WhatsApp/e-mail, encaminhando cópia integral da proposta de ANPP oferecida pelo Ministério Público. Certifico que o interessado acusou formalmente o recebimento da notificação, manifestando que apresentará resposta com sua defesa técnica.`
    },
    {
      label: 'Recusa / Desinteresse em ANPP',
      category: 'ANPP',
      order: 'Apurar interesse do investigado na celebração de ANPP',
      action: 'Contato com o investigado e explicação dos termos do acordo ministerial',
      response: 'Investigado declarou que não possui interesse na proposta de acordo e prefere responder ao processo em juízo.',
      certidaoText: `Certifico e dou fé que realizei contato com o investigado [NOME], o qual, devidamente cientificado da proposta de Acordo de Não Persecução Penal ofertada pelo Ministério Público, declarou expressamente seu desinteresse na celebração do ajuste, requerendo o prosseguimento do feito.`
    },
    {
      label: 'Impossibilidade de Notificação (SAICA / Menor Evadido)',
      category: 'Diligência Negativa',
      order: 'Promover a intimação/notificação da vítima R.G.F.S.J. e/ou seu representante legal',
      action: 'Diligência de intimação do representante legal da vítima R.G.F.S.J. e apuração junto ao SAICA Samaritaninhos',
      response: 'Não foi possível promover a intimação do representante legal da vítima R.G.F.S.J., uma vez que a criança evadiu-se do SAICA Samaritaninhos em 05/12/2025, encontrando-se em local incerto e não sabido, inexistindo nos autos informações atuais acerca de responsável legal ou endereço para notificação. Ademais, a responsável pela entidade à época dos fatos não mais integra seus quadros funcionais, sem dados de contato informados. Assim, resta impossível o cumprimento da diligência.',
      certidaoText: `Certifico e dou fé que não foi possível promover a intimação do representante legal da vítima R.G.F.S.J., uma vez que a criança evadiu-se do SAICA Samaritaninhos em 05/12/2025, encontrando-se em local incerto e não sabido, inexistindo nos autos informações atuais acerca de responsável legal ou endereço para notificação. Ademais, a responsável pela entidade à época dos fatos não mais integra seus quadros funcionais, sem dados de contato informados. Assim, diante da ausência de elementos que permitam a localização dos envolvidos, restou impossibilitado o cumprimento da diligência.`
    },
    {
      label: 'Tentativas Telefônicas Frustradas',
      category: 'Diligência Negativa',
      order: 'Contato telefônico com a vítima / interessado',
      action: 'Tentativas de contato telefônico via número cadastrado nos autos',
      response: 'Chamadas não atendidas e direcionadas para caixa postal em múltiplos horários.',
      certidaoText: `Certifico e dou fé que realizei tentativas de contato telefônico com a parte interessada através do número constante nos autos, nas datas de praxe em horários alternados, contudo as chamadas não foram atendidas, sendo direcionadas à caixa postal. Assim, restou frustrada a intimação via telefone.`
    },
    {
      label: 'Decurso de Prazo sem Manifestação',
      category: 'Prazos',
      order: 'Certificar decurso de prazo da notificação expedida',
      action: 'Conferência do comprovante de entrega / AR e prazo concedido',
      response: 'Prazo decorrido sem manifestação ou contato do interessado.',
      certidaoText: `Certifico e dou fé que decorreu in albis o prazo assinalado na notificação de fls. retro, devidamente recebida pelo interessado, sem que houvesse apresentação de manifestação ou contato com esta Promotoria de Justiça.`
    },
    {
      label: 'Diligências Cumpridas / Autos Conclusos',
      category: 'Prazos',
      order: 'Cumprimento de todas as cotas e devolução dos autos ao Promotor de Justiça',
      action: 'Verificação de juntadas e resposta de ofícios nos autos digitais',
      response: 'Todas as diligências foram atendidas sem outras pendências.',
      certidaoText: `Certifico e dou fé que todas as providências e diligências determinadas na r. cota ministerial foram integralmente cumpridas, não restando pendências a sanar. Faço os autos com vista ao d. Promotor de Justiça para deliberação.`
    }
  ];

  const applyPresetProvidencia = (preset: typeof PRESETS_PROVIDENCIAS[0], idx: number) => {
    setSelectedPresetIndex(idx);
    setOrder(preset.order);
    setAction(preset.action);
    setResponse(preset.response);
    setGeneratedCertidao(preset.certidaoText);
  };

  const inputClass = "w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all placeholder-slate-600 text-slate-100";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* Sidebar - Inputs */}
      <div className="w-full md:w-[420px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-5 shadow-2xl z-10 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-600 rounded-lg text-white">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h2 className="font-bold uppercase tracking-tight text-white">Providências</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Certidões SISDIGITAL</p>
          </div>
        </div>

        <div className="space-y-4 flex-1">
            
            {/* Quick Fill Presets */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} /> Modelos & Variações Prontas ({PRESETS_PROVIDENCIAS.length})
                    </label>
                    <span className="text-[9px] bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/50">Clique para preencher</span>
                </div>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                    {PRESETS_PROVIDENCIAS.map((p, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => applyPresetProvidencia(p, idx)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                                selectedPresetIndex === idx
                                    ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-200 shadow-md shadow-cyan-950'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className="font-bold flex items-center justify-between">
                                <span className="truncate">{p.label}</span>
                                {selectedPresetIndex === idx && <CheckCircle size={12} className="text-cyan-400 shrink-0 ml-1" />}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                                <p className="text-[10px] text-slate-400 truncate flex-1">{p.response}</p>
                                <span className="text-[8px] uppercase tracking-wider font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                                    {p.category}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className={labelClass}>
                    1. Ordem do Promotor (Opcional)
                </label>
                <textarea
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    placeholder="Ex: Tentar contato com a vítima; Verificar antecedentes..."
                    className={`${inputClass} h-20 resize-none`}
                />
            </div>

            <div className="space-y-2">
                <label className={labelClass}>
                    2. Ação Realizada (Obrigatório)
                </label>
                <textarea
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="Ex: Enviei e-mail para x; Consultei o sistema CAEX; Liguei no número y..."
                    className={`${inputClass} h-24 resize-none`}
                />
            </div>

            <div className="space-y-2">
                <label className={labelClass}>
                    3. Resposta / Resultado
                </label>
                <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Ex: A vítima atendeu e disse que virá; O e-mail retornou..."
                    className={`${inputClass} h-20 resize-none`}
                />
            </div>

            {/* File Upload */}
            <div>
                <label className={labelClass}>
                    4. Anexos (Prints/PDFs)
                </label>
                <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDragging ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-cyan-500/50'}`}
                >
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        <Upload size={20} className={`mb-1 transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-500'}`} />
                        <p className={`text-[10px] font-bold ${isDragging ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`}>
                            {isDragging ? 'Solte para anexar' : 'Clique ou Arraste'}
                        </p>
                    </div>
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>

                {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Paperclip size={14} className="text-cyan-500" />
                                    <span className="text-xs font-bold text-slate-300 truncate">{f.name}</span>
                                </div>
                                <button onClick={() => removeFile(i)} className="p-1 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-2">
                {generatedCertidao && (
                    <button onClick={handleReset} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all" title="Limpar"><Trash2 size={18}/></button>
                )}
                <button 
                    onClick={() => generateCertidao()}
                    disabled={isGenerating}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating ? 'Escrevendo...' : 'Gerar Certidão'}
                </button>
            </div>
        </div>
      </div>

      {/* Main Content - Preview & Chat */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center bg-slate-950 relative">
        
        {!generatedCertidao && !isGenerating && (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60">
                <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl border border-slate-800">
                    <FileText size={40} className="text-cyan-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-300">Aguardando Dados</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Preencha o formulário ao lado com as providências tomadas para gerar a certidão.</p>
                </div>
             </div>
        )}

        {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 size={40} className="text-cyan-500 animate-spin" />
                <p className="text-sm font-bold text-cyan-500 animate-pulse">Redigindo documento...</p>
            </div>
        )}

        {generatedCertidao && (
            <div className="w-full max-w-3xl flex flex-col gap-6 animate-in slide-in-from-bottom duration-500 h-full">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-2xl sticky top-0 z-20 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Documento Gerado</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <button 
                            onClick={handleCopy}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                            {copied ? <CheckCircle size={14}/> : <Copy size={14}/>} {copied ? 'Copiado!' : 'Copiar Texto'}
                        </button>
                        <button 
                            onClick={handleDownloadDocx}
                            disabled={isExportingDocx}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-blue-900/30"
                            title="Baixar arquivo Word (.docx) formatado para edição"
                        >
                            {isExportingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileCode size={14}/>}
                            {isExportingDocx ? 'Gerando...' : 'Baixar DOCX'}
                        </button>
                        <button 
                            onClick={handlePrintSingle}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
                            title="Gerar PDF A4 vetorial pronto para juntar aos autos"
                        >
                            <Download size={14}/> Baixar / Imprimir PDF
                        </button>
                        <button 
                            onClick={handlePrintTwoPartes}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
                        >
                            <Printer size={14}/> 2 Vias (A4)
                        </button>
                    </div>
                </div>

                {/* Paper Preview - Official MPSP Sheet Layout */}
                <div className="bg-white text-black p-12 md:p-16 shadow-2xl rounded-sm min-h-[700px] flex flex-col justify-between border border-slate-300 font-sans">
                    
                    {/* Header Table */}
                    <div>
                        <div className="flex justify-between items-center border-b-2 border-double border-red-700 pb-3 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl font-black tracking-tighter">
                                    <span className="text-black">MP</span><span className="text-red-700">SP</span>
                                </div>
                                <div className="border-l border-slate-400 pl-3 text-left leading-tight">
                                    <span className="block text-[10px] font-bold text-slate-900 tracking-wider">MINISTÉRIO PÚBLICO</span>
                                    <span className="block text-[8px] font-medium text-slate-600 tracking-wider">DO ESTADO DE SÃO PAULO</span>
                                </div>
                            </div>
                            <div className="text-right border-l-2 border-red-700 pl-4 py-1 text-xs font-bold text-slate-900 uppercase leading-snug">
                                {promotoria}
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-center font-bold text-sm uppercase tracking-widest my-6 text-slate-900">
                            CERTIDÃO DE OFICIAL DE PROMOTORIA
                        </h3>

                        {/* Process Info */}
                        <div className="text-xs font-bold text-slate-900 mb-8 space-y-0.5">
                            <div>Autos: {numeroProcesso}</div>
                            <div>{varaGarantias}</div>
                        </div>

                        {/* Body Paragraph */}
                        <p className="text-justify font-sans text-sm text-slate-900 leading-relaxed indent-8 mb-8 whitespace-pre-wrap">
                            {buildCleanBodyText(generatedCertidao)}
                        </p>

                        {/* Official Signature Fecho */}
                        <p className="text-justify font-sans text-sm text-slate-900 leading-relaxed indent-8 mb-8">
                            Para constar, eu {officialName} (Assinatura Eletrônica), {officialCargo}, de matrícula 12078, realizei a digitação e a emissão desta certidão.
                        </p>

                        <p className="text-right text-sm text-slate-900 mt-10">
                            São Paulo, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-red-700 pt-3 text-center text-[10px] text-slate-600 leading-tight mt-16">
                        Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br/>
                        Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
                    </div>
                </div>

                {/* Chat Interface for Refinement */}
                <div className="mt-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={16} className="text-cyan-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IA de Correção e Ajuste</span>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isRefining && generateCertidao(chatInput)}
                            placeholder="Ex: 'Deixe mais formal', 'Adicione que verifiquei também o CAEX'..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder-slate-600"
                        />
                        <button 
                            onClick={() => generateCertidao(chatInput)}
                            disabled={isRefining || !chatInput.trim()}
                            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white px-4 rounded-xl transition-all"
                        >
                            {isRefining ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ProvidenciasTool;