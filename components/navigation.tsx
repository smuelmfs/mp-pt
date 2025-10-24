"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Settings, 
  LogOut, 
  User,
  Menu,
  X,
  Building2,
  Calculator,
  Layers,
  Printer,
  Scissors,
  TrendingUp,
  Cog
} from "lucide-react";

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdmin = pathname.startsWith('/products') || 
                  pathname.startsWith('/materials') || 
                  pathname.startsWith('/printing') || 
                  pathname.startsWith('/finishes') || 
                  pathname.startsWith('/margins') || 
                  pathname.startsWith('/config') ||
                  pathname.startsWith('/categories');

  const isCommercial = pathname.startsWith('/quotes') || 
                      pathname.startsWith('/quotes/categories') || 
                      pathname.startsWith('/quotes/configurator');

  const commercialNavItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      description: "Visão geral do sistema"
    },
    {
      title: "Orçamentos",
      href: "/quotes",
      icon: FileText,
      description: "Gerenciar orçamentos"
    },
    {
      title: "Categorias",
      href: "/quotes/categories",
      icon: Layers,
      description: "Navegar por categorias"
    }
  ];

  const adminNavItems = [
    {
      title: "Produtos",
      href: "/products",
      icon: Package,
      description: "Gerenciar produtos"
    },
    {
      title: "Materiais",
      href: "/materials",
      icon: Building2,
      description: "Configurar materiais"
    },
    {
      title: "Impressões",
      href: "/printing",
      icon: Printer,
      description: "Tecnologias de impressão"
    },
    {
      title: "Acabamentos",
      href: "/finishes",
      icon: Scissors,
      description: "Configurar acabamentos"
    },
    {
      title: "Margens",
      href: "/margins",
      icon: TrendingUp,
      description: "Regras de margem"
    },
    {
      title: "Categorias",
      href: "/categories",
      icon: Layers,
      description: "Organizar categorias"
    },
    {
      title: "Configurações",
      href: "/config",
      icon: Cog,
      description: "Configurações gerais"
    }
  ];

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/dev/logout', {
        method: 'POST',
      });
      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 group-hover:bg-slate-800 transition-colors">
                  <Calculator className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-slate-900">MP-PT</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 group-hover:bg-slate-800 transition-colors">
                <Calculator className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">MP-PT</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Comercial Navigation */}
                {!isAdmin && (
                  <>
                    {commercialNavItems.map((item) => (
                      <NavigationMenuItem key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link 
                            href={item.href}
                            className={`group inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none ${
                              pathname === item.href 
                                ? 'bg-slate-100 text-slate-900' 
                                : 'text-slate-600'
                            }`}
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            {item.title}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </>
                )}

                {/* Admin Navigation */}
                {isAdmin && (
                  <>
                    {adminNavItems.map((item) => (
                      <NavigationMenuItem key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link 
                            href={item.href}
                            className={`group inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none ${
                              pathname === item.href 
                                ? 'bg-slate-100 text-slate-900' 
                                : 'text-slate-600'
                            }`}
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            {item.title}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-slate-100">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="User" />
                    <AvatarFallback className="bg-slate-100 text-slate-700">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-900">Usuário</p>
                    <p className="text-xs leading-none text-slate-500">
                      Sistema MP-PT
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-slate-700 hover:bg-slate-100">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-slate-200">
              {/* Comercial Navigation */}
              {!isAdmin && (
                <>
                  {commercialNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.title}
                    </Link>
                  ))}
                </>
              )}

              {/* Admin Navigation */}
              {isAdmin && (
                <>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.title}
                    </Link>
                  ))}
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </header>
  );
}
