/**
 * Sistema de rastreamento de progresso do admin baseado em ações reais
 */

export type ProgressStep = 
  | 'customers' 
  | 'suppliers' 
  | 'categories' 
  | 'materials' 
  | 'printing' 
  | 'finishes' 
  | 'margins' 
  | 'products' 
  | 'config';

const STEP_MAP: Record<ProgressStep, number> = {
  customers: 1,
  suppliers: 2,
  categories: 3,
  materials: 4,
  printing: 5,
  finishes: 6,
  margins: 7,
  products: 8,
  config: 9,
};

const STORAGE_KEY = 'admin-progress';

export interface AdminProgress {
  completedSteps: ProgressStep[];
  lastUpdated: number;
}

/**
 * Carrega o progresso salvo do localStorage
 */
export function loadProgress(): AdminProgress {
  if (typeof window === 'undefined') {
    return { completedSteps: [], lastUpdated: 0 };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AdminProgress;
      // Valida se tem a estrutura correta
      if (Array.isArray(parsed.completedSteps)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar progresso:', error);
  }

  return { completedSteps: [], lastUpdated: 0 };
}

/**
 * Salva o progresso no localStorage
 */
export function saveProgress(progress: AdminProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    // Dispara evento para atualizar componentes que escutam
    window.dispatchEvent(new CustomEvent('adminProgressUpdated', { detail: progress }));
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
  }
}

/**
 * Marca um passo como completo
 */
export function markStepComplete(step: ProgressStep): void {
  const progress = loadProgress();
  
  if (!progress.completedSteps.includes(step)) {
    progress.completedSteps.push(step);
    progress.lastUpdated = Date.now();
    saveProgress(progress);
  }
}

/**
 * Verifica se um passo está completo
 */
export function isStepComplete(step: ProgressStep): boolean {
  const progress = loadProgress();
  return progress.completedSteps.includes(step);
}

/**
 * Retorna o número do último passo completo
 */
export function getLastCompletedStep(): number {
  const progress = loadProgress();
  
  if (progress.completedSteps.length === 0) {
    return 0;
  }

  // Retorna o maior número de passo completo
  const stepNumbers = progress.completedSteps.map(step => STEP_MAP[step]);
  return Math.max(...stepNumbers, 0);
}

/**
 * Retorna o próximo passo a ser feito (baseado no último completo)
 */
export function getNextStep(): number {
  const lastCompleted = getLastCompletedStep();
  return lastCompleted + 1;
}

/**
 * Reseta todo o progresso (útil para testes ou reset manual)
 */
export function resetProgress(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('adminProgressUpdated', { 
    detail: { completedSteps: [], lastUpdated: Date.now() } 
  }));
}

