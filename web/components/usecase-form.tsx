"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/multi-select";
import { MarkdownEditor } from "@/components/markdown-editor";

interface StepDraft {
  prompt: string;
  skills: string[];
}
interface JourneyDraft {
  title: string;
  description: string;
  done: string;
  prompts: StepDraft[];
}

const emptyStep = (): StepDraft => ({ prompt: "", skills: [] });
const emptyJourney = (): JourneyDraft => ({ title: "", description: "", done: "", prompts: [emptyStep()] });

// Authoring form for a use case: journeys, each with one or more agent prompts
// that reference their own skills.
export function UsecaseForm({
  orgId,
  skillOptions,
  onSubmitted,
}: {
  orgId: number;
  skillOptions: string[];
  onSubmitted: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState("Apache-2.0");
  const [prereqs, setPrereqs] = useState<string[]>([""]);
  const [journeys, setJourneys] = useState<JourneyDraft[]>([emptyJourney()]);
  const [err, setErr] = useState("");

  function setJourney(i: number, patch: Partial<JourneyDraft>) {
    setJourneys((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));
  }
  function setStep(ji: number, si: number, patch: Partial<StepDraft>) {
    setJourneys((js) => js.map((j, k) => (k === ji ? { ...j, prompts: j.prompts.map((p, m) => (m === si ? { ...p, ...patch } : p)) } : j)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const { passed } = await api("/api/usecases", {
        method: "POST",
        json: {
          orgId,
          name,
          title,
          description,
          license,
          prerequisites: prereqs.map((s) => s.trim()).filter(Boolean),
          journeys: journeys.map((j, i) => ({
            tag: `J${i + 1}`,
            title: j.title,
            description: j.description,
            done: j.done,
            prompts: j.prompts,
          })),
        },
      });
      onSubmitted(
        passed
          ? "Use case submitted - automated checks passed, now in the review queue."
          : "Automated checks failed - see the check report under My submissions.",
      );
      setName("");
      setTitle("");
      setDescription("");
      setPrereqs([""]);
      setJourneys([emptyJourney()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="uc-name" className="text-sm font-medium text-ink">Name (slug)</label>
          <Input id="uc-name" placeholder="national-learner-registry" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="uc-license" className="text-sm font-medium text-ink">Licence</label>
          <Input id="uc-license" value={license} onChange={(e) => setLicense(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="uc-title" className="text-sm font-medium text-ink">Title</label>
        <Input id="uc-title" placeholder="National Learner Registry & Digital Credentials" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-ink">Description</span>
        <MarkdownEditor value={description} onChange={setDescription} placeholder="What working solution this use case delivers." />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">Prerequisites</span>
        {prereqs.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Something the app builder must have in place."
              value={p}
              onChange={(e) => setPrereqs(prereqs.map((x, k) => (k === i ? e.target.value : x)))}
            />
            {prereqs.length > 1 && (
              <button type="button" aria-label={`Remove prerequisite ${i + 1}`} onClick={() => setPrereqs(prereqs.filter((_, k) => k !== i))} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => setPrereqs([...prereqs, ""])}>
          <Plus className="size-3.5" /> Add prerequisite
        </Button>
      </div>

      <div className="space-y-3">
        <span className="text-sm font-medium text-ink">Journeys</span>
        {journeys.map((j, ji) => (
          <div key={ji} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-primary-foreground">J{ji + 1}</span>
              {journeys.length > 1 && (
                <button type="button" aria-label={`Remove journey ${ji + 1}`} onClick={() => setJourneys((js) => js.filter((_, k) => k !== ji))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <Input placeholder="Journey title" value={j.title} onChange={(e) => setJourney(ji, { title: e.target.value })} required />
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Description</span>
              <MarkdownEditor value={j.description} onChange={(v) => setJourney(ji, { description: v })} placeholder="Short description of this journey." minHeightClass="min-h-20" />
            </div>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prompts</span>
              {j.prompts.map((p, si) => (
                <div key={si} className="space-y-2 rounded-lg border border-border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">Prompt {si + 1}</span>
                    {j.prompts.length > 1 && (
                      <button type="button" aria-label={`Remove prompt ${si + 1}`}
                        onClick={() => setJourney(ji, { prompts: j.prompts.filter((_, m) => m !== si) })}
                        className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <MarkdownEditor value={p.prompt} onChange={(v) => setStep(ji, si, { prompt: v })} placeholder="The agent prompt for this step." minHeightClass="min-h-20" />
                  <MultiSelect label="Skills" options={skillOptions} selected={p.skills} onChange={(v) => setStep(ji, si, { skills: v })} placeholder="Search skills…" />
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setJourney(ji, { prompts: [...j.prompts, emptyStep()] })}>
                <Plus className="size-3.5" /> Add prompt
              </Button>
            </div>

            <Input placeholder="Done when… (acceptance criterion)" value={j.done} onChange={(e) => setJourney(ji, { done: e.target.value })} />
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => setJourneys((js) => [...js, emptyJourney()])}>
          <Plus className="size-4" /> Add journey
        </Button>
      </div>

      {err && <p className="text-sm font-medium text-destructive">{err}</p>}
      <Button type="submit">Submit use case for review</Button>
    </form>
  );
}
