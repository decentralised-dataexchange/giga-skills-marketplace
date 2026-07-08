"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { api, auth } from "@/lib/client";
import { DEFAULT_MODEL } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl } from "@/components/ai-elements/web-preview";
import { CodeIcon, DownloadIcon, ExternalLinkIcon, PanelLeftIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Entry { slug: string; version: string; org: { name: string } }
interface ChatSummary { id: number; title: string; appUrl: string | null }

const HTML_BLOCK = /```html\s*\n([\s\S]*?)(```|$)/g;

const text = (m: UIMessage) =>
  m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");

function extractHtml(content: string): string | null {
  const blocks = [...content.matchAll(HTML_BLOCK)].filter((m) => m[2] === "```");
  return blocks.at(-1)?.[1] ?? null;
}

/** Assistant text with the ```html block collapsed into a chip. */
function AssistantBody({ content, streaming }: { content: string; streaming: boolean }) {
  const open = content.indexOf("```html");
  if (open === -1) return <MessageResponse>{content}</MessageResponse>;
  const closed = extractHtml(content) !== null;
  const after = closed ? content.slice(content.indexOf("```", open + 7) + 3) : "";
  return (
    <>
      <MessageResponse>{content.slice(0, open).trim()}</MessageResponse>
      <span className="w-fit rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-emerald-400">
        {closed ? "✓ app.html, see preview" : streaming ? "⟳ generating app.html..." : "app.html"}
      </span>
      {after.trim() && <MessageResponse>{after.trim()}</MessageResponse>}
    </>
  );
}

function Builder() {
  const params = useSearchParams();
  const [marketplace, setMarketplace] = useState<Entry[]>([]);
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [hasKey, setHasKey] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewPref, setPreviewPref] = useState<boolean | null>(null); // null = follow the app
  const [showCode, setShowCode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant/chat" }),
    onFinish: () => setTimeout(persistRef.current, 0),
  });
  const busy = status === "submitted" || status === "streaming";

  const app = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant ? extractHtml(text(lastAssistant)) : null;
  }, [messages]);
  const previewOpen = previewPref ?? app !== null;

  /* ---- data loading ---- */

  useEffect(() => {
    if (!auth.user) {
      location.href = "/builder" === location.pathname ? "/login?next=/builder" : "/login";
      return;
    }
    Promise.all([api("/api/marketplace"), api("/api/assistant/models"), api("/api/auth/settings"), api("/api/chats")])
      .then(([m, mdl, s, c]) => {
        setMarketplace(m.skills);
        setModels(mdl.models);
        setHasKey(s.settings.hasKey);
        if (s.settings.model) setModel(s.settings.model);
        setChatList(c.chats);
        const install = params.get("install");
        if (install && m.skills.some((x: Entry) => x.slug === install)) addSkill(install);
      })
      .catch(console.error);
    const onSettings = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHasKey(detail.hasKey);
      if (detail.model) setModel(detail.model);
    };
    window.addEventListener("settings-updated", onSettings);
    return () => window.removeEventListener("settings-updated", onSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- skills via /slash invocation ---- */

  function addSkill(slug: string) {
    setSkills((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
    api(`/api/marketplace/${slug}/install`, { method: "POST" }).catch(() => {});
  }

  const slashToken = useMemo(() => {
    const pos = textareaRef.current?.selectionStart ?? input.length;
    return input.slice(0, pos).match(/(?:^|\s)\/([a-z0-9-]*)$/i)?.[1]?.toLowerCase() ?? null;
  }, [input]);

  const slashMatches = useMemo(
    () => (slashToken === null ? [] : marketplace.filter((s) => s.slug.includes(slashToken)).slice(0, 8)),
    [slashToken, marketplace],
  );

  function completeSlash(slug: string) {
    const pos = textareaRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, pos).replace(/\/[a-z0-9-]*$/i, `/${slug} `);
    setInput(before + input.slice(pos));
    setSlashIndex(0);
    textareaRef.current?.focus();
  }

  /* ---- chat persistence ---- */

  const persistRef = useRef(() => {});
  persistRef.current = async () => {
    const firstUser = messages.find((m) => m.role === "user");
    const title = firstUser
      ? text(firstUser).replace(/(?:^|\s)\/[a-z0-9-]+/gi, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled app"
      : "Untitled app";
    const payload = {
      title, model, skills,
      messages: messages.map((m) => ({ role: m.role, content: text(m) })),
      appHtml: app,
    };
    try {
      const { chat } = chatId
        ? await api(`/api/chats/${chatId}`, { method: "PUT", json: payload })
        : await api("/api/chats", { method: "POST", json: payload });
      setChatId(chat.id);
      setAppUrl(chat.appUrl);
      setChatList((await api("/api/chats")).chats);
    } catch (e) {
      console.error(e);
    }
  };

  async function loadChat(id: number) {
    if (busy) return;
    const { chat } = await api(`/api/chats/${id}`);
    setChatId(chat.id);
    setSkills((chat.skills ?? []).filter((s: string) => marketplace.some((m) => m.slug === s)));
    if (chat.model) setModel(chat.model);
    setAppUrl(chat.appUrl);
    setMessages(chat.messages.map((m: { role: "user" | "assistant"; content: string }, i: number) => ({
      id: `loaded-${id}-${i}`,
      role: m.role,
      parts: [{ type: "text", text: m.content }],
    })));
    setPreviewPref(null);
  }

  function resetChat() {
    setChatId(null);
    setSkills([]);
    setAppUrl(null);
    setMessages([]);
    setPreviewPref(null);
  }

  async function deleteChat(id: number) {
    if (!confirm("Delete this saved chat? The generated app goes with it.")) return;
    await api(`/api/chats/${id}`, { method: "DELETE" });
    setChatList((prev) => prev.filter((c) => c.id !== id));
    if (chatId === id) resetChat();
  }

  /* ---- sending ---- */

  const saveModel = useCallback((value: string) => {
    setModel(value);
    api("/api/auth/settings", { method: "PUT", json: { model: value } }).catch(() => {});
  }, []);

  function send() {
    const prompt = input.trim();
    if (!prompt || busy || !hasKey) return;
    const invoked = [...prompt.matchAll(/(?:^|\s)\/([a-z0-9-]+)/gi)]
      .map((m) => m[1].toLowerCase())
      .filter((slug) => marketplace.some((s) => s.slug === slug));
    invoked.forEach(addSkill);
    const allSkills = [...new Set([...skills, ...invoked])];
    setInput("");
    sendMessage(
      { text: prompt },
      { headers: { Authorization: `Bearer ${auth.token}` }, body: { skills: allSkills, model } },
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (slashMatches.length) {
      if (e.key === "ArrowDown") return e.preventDefault(), setSlashIndex((i) => (i + 1) % slashMatches.length);
      if (e.key === "ArrowUp") return e.preventDefault(), setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
      if (e.key === "Enter" || e.key === "Tab") return e.preventDefault(), completeSlash(slashMatches[slashIndex].slug);
      if (e.key === "Escape") return setInput((v) => v); // recompute closes on next input
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function download() {
    if (!app) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([app], { type: "text/html" }));
    a.download = "app.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---- render ---- */

  return (
    <div
      className="grid h-[calc(100vh-3.5rem)] gap-3 p-3"
      style={{ gridTemplateColumns: [sidebarOpen ? "250px" : null, "1fr", previewOpen ? "1fr" : null].filter(Boolean).join(" ") }}
    >
      {sidebarOpen && (
        <aside className="flex flex-col overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-medium">Chats</span>
            <Button size="sm" variant="secondary" onClick={resetChat}>+ New</Button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {chatList.map((c) => (
              <div
                key={c.id}
                onClick={() => loadChat(c.id).catch(console.error)}
                className={cn(
                  "group flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-secondary",
                  c.id === chatId && "bg-secondary",
                )}
              >
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  className="hidden rounded p-1 text-muted-foreground hover:text-red-400 group-hover:block"
                  onClick={(e) => { e.stopPropagation(); deleteChat(c.id).catch(console.error); }}
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))}
            {!chatList.length && <p className="py-8 text-center text-sm text-muted-foreground">No chats yet.</p>}
          </div>
        </aside>
      )}

      <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Button size="icon-sm" variant="ghost" onClick={() => setSidebarOpen((v) => !v)} title="Toggle chat history">
            <PanelLeftIcon className="size-4" />
          </Button>
          <span className="text-sm font-medium">Integration Assistant</span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => setPreviewPref(!previewOpen)}>
            {previewOpen ? "Hide preview" : "Preview"}
          </Button>
        </div>

        <Conversation className="flex-1">
          <ConversationContent>
            {!messages.length && (
              <ConversationEmptyState
                title="Describe the app you want to build"
                description={'Type / to invoke provider skills, e.g. "/igrantio-education-issuer /govstack-consent-bb Build a Ministry of Education portal that issues a diploma credential with a consent step." You get a complete single-file HTML app with a mock mode, ready to demo.'}
              />
            )}
            {messages.map((m, i) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.role === "assistant"
                    ? <AssistantBody content={text(m)} streaming={busy && i === messages.length - 1} />
                    : text(m)}
                </MessageContent>
              </Message>
            ))}
            {error && <p className="text-sm text-red-400">⚠ {error.message}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          {skills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">
                  /{s}
                  <button onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} title="Remove skill">
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative rounded-2xl border border-input bg-secondary/30 p-3 focus-within:border-muted-foreground/40">
            {slashMatches.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 z-10 mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                {slashMatches.map((s, i) => (
                  <button
                    key={s.slug}
                    onMouseDown={(e) => { e.preventDefault(); completeSlash(s.slug); }}
                    className={cn(
                      "flex w-full items-baseline gap-2 px-4 py-2 text-left text-sm",
                      i === slashIndex && "bg-secondary",
                    )}
                  >
                    <span className="font-semibold">/{s.slug}</span>
                    <span className="text-xs text-muted-foreground">{s.org.name} · v{s.version}</span>
                  </button>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Describe the app you want to build... type / to add a skill"
              className="min-h-14 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
            <div className="mt-2 flex items-center gap-2">
              <Select value={model} onValueChange={(v) => v && saveModel(v)}>
                <SelectTrigger size="sm" className="max-w-56 border-0 bg-transparent text-muted-foreground shadow-none">
                  <SelectValue>{models.find((m) => m.id === model)?.label ?? model}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(models.some((m) => m.id === model) ? models : [{ id: model, label: model }, ...models]).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <span title={hasKey ? undefined : "Add your OpenRouter API key in Settings (menu bar) to send"}>
                <Button onClick={send} disabled={busy || !hasKey || !input.trim()}>Send</Button>
              </span>
            </div>
          </div>
        </div>
      </section>

      {previewOpen && (
        <WebPreview className="overflow-hidden rounded-xl border-border">
          <WebPreviewNavigation>
            <WebPreviewUrl readOnly value={appUrl ? `${location.host}${appUrl}` : "no shareable URL until the chat is saved"} />
            <WebPreviewNavigationButton
              tooltip="Open full screen in a new tab"
              disabled={!appUrl}
              onClick={() => appUrl && window.open(appUrl, "_blank")}
            >
              <ExternalLinkIcon className="size-4" />
            </WebPreviewNavigationButton>
            <WebPreviewNavigationButton tooltip="View code" disabled={!app} onClick={() => setShowCode((v) => !v)}>
              <CodeIcon className="size-4" />
            </WebPreviewNavigationButton>
            <WebPreviewNavigationButton tooltip="Download app.html" disabled={!app} onClick={download}>
              <DownloadIcon className="size-4" />
            </WebPreviewNavigationButton>
            <WebPreviewNavigationButton tooltip="Hide preview" onClick={() => setPreviewPref(false)}>
              <XIcon className="size-4" />
            </WebPreviewNavigationButton>
          </WebPreviewNavigation>
          {showCode ? (
            <pre className="flex-1 overflow-auto bg-black/30 p-4 font-mono text-xs leading-relaxed">{app}</pre>
          ) : (
            <WebPreviewBody className={app ? "bg-white" : ""} srcDoc={app ?? undefined} />
          )}
        </WebPreview>
      )}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense>
      <Builder />
    </Suspense>
  );
}
