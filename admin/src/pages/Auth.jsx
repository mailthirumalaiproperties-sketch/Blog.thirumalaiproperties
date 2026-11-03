import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Button, Field, Input, Notice } from "../components/ui.jsx";

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-mark.png" alt="" className="h-12 mx-auto" />
          <p className="font-serif text-2xl font-bold tracking-[0.12em] text-brand-gold mt-2">THIRUMALAI</p>
          <p className="text-[10px] font-bold tracking-[0.3em] text-stone-500">BLOG ADMIN</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-brand-dark">{title}</h1>
          {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    api("/api/auth/setup")
      .then((d) => setNeedsSetup(d.needsSetup))
      .catch(() => {});
  }, []);

  if (needsSetup) return <SetupPage />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in" subtitle="Manage articles and SEO for thirumalaiproperties.com">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Notice tone="error">{error}</Notice>
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password">
          {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button type="submit" variant="primary" size="lg" busy={busy} className="mt-2">
          Log in
        </Button>
        <p className="text-xs text-stone-500 text-center">Forgot your password? Ask an admin to reset it for you.</p>
      </form>
    </AuthShell>
  );
}

function SetupPage() {
  const { setup } = useAuth();
  const [form, setForm] = useState({ setupToken: "", name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setup(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="First-time setup" subtitle="Create the first admin account. This page disappears once setup is done.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Notice tone="error">{error}</Notice>
        <Field label="Setup code" hint="The one-time code you were given when the system was installed.">
          {(id) => <Input id={id} required value={form.setupToken} onChange={set("setupToken")} autoComplete="off" />}
        </Field>
        <Field label="Your name">{(id) => <Input id={id} required value={form.name} onChange={set("name")} />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" required value={form.email} onChange={set("email")} autoComplete="username" />}</Field>
        <Field label="Password" hint="At least 10 characters.">
          {(id) => <Input id={id} type="password" required minLength={10} value={form.password} onChange={set("password")} autoComplete="new-password" />}
        </Field>
        <Field label="Confirm password">
          {(id) => <Input id={id} type="password" required value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />}
        </Field>
        <Button type="submit" variant="primary" size="lg" busy={busy}>
          Create admin account
        </Button>
      </form>
    </AuthShell>
  );
}

export function PasswordForm({ onDone, forced = false }) {
  const { markPasswordChanged } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword !== form.confirm) {
      setError("The two new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", { method: "POST", body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setSuccess("Password changed. You've been signed out on other devices.");
      markPasswordChanged();
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Notice tone="error">{error}</Notice>
      <Notice tone="success">{success}</Notice>
      <Field label={forced ? "Temporary password" : "Current password"}>
        {(id) => <Input id={id} type="password" required value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />}
      </Field>
      <Field label="New password" hint="At least 10 characters. A short sentence is easy to remember and hard to guess.">
        {(id) => <Input id={id} type="password" required minLength={10} value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" />}
      </Field>
      <Field label="Confirm new password">
        {(id) => <Input id={id} type="password" required value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />}
      </Field>
      <Button type="submit" variant="primary" busy={busy} className="self-start">
        Change password
      </Button>
    </form>
  );
}

export function ForcedPasswordChange() {
  const { logout } = useAuth();
  return (
    <AuthShell title="Choose a new password" subtitle="Your account was created with a temporary password. Set your own to continue.">
      <PasswordForm forced />
      <button type="button" onClick={logout} className="mt-6 text-sm text-stone-500 hover:text-stone-800">
        Log out
      </button>
    </AuthShell>
  );
}
