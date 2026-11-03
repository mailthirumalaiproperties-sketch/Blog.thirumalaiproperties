import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useState } from "react";
import { mediaUrl } from "../lib/api.js";
import { formatBytes } from "../lib/format.js";
import MediaPicker from "./MediaPicker.jsx";
import { Button, Checkbox, Field, Input, Modal } from "./ui.jsx";

// watch?v=, youtu.be/, /embed/, /shorts/ and /live/ links all carry the 11-character video id.
const YOUTUBE_ID = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function ToolButton({ active, disabled, onClick, label, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 px-2 rounded-md text-sm font-semibold transition disabled:opacity-30 ${
        active ? "bg-brand-yellow text-brand-dark" : "text-stone-700 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="w-px h-6 bg-stone-200 mx-1" aria-hidden="true" />;

function LinkDialog({ open, initial, onClose, onSave, onRemove }) {
  const [href, setHref] = useState("");
  const [newTab, setNewTab] = useState(false);
  useEffect(() => {
    if (open) {
      setHref(initial?.href || "");
      setNewTab(initial?.target === "_blank");
    }
  }, [open, initial]);
  const normalized = /^(https?:\/\/|mailto:|tel:|\/)/i.test(href.trim()) ? href.trim() : href.trim() ? `https://${href.trim()}` : "";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link"
      footer={
        <>
          {initial?.href && (
            <Button variant="danger" onClick={onRemove}>
              Remove link
            </Button>
          )}
          <Button variant="primary" disabled={!normalized} onClick={() => onSave(normalized, newTab)}>
            Save link
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Web address" hint="Link to our properties: https://thirumalaiproperties.com/properties/ — another article: /blog/article-url/">
          {(id) => <Input id={id} autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://…" onKeyDown={(e) => e.key === "Enter" && normalized && onSave(normalized, newTab)} />}
        </Field>
        <Checkbox label="Open in a new tab" checked={newTab} onChange={setNewTab} />
      </div>
    </Modal>
  );
}

function VideoDialog({ open, onClose, onInsert }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (open) setUrl("");
  }, [open]);
  const id = url.trim().match(YOUTUBE_ID)?.[1];
  const insert = () => id && onInsert(`https://www.youtube.com/watch?v=${id}`);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a YouTube video"
      footer={
        <Button variant="primary" disabled={!id} onClick={insert}>
          Insert video
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="YouTube link"
          hint="Open the video on YouTube, click Share, copy the link and paste it here. Unlisted videos work too."
          error={url.trim() && !id ? "That doesn't look like a YouTube video link." : ""}
        >
          {(fid) => (
            <Input
              id={fid}
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/…"
              onKeyDown={(e) => e.key === "Enter" && insert()}
            />
          )}
        </Field>
        {id && <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="Video preview" className="w-full max-w-sm rounded-lg border border-stone-200" />}
      </div>
    </Modal>
  );
}

export default function RichEditor({ value, onChange, editable = true }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer", target: null } },
        codeBlock: false,
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Youtube.configure({ nocookie: true, modestBranding: true, rel: 0, width: 640, height: 360 }),
      Placeholder.configure({ placeholder: "Start writing your article… Use “Heading 2” for section titles." }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "prose prose-stone prose-brand max-w-none px-5 py-4" } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && {
        paragraph: e.isActive("paragraph"),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        quote: e.isActive("blockquote"),
        link: e.isActive("link"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor || !state) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="rounded-xl border border-stone-300 bg-white focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-yellow/20">
      <div className={`sticky top-16 z-10 flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-stone-200 bg-white rounded-t-xl ${editable ? "flex" : "hidden"}`}>
        <ToolButton label="Normal text" active={state.paragraph} onClick={() => chain().setParagraph().run()}>
          Text
        </ToolButton>
        <ToolButton label="Heading 2 (section title)" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolButton>
        <ToolButton label="Heading 3 (sub-section)" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolButton>
        <Divider />
        <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </ToolButton>
        <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </ToolButton>
        <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </ToolButton>
        <Divider />
        <ToolButton label="Bullet list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
          • List
        </ToolButton>
        <ToolButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
          1. List
        </ToolButton>
        <ToolButton label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
          “ ”
        </ToolButton>
        <Divider />
        <ToolButton label="Add or edit link" active={state.link} onClick={() => setLinkOpen(true)}>
          Link
        </ToolButton>
        <ToolButton label="Insert image" onClick={() => setPickerOpen(true)}>
          Image
        </ToolButton>
        <ToolButton label="Insert YouTube video" onClick={() => setVideoOpen(true)}>
          Video
        </ToolButton>
        <ToolButton label="Insert PDF document" onClick={() => setDocPickerOpen(true)}>
          PDF
        </ToolButton>
        <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
          ―
        </ToolButton>
        <Divider />
        <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          ↶
        </ToolButton>
        <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          ↷
        </ToolButton>
      </div>

      <EditorContent editor={editor} />

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Insert an image"
        onSelect={({ media, alt }) => chain().setImage({ src: mediaUrl(media.id), alt }).run()}
      />
      <MediaPicker
        kind="document"
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        onSelect={({ media, alt }) =>
          chain()
            .insertContent({
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `${alt} (PDF, ${formatBytes(media.size)})`,
                  // The ".pdf" ending lets the website style it as a download button.
                  marks: [{ type: "link", attrs: { href: `${mediaUrl(media.id)}.pdf`, target: "_blank" } }],
                },
              ],
            })
            .run()
        }
      />
      <VideoDialog
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        onInsert={(src) => {
          chain().setYoutubeVideo({ src }).run();
          setVideoOpen(false);
        }}
      />
      <LinkDialog
        open={linkOpen}
        initial={linkOpen ? editor.getAttributes("link") : null}
        onClose={() => setLinkOpen(false)}
        onRemove={() => {
          chain().extendMarkRange("link").unsetLink().run();
          setLinkOpen(false);
        }}
        onSave={(href, newTab) => {
          const attrs = { href, target: newTab ? "_blank" : null };
          if (editor.state.selection.empty && !state.link) {
            chain().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs }] }).run();
          } else {
            chain().extendMarkRange("link").setLink(attrs).run();
          }
          setLinkOpen(false);
        }}
      />
    </div>
  );
}
