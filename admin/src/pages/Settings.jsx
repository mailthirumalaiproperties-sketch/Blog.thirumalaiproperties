import { useEffect, useState } from "react";
import MediaPicker from "../components/MediaPicker.jsx";
import { Button, Card, CharCount, Field, Input, LoadingBlock, Notice, PageHeader, Textarea } from "../components/ui.jsx";
import { api, mediaUrl } from "../lib/api.js";
import { DESCRIPTION_RANGE } from "../lib/seo.js";

function SettingsCard({ title, description, settingKey, initial, children }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api(`/api/seo/settings/${settingKey}`, { method: "PUT", body: form });
      setNotice({ tone: "success", text: "Saved. The website will update in about 2 minutes." });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const bind = (key) => ({ value: form[key] ?? "", onChange: (e) => setForm({ ...form, [key]: e.target.value }) });
  return (
    <Card title={title}>
      {description && <p className="text-sm text-stone-500 -mt-1 mb-4">{description}</p>}
      <form onSubmit={save} className="flex flex-col gap-4">
        {children({ form, setForm, bind })}
        {notice && (
          <Notice tone={notice.tone} onClose={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}
        <Button type="submit" variant="primary" busy={busy} className="self-start">
          Save
        </Button>
      </form>
    </Card>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    api("/api/seo/settings").then((d) => setSettings(d.settings)).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!settings) return <LoadingBlock />;

  return (
    <>
      <PageHeader title="Site settings" description="Business details and SEO defaults used across thirumalaiproperties.com. Only admins can change these." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <SettingsCard
          title="Business details"
          description="Used for Google's business information (structured data), the blog's contact buttons and article footers."
          settingKey="organization"
          initial={settings.organization || {}}
        >
          {({ bind }) => (
            <>
              <Field label="Business name">{(id) => <Input id={id} required maxLength={80} {...bind("name")} />}</Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Main phone">{(id) => <Input id={id} maxLength={30} {...bind("phone")} />}</Field>
                <Field label="Second phone">{(id) => <Input id={id} maxLength={30} {...bind("phone2")} />}</Field>
              </div>
              <Field label="WhatsApp number" hint="Digits only, with country code: 919514476555">
                {(id) => <Input id={id} maxLength={20} inputMode="numeric" {...bind("whatsapp")} />}
              </Field>
              <Field label="Email">{(id) => <Input id={id} type="email" maxLength={254} {...bind("email")} />}</Field>
              <Field label="Street address">{(id) => <Input id={id} maxLength={200} {...bind("streetAddress")} />}</Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="City">{(id) => <Input id={id} maxLength={80} {...bind("locality")} />}</Field>
                <Field label="PIN code">{(id) => <Input id={id} maxLength={12} {...bind("postalCode")} />}</Field>
                <Field label="State / UT">{(id) => <Input id={id} maxLength={80} {...bind("region")} />}</Field>
              </div>
              <Field label="Instagram link">{(id) => <Input id={id} placeholder="https://www.instagram.com/…" maxLength={300} {...bind("instagram")} />}</Field>
              <Field label="YouTube link">{(id) => <Input id={id} placeholder="https://www.youtube.com/@…" maxLength={300} {...bind("youtube")} />}</Field>
              <Field label="Facebook link">{(id) => <Input id={id} placeholder="https://www.facebook.com/…" maxLength={300} {...bind("facebook")} />}</Field>
            </>
          )}
        </SettingsCard>

        <SettingsCard title="SEO defaults" settingKey="seo_defaults" initial={settings.seo_defaults || {}}>
          {({ form, setForm, bind }) => (
            <>
              <Field label="Title ending for articles" hint="Added after article titles that don't have their own SEO title.">
                {(id) => <Input id={id} maxLength={60} {...bind("titleSuffix")} />}
              </Field>
              <Field label="Default meta description" hint="Used for any page without its own description." counter={<CharCount value={form.defaultDescription} range={DESCRIPTION_RANGE} />}>
                {(id) => <Textarea id={id} rows={3} maxLength={320} {...bind("defaultDescription")} />}
              </Field>
              <Field label="Default social sharing image" hint="Shown when a page without its own image is shared. 1200×630 works best.">
                <div className="flex items-center gap-3">
                  {form.defaultOgMediaId ? (
                    <img src={mediaUrl(form.defaultOgMediaId)} alt="" className="h-16 w-28 rounded-md object-cover border border-stone-200" />
                  ) : (
                    <span className="h-16 w-28 rounded-md border-2 border-dashed border-stone-200 flex items-center justify-center text-[10px] text-stone-400">None</span>
                  )}
                  <Button size="sm" onClick={() => setPicker(true)}>
                    Choose
                  </Button>
                  {form.defaultOgMediaId && (
                    <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, defaultOgMediaId: null })}>
                      Remove
                    </Button>
                  )}
                </div>
                <MediaPicker open={picker} onClose={() => setPicker(false)} askAlt={false} onSelect={({ media }) => setForm({ ...form, defaultOgMediaId: media.id })} />
              </Field>
              <Field label="Google Search Console verification code" hint="Only the content value of the google-site-verification meta tag. Optional: the site is already verified by file.">
                {(id) => <Input id={id} maxLength={120} {...bind("googleVerification")} />}
              </Field>
            </>
          )}
        </SettingsCard>
      </div>
    </>
  );
}
