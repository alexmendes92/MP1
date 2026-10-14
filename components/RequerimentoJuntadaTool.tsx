import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Copy, CheckCircle, Download, Printer, 
  ArrowLeft, Sparkles
} from 'lucide-react';
import { PromotoriaDef, CaseData, Person } from '../types';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { downloadDocxBlob } from '../utils/docxExport';
import { formatRG, formatCPF } from '../utils/niRulesHelper';

interface RequerimentoJuntadaToolProps {
  promotorias?: PromotoriaDef[];
  caseData?: CaseData;
  people?: Person[];
  onNavigateScreen?: (screen: any) => void;
}

export const RequerimentoJuntadaTool: React.FC<RequerimentoJuntadaToolProps> = ({
  promotorias,
  caseData,
  people,
  onNavigateScreen
}) => {
  // Dados do Processo (sincronizados com a pesquisa N.I)
  const [numeroProcesso, setNumeroProcesso] = useState<string>(
    caseData?.numeroProcesso || '1517277-42.2026.8.26.0228'
  );
  const [vara, setVara] = useState<string>('16ª VARA CRIMINAL DO FORO CENTRAL DA CAPITAL');
  const [promotoria, setPromotoria] = useState<string>(
    '4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL'
  );
  const [promotorNome, setPromotorNome] = useState<string>(() => {
    if (caseData?.promotor) return caseData.promotor;
    if (caseData?.cargo?.includes('79')) return 'MARGARETH FERRAZ FRANÇA';
    if (caseData?.cargo?.includes('71')) return "LEONARDO D'ANGELO VARGAS PEREIRA";
    return 'MARGARETH FERRAZ FRANÇA';
  });
  const [cargo, setCargo] = useState<string>(() => {
    if (caseData?.cargo) {
      const match = caseData.cargo.match(/\d+/);
      return match ? `${match[0]}ª Promotora de Justiça Criminal` : caseData.cargo;
    }
    return '79ª Promotora de Justiça Criminal';
  });

  // Dados específicos do Ofício / Relatório do N.I
  const [oficioNumero, setOficioNumero] = useState<string>('18458/2026');
  const [generoPromotor, setGeneroPromotor] = useState<'F' | 'M'>(() => {
    if (caseData?.promotor?.toLowerCase().includes('margareth') || caseData?.cargo?.includes('79')) return 'F';
    return 'M';
  });
  const [itemEndereco, setItemEndereco] = useState<string>('A');
  const [detalhesParte, setDetalhesParte] = useState<string>(() => {
    if (people && people.length > 0 && people[0].nome) {
      const p = people[0];
      return `${p.nome}${p.rg ? ` (RG ${formatRG(p.rg)})` : ''}${p.cpf ? ` (CPF ${formatCPF(p.cpf)})` : ''}`;
    }
    return '';
  });

  // Estados de feedback de cópia
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Sincroniza quando caseData ou people mudam
  useEffect(() => {
    if (caseData?.numeroProcesso) setNumeroProcesso(caseData.numeroProcesso);
    if (caseData?.promotor) {
      setPromotorNome(caseData.promotor.toUpperCase());
      const isFem = /margareth|tânia|martha|vera|beatriz|adriana|simone|barbara|fernanda|laurani/i.test(caseData.promotor);
      setGeneroPromotor(isFem ? 'F' : 'M');
    }
    if (caseData?.cargo) {
      const numMatch = caseData.cargo.match(/\d+/);
      const num = numMatch ? numMatch[0] : '79';
      setCargo(`${num}ª Promotora de Justiça Criminal`);
      if (num === '79' && !caseData.promotor) {
        setPromotorNome('MARGARETH FERRAZ FRANÇA');
        setGeneroPromotor('F');
      } else if (num === '71' && !caseData.promotor) {
        setPromotorNome("LEONARDO D'ANGELO VARGAS PEREIRA");
        setGeneroPromotor('M');
        setCargo('71º Promotor de Justiça Criminal');
      }
    }
    if (people && people.length > 0 && people[0].nome) {
      const p = people[0];
      setDetalhesParte(`${p.nome}${p.rg ? ` (RG ${formatRG(p.rg)})` : ''}${p.cpf ? ` (CPF ${formatCPF(p.cpf)})` : ''}`);
    }
  }, [caseData, people]);

  const pronomeTratamento = generoPromotor === 'F' ? 'da Promotora de Justiça' : 'do Promotor de Justiça';
  const cargoExibicao = useMemo(() => {
    const numMatch = cargo.match(/\d+/);
    const num = numMatch ? numMatch[0] : '79';
    return generoPromotor === 'F' 
      ? `${num}ª Promotora de Justiça Criminal` 
      : `${num}º Promotor de Justiça Criminal`;
  }, [cargo, generoPromotor]);

  const dataExtenso = useMemo(() => {
    const hoje = new Date();
    return `São Paulo, ${hoje.getDate()} de ${hoje.toLocaleDateString('pt-BR', { month: 'long' })} de ${hoje.getFullYear()}.`;
  }, []);

  // Texto limpo (padrão SAJ)
  const textoSimples = useMemo(() => {
    const parteExtra = detalhesParte.trim() ? ` das partes processuais (${detalhesParte.trim()})` : ' das partes processuais';

    return `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ${vara.toUpperCase()}

Ação Penal: ${numeroProcesso}

O MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO, por meio ${pronomeTratamento} que esta subscreve, vem respeitosamente à presença de Vossa Excelência requerer a juntada do Ofício n° ${oficioNumero} do Núcleo de Investigações aos autos em epígrafe com informe de localização, ainda não relacionado aos autos,${parteExtra}, recomendando que se diligencie no endereço indicado no item ${itemEndereco} preferencialmente na ordem mencionada.

Nestes termos,
Pede deferimento.

${dataExtenso}

${promotorNome.toUpperCase()}
${cargoExibicao}`;
  }, [vara, numeroProcesso, pronomeTratamento, oficioNumero, detalhesParte, itemEndereco, dataExtenso, promotorNome, cargoExibicao]);

  // HTML formatado seguindo a folha padrão A4 (210mm x 297mm) com rodapé fixado na parte inferior
  const htmlFormatado = useMemo(() => {
    const parteExtra = detalhesParte.trim() 
      ? ` das partes processuais (<b>${detalhesParte.trim()}</b>)` 
      : ' das partes processuais';

    return `
      <div class="a4-sheet" style="width: 210mm; min-height: 297mm; padding: 25mm 20mm 20mm 25mm; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; position: relative; font-family: 'Aptos', Arial, Helvetica, sans-serif; color: #000000; line-height: 1.6; text-align: left; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        
        <!-- PARTE SUPERIOR E CONTEÚDO PRINCIPAL -->
        <div style="flex: 1 0 auto; display: flex; flex-direction: column;">
          
          <!-- CABEÇALHO OFICIAL MPSP -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-bottom: 2.5px double #c00000; padding-bottom: 12px; margin-bottom: 28px; font-family: 'Aptos', Arial, sans-serif;">
            <tr>
              <td align="left" valign="middle" style="padding-bottom: 6px;">
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
              <td align="right" valign="middle" style="text-align: right; line-height: 1.35; font-size: 10px; font-weight: bold; color: #111111; padding-left: 15px; border-left: 2px solid #c00000; padding-bottom: 6px; text-transform: uppercase; font-family: 'Aptos', Arial, sans-serif;">
                ${promotoria}<br>
                CRIMINAL DA CAPITAL
              </td>
            </tr>
          </table>

          <!-- ENDEREÇAMENTO JUDICIAL -->
          <p style="text-align: left; font-family: 'Aptos', Arial, sans-serif; font-size: 13.5px; font-weight: bold; margin-bottom: 28px; line-height: 1.5; color: #000000; text-transform: uppercase;">
            EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ${vara.toUpperCase()}
          </p>

          <!-- NÚMERO DO PROCESSO / AÇÃO PENAL -->
          <p style="text-align: left; margin-bottom: 32px; font-family: 'Aptos', Arial, sans-serif; font-weight: bold; font-size: 13.5px; color: #000000;">
            Ação Penal: <span style="font-family: monospace, 'Courier New', Courier; font-size: 13.5px;">${numeroProcesso}</span>
          </p>

          <!-- PARÁGRAFO ÚNICO DO REQUERIMENTO DE JUNTADA DO N.I -->
          <p style="text-align: justify; text-indent: 2.0cm; margin-bottom: 30px; font-family: 'Aptos', Arial, sans-serif; font-size: 14px; line-height: 1.9; color: #000000; word-break: break-word;">
            <b>O MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO</b>, por meio ${pronomeTratamento} que esta subscreve, vem respeitosamente à presença de Vossa Excelência requerer a juntada do Ofício n° <b>${oficioNumero}</b> do <b>Núcleo de Investigações</b> aos autos em epígrafe com informe de localização, ainda não relacionado aos autos,${parteExtra}, recomendando que se diligencie no endereço indicado no item <b>${itemEndereco}</b> preferencialmente na ordem mencionada.
          </p>

          <!-- FECHO COM RECUO -->
          <div style="margin-left: 2.0cm; margin-bottom: 34px; line-height: 1.8; font-family: 'Aptos', Arial, sans-serif; font-size: 14px;">
            <p style="margin: 0; color: #000000;">Nestes termos,</p>
            <p style="margin: 0; color: #000000;">Pede deferimento.</p>
          </div>

          <!-- DATAÇÃO -->
          <p style="text-align: center; margin-bottom: 32px; color: #000000; font-family: 'Aptos', Arial, sans-serif; font-size: 13.5px;">
            ${dataExtenso}
          </p>

          <!-- ASSINATURA -->
          <div style="text-align: center; margin-top: 10px; margin-bottom: 24px; line-height: 1.5; font-family: 'Aptos', Arial, sans-serif;">
            <div style="font-weight: bold; font-size: 14px; color: #000000; text-transform: uppercase;">${promotorNome.toUpperCase()}</div>
            <div style="font-weight: bold; font-size: 13px; color: #333333;">${cargoExibicao}</div>
          </div>

        </div>

        <!-- RODAPÉ OFICIAL MPSP (FIXADO NO FINAL DA PÁGINA) -->
        <div class="footer" style="margin-top: auto; border-top: 1.5px solid #c00000; padding-top: 12px; text-align: center; font-size: 9.5px; color: #444444; line-height: 1.4; font-family: 'Aptos', Arial, sans-serif;">
          Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020<br>
          Telefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br
        </div>

      </div>
    `;
  }, [promotoria, vara, numeroProcesso, pronomeTratamento, oficioNumero, detalhesParte, itemEndereco, dataExtenso, promotorNome, cargoExibicao]);

  // Cópia Formatada para colar no Word ou E-SAJ
  const handleCopyFormatted = () => {
    const htmlBlob = new Blob([htmlFormatado], { type: 'text/html' });
    const textBlob = new Blob([textoSimples], { type: 'text/plain' });

    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      })
    ]).then(() => {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2200);
    }).catch(() => {
      navigator.clipboard.writeText(textoSimples).then(() => {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2200);
      });
    });
  };

  // Cópia do Texto Puro (SAJ)
  const handleCopyTextOnly = () => {
    navigator.clipboard.writeText(textoSimples).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Exportar Word (.docx) com fonte padrão Arial/Aptos e rodapé no final
  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const parteExtra = detalhesParte.trim() 
        ? ` das partes processuais (${detalhesParte.trim()})` 
        : ' das partes processuais';

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1418, // 2.5cm
                  bottom: 1134, // 2.0cm
                  left: 1418, // 2.5cm
                  right: 1134 // 2.0cm
                }
              }
            },
            footers: {
              default: new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 180 },
                border: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "C00000" }
                },
                children: [
                  new TextRun({
                    text: "Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020\nTelefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br",
                    size: 17, // ~8.5pt
                    font: "Arial",
                    color: "444444"
                  })
                ]
              })
            },
            children: [
              // Cabeçalho MPSP Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.DOUBLE, size: 6, color: "C00000" },
                  insideHorizontal: { style: BorderStyle.NONE },
                  insideVertical: { style: BorderStyle.NONE }
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.NONE },
                          left: { style: BorderStyle.NONE },
                          bottom: { style: BorderStyle.NONE },
                          right: { style: BorderStyle.NONE }
                        },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: "MP", bold: true, size: 36, font: "Arial", color: "000000" }),
                              new TextRun({ text: "SP", bold: true, size: 36, font: "Arial", color: "C00000" }),
                              new TextRun({ text: "  |  MINISTÉRIO PÚBLICO", bold: true, size: 18, font: "Arial", color: "111111" }),
                              new TextRun({ text: "\nDO ESTADO DE SÃO PAULO", size: 16, font: "Arial", color: "555555" })
                            ]
                          })
                        ]
                      }),
                      new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.NONE },
                          left: { style: BorderStyle.SINGLE, size: 4, color: "C00000" },
                          bottom: { style: BorderStyle.NONE },
                          right: { style: BorderStyle.NONE }
                        },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: promotoria.toUpperCase(), bold: true, size: 20, font: "Arial", color: "111111" }),
                              new TextRun({ text: "\nCRIMINAL DA CAPITAL", bold: true, size: 18, font: "Arial", color: "111111" })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),

              // Espaço após cabeçalho
              new Paragraph({ spacing: { before: 360, after: 180 }, children: [] }),

              // Endereçamento
              new Paragraph({
                spacing: { after: 240 },
                children: [
                  new TextRun({
                    text: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ${vara.toUpperCase()}`,
                    bold: true,
                    size: 22,
                    font: "Arial"
                  })
                ]
              }),

              // Ação Penal
              new Paragraph({
                spacing: { after: 360 },
                children: [
                  new TextRun({ text: "Ação Penal: ", bold: true, size: 22, font: "Arial" }),
                  new TextRun({ text: numeroProcesso, bold: true, size: 22, font: "Arial" })
                ]
              }),

              // Parágrafo do Requerimento com recuo de 2,0 cm
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 1134 }, // 2.0 cm
                spacing: { line: 360, after: 240 },
                children: [
                  new TextRun({ text: "O MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO", bold: true, size: 22, font: "Arial" }),
                  new TextRun({ 
                    text: `, por meio ${pronomeTratamento} que esta subscreve, vem respeitosamente à presença de Vossa Excelência requerer a juntada do Ofício n° `, 
                    size: 22, 
                    font: "Arial" 
                  }),
                  new TextRun({ text: oficioNumero, bold: true, size: 22, font: "Arial" }),
                  new TextRun({ text: " do Núcleo de Investigações aos autos em epígrafe com informe de localização, ainda não relacionado aos autos,", size: 22, font: "Arial" }),
                  new TextRun({ text: `${parteExtra}, `, size: 22, font: "Arial" }),
                  new TextRun({ text: "recomendando que se diligencie no endereço indicado no item ", size: 22, font: "Arial" }),
                  new TextRun({ text: itemEndereco, bold: true, size: 22, font: "Arial" }),
                  new TextRun({ text: " preferencialmente na ordem mencionada.", size: 22, font: "Arial" })
                ]
              }),

              // Fecho com recuo
              new Paragraph({
                indent: { left: 1134 },
                spacing: { before: 180, after: 60 },
                children: [new TextRun({ text: "Nestes termos,", size: 22, font: "Arial" })]
              }),
              new Paragraph({
                indent: { left: 1134 },
                spacing: { after: 360 },
                children: [new TextRun({ text: "Pede deferimento.", size: 22, font: "Arial" })]
              }),

              // Data
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 360 },
                children: [new TextRun({ text: dataExtenso, size: 22, font: "Arial" })]
              }),

              // Assinatura
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 60 },
                children: [
                  new TextRun({ text: promotorNome.toUpperCase(), bold: true, size: 22, font: "Arial" })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 360 },
                children: [
                  new TextRun({ text: cargoExibicao, bold: true, size: 20, font: "Arial", color: "333333" })
                ]
              })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      downloadDocxBlob(blob, `Requerimento_Juntada_NI_${numeroProcesso.replace(/[^\d]/g, '') || 'autos'}.docx`);
    } catch (e) {
      console.error(e);
      alert("Falha ao exportar o documento DOCX.");
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Habilite pop-ups para imprimir.");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Requerimento_Juntada_NI_${numeroProcesso}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body { margin: 0; padding: 0; background: #ffffff; font-family: 'Aptos', Arial, sans-serif; }
            .a4-sheet { width: 210mm !important; min-height: 297mm !important; box-shadow: none !important; margin: 0 auto !important; }
          </style>
        </head>
        <body>
          ${htmlFormatado}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500 bg-slate-950">
      
      {/* PAINEL ESQUERDO: CONTROLE DOS DADOS DO N.I */}
      <div className="w-[420px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-5 shadow-2xl z-10 overflow-y-auto custom-scrollbar shrink-0">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl shadow-md">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Requerimento de Juntada N.I
              </h2>
              <p className="text-[11px] text-slate-400">
                Petição oficial do Núcleo de Investigações (E-SAJ)
              </p>
            </div>
          </div>

          {onNavigateScreen && (
            <button
              onClick={() => onNavigateScreen('PESQUISA_NI')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Voltar para Pesquisa de N.I"
            >
              <ArrowLeft size={16} />
            </button>
          )}
        </div>

        {/* Campos do Processo */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Ação Penal / Autos (SAJ)
            </label>
            <input
              type="text"
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="1517277-42.2026.8.26.0228"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Juízo / Vara
            </label>
            <input
              type="text"
              value={vara}
              onChange={(e) => setVara(e.target.value)}
              placeholder="16ª VARA CRIMINAL DO FORO CENTRAL DA CAPITAL"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Ofício N.I nº
              </label>
              <input
                type="text"
                value={oficioNumero}
                onChange={(e) => setOficioNumero(e.target.value)}
                placeholder="18458/2026"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Item Recomendado
              </label>
              <input
                type="text"
                value={itemEndereco}
                onChange={(e) => setItemEndereco(e.target.value)}
                placeholder="A"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
              />
            </div>
          </div>

          {/* Dados do Promotor */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nome do(a) Promotor(a)
              </label>
              <input
                type="text"
                value={promotorNome}
                onChange={(e) => setPromotorNome(e.target.value)}
                placeholder="MARGARETH FERRAZ FRANÇA"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Gênero
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGeneroPromotor('F')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      generoPromotor === 'F' ? 'bg-red-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Feminino
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneroPromotor('M')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      generoPromotor === 'M' ? 'bg-red-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Masculino
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="79ª Promotora de Justiça Criminal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Parte(s) Localizada(s)
              </label>
              <input
                type="text"
                value={detalhesParte}
                onChange={(e) => setDetalhesParte(e.target.value)}
                placeholder="Nome da parte qualificada"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Será inserido em &quot;das partes processuais (...)&quot;.
              </p>
            </div>
          </div>
        </div>

        {/* Informação sobre a estrutura */}
        <div className="mt-auto p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px]">
            <Sparkles size={14} className="text-red-400" />
            Padrão MPSP A4 Completo
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Fonte <b>Aptos</b> / Arial oficial, folha com proporção A4 (210mm x 297mm), cabeçalho duplo, recuo de 2,0 cm e rodapé de contato fixado ao final da página.
          </p>
        </div>

      </div>

      {/* PAINEL DIREITO: VISUALIZAÇÃO E AÇÕES */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        
        {/* Barra Superior */}
        <div className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Requerimento de Juntada — Núcleo de Investigações (N.I)
            </span>
            <span className="text-xs text-slate-500 font-mono hidden md:inline">
              | Ação Penal: {numeroProcesso}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTextOnly}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
              title="Copiar texto puro para colar no editor do SAJ"
            >
              {copiedText ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedText ? 'Texto Copiado!' : 'Copiar Texto SAJ'}</span>
            </button>

            <button
              onClick={handleCopyFormatted}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
              title="Copiar documento completo formatado para Word"
            >
              {copiedHtml ? <CheckCircle size={15} /> : <Copy size={15} />}
              <span>{copiedHtml ? 'Petição Copiada!' : 'Copiar Formatado'}</span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Baixar em formato Word (.docx) com papel timbrado oficial MPSP"
            >
              <Download size={14} />
              <span>{isExportingDocx ? 'Gerando...' : 'Word (.docx)'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* Folha A4 com proporção e visual oficial */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-900/60 flex justify-center custom-scrollbar">
          <div className="w-full max-w-[210mm] self-start py-4">
            <div dangerouslySetInnerHTML={{ __html: htmlFormatado }} />
          </div>
        </div>

        {/* Rodapé da Ferramenta */}
        <div className="h-12 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Petição configurada para juntada de informe de localização do <b>Núcleo de Investigações (SIS/N.I)</b>.
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>{numeroProcesso}</span>
            <span>•</span>
            <span>{promotorNome}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
