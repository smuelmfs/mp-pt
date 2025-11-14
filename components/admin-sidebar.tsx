"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  Building2, 
  Layers, 
  Package, 
  Printer, 
  Scissors, 
  TrendingUp, 
  Cog,
  BookOpen,
  User,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Clientes",
    href: "/customers",
    icon: Users,
    description: "Cadastre clientes e configure preços específicos"
  },
  {
    title: "Fornecedores",
    href: "/suppliers",
    icon: Building2,
    description: "Gerencie fornecedores de materiais"
  },
  {
    title: "Categorias",
    href: "/categories",
    icon: Layers,
    description: "Organize produtos em categorias"
  },
  {
    title: "Materiais",
    href: "/materials",
    icon: Package,
    description: "Configure materiais e variantes"
  },
  {
    title: "Impressões",
    href: "/printing",
    icon: Printer,
    description: "Configure tecnologias de impressão"
  },
  {
    title: "Acabamentos",
    href: "/finishes",
    icon: Scissors,
    description: "Configure acabamentos disponíveis"
  },
  {
    title: "Margens",
    href: "/margins",
    icon: TrendingUp,
    description: "Defina regras de margem e descontos"
  },
  {
    title: "Produtos",
    href: "/products",
    icon: Package,
    description: "Crie e configure produtos"
  },
  {
    title: "Configurações",
    href: "/config",
    icon: Cog,
    description: "Configurações gerais do sistema"
  }
];

interface AdminSidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isMobile = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div 
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
          {/* Botão de fechar no mobile */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-[#341601] uppercase tracking-wider">
              Menu
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#F6EEE8] transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <SidebarContent 
            pathname={pathname}
            onLinkClick={onClose}
          />
        </aside>
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-40 hidden lg:block">
      <SidebarContent 
        pathname={pathname}
      />
    </aside>
  );
}

function SidebarContent({ 
  pathname,
  onLinkClick 
}: { 
  pathname: string;
  onLinkClick?: () => void;
}) {
  const handleLinkClick = () => {
    if (onLinkClick) {
      // Pequeno delay para permitir a navegação antes de fechar
      setTimeout(() => {
        onLinkClick();
      }, 100);
    }
  };

  return (
    <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#341601] uppercase tracking-wider mb-2">
            Menu Admin
          </h2>
          <p className="text-xs text-gray-600">
            Gerencie clientes, fornecedores, materiais e produtos
          </p>
        </div>

        {/* Botão para iniciar wizard */}
        <div className="mb-6">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('startProductWizard'));
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F66807] text-white font-medium rounded-lg hover:bg-[#F66807]/90 transition-colors shadow-sm"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm">Criar Produto Guiado</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Fluxo passo a passo para criar um produto completo
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-[#F6EEE8] hover:text-[#341601]",
                  isActive && "bg-[#F6EEE8] text-[#341601] font-medium",
                  !isActive && "text-gray-700"
                )}
              >
                {/* Icon */}
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive && "text-[#F66807]",
                  !isActive && "text-gray-400 group-hover:text-gray-600"
                )} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{item.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Help Link */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-1">
          <Link
            href="/guide"
            onClick={handleLinkClick}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#341601] hover:bg-[#F6EEE8] rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manual do Admin</span>
          </Link>
          <Link
            href="/profile"
            onClick={handleLinkClick}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#341601] hover:bg-[#F6EEE8] rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Meu Perfil</span>
          </Link>
        </div>
      </div>
  );
}

