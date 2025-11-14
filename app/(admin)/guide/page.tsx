"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Building2, 
  Layers, 
  Package, 
  Printer, 
  Scissors, 
  TrendingUp, 
  Cog,
  ArrowLeft,
  CheckCircle2,
  Info,
  BookOpen
} from "lucide-react";

const guideSections = [
  {
    id: "overview",
    title: "Visão Geral",
    icon: BookOpen,
    content: `
      <p>Bem-vindo ao painel administrativo do MyPrint.pt! Este manual irá guiá-lo através de todo o processo de configuração do sistema.</p>
      <p className="mt-4">O sistema foi projetado para seguir uma ordem lógica de configuração, garantindo que todos os componentes necessários estejam prontos antes de criar produtos.</p>
    `
  },
  {
    id: "workflow",
    title: "Fluxo de Trabalho",
    icon: CheckCircle2,
    content: `
      <p>Para criar um produto completo e funcional, siga esta ordem:</p>
      <ol className="list-decimal list-inside mt-4 space-y-2">
        <li><strong>Clientes</strong> - Cadastre os clientes que usarão o sistema</li>
        <li><strong>Fornecedores</strong> - Configure fornecedores de materiais</li>
        <li><strong>Categorias</strong> - Organize produtos em categorias</li>
        <li><strong>Materiais</strong> - Configure materiais e suas variantes</li>
        <li><strong>Impressões</strong> - Configure tecnologias de impressão</li>
        <li><strong>Acabamentos</strong> - Configure acabamentos disponíveis</li>
        <li><strong>Margens</strong> - Defina regras de margem e descontos</li>
        <li><strong>Produtos</strong> - Crie e configure os produtos finais</li>
        <li><strong>Configurações</strong> - Ajuste configurações gerais</li>
      </ol>
    `
  },
  {
    id: "customers",
    title: "1. Clientes",
    icon: Users,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Clientes?</h3>
      <p>Clientes são as empresas ou pessoas que receberão orçamentos. Cada cliente pode ter preços personalizados para materiais, impressões e acabamentos.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Cadastro de informações básicas (nome, email, NIF)</li>
        <li>Agrupamento de clientes em grupos</li>
        <li>Preços personalizados por cliente</li>
        <li>Controle de clientes ativos/inativos</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Quando usar:</h3>
      <p>Configure clientes antes de criar produtos se você quiser oferecer preços diferenciados ou descontos específicos.</p>
    `
  },
  {
    id: "suppliers",
    title: "2. Fornecedores",
    icon: Building2,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Fornecedores?</h3>
      <p>Fornecedores são empresas que fornecem materiais para produção. Eles podem ser associados a materiais para rastreamento de custos.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Cadastro de fornecedores com informações de contato</li>
        <li>Associação de fornecedores a materiais</li>
        <li>Rastreamento de custos por fornecedor</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Quando usar:</h3>
      <p>Configure fornecedores antes de cadastrar materiais, especialmente se você quiser rastrear custos de diferentes fornecedores.</p>
    `
  },
  {
    id: "categories",
    title: "3. Categorias",
    icon: Layers,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Categorias?</h3>
      <p>Categorias organizam produtos em grupos lógicos (ex: "Flyers", "Cartões de Visita", "Banners"). Cada categoria pode ter configurações próprias de arredondamento, estratégia de preço e margem padrão.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Organização hierárquica de produtos</li>
        <li>Configurações de arredondamento por categoria</li>
        <li>Estratégias de precificação por categoria</li>
        <li>Margem padrão por categoria</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Quando usar:</h3>
      <p>Crie categorias antes de criar produtos. Isso ajuda a organizar e aplicar configurações comuns a grupos de produtos.</p>
    `
  },
  {
    id: "materials",
    title: "4. Materiais",
    icon: Package,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Materiais?</h3>
      <p>Materiais são os insumos básicos usados na produção (ex: papel, vinil, PVC). Cada material pode ter múltiplas variantes (ex: Couché 300g 66x96, pack 500).</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Termos importantes:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Unidade:</strong> Como o material é medido (unidade, m², lote, folha, hora)</li>
        <li><strong>Custo Unitário:</strong> Custo por unidade do material</li>
        <li><strong>Custo do Fornecedor:</strong> Custo específico do fornecedor (opcional)</li>
        <li><strong>Variante:</strong> Versão específica do material (ex: tamanho, gramatura)</li>
        <li><strong>Fator de Perda:</strong> Percentual de material perdido no processo</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Cadastro de materiais com custos</li>
        <li>Criação de variantes (tamanhos, gramaturas, etc.)</li>
        <li>Associação com fornecedores</li>
        <li>Preços personalizados por cliente</li>
        <li>Controle de versões (SCD2)</li>
      </ul>
    `
  },
  {
    id: "printing",
    title: "5. Impressões",
    icon: Printer,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Impressões?</h3>
      <p>Impressões são as tecnologias e métodos de impressão disponíveis (ex: Offset, Digital, UV, Grande Formato). Cada impressão tem custos, rendimentos e tempos de setup.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Termos importantes:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Tecnologia:</strong> Tipo de impressão (Offset, Digital, UV, Grande Formato)</li>
        <li><strong>Formato:</strong> Descrição do formato (ex: SRA3, Rolo 1,6m)</li>
        <li><strong>Cores:</strong> Configuração de cores (ex: 4x4, 4x0, 1x0)</li>
        <li><strong>Lados:</strong> Quantidade de lados (1 ou 2)</li>
        <li><strong>Preço Unitário:</strong> Custo por impressão/folha/tiro</li>
        <li><strong>Yield:</strong> Rendimento por formato</li>
        <li><strong>Setup:</strong> Tempo de acerto em minutos</li>
        <li><strong>Taxa Mínima:</strong> Valor mínimo para impressão</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Configuração de múltiplas tecnologias</li>
        <li>Preços personalizados por cliente</li>
        <li>Controle de versões</li>
      </ul>
    `
  },
  {
    id: "finishes",
    title: "6. Acabamentos",
    icon: Scissors,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Acabamentos?</h3>
      <p>Acabamentos são processos aplicados após a impressão (ex: laminação, verniz, corte, dobra). Cada acabamento tem um tipo de cálculo e pode ter custos mínimos.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Termos importantes:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Categoria:</strong> Tipo de acabamento (Laminação, Verniz, Corte, Dobra, Outros)</li>
        <li><strong>Unidade:</strong> Como é calculado (unidade, m², lote, hora)</li>
        <li><strong>Tipo de Cálculo:</strong> Como o preço é calculado:
          <ul className="list-disc list-inside ml-4 mt-1">
            <li><strong>PER_UNIT:</strong> Por unidade</li>
            <li><strong>PER_M2:</strong> Por metro quadrado</li>
            <li><strong>PER_LOT:</strong> Por lote</li>
            <li><strong>PER_HOUR:</strong> Por hora</li>
          </ul>
        </li>
        <li><strong>Custo Base:</strong> Custo inicial do acabamento</li>
        <li><strong>Taxa Mínima:</strong> Valor mínimo para aplicar o acabamento</li>
        <li><strong>Degrau de Área:</strong> Incremento de área para cálculo (opcional)</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Configuração de múltiplos acabamentos</li>
        <li>Diferentes tipos de cálculo</li>
        <li>Preços personalizados por cliente</li>
        <li>Controle de versões</li>
      </ul>
    `
  },
  {
    id: "margins",
    title: "7. Margens",
    icon: TrendingUp,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Margens?</h3>
      <p>Margens são regras que definem o lucro sobre os custos. Podem ser fixas ou dinâmicas (promoções/descontos).</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Tipos de Margem:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Margem Fixa:</strong> Percentual fixo aplicado (ex: 30%)</li>
        <li><strong>Margem Dinâmica:</strong> Ajustes baseados em condições:
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>Subtotal mínimo</li>
            <li>Quantidade mínima</li>
            <li>Ajuste percentual (desconto ou acréscimo)</li>
            <li>Pode ser acumulável (stackable)</li>
          </ul>
        </li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Escopos:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GLOBAL:</strong> Aplica a todos os produtos</li>
        <li><strong>CATEGORY:</strong> Aplica a uma categoria</li>
        <li><strong>PRODUCT:</strong> Aplica a um produto específico</li>
        <li><strong>CUSTOMER:</strong> Aplica a um cliente específico</li>
        <li><strong>CUSTOMER_GROUP:</strong> Aplica a um grupo de clientes</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Regras de margem fixa por escopo</li>
        <li>Promoções e descontos dinâmicos</li>
        <li>Priorização de regras</li>
        <li>Períodos de validade</li>
      </ul>
    `
  },
  {
    id: "products",
    title: "8. Produtos",
    icon: Package,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Produtos?</h3>
      <p>Produtos são os itens finais que podem ser orçados. Eles combinam materiais, impressões e acabamentos em uma configuração completa.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Componentes de um Produto:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Categoria:</strong> Categoria à qual pertence</li>
        <li><strong>Materiais:</strong> Materiais necessários e quantidades</li>
        <li><strong>Impressão:</strong> Tecnologia de impressão associada</li>
        <li><strong>Acabamentos:</strong> Acabamentos disponíveis</li>
        <li><strong>Dimensões:</strong> Tamanhos padrão do produto</li>
        <li><strong>Opções:</strong> Grupos de opções configuráveis (ex: Papel, Tamanho)</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Configurações do Produto:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Margem padrão</li>
        <li>Markup operacional</li>
        <li>Arredondamento</li>
        <li>Estratégia de precificação</li>
        <li>Preço mínimo por peça</li>
        <li>Quantidade mínima de pedido</li>
        <li>Valor mínimo de pedido</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Funcionalidades:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Criação de produtos completos</li>
        <li>Configuração de opções e variantes</li>
        <li>Preços personalizados por cliente</li>
        <li>Tiragens sugeridas</li>
        <li>Modo de sourcing (interno/fornecedor/híbrido)</li>
      </ul>
    `
  },
  {
    id: "config",
    title: "9. Configurações",
    icon: Cog,
    content: `
      <h3 className="font-semibold text-lg mb-2">O que são Configurações?</h3>
      <p>Configurações globais que afetam todo o sistema. São valores padrão que podem ser sobrescritos por categoria ou produto.</p>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Configurações Disponíveis:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Margem Padrão:</strong> Margem padrão aplicada globalmente</li>
        <li><strong>Markup Operacional:</strong> Markup padrão para custos operacionais</li>
        <li><strong>Degrau de Arredondamento:</strong> Incremento para arredondamento (ex: 0.05)</li>
        <li><strong>Estratégia de Arredondamento:</strong> Quando arredondar (só no final ou por etapa)</li>
        <li><strong>Estratégia de Precificação:</strong> Como calcular o preço final</li>
        <li><strong>Fator de Perda Global:</strong> Percentual de perda padrão</li>
        <li><strong>Tempo de Setup:</strong> Tempo padrão de setup</li>
        <li><strong>Custo por Hora de Impressão:</strong> Para cálculo de setup</li>
        <li><strong>Percentual de IVA:</strong> Taxa de IVA aplicada</li>
      </ul>
      
      <h3 className="font-semibold text-lg mt-4 mb-2">Hierarquia de Configurações:</h3>
      <p>As configurações seguem esta ordem de prioridade:</p>
      <ol className="list-decimal list-inside mt-2 space-y-1">
        <li>Configuração do produto (maior prioridade)</li>
        <li>Configuração da categoria</li>
        <li>Configuração global (menor prioridade)</li>
      </ol>
    `
  },
  {
    id: "glossary",
    title: "Glossário de Termos",
    icon: Info,
    content: `
      <dl className="space-y-4">
        <div>
          <dt className="font-semibold text-[#341601]">Arredondamento</dt>
          <dd className="text-sm text-gray-600 mt-1">Processo de ajustar valores para múltiplos de um degrau (ex: 0.05). Pode ser aplicado só no final ou em cada etapa.</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Estratégia de Precificação</dt>
          <dd className="text-sm text-gray-600 mt-1">Método usado para calcular o preço final:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><strong>COST_MARKUP_MARGIN:</strong> subtotal × (1 + markup) × (1 + margem)</li>
              <li><strong>COST_MARGIN_ONLY:</strong> subtotal × (1 + margem)</li>
              <li><strong>MARGIN_TARGET:</strong> preço = subtotal / (1 - margem alvo)</li>
            </ul>
          </dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Fator de Perda</dt>
          <dd className="text-sm text-gray-600 mt-1">Percentual de material perdido durante a produção (ex: 5% = 0.05). Usado para calcular a quantidade real necessária.</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Markup</dt>
          <dd className="text-sm text-gray-600 mt-1">Acréscimo sobre o custo para cobrir despesas operacionais antes de aplicar a margem de lucro.</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Margem</dt>
          <dd className="text-sm text-gray-600 mt-1">Percentual de lucro sobre o custo total (incluindo markup). Ex: 30% de margem significa que o preço final é 30% maior que o custo.</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">SCD2</dt>
          <dd className="text-sm text-gray-600 mt-1">Slowly Changing Dimension Type 2 - Sistema que mantém histórico de alterações, permitindo rastrear versões antigas de materiais, impressões e acabamentos.</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Setup</dt>
          <dd className="text-sm text-gray-600 mt-1">Tempo necessário para preparar a máquina antes de iniciar a produção. Pode ser calculado por tempo × custo/hora ou taxa fixa.</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Variante</dt>
          <dd className="text-sm text-gray-600 mt-1">Versão específica de um material com características próprias (ex: Couché 300g 66x96, pack 500 folhas).</dd>
        </div>
        
        <div>
          <dt className="font-semibold text-[#341601]">Yield</dt>
          <dd className="text-sm text-gray-600 mt-1">Rendimento por formato de impressão. Quantas unidades podem ser impressas em um único tiro/formato.</dd>
        </div>
      </dl>
    `
  }
];

export default function AdminGuidePage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/products">
            <Button
              variant="ghost"
              className="mb-4 text-sm sm:text-base !text-[#341601] !bg-white hover:!bg-gray-50 hover:!text-[#F66807] border border-gray-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Admin
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-[#F66807]" />
            <h1 className="text-3xl font-bold text-[#341601]">Manual do Administrador</h1>
          </div>
          <p className="text-gray-600">Guia completo para configurar e usar o sistema MyPrint.pt</p>
        </div>

        {/* Table of Contents */}
        <Card className="mb-6 bg-white">
          <CardHeader>
            <CardTitle className="text-[#341601]">Índice</CardTitle>
            <CardDescription>Navegue pelos tópicos abaixo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {guideSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(activeSection === section.id ? null : section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-[#F6EEE8] text-[#341601]'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <div className="space-y-6">
          {guideSections.map((section) => (
            <Card
              key={section.id}
              id={section.id}
              className="bg-white"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon className="h-6 w-6 text-[#F66807]" />
                  <CardTitle className="text-[#341601]">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Precisa de ajuda? Entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    </main>
  );
}

