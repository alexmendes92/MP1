import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, UnderlineType } from "docx";
import { BatchNiItem } from "../types";

interface CertidaoDocxOptions {
  numeroProcesso: string;
  varaGarantias: string;
  promotoria: string;
  officialName: string;
  officialCargo: string;
  bodyText: string;
  dataHoje?: string;
}

export async function exportCertidaoToDocx({
  numeroProcesso,
  varaGarantias,
  promotoria,
  officialName,
  officialCargo,
  bodyText,
  dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}: CertidaoDocxOptions): Promise<Blob> {
  
  // Clean the body text into separate paragraphs
  const cleanParagraphs = bodyText
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1418, // 2.5 cm (in twips: 1cm = 567 twips)
              bottom: 1134, // 2.0 cm
              left: 1418, // 2.5 cm
              right: 1134 // 2.0 cm
            }
          }
        },
        children: [
          // Header Table (MPSP standard)
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
                  // Left Cell: MPSP Brand
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "MP",
                            bold: true,
                            size: 36, // 18pt
                            font: "Arial",
                            color: "000000"
                          }),
                          new TextRun({
                            text: "SP",
                            bold: true,
                            size: 36, // 18pt
                            font: "Arial",
                            color: "C00000"
                          }),
                          new TextRun({
                            text: "  |  MINISTÉRIO PÚBLICO",
                            bold: true,
                            size: 18, // 9pt
                            font: "Arial",
                            color: "111111"
                          }),
                          new TextRun({
                            text: "\nDO ESTADO DE SÃO PAULO",
                            size: 16, // 8pt
                            font: "Arial",
                            color: "555555"
                          })
                        ]
                      })
                    ]
                  }),
                  // Right Cell: Promotoria Name
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
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
                          new TextRun({
                            text: promotoria.toUpperCase(),
                            bold: true,
                            size: 20, // 10pt
                            font: "Arial",
                            color: "111111"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Spacing
          new Paragraph({
            spacing: { before: 360, after: 240 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "CERTIDÃO DE OFICIAL DE PROMOTORIA",
                bold: true,
                size: 26, // 13pt
                font: "Arial",
                color: "000000"
              })
            ]
          }),

          // Process Info
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({
                text: `Autos: ${numeroProcesso}`,
                bold: true,
                size: 22, // 11pt
                font: "Arial"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: varaGarantias,
                bold: true,
                size: 22, // 11pt
                font: "Arial"
              })
            ]
          }),

          // Body Paragraphs with 2cm indentation
          ...cleanParagraphs.map(text =>
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 1134 }, // ~2cm in twips (1134 twips)
              spacing: { before: 120, after: 240, line: 360 }, // 1.5 line spacing
              children: [
                new TextRun({
                  text: text,
                  size: 24, // 12pt
                  font: "Arial",
                  color: "000000"
                })
              ]
            })
          ),

          // Fecho / Official Validation
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1134 },
            spacing: { before: 120, after: 360, line: 360 },
            children: [
              new TextRun({
                text: `Para constar, eu ${officialName} (Assinatura Eletrônica), ${officialCargo}, de matrícula 12078, realizei a digitação e a emissão desta certidão.`,
                size: 24, // 12pt
                font: "Arial",
                color: "000000"
              })
            ]
          }),

          // Date Right
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 360, after: 480 },
            children: [
              new TextRun({
                text: `São Paulo, ${dataHoje}.`,
                size: 22, // 11pt
                font: "Arial",
                color: "000000"
              })
            ]
          }),

          // Footer info
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 720 },
            children: [
              new TextRun({
                text: "_____________________________________________________________________________\n",
                color: "C00000",
                size: 16
              }),
              new TextRun({
                text: "Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020\nTelefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br",
                size: 16, // 8pt
                font: "Arial",
                color: "555555"
              })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

export interface CartaNotificacaoDocxOptions {
  numeroProcesso: string;
  destinatarioNome: string;
  destinatarioTipo?: string;
  destinatarioEndereco: string;
  destinatarioCep?: string;
  destinatarioTelefone?: string;
  destinatarioEmail?: string;
  destinatarioFolha?: string;
  varaGarantias?: string;
  promotoria?: string;
  promotorNome?: string;
  dataHoje?: string;
}

export async function exportCartaNotificacaoToDocx({
  numeroProcesso,
  destinatarioNome,
  destinatarioTipo = "Vítima",
  destinatarioEndereco,
  destinatarioCep = "",
  destinatarioTelefone = "",
  destinatarioEmail = "",
  destinatarioFolha = "",
  varaGarantias = "Juiz das Garantias - 1ª RAJ - Capital",
  promotoria = "4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL",
  promotorNome = "Leonardo D'Angelo Vargas Pereira",
  dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}: CartaNotificacaoDocxOptions): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1418, // 2.5 cm
              bottom: 1134, // 2.0 cm
              left: 1418, // 2.5 cm
              right: 1134 // 2.0 cm
            }
          }
        },
        children: [
          // Header Table (MPSP standard)
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
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "MP",
                            bold: true,
                            size: 36,
                            font: "Arial",
                            color: "000000"
                          }),
                          new TextRun({
                            text: "SP",
                            bold: true,
                            size: 36,
                            font: "Arial",
                            color: "C00000"
                          }),
                          new TextRun({
                            text: "  |  MINISTÉRIO PÚBLICO",
                            bold: true,
                            size: 18,
                            font: "Arial",
                            color: "111111"
                          }),
                          new TextRun({
                            text: "\nDO ESTADO DE SÃO PAULO",
                            size: 16,
                            font: "Arial",
                            color: "555555"
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
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
                          new TextRun({
                            text: promotoria.toUpperCase(),
                            bold: true,
                            size: 20,
                            font: "Arial",
                            color: "111111"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Title
          new Paragraph({
            spacing: { before: 280, after: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "CARTA DE NOTIFICAÇÃO OFICIAL",
                bold: true,
                size: 26,
                font: "Arial",
                color: "000000"
              }),
              new TextRun({
                text: "\n(Art. 28, caput, do Código de Processo Penal - Aviso PGJ/CAO-CRIM nº 707/2023)",
                size: 18,
                font: "Arial",
                color: "555555"
              })
            ]
          }),

          // Recipient Box Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "DESTINATÁRIO / CORRESPONDÊNCIA:",
                            size: 16,
                            bold: true,
                            font: "Arial",
                            color: "666666"
                          })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 80 },
                        children: [
                          new TextRun({
                            text: destinatarioNome.toUpperCase(),
                            bold: true,
                            size: 24,
                            font: "Arial",
                            color: "000000"
                          }),
                          new TextRun({
                            text: ` (${destinatarioTipo.toUpperCase()}${destinatarioFolha ? ` - FLS. ${destinatarioFolha}` : ''})`,
                            size: 20,
                            font: "Arial",
                            color: "444444"
                          })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 60 },
                        children: [
                          new TextRun({
                            text: destinatarioEndereco,
                            size: 20,
                            font: "Arial",
                            color: "222222"
                          }),
                          destinatarioCep ? new TextRun({
                            text: ` | CEP: ${destinatarioCep}`,
                            size: 20,
                            font: "Arial",
                            color: "222222"
                          }) : new TextRun({ text: "" })
                        ]
                      }),
                      (destinatarioTelefone || destinatarioEmail) ? new Paragraph({
                        spacing: { before: 40 },
                        children: [
                          destinatarioTelefone ? new TextRun({
                            text: `Telefone/Celular: ${destinatarioTelefone} `,
                            size: 18,
                            font: "Arial",
                            color: "444444"
                          }) : new TextRun({ text: "" }),
                          destinatarioEmail ? new TextRun({
                            text: `| E-mail: ${destinatarioEmail}`,
                            size: 18,
                            font: "Arial",
                            color: "444444"
                          }) : new TextRun({ text: "" })
                        ]
                      }) : new Paragraph({ children: [] })
                    ]
                  })
                ]
              })
            ]
          }),

          // Process Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
              left: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
              right: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "NÚMERO DO PROCESSO (AUTOS):", size: 15, bold: true, color: "555555" }),
                          new TextRun({ text: `\n${numeroProcesso}`, bold: true, size: 22, color: "000000" })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "PRAZO PARA EVENTUAL RECURSO:", size: 15, bold: true, color: "B91C1C" }),
                          new TextRun({ text: "\n30 (TRINTA) DIAS CORRIDOS", bold: true, size: 22, color: "B91C1C" })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "ÓRGÃO JUDICIAL / PROMOTOR RESPONSÁVEL:", size: 15, bold: true, color: "555555" }),
                          new TextRun({ text: `\n${varaGarantias} — ${promotorNome} (Promotor de Justiça)`, size: 20, color: "222222" })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Letter Body
          new Paragraph({
            spacing: { before: 240, after: 140 },
            children: [
              new TextRun({
                text: "Prezado(a) Senhor(a),",
                size: 22,
                font: "Arial"
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1134 },
            spacing: { before: 100, after: 180, line: 360 },
            children: [
              new TextRun({
                text: `Comunico a Vossa Senhoria que, na qualidade de `,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: destinatarioTipo.toUpperCase(),
                bold: true,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: ` nos autos do procedimento criminal em epígrafe (Autos nº ${numeroProcesso}), foi apresentada r. promoção ministerial de `,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: `ARQUIVAMENTO`,
                bold: true,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: ` do inquérito policial pelo Ministério Público do Estado de São Paulo.`,
                size: 22,
                font: "Arial"
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1134 },
            spacing: { before: 100, after: 180, line: 360 },
            children: [
              new TextRun({
                text: `Caso possua discordância ou inconformismo em relação aos fundamentos aduzidos para o arquivamento, cientifica-se Vossa Senhoria de que vigora o `,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: `prazo legal de 30 (trinta) dias`,
                bold: true,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: `, contados do efetivo recebimento desta notificação, para submeter suas razões recursais ou novos elementos de convicção à instância revisora competente do Ministério Público (Procuradoria-Geral de Justiça / Colégio de Procuradores), em estrita observância ao disposto no artigo 28, caput, do Código de Processo Penal (com a redação outorgada pela Lei Federal nº 13.964/19).`,
                size: 22,
                font: "Arial"
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1134 },
            spacing: { before: 100, after: 240, line: 360 },
            children: [
              new TextRun({
                text: `Para obtenção de cópia integral do pronunciamento ministerial ou orientações sobre o envio de sua manifestação à instância revisora, solicitamos entrar em contato com a Serventia da 4ª Promotoria de Justiça Criminal da Capital através do e-mail `,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: `4pjcrimcentcap@mpsp.mp.br`,
                bold: true,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: ` ou pelos telefones (11) 3429-6302 / (11) 3429-6363.`,
                size: 22,
                font: "Arial"
              })
            ]
          }),

          // Date Right
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({
                text: `São Paulo, ${dataHoje}.`,
                size: 22,
                font: "Arial"
              })
            ]
          }),

          // Promotor Signature Block
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 60 },
            children: [
              new TextRun({
                text: promotorNome,
                bold: true,
                size: 22,
                font: "Arial"
              }),
              new TextRun({
                text: `\nPromotor de Justiça`,
                size: 20,
                font: "Arial"
              })
            ]
          }),

          // Footer info
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360 },
            children: [
              new TextRun({
                text: "_____________________________________________________________________________\n",
                color: "C00000",
                size: 16
              }),
              new TextRun({
                text: "Av. Dr. Abraão Ribeiro, 313, Térreo – Barra Funda – São Paulo/SP – CEP: 01133-020\nTelefones: (11) 3429-6302 / (11) 3429-6363 – E-mail: 4pjcrimcentcap@mpsp.mp.br",
                size: 16,
                font: "Arial",
                color: "555555"
              })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

interface PesquisaNiDocxOptions {
  item: BatchNiItem;
  promotoriaName?: string;
  promotorName?: string;
  cargoStr?: string;
}

export async function exportPesquisaNiToDocx({
  item,
  promotoriaName = "4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL",
  promotorName = "Leonardo D’Angelo Vargas Pereira",
  cargoStr = "71º Promotor de Justiça Criminal"
}: PesquisaNiDocxOptions): Promise<Blob> {
  const dataAud = item.dataAudiencia ? item.dataAudiencia : "Não designada";
  const prioridade = item.urgente ? "Urgente (Prioritário)" : "Normal";

  const children: any[] = [
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
              width: { size: 55, type: WidthType.PERCENTAGE },
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
              width: { size: 45, type: WidthType.PERCENTAGE },
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
                    new TextRun({
                      text: promotoriaName.toUpperCase(),
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "111111"
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 280 },
      children: [
        new TextRun({
          text: "PESQUISA DE LOCALIZAÇÃO (SIS/NI)",
          bold: true,
          size: 26,
          font: "Arial",
          color: "C00000"
        })
      ]
    }),

    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({ text: "Autos do Processo nº: ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: item.numeroProcesso, bold: true, size: 22, font: "Arial", color: "C00000" })
      ]
    }),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      children: [
        new TextRun({ text: "Data da Audiência: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: dataAud, size: 20, font: "Arial" }),
        new TextRun({ text: "   |   Prioridade: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: prioridade, size: 20, font: "Arial", color: item.urgente ? "C00000" : "000000" })
      ]
    }),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      children: [
        new TextRun({ text: "Promotor de Justiça: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: promotorName, size: 20, font: "Arial" }),
        new TextRun({ text: "   |   Cargo: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: cargoStr, size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 60, after: 240 },
      children: [
        new TextRun({ text: "Órgão / Vara: ", bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: item.vara || promotoriaName, size: 20, font: "Arial" })
      ]
    }),

    new Paragraph({
      spacing: { before: 60, after: 200 },
      children: [
        new TextRun({
          text: "_____________________________________________________________________________",
          color: "CCCCCC",
          size: 14
        })
      ]
    }),

    new Paragraph({
      spacing: { before: 100, after: 160 },
      children: [
        new TextRun({
          text: "QUALIFICAÇÃO DAS PARTES PARA PESQUISA:",
          bold: true,
          size: 22,
          font: "Arial"
        })
      ]
    })
  ];

  item.partes.forEach((p, idx) => {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "Nome: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: `${p.nome} `, bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: `(Fls. ${p.folha || "01"}) `, size: 18, font: "Arial", color: "555555" }),
          new TextRun({ text: p.tipoParte ? `[${p.tipoParte}]` : "", bold: true, size: 18, font: "Arial", color: "C00000" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "Nacionalidade: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: p.nacionalidade || "Brasileiro", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "CPF: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: p.cpf || "________________", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "RG: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: p.rg || "________________", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "Filiação - Pai: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: p.pai || "________________", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "Filiação - Mãe: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: p.mae || "________________", size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: "Data de Nascimento: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: p.dataNascimento || "____/____/____", size: 20, font: "Arial" })
        ]
      })
    );

    if (p.endereco) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: "Endereço nos autos: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.endereco, size: 20, font: "Arial" })
          ]
        })
      );
    }
    if (p.telefone) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: "Telefone / Contato: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.telefone, size: 20, font: "Arial" })
          ]
        })
      );
    }
    if (p.email) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: "E-mail: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.email, size: 20, font: "Arial" })
          ]
        })
      );
    }

    if (idx < item.partes.length - 1) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          children: [
            new TextRun({
              text: "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -",
              color: "E2E8F0",
              size: 14
            })
          ]
        })
      );
    }
  });

  children.push(
    new Paragraph({
      spacing: { before: 300, after: 120 },
      children: [
        new TextRun({ text: "Atenciosamente,", size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({ text: "Oficial de Promotoria", bold: true, size: 20, font: "Arial" })
      ]
    }),
    new Paragraph({
      spacing: { before: 40, after: 200 },
      children: [
        new TextRun({ text: promotoriaName, size: 18, font: "Arial", color: "444444" })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1418, bottom: 1134, left: 1418, right: 1134 }
          }
        },
        children
      }
    ]
  });

  return await Packer.toBlob(doc);
}

export async function exportConsolidatedPesquisaNiToDocx({
  items,
  promotoriaName = "4ª PROMOTORIA DE JUSTIÇA CRIMINAL DA CAPITAL",
  promotorName = "Leonardo D’Angelo Vargas Pereira",
  cargoStr = "71º Promotor de Justiça Criminal"
}: {
  items: BatchNiItem[];
  promotoriaName?: string;
  promotorName?: string;
  cargoStr?: string;
}): Promise<Blob> {
  const sections: any[] = [];

  for (const item of items) {
    const dataAud = item.dataAudiencia ? item.dataAudiencia : "Não designada";
    const prioridade = item.urgente ? "Urgente (Prioritário)" : "Normal";

    const children: any[] = [
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
                width: { size: 55, type: WidthType.PERCENTAGE },
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
                width: { size: 45, type: WidthType.PERCENTAGE },
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
                      new TextRun({
                        text: promotoriaName.toUpperCase(),
                        bold: true,
                        size: 20,
                        font: "Arial",
                        color: "111111"
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 280 },
        children: [
          new TextRun({
            text: "PESQUISA DE LOCALIZAÇÃO (SIS/NI)",
            bold: true,
            size: 26,
            font: "Arial",
            color: "C00000"
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({ text: "Autos do Processo nº: ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: item.numeroProcesso, bold: true, size: 22, font: "Arial", color: "C00000" })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [
          new TextRun({ text: "Data da Audiência: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: dataAud, size: 20, font: "Arial" }),
          new TextRun({ text: "   |   Prioridade: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: prioridade, size: 20, font: "Arial", color: item.urgente ? "C00000" : "000000" })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [
          new TextRun({ text: "Promotor de Justiça: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: promotorName, size: 20, font: "Arial" }),
          new TextRun({ text: "   |   Cargo: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: cargoStr, size: 20, font: "Arial" })
        ]
      }),
      new Paragraph({
        spacing: { before: 60, after: 240 },
        children: [
          new TextRun({ text: "Órgão / Vara: ", bold: true, size: 20, font: "Arial" }),
          new TextRun({ text: item.vara || promotoriaName, size: 20, font: "Arial" })
        ]
      }),

      new Paragraph({
        spacing: { before: 60, after: 200 },
        children: [
          new TextRun({
            text: "_____________________________________________________________________________",
            color: "CCCCCC",
            size: 14
          })
        ]
      }),

      new Paragraph({
        spacing: { before: 100, after: 160 },
        children: [
          new TextRun({
            text: "QUALIFICAÇÃO DAS PARTES PARA PESQUISA:",
            bold: true,
            size: 22,
            font: "Arial"
          })
        ]
      })
    ];

    item.partes.forEach(p => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 60, after: 30 },
          children: [
            new TextRun({ text: "Nome: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: `${p.nome} `, bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: `(Fls. ${p.folha || "01"}) `, size: 18, font: "Arial", color: "555555" }),
            new TextRun({ text: p.tipoParte ? `[${p.tipoParte}]` : "", bold: true, size: 18, font: "Arial", color: "C00000" })
          ]
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({ text: "CPF: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.cpf || "________________", size: 20, font: "Arial" }),
            new TextRun({ text: "   |   RG: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.rg || "________________", size: 20, font: "Arial" })
          ]
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({ text: "Pai: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.pai || "________________", size: 20, font: "Arial" }),
            new TextRun({ text: "   |   Mãe: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.mae || "________________", size: 20, font: "Arial" })
          ]
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({ text: "Data de Nascimento: ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: p.dataNascimento || "____/____/____", size: 20, font: "Arial" })
          ]
        })
      );
      if (p.endereco) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({ text: "Endereço: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: p.endereco, size: 20, font: "Arial" })
            ]
          })
        );
      }
      if (p.telefone || p.email) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({ text: "Contato: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `${p.telefone || ''} ${p.email ? ' | ' + p.email : ''}`.trim(), size: 20, font: "Arial" })
            ]
          })
        );
      }
    });

    children.push(
      new Paragraph({
        spacing: { before: 240, after: 60 },
        children: [new TextRun({ text: "Atenciosamente,", size: 20, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [new TextRun({ text: "Oficial de Promotoria - MPSP", bold: true, size: 20, font: "Arial" })]
      })
    );

    sections.push({
      properties: {
        page: {
          margin: { top: 1418, bottom: 1134, left: 1418, right: 1134 }
        }
      },
      children
    });
  }

  const doc = new Document({ sections });
  return await Packer.toBlob(doc);
}

export function downloadDocxBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
