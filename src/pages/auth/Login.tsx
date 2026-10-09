import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Lock, ShieldCheck, Sparkles, User, CircleAlert } from "lucide-react";
import type { Role } from "@shared/types";
import { ROLE_LABEL } from "@shared/types";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput, SegmentedControl, Toggle } from "@/components/ui/form";
import { AppIcon } from "@/components/Logo";
import { AuthLayout } from "./AuthLayout";

export function ErrorBanner({ message, shakeKey }: { message: string | null; shakeKey: number }) {
  if (!message) return null;
  return (
    <motion.div
      key={shakeKey}
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: [0, -9, 9, -6, 6, -3, 0] }}
      transition={{ duration: 0.45 }}
      className="flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger/[0.08] px-4 py-3 text-[14px] text-danger"
      role="alert"
    >
      <CircleAlert size={18} className="shrink-0 mt-0.5" />
      <span className="font-medium">{message}</span>
    </motion.div>
  );
}

export function Login() {
  const signIn = useSession((s) => s.signIn);
  const [role, setRole] = useState<Role>("usuario");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"user" | "password" | "role" | null>(null);
  const [shake, setShake] = useState(0);
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    api
      .appInfo()
      .then((i) => setFirstRun(!i.hasUsers))
      .catch(() => undefined);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Preencha usuário e senha.");
      setErrorField(!username.trim() ? "user" : "password");
      setShake((s) => s + 1);
      return;
    }
    setLoading(true);
    setError(null);
    setErrorField(null);
    try {
      const user = await api.login({ username, password, role, remember });
      await signIn(user);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError((err as Error).message);
      setErrorField(code === "WRONG_PASSWORD" ? "password" : code === "USER_NOT_FOUND" ? "user" : code === "ROLE_MISMATCH" ? "role" : null);
      setShake((s) => s + 1);
      if (code === "WRONG_PASSWORD") setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <div className="lg:hidden flex justify-center mb-6">
          <AppIcon size={68} />
        </div>
        <h1 className="text-[30px] font-bold tracking-tight">Entrar</h1>
        <p className="text-muted mt-1.5">Bem-vindo de volta ao Investa.</p>

        {firstRun && (
          <div className="mt-5 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 text-[13.5px] flex gap-2.5">
            <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Primeiro acesso</div>
              <div className="text-muted mt-0.5">
                Ainda não existe nenhuma conta. A primeira conta criada será a conta <strong className="text-fg">Dono</strong> do aplicativo.{" "}
                <Link to="/cadastro" className="text-primary font-semibold">
                  Criar agora
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="Entrar como">
            <SegmentedControl<Role>
              block
              value={role}
              onChange={(r) => {
                setRole(r);
                if (errorField === "role") {
                  setError(null);
                  setErrorField(null);
                }
              }}
              options={[
                { value: "usuario", label: ROLE_LABEL.usuario, icon: User },
                { value: "adm", label: "Admin", icon: ShieldCheck },
                { value: "dono", label: ROLE_LABEL.dono, icon: Crown },
              ]}
            />
          </Field>
          <Field label="Usuário">
            <Input
              icon={User}
              autoFocus
              autoComplete="username"
              placeholder="seu.usuario"
              value={username}
              invalid={errorField === "user"}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Senha">
            <PasswordInput
              icon={Lock}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              invalid={errorField === "password"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <ErrorBanner message={error} shakeKey={shake} />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-3 text-[14px] text-muted cursor-pointer select-none">
              <Toggle checked={remember} onChange={setRemember} label="Manter conectado" />
              Manter conectado
            </label>
          </div>

          <Button type="submit" size="lg" block loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="text-center text-[14px] text-muted mt-6">
          Não tem conta?{" "}
          <Link to="/cadastro" className="text-primary font-semibold">
            Criar conta
          </Link>
        </p>
        <p className="text-center text-[12px] text-muted/70 mt-8">Nomes de usuário não diferenciam maiúsculas de minúsculas. Esqueceu a senha? O Dono ou um Administrador pode redefini-la.</p>
      </motion.div>
    </AuthLayout>
  );
}
