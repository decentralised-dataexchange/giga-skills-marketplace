"use client";

// Account settings: the OpenRouter key and default model live on the account.
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Settings {
  hasKey: boolean;
  keyMasked: string | null;
  model: string | null;
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([api("/api/auth/settings"), api("/api/assistant/models")])
      .then(([s, m]) => {
        setSettings(s.settings);
        setModels(m.models);
        const inList = m.models.some((x: { id: string }) => x.id === s.settings.model);
        setModel(inList ? s.settings.model : m.models[0].id);
        setCustom(inList ? "" : s.settings.model ?? "");
      })
      .catch((e) => setError(e.message));
  }, [open]);

  async function save() {
    try {
      const { settings: updated } = await api("/api/auth/settings", {
        method: "PUT",
        json: { ...(key.trim() ? { openrouterKey: key.trim() } : {}), model: custom.trim() || model },
      });
      window.dispatchEvent(new CustomEvent("settings-updated", { detail: updated }));
      onOpenChange(false);
      setKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>
            Your OpenRouter key is stored on your account and never shown in full.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">OpenRouter API key</label>
            <Input type="password" placeholder="sk-or-..." value={key} onChange={(e) => setKey(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {settings?.hasKey
                ? `Key on account: ${settings.keyMasked}. Enter a new key to replace it.`
                : "No key on your account yet. Create one at openrouter.ai/keys."}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default model</label>
            <Select value={model} onValueChange={(v) => v && setModel(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{models.find((m) => m.id === model)?.label ?? model}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="or a custom model id, e.g. mistralai/mistral-large"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
