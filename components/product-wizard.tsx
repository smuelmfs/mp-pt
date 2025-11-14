"use client";

import { useProductWizard } from "@/contexts/product-wizard-context";
import { X } from "lucide-react";
import { WizardStepCustomer } from "@/components/wizard-steps/wizard-step-customer";
import { WizardStepSupplier } from "@/components/wizard-steps/wizard-step-supplier";
import { WizardStepCategory } from "@/components/wizard-steps/wizard-step-category";
import { WizardStepMaterial } from "@/components/wizard-steps/wizard-step-material";
import { WizardStepPrinting } from "@/components/wizard-steps/wizard-step-printing";
import { WizardStepFinish } from "@/components/wizard-steps/wizard-step-finish";
import { WizardStepProduct } from "@/components/wizard-steps/wizard-step-product";
import { WizardStepMargin } from "@/components/wizard-steps/wizard-step-margin";

const WIZARD_STEPS = [
  { id: 0, title: "Cliente", description: "Selecione ou crie um cliente" },
  { id: 1, title: "Fornecedor", description: "Selecione ou crie um fornecedor" },
  { id: 2, title: "Categoria", description: "Selecione ou crie uma categoria" },
  { id: 3, title: "Material", description: "Selecione ou crie um material" },
  { id: 4, title: "Impressão", description: "Selecione ou crie uma impressão" },
  { id: 5, title: "Acabamento", description: "Selecione ou crie um acabamento" },
  { id: 6, title: "Produto", description: "Configure o produto" },
  { id: 7, title: "Margem", description: "Configure a margem" },
];

export function ProductWizard() {
  const { isActive, currentStep, stopWizard } = useProductWizard();

  if (!isActive) return null;

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const currentStepInfo = WIZARD_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#341601]">Criar Produto Guiado</h2>
            <p className="text-sm text-gray-600 mt-1">{currentStepInfo.description}</p>
          </div>
          <button
            onClick={stopWizard}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar wizard"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Passo {currentStep + 1} de {WIZARD_STEPS.length}
            </span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#F66807] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex items-center justify-between mt-4">
            {WIZARD_STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`
                  flex-1 flex items-center
                  ${idx < WIZARD_STEPS.length - 1 ? 'mr-2' : ''}
                `}
              >
                <div
                  className={`
                    flex-1 h-1 rounded
                    ${idx <= currentStep ? 'bg-[#F66807]' : 'bg-gray-300'}
                  `}
                />
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                    ${idx < currentStep ? 'bg-[#F66807] text-white' : ''}
                    ${idx === currentStep ? 'bg-[#F66807] text-white ring-2 ring-[#F66807] ring-offset-2' : ''}
                    ${idx > currentStep ? 'bg-gray-300 text-gray-600' : ''}
                  `}
                >
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 rounded ml-2
                      ${idx < currentStep ? 'bg-[#F66807]' : 'bg-gray-300'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 0 && <WizardStepCustomer />}
          {currentStep === 1 && <WizardStepSupplier />}
          {currentStep === 2 && <WizardStepCategory />}
          {currentStep === 3 && <WizardStepMaterial />}
          {currentStep === 4 && <WizardStepPrinting />}
          {currentStep === 5 && <WizardStepFinish />}
          {currentStep === 6 && <WizardStepProduct />}
          {currentStep === 7 && <WizardStepMargin />}
        </div>

        {/* Footer - Os botões de navegação estão dentro de cada componente de passo */}
      </div>
    </div>
  );
}

