import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Input, LoadingBlock, Modal, Notice, PageHeader, Select } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { ROLE_HELP, ROLE_LABELS, useAuth } from "../lib/auth.jsx";
import { randomPassword, timeAgo } from "../lib/format.js";

function TempPasswordNote({ email, password }) {
  return (
    <Notice tone="success">
      Share these details with the person privately (for example by phone or WhatsApp). They'll be asked to choose their own password when they first log in.
      <div className="mt-2 font-mono text-sm bg-white/70 rounded px-3 py-2 select-all">
        Email: {email}
        <br />
        Temporary password: {password}
      </div>
    </Notice>
  );
}

function AddUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", role: "writer", password: randomPassword() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", role: "writer", password: randomPassword() });
      setError("");
      setCreated(null);
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user } = await api("/api/users", { method: "POST", body: form });
      onCreated(user);
      setCreated({ email: user.email, password: form.password });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="Add a user">
      {created ? (
        <div className="flex flex-col gap-4">
          <TempPasswordNote {...created} />
          <Button variant="primary" onClick={onClose} className="self-end">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Notice tone="error">{error}</Notice>
          <Field label="Name">{(id) => <Input id={id} required maxLength={80} value={form.name} onChange={set("name")} />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" required value={form.email} onChange={set("email")} />}</Field>
          <Field label="Role" hint={ROLE_HELP[form.role]}>
            {(id) => (
              <Select id={id} value={form.role} onChange={set("role")}>
                <option value="writer">Writer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </Select>
            )}
          </Field>
          <Field label="Temporary password" hint="They must change it when they first log in.">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} required minLength={10} value={form.password} onChange={set("password")} className="font-mono" />
                <Button onClick={() => setForm({ ...form, password: randomPassword() })}>New</Button>
              </div>
            )}
          </Field>
          <Button type="submit" variant="primary" busy={busy} className="self-end">
            Create user
          </Button>
        </form>
      )}
    </Modal>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function DeleteUserModal({ target, users, me, onClose, onDeleted }) {
  const [heir, setHeir] = useState(me.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setHeir(me.id);
      setError("");
    }
  }, [target, me.id]);

  if (!target) return null;
  const count = target.articleCount ?? 0;
  const heirs = users.filter((u) => u.active && u.id !== target.id);

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/users/${target.id}?transferTo=${encodeURIComponent(heir)}`, { method: "DELETE" });
      onDeleted(target, result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${target.name}?`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="destructive" busy={busy} onClick={confirmDelete}>
            Delete user
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-stone-600">
        <Notice tone="error">{error}</Notice>
        <p>
          The account <strong className="text-stone-800">{target.email}</strong> will be removed permanently and logged out. This can't be undone.
        </p>
        {count > 0 ? (
          <Field label={`Move their ${plural(count, "article")} to`} hint="The articles stay on the website, and published ones keep their author name.">
            {(id) => (
              <Select id={id} value={heir} onChange={(e) => setHeir(e.target.value)}>
                {heirs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.id === me.id ? " (you)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <p>They haven't written any articles.</p>
        )}
        <p className="text-stone-500">
          Only need to block them for a while? Use <strong>Deactivate</strong> instead. It can be undone.
        </p>
      </div>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [notice, setNotice] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reset, setReset] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function onDeleted(u, { articlesMoved, transferredTo }) {
    setDeleting(null);
    setUsers((list) => list.filter((x) => x.id !== u.id));
    const moved = articlesMoved ? ` Their ${plural(articlesMoved, "article")} now ${articlesMoved === 1 ? "belongs" : "belong"} to ${transferredTo}.` : "";
    setNotice({ tone: "success", text: `${u.name} was deleted.${moved}` });
  }

  useEffect(() => {
    api("/api/users").then((d) => setUsers(d.users)).catch((e) => setNotice({ tone: "error", text: e.message }));
  }, []);

  async function update(u, patch) {
    if (patch.active === false && !window.confirm(`Deactivate ${u.name}? They will be logged out and can't log in until reactivated.`)) return;
    try {
      const { user } = await api(`/api/users/${u.id}`, { method: "PUT", body: patch });
      setUsers((list) => list.map((x) => (x.id === user.id ? { ...x, ...user } : x)));
      setNotice({ tone: "success", text: `${user.name} updated.` });
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  }

  async function resetPassword(u) {
    if (!window.confirm(`Reset ${u.name}'s password? They'll be logged out everywhere.`)) return;
    const password = randomPassword();
    try {
      await api(`/api/users/${u.id}/reset-password`, { method: "POST", body: { password } });
      setReset({ email: u.email, password });
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="People who can log in to this admin."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            + Add user
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {notice && (
          <Notice tone={notice.tone} onClose={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}
        {reset && (
          <div>
            <TempPasswordNote {...reset} />
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setReset(null)}>
              Hide
            </Button>
          </div>
        )}
        <Card bodyClassName="p-0">
          {!users ? (
            <LoadingBlock />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-stone-500 border-b border-stone-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Last login</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => (
                    <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-stone-800">
                          {u.name} {u.id === me.id && <span className="text-xs font-normal text-stone-400">(you)</span>}
                        </p>
                        <p className="text-xs text-stone-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Select aria-label={`Role for ${u.name}`} value={u.role} disabled={u.id === me.id} onChange={(e) => update(u, { role: e.target.value })} className="w-32">
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-5 py-3">
                        {!u.active ? <Badge tone="red">Deactivated</Badge> : u.mustChangePassword ? <Badge tone="amber">Temporary password</Badge> : <Badge tone="green">Active</Badge>}
                      </td>
                      <td className="px-5 py-3 text-stone-500">{timeAgo(u.lastLoginAt)}</td>
                      <td className="px-5 py-3">
                        {u.id !== me.id && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => resetPassword(u)}>
                              Reset password
                            </Button>
                            <Button size="sm" onClick={() => update(u, { active: !u.active })}>
                              {u.active ? "Deactivate" : "Reactivate"}
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setDeleting(u)}>
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="What each role can do">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(ROLE_HELP).map(([role, help]) => (
              <div key={role}>
                <dt className="font-semibold text-stone-800">{ROLE_LABELS[role]}</dt>
                <dd className="text-stone-500 mt-0.5">{help}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <AddUserModal open={adding} onClose={() => setAdding(false)} onCreated={(u) => setUsers((list) => [...list, u])} />
      <DeleteUserModal target={deleting} users={users ?? []} me={me} onClose={() => setDeleting(null)} onDeleted={onDeleted} />
    </>
  );
}
