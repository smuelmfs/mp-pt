"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, 
  User,
  Menu
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [isMounted, setIsMounted] = useState(false);
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    role: string | null;
  } | null>(null);
  const pathname = usePathname();

  const loadUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken(true);
        const res = await fetch("/api/me", {
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUserData({
            name: data.name || user.displayName || user.email?.split("@")[0] || "Usuário",
            email: data.email || user.email || "",
            role: data.role || null,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
      }
    } else {
      setUserData(null);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    
    loadUserData();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadUserData();
      } else {
        setUserData(null);
      }
    });

    const handleProfileUpdate = () => {
      loadUserData();
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [loadUserData]);

  if (pathname === "/login") {
    return null;
  }


  const handleLogout = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      
      await signOut(auth);
      document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      try {
        await fetch('/api/dev/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (fallbackError) {
        console.error('Erro no logout de fallback:', fallbackError);
      }
    }
  };

  // Verifica se está em uma rota admin (mesmo durante loading)
  const isAdminRoute = pathname.startsWith('/products') || 
                  pathname.startsWith('/materials') || 
                  pathname.startsWith('/printing') || 
                  pathname.startsWith('/finishes') || 
                  pathname.startsWith('/margins') || 
                  pathname.startsWith('/config') ||
                  pathname.startsWith('/categories') ||
                  pathname.startsWith('/customers') ||
                  pathname.startsWith('/suppliers') ||
                  pathname.startsWith('/guide');

  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent('openAdminSidebar'));
  };

  const isProductsSection =
    pathname === "/" ||
    pathname.startsWith("/quotes/categories") ||
    pathname.startsWith("/quotes/configurator");

  const isGuideSection = pathname.startsWith("/quotes/guide");

  const isQuotesSection =
    pathname.startsWith("/quotes") &&
    !isProductsSection &&
    !isGuideSection;

  const commercialNavItems = [
    {
      label: "Produtos",
      href: "/quotes/categories",
      active: isProductsSection,
    },
    {
      label: "Orçamentos",
      href: "/quotes",
      active: isQuotesSection,
    },
    {
      label: "Manual",
      href: "/quotes/guide",
      active: isGuideSection,
    },
  ];

  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[#F6EEE8] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              {isAdminRoute && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMenuClick}
                  className="lg:hidden h-9 w-9 p-0 hover:bg-[#F6EEE8]"
                >
                  <Menu className="h-5 w-5 text-[#341601]" />
                </Button>
              )}
              <Link href="/" className="flex items-center space-x-3 group">
                <img 
                  src="/logo.svg" 
                  alt="MyPrint.pt" 
                  className="h-8 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-[#F6EEE8] animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#F6EEE8] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botão do menu apenas para admin em mobile */}
            {isAdminRoute && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenuClick}
                className="lg:hidden h-9 w-9 p-0 hover:bg-[#F6EEE8]"
              >
                <Menu className="h-5 w-5 text-[#341601]" />
              </Button>
            )}
            <Link href="/" className="flex items-center space-x-3 group">
              <img 
                src="/logo.svg" 
                alt="MyPrint.pt" 
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {!isAdminRoute && (
            <nav className="hidden md:flex items-center gap-2 text-sm font-semibold text-[#341601] flex-1 justify-center">
              {commercialNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                    item.active
                      ? "bg-[#341601] text-white shadow-sm"
                      : "text-[#341601]/80 hover:text-[#341601] hover:bg-[#F6EEE8]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {!isAdminRoute && (
            <nav className="md:hidden flex items-center gap-2 text-sm font-semibold text-[#341601]/80">
              {commercialNavItems.map((item) => (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-colors",
                    item.active
                      ? "bg-[#341601] text-white shadow-sm"
                      : "hover:text-[#341601] hover:bg-[#F6EEE8]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-[#F6EEE8]">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt={userData?.name || "User"} />
                    <AvatarFallback className="bg-[#F6EEE8] text-[#341601]">
                      {userData?.name ? userData.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-[#341601]">
                      {userData?.name || "Usuário"}
                    </p>
                    <p className="text-xs leading-none text-[#341601]/70">
                      {userData?.email || "MyPrint.pt"}
                    </p>
                    {userData?.role && (
                      <Badge variant="secondary" className="mt-1 w-fit text-xs">
                        {userData.role === "ADMIN" ? "Administrador" : "Comercial"}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-[#341601] hover:bg-[#F6EEE8]">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-[#341601] hover:bg-[#F6EEE8]">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

      </div>
    </header>
  );
}
