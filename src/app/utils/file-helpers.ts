/**
 * Utilitários para manipulação de arquivos e conversão base64
 */

/**
 * Converte um arquivo para string base64
 * @param file arquivo a ser convertido
 * @returns Promise com a string base64 (sem o prefixo data:)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:application/...;base64," e retorna apenas o base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Converte uma string base64 de volta para Blob
 * @param base64 string base64 (sem o prefixo data:)
 * @param mimeType tipo MIME do arquivo
 * @returns Blob com o conteúdo do arquivo
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Faz download de um arquivo a partir de base64
 * @param base64 string base64 do arquivo
 * @param filename nome do arquivo para download
 * @param mimeType tipo MIME do arquivo
 */
export function downloadBase64File(base64: string, filename: string, mimeType: string): void {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Limpa a URL criada
  URL.revokeObjectURL(url);
}

/**
 * Formata o tamanho de um arquivo em bytes para formato legível
 * @param bytes tamanho em bytes
 * @returns string formatada (ex: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Valida se o arquivo é um tipo permitido
 * @param file arquivo a ser validado
 * @param allowedTypes tipos MIME permitidos
 * @returns true se o arquivo é válido
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Valida o tamanho máximo de um arquivo
 * @param file arquivo a ser validado
 * @param maxSizeInMB tamanho máximo em MB
 * @returns true se o arquivo está dentro do limite
 */
export function isValidFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Obtém o ícone apropriado para um tipo de arquivo
 * @param mimeType tipo MIME do arquivo
 * @returns nome do ícone
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') {
    return 'FileText';
  } else if (mimeType === 'application/msword' || 
             mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'FileType';
  }
  return 'File';
}
