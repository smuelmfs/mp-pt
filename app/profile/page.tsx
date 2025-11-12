"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Lock, Save, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    uid: string;
    role: string | null;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      await user.reload();
      
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/me", {
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
        });
      } else {
        toast.error("Erro ao carregar dados do usuário");
        router.replace("/login");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!auth.currentUser) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      
      if (formData.name && formData.name !== user.displayName) {
        await updateProfile(user, {
          displayName: formData.name,
        });
        await user.reload();
      }

      if (formData.email && formData.email !== user.email) {
        toast.info("Para alterar o email, entre em contato com o administrador");
      }

      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      });

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await user.reload();
        await loadUserData();
        
        toast.success("Perfil atualizado com sucesso!");
        
        window.dispatchEvent(new CustomEvent('userProfileUpdated'));
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao atualizar perfil");
      }
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!auth.currentUser || !auth.currentUser.email) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setChangingPassword(true);
    try {
      const user = auth.currentUser;
      
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      await updatePassword(user, passwordData.newPassword);
      
      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      if (error.code === "auth/wrong-password") {
        toast.error("Senha atual incorreta");
      } else if (error.code === "auth/weak-password") {
        toast.error("A senha é muito fraca");
      } else {
        toast.error(error.message || "Erro ao alterar senha");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6EEE8] flex items-center justify-center">
        <Card className="w-full max-w-2xl bg-white border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#341601] mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando perfil...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F6EEE8]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-[#341601]">Meu Perfil</h1>
          <p className="text-gray-600 mt-2">Gerencie suas informações pessoais e senha</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#341601]">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize seu nome e informações de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#341601]">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#341601]">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-10 bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500">O email não pode ser alterado diretamente</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#341601]">Função</Label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600">
                  {userData.role === "ADMIN" ? "Administrador" : userData.role === "COMMERCIAL" ? "Comercial" : "Usuário"}
                </div>
              </div>

              <Button
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-[#F66807] hover:bg-[#E55A00] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#341601]">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Altere sua senha para manter sua conta segura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[#341601]">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#341601]">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Digite a nova senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#341601]">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Confirme a nova senha"
                />
              </div>

              <Button
                onClick={changePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full bg-[#F66807] hover:bg-[#E55A00] text-white"
              >
                <Lock className="h-4 w-4 mr-2" />
                {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

