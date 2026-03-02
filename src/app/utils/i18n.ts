// Sistema de internacionalização (i18n)

export type Language = 'pt-BR' | 'en';

interface Translations {
  [key: string]: {
    'pt-BR': string;
    'en': string;
  };
}

const translations: Translations = {
  // Geral
  'app.title': {
    'pt-BR': 'Sistema de Gestão de Contratos',
    'en': 'Contract Management System',
  },
  'common.loading': {
    'pt-BR': 'Carregando...',
    'en': 'Loading...',
  },
  'common.save': {
    'pt-BR': 'Salvar',
    'en': 'Save',
  },
  'common.cancel': {
    'pt-BR': 'Cancelar',
    'en': 'Cancel',
  },
  'common.delete': {
    'pt-BR': 'Excluir',
    'en': 'Delete',
  },
  'common.edit': {
    'pt-BR': 'Editar',
    'en': 'Edit',
  },
  'common.export': {
    'pt-BR': 'Exportar',
    'en': 'Export',
  },
  'common.search': {
    'pt-BR': 'Pesquisar',
    'en': 'Search',
  },
  
  // Contratos
  'contracts.title': {
    'pt-BR': 'Contratos',
    'en': 'Contracts',
  },
  'contracts.new': {
    'pt-BR': 'Novo Contrato',
    'en': 'New Contract',
  },
  'contracts.number': {
    'pt-BR': 'Número do Contrato',
    'en': 'Contract Number',
  },
  'contracts.company': {
    'pt-BR': 'Empresa',
    'en': 'Company',
  },
  'contracts.manager': {
    'pt-BR': 'Gestor',
    'en': 'Manager',
  },
  'contracts.supervisor': {
    'pt-BR': 'Fiscal',
    'en': 'Supervisor',
  },
  'contracts.validity': {
    'pt-BR': 'Vigência',
    'en': 'Validity',
  },
  'contracts.value': {
    'pt-BR': 'Valor',
    'en': 'Value',
  },
  
  // Status
  'status.expired': {
    'pt-BR': 'Vencido',
    'en': 'Expired',
  },
  'status.critical': {
    'pt-BR': 'Crítico',
    'en': 'Critical',
  },
  'status.warning': {
    'pt-BR': 'Atenção',
    'en': 'Warning',
  },
  'status.safe': {
    'pt-BR': 'Seguro',
    'en': 'Safe',
  },
  
  // Notificações
  'notifications.title': {
    'pt-BR': 'Notificações',
    'en': 'Notifications',
  },
  'notifications.none': {
    'pt-BR': 'Nenhuma notificação',
    'en': 'No notifications',
  },
  
  // Dashboard
  'dashboard.title': {
    'pt-BR': 'Dashboard',
    'en': 'Dashboard',
  },
  'dashboard.totalContracts': {
    'pt-BR': 'Total de Contratos',
    'en': 'Total Contracts',
  },
  'dashboard.totalValue': {
    'pt-BR': 'Valor Total',
    'en': 'Total Value',
  },
  
  // Filtros
  'filters.advanced': {
    'pt-BR': 'Filtros Avançados',
    'en': 'Advanced Filters',
  },
  'filters.type': {
    'pt-BR': 'Tipo',
    'en': 'Type',
  },
  'filters.status': {
    'pt-BR': 'Situação',
    'en': 'Status',
  },
  'filters.clear': {
    'pt-BR': 'Limpar Filtros',
    'en': 'Clear Filters',
  },
  'filters.apply': {
    'pt-BR': 'Aplicar',
    'en': 'Apply',
  },
  
  // Documentos
  'documents.title': {
    'pt-BR': 'Documentos',
    'en': 'Documents',
  },
  'documents.upload': {
    'pt-BR': 'Enviar Documento',
    'en': 'Upload Document',
  },
  'documents.none': {
    'pt-BR': 'Nenhum documento anexado',
    'en': 'No documents attached',
  },
  
  // Comentários
  'comments.title': {
    'pt-BR': 'Comentários',
    'en': 'Comments',
  },
  'comments.add': {
    'pt-BR': 'Adicionar Comentário',
    'en': 'Add Comment',
  },
  'comments.approve': {
    'pt-BR': 'Aprovar',
    'en': 'Approve',
  },
  'comments.reject': {
    'pt-BR': 'Rejeitar',
    'en': 'Reject',
  },
  
  // Ajuda
  'help.title': {
    'pt-BR': 'Ajuda',
    'en': 'Help',
  },
  'help.manual': {
    'pt-BR': 'Manual do Usuário',
    'en': 'User Manual',
  },
};

class I18n {
  private currentLanguage: Language = 'pt-BR';

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
    // Salvar preferência no localStorage
    localStorage.setItem('app-language', lang);
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: string, fallback?: string): string {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation not found for key: ${key}`);
      return fallback || key;
    }
    return translation[this.currentLanguage] || fallback || key;
  }

  // Inicializar com linguagem salva ou detectar do navegador
  init() {
    const saved = localStorage.getItem('app-language') as Language;
    if (saved && (saved === 'pt-BR' || saved === 'en')) {
      this.currentLanguage = saved;
    } else {
      const browserLang = navigator.language;
      this.currentLanguage = browserLang.startsWith('pt') ? 'pt-BR' : 'en';
    }
  }
}

export const i18n = new I18n();

// Hook para React
import { useState, useEffect } from 'react';

export function useTranslation() {
  const [, setUpdate] = useState(0);
  
  const setLanguage = (lang: Language) => {
    i18n.setLanguage(lang);
    setUpdate(prev => prev + 1);
  };

  return {
    t: i18n.t.bind(i18n),
    language: i18n.getLanguage(),
    setLanguage,
  };
}
