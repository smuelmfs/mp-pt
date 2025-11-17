"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  CheckCircle2,
  Layers,
  Package,
  FileText,
  Users,
  CalendarDays,
  Info,
  ArrowLeft,
} from "lucide-react";

const guideSections = [
  {
    id: "overview",
    title: "Visão Geral",
    icon: BookOpen,
    content: `
      <p>Este manual foi criado para a equipa comercial do MyPrint.pt. Aqui você encontra instruções alinhadas com o fluxo atual para navegar pelos produtos, configurar orçamentos e acompanhar propostas.</p>
      <p className="mt-4">Use o menu superior (Produtos · Orçamentos · Manual) para alternar rapidamente entre as etapas enquanto atende o cliente.</p>
    `,
  },
  {
    id: "workflow",
    title: "Fluxo de Trabalho",
    icon: CheckCircle2,
    content: `
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Selecionar Produto:</strong> Abra <em>Produtos</em>, pesquise ou filtre e, se necessário, ative <em>Selecionar Múltiplos</em> para um orçamento combinado.</li>
        <li><strong>Configurar e Calcular:</strong> No configurador escolha o cliente (opcional), preencha os grupos obrigatórios, defina a quantidade e gere o preço.</li>
        <li><strong>Salvar:</strong> Assim que o preço aparecer, use <em>Salvar Orçamento</em> (ou <em>Próximo Produto</em> no modo multi-quote) para gravar o resultado.</li>
        <li><strong>Acompanhar:</strong> Consulte a lista em <em>Orçamentos</em>, abra os detalhes para exportar PDF/Excel, editar notas ou excluir, e faça follow-up com os filtros.</li>
      </ol>
    `,
  },
  {
    id: "categories",
    title: "Navegação por Produtos",
    icon: Layers,
    content: `
      <p>A página de produtos reúne tudo o que precisa para encontrar rapidamente o item correto:</p>
      <ul className="list-disc list-inside mt-4 space-y-1">
        <li><strong>Pesquisa:</strong> Busque por nome do produto ou tipo de material.</li>
        <li><strong>Filtros:</strong> Refinam por material, acabamento, tecnologia/formato de impressão e cliente.</li>
        <li><strong>Abas de Categorias:</strong> Os botões no topo filtram dinamicamente cada categoria cadastrada pelo admin.</li>
        <li><strong>Selecionar Múltiplos:</strong> Ative o modo para escolher dois ou mais produtos e gerar orçamentos em sequência. O botão <em>Orçar X Produtos</em> abre um modal para informar o cliente.</li>
      </ul>
      <p className="mt-4">Clique em um card para abrir o configurador do produto escolhido ou siga o fluxo guiado caso esteja no modo multi-quote.</p>
    `,
  },
  {
    id: "configurator",
    title: "Configurador de Orçamentos",
    icon: Package,
    content: `
      <p>O configurador concentra tudo o que é necessário para montar o orçamento:</p>
      <ul className="list-disc list-inside space-y-1 mt-4">
        <li><strong>Cliente (opcional):</strong> Selecionar um cliente aplica automaticamente as regras comerciais configuradas pelo admin. No modo multi-quote, o painel azul mostra o cliente definido no modal.</li>
        <li><strong>Grupos de Opções:</strong> Campos marcados com * são obrigatórios. Alguns grupos permitem múltiplas escolhas (acabamentos) e exibem o total selecionado.</li>
        <li><strong>Quantidade:</strong> Digite qualquer valor ou use os botões de tiragens sugeridas.</li>
        <li><strong>Preço em tempo real:</strong> Após preencher os campos obrigatórios o cartão “Preço Unitário” mostra bruto, líquido e IVA. O quadro “Detalhamento dos Custos” abre cada item.</li>
        <li><strong>Grade de Preços:</strong> Use o botão “Gerar Grade” para montar automaticamente uma tabela com outras quantidades.</li>
        <li><strong>Fluxo Multi-Quote:</strong> Quando mais de um produto foi selecionado, o painel inferior exibe o progresso (Produto 1 de N) e libera o botão Próximo/Salvar Completo.</li>
      </ul>
      <p className="mt-4">Assim que o preço estiver disponível, o botão “Salvar Orçamento” (ou “Salvar Orçamento Completo”) fica ativo para gravar a proposta.</p>
    `,
  },
  {
    id: "quotes",
    title: "Página de Orçamentos",
    icon: FileText,
    content: `
      <p>Em <strong>Orçamentos</strong> ficam todos os registros criados pela equipa comercial:</p>
      <ul className="list-disc list-inside space-y-1 mt-4">
        <li>Os cartões superiores mostram o total de orçamentos, o valor acumulado e o último número criado.</li>
        <li>Use a busca livre e os filtros (cliente, produto e intervalo de datas) para localizar propostas específicas — o botão “Mostrar/Ocultar Filtros” revela os campos extras.</li>
        <li>“Atualizar” recarrega a lista e “Novo Orçamento” abre a página de produtos.</li>
        <li>Cada linha traz número, data, cliente, quantidade e valor, além do botão “Ver Detalhes”. A exportação em PDF/Excel ocorre dentro da página de detalhes.</li>
      </ul>
      <p className="mt-4">A listagem é ordenada pelos orçamentos mais recentes e não utiliza status — priorize pelo número e pela data exibidos.</p>
    `,
  },
  {
    id: "customers",
    title: "Clientes e Condições",
    icon: Users,
    content: `
      <p>Os clientes ativos cadastrados no admin aparecem diretamente nos seletores do configurador e do modal multi-quote.</p>
      <ul className="list-disc list-inside mt-4 space-y-1">
        <li><strong>Cliente cadastrado:</strong> aplica margens, descontos ou impostos personalizados automaticamente.</li>
        <li><strong>Cliente manual (multi-quote):</strong> escolha “Informar Nome do Solicitante” no modal para registrar quem solicitou mesmo sem cadastro.</li>
        <li><strong>Sem cliente:</strong> os preços padrão do produto/categoria são utilizados.</li>
      </ul>
      <p className="mt-4">Se precisar de um novo cliente fixo, solicite ao administrador do sistema para que ele apareça nos filtros e seletores.</p>
    `,
  },
  {
    id: "followup",
    title: "Histórico e Follow-up",
    icon: CalendarDays,
    content: `
      <p>Abra um orçamento específico (botão “Ver Detalhes”) para realizar ações adicionais:</p>
      <ul className="list-disc list-inside space-y-1 mt-4">
        <li>Gerar PDF ou Excel com um clique.</li>
        <li>Editar e salvar notas comerciais diretamente no card “Notas Internas”.</li>
        <li>Excluir o orçamento (com confirmação) quando necessário.</li>
        <li>Consultar todo o detalhamento de itens, custos e totais gravados.</li>
      </ul>
      <p className="mt-4">Use os filtros da página principal para planejar follow-up semanal/mensal e reaproveite os dados do orçamento salvo como referência.</p>
    `,
  },
  {
    id: "faq",
    title: "Dúvidas Frequentes",
    icon: Info,
    content: `
      <dl className="space-y-4">
        <div>
          <dt className="font-semibold text-[#341601]">Posso editar preços manualmente?</dt>
          <dd className="text-sm text-gray-600 mt-1">Os preços são calculados automaticamente a partir das regras de materiais, impressões e margens. Caso precise de uma condição especial, fale com o administrador para ajustar as regras.</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#341601]">Como faço um orçamento com vários produtos?</dt>
          <dd className="text-sm text-gray-600 mt-1">Na página Produtos clique em “Selecionar Múltiplos”, marque os itens desejados e avance em “Orçar X Produtos”. O sistema guiará produto por produto até salvar tudo.</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#341601]">E se o cliente ainda não estiver cadastrado?</dt>
          <dd className="text-sm text-gray-600 mt-1">Selecione “Informar Nome do Solicitante” no modal multi-quote ou deixe sem cliente no configurador. Depois comunique o admin para criar o cadastro definitivo.</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#341601]">Onde baixo o PDF/Excel?</dt>
          <dd className="text-sm text-gray-600 mt-1">Abra o orçamento em <em>Orçamentos &gt; Ver Detalhes</em> e use os botões “Exportar PDF” ou “Exportar Excel” no topo da página.</dd>
        </div>
      </dl>
    `,
  },
];

export default function CommercialGuidePage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <Link href="/quotes/categories">
            <Button
              variant="ghost"
              className="mb-4 text-sm sm:text-base !text-[#341601] !bg-white hover:!bg-gray-50 hover:!text-[#F66807] border border-gray-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Produtos
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-[#F66807]" />
            <h1 className="text-3xl font-bold text-[#341601]">Manual Comercial</h1>
          </div>
          <p className="text-gray-600">Guia prático para criar e gerir orçamentos no MyPrint.pt</p>
        </div>

        <Card className="mb-6 bg-white">
          <CardHeader>
            <CardTitle className="text-[#341601]">Índice</CardTitle>
            <CardDescription>Selecione um tópico para navegar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {guideSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(activeSection === section.id ? null : section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? "bg-[#F6EEE8] text-[#341601]"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {guideSections.map((section) => (
            <Card key={section.id} id={section.id} className="bg-white">
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
      </div>
    </main>
  );
}

