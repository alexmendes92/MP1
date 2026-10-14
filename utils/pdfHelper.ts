/**
 * Utilitário central de processamento e extração de PDFs para o aplicativo MPSP
 * Garante extração de texto em alta velocidade, tratamento de erros e normalização de MIME types.
 */

export interface PdfExtractionResult {
  text: string;
  numPages: number;
  success: boolean;
  error?: string;
}

/**
 * Normaliza o MIME type de qualquer arquivo, evitando erros de "Invalid MIME type" na API do Gemini
 */
export function normalizeMimeType(file: File): string {
  if (file.type && file.type.trim()) {
    return file.type.trim();
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

/**
 * Converte um arquivo para Base64 de forma segura, retornando os dados e o MIME type garantido
 */
export async function fileToBase64Safe(file: File): Promise<{ data: string; mimeType: string }> {
  const mimeType = normalizeMimeType(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const data = res.includes(',') ? res.split(',')[1] : res;
      resolve({ data, mimeType });
    };
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Verifica se um arquivo é PDF
 */
export function isPdfFile(file: File): boolean {
  return normalizeMimeType(file) === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Extrai o texto contido em um arquivo PDF através do backend de alta performance
 */
export async function extractTextFromPdfFile(file: File): Promise<PdfExtractionResult> {
  try {
    const { data: base64 } = await fileToBase64Safe(file);
    const response = await fetch('/api/pdf/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileBase64: base64,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        text: result.text || '',
        numPages: result.numPages || 1,
        success: true,
      };
    }

    const errData = await response.json().catch(() => ({}));
    return {
      text: '',
      numPages: 1,
      success: false,
      error: errData.error || `Erro HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      text: '',
      numPages: 1,
      success: false,
      error: error?.message || 'Falha ao extrair texto do PDF',
    };
  }
}
