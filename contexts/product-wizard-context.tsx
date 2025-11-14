"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface WizardData {
  customerId?: number;
  supplierId?: number;
  categoryId?: number;
  materialIds: number[];
  printingId?: number;
  finishIds: number[];
  marginId?: number;
  productName?: string;
  productId?: number;
}

interface ProductWizardContextType {
  isActive: boolean;
  currentStep: number;
  data: WizardData;
  startWizard: () => void;
  stopWizard: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateData: (data: Partial<WizardData>) => void;
}

const ProductWizardContext = createContext<ProductWizardContextType | undefined>(undefined);

export function ProductWizardProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    materialIds: [],
    finishIds: [],
  });

  const startWizard = () => {
    setIsActive(true);
    setCurrentStep(0);
    setData({
      materialIds: [],
      finishIds: [],
    });
    // Salva no sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('productWizardActive', 'true');
    }
  };

  const stopWizard = () => {
    setIsActive(false);
    setCurrentStep(0);
    setData({
      materialIds: [],
      finishIds: [],
    });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('productWizardActive');
      sessionStorage.removeItem('productWizardData');
      sessionStorage.removeItem('productWizardStep');
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => {
      const newStep = prev + 1;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('productWizardStep', String(newStep));
      }
      return newStep;
    });
  };

  const prevStep = () => {
    setCurrentStep(prev => {
      const newStep = Math.max(0, prev - 1);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('productWizardStep', String(newStep));
      }
      return newStep;
    });
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('productWizardStep', String(step));
    }
  };

  const updateData = (newData: Partial<WizardData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('productWizardData', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Carrega estado do sessionStorage ao montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActive = sessionStorage.getItem('productWizardActive');
      if (savedActive === 'true') {
        setIsActive(true);
        const savedStep = sessionStorage.getItem('productWizardStep');
        if (savedStep) {
          setCurrentStep(Number(savedStep));
        }
        const savedData = sessionStorage.getItem('productWizardData');
        if (savedData) {
          try {
            setData(JSON.parse(savedData));
          } catch (e) {
            console.error('Erro ao carregar dados do wizard:', e);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProductWizardContext.Provider
      value={{
        isActive,
        currentStep,
        data,
        startWizard,
        stopWizard,
        nextStep,
        prevStep,
        goToStep,
        updateData,
      }}
    >
      {children}
    </ProductWizardContext.Provider>
  );
}

export function useProductWizard() {
  const context = useContext(ProductWizardContext);
  if (context === undefined) {
    throw new Error("useProductWizard must be used within a ProductWizardProvider");
  }
  return context;
}

