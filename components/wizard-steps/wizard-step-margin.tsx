"use client";

import { useState, useEffect } from "react";
import { useProductWizard } from "@/contexts/product-wizard-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, CheckCircle } from "lucide-react";

export function WizardStepMargin() {
  const { data, stopWizard } = useProductWizard();
  const router = useRouter();
  const [productId, setProductId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Usa o ID do produto salvo no contexto
    if (data.productId) {
      setProductId(data.productId);
    }
  }, [data.productId]);

  async function handleFinish() {
    const finalProductId = productId || data.productId;
    console.log('Wizard finish - Product ID:', finalProductId);
    console.log('Wizard finish - Material IDs:', data.materialIds);
    console.log('Wizard finish - Finish IDs:', data.finishIds);
    
    if (finalProductId) {
      // Redireciona para a página do produto com os parâmetros do wizard
      stopWizard();
      
      // Filtra apenas IDs válidos (números finitos e maiores que 0)
      const validMaterialIds = data.materialIds.filter(id => Number.isFinite(id) && id > 0);
      const validFinishIds = data.finishIds.filter(id => Number.isFinite(id) && id > 0);
      
      console.log('Wizard finish - Valid Material IDs:', validMaterialIds);
      console.log('Wizard finish - Valid Finish IDs:', validFinishIds);
      
      const materialsParam = validMaterialIds.length > 0 
        ? `&materials=${validMaterialIds.join(",")}` 
        : "";
      const finishesParam = validFinishIds.length > 0 
        ? `&finishes=${validFinishIds.join(",")}` 
        : "";
      
      const url = `/products/${finalProductId}?wizard=true${materialsParam}${finishesParam}`;
      console.log('Wizard finish - Redirecting to:', url);
      
      router.push(url);
    } else {
      // Se não encontrou o produto, apenas fecha o wizard
      console.warn('Wizard finish - No product ID found');
      stopWizard();
      router.push("/products");
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <TrendingUp className="w-12 h-12 mx-auto text-[#F66807] mb-4" />
        <h3 className="text-xl font-semibold text-[#341601] mb-2">
          Configuração de Margem
        </h3>
        <p className="text-sm text-gray-600">
          Esta etapa é opcional. Você pode configurar margens específicas depois.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
        <h4 className="text-lg font-semibold text-green-800 mb-2">
          Produto criado com sucesso! 🎉
        </h4>
        <p className="text-sm text-green-700 mb-4">
          O produto <strong>{data.productName}</strong> foi criado com sucesso.
        </p>
        <div className="bg-white rounded-lg p-4 mb-4 text-left">
          <p className="text-sm font-semibold text-[#341601] mb-2">Resumo da configuração:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {data.categoryId && <li>✓ Categoria selecionada</li>}
            {data.materialIds.length > 0 && <li>✓ {data.materialIds.length} material(is) selecionado(s)</li>}
            {data.printingId && <li>✓ Impressão selecionada</li>}
            {data.finishIds.length > 0 && <li>✓ {data.finishIds.length} acabamento(s) selecionado(s)</li>}
          </ul>
        </div>
        <p className="text-xs text-gray-600">
          Você será redirecionado para configurar materiais e acabamentos no produto.
          Margens podem ser configuradas depois na página do produto.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleFinish}
          disabled={loading}
          className="bg-[#F66807] hover:bg-[#F66807]/90"
        >
          {loading ? "Finalizando..." : "Finalizar"}
        </Button>
      </div>
    </div>
  );
}

