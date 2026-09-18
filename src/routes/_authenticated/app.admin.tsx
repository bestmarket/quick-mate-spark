import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, ShieldCheck, Sparkles, Trash2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { VOICE_ENGINES } from "@/lib/voices";
import {
  addGeminiKeys,
  claimAdmin,
  deleteGeminiKey,
  listGeminiKeys,
  testGeminiKeys,
  updateGeminiKey,
  getAdminData,
  getAdminStatus,
  saveProvider,
  setEngineDefaults,
  setVoiceEngines,
  setZeroCostMode,
  testAiRouting,
  testVoice,
  type AdminData,
  type AdminGeminiKey,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Channel Studio" },
      {
        name: "description",
        content:
          "Control which AI engines Channel Studio uses, store provider keys and watch usage and cost.",
      },
      { property: "og:title", content: "Admin · Channel Studio" },
      {
        property: "og:description",
        content: "AI engine controls, provider keys and usage numbers for Channel Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  llm: "Writing",
  tts: "Voice",
  image: "Pictures",
};

function AdminPage() {
  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => getAdminStatus() });
  const claim = useMutation({
    mutationFn: useServerFn(claimAdmin),
    onSuccess: () => {
      toast.success("You are now the admin");
      void status.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (status.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status.data?.isAdmin) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Admin area</CardTitle>
          <CardDescription>
            {status.data?.canClaim
              ? "No admin has been set up yet. Take the admin seat to manage AI engines."
              : "This area is for admins only."}
          </CardDescription>
        </CardHeader>
        {status.data?.canClaim ? (
          <CardContent>
            <Button onClick={() => claim.mutate({})} disabled={claim.isPending}>
              {claim.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Make me the admin
            </Button>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const data = useQuery({ queryKey: ["admin-data"], queryFn: () => getAdminData() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-data"] });

  const saveProviderFn = useServerFn(saveProvider);
  const providerMutation = useMutation({
    mutationFn: saveProviderFn,
    onSuccess: () => {
      toast.success("Saved");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const defaultsMutation = useMutation({
    mutationFn: useServerFn(setEngineDefaults),
    onSuccess: () => {
      toast.success("Engine choices saved");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const zeroCostMutation = useMutation({
    mutationFn: useServerFn(setZeroCostMode),
    onSuccess: () => {
      toast.success("Zero-cost mode updated");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: useServerFn(testAiRouting),
    onSuccess: (result: { provider: string; ms: number; reply: string }) =>
      toast.success(`${result.provider} replied in ${result.ms} ms`, { description: result.reply }),

    onError: (error: Error) => toast.error(error.message),
  });

  if (data.isLoading || !data.data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const config: AdminData = data.data;
  const categories: ("llm" | "tts" | "image")[] = ["llm", "tts", "image"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Admin</h2>
          <p className="text-sm text-muted-foreground">
            Pick the engines, store keys and watch what everything costs.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => testMutation.mutate({})}
          disabled={testMutation.isPending}
        >
          {testMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Test AI
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zero-cost mode</CardTitle>
          <CardDescription>
            Only free engines are used while this is on. Paid engines are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.zeroCostMode}
              disabled={zeroCostMutation.isPending}
              onCheckedChange={(enabled) => zeroCostMutation.mutate({ data: { enabled } })}
              aria-label="Zero-cost mode"
            />
            <span className="text-sm">{config.zeroCostMode ? "On" : "Off"}</span>
          </div>
        </CardContent>
      </Card>

      <DefaultsCard
        config={config}
        pending={defaultsMutation.isPending}
        onSave={(defaults) => defaultsMutation.mutate({ data: defaults })}
      />

      <GeminiKeysCard />

      <VoiceEnginesCard config={config} onSaved={refresh} />

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABEL[category]} engines</CardTitle>
            <CardDescription>Turn engines on or off and store their keys.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.providers
              .filter((provider) => provider.category === category)
              .map((provider) => (
                <ProviderRow
                  key={provider.id}
                  provider={provider}
                  pending={providerMutation.isPending}
                  onSave={(input) => providerMutation.mutate({ data: input })}
                />
              ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Every AI call the app has made.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total calls" value={String(config.telemetry.totalCalls)} />
            <Stat label="Last 30 days" value={String(config.telemetry.last30dCalls)} />
            <Stat label="Failed" value={String(config.telemetry.failedCalls)} />
            <Stat label="Cost" value={`$${config.telemetry.totalCostUsd.toFixed(3)}`} />
          </div>

          {config.telemetry.byProvider.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">By engine</p>
              {config.telemetry.byProvider.map((row) => (
                <div key={row.provider} className="flex justify-between text-sm">
                  <span>{row.provider}</span>
                  <span className="text-muted-foreground">
                    {row.calls} calls · ${row.costUsd.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No AI calls recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function DefaultsCard({
  config,
  pending,
  onSave,
}: {
  config: AdminData;
  pending: boolean;
  onSave: (defaults: { llm: string; tts: string; image: string }) => void;
}) {
  const [defaults, setDefaults] = useState(config.defaults);
  useEffect(() => setDefaults(config.defaults), [config.defaults]);

  const options = (category: "llm" | "tts" | "image") =>
    config.providers.filter((provider) => provider.category === category);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Which engine does what</CardTitle>
        <CardDescription>
          If the chosen engine is off or missing a key, the built-in AI is used instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(["llm", "tts", "image"] as const).map((category) => (
          <div key={category} className="space-y-2">
            <Label htmlFor={`default-${category}`}>{CATEGORY_LABEL[category]}</Label>
            <select
              id={`default-${category}`}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={defaults[category]}
              onChange={(event) =>
                setDefaults((prev) => ({ ...prev, [category]: event.target.value }))
              }
            >
              {options(category).map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                  {provider.tier === "free" ? " (free)" : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
        <Button onClick={() => onSave(defaults)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save choices
        </Button>
      </CardContent>
    </Card>
  );
}

function ProviderRow({
  provider,
  pending,
  onSave,
}: {
  provider: AdminData["providers"][number];
  pending: boolean;
  onSave: (input: { id: string; enabled?: boolean; apiKey?: string; clearKey?: boolean }) => void;
}) {
  const [key, setKey] = useState("");

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{provider.label}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant={provider.tier === "free" ? "secondary" : "outline"}>
              {provider.tier === "free" ? "Free" : "Paid"}
            </Badge>
            {provider.requires_key ? (
              <Badge variant={provider.has_key ? "secondary" : "destructive"}>
                {provider.has_key ? "Key saved" : "Key needed"}
              </Badge>
            ) : (
              <Badge variant="secondary">No key needed</Badge>
            )}
          </div>
        </div>
        <Switch
          checked={provider.enabled}
          disabled={pending}
          aria-label={`Enable ${provider.label}`}
          onCheckedChange={(enabled) => onSave({ id: provider.id, enabled })}
        />
      </div>

      {provider.requires_key ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            type="password"
            value={key}
            placeholder={provider.has_key ? "Replace saved key" : "Paste key"}
            aria-label={`${provider.label} key`}
            onChange={(event) => setKey(event.target.value)}
            className="min-w-[12rem] flex-1"
          />
          <Button
            variant="outline"
            disabled={pending || !key.trim()}
            onClick={() => {
              onSave({ id: provider.id, apiKey: key });
              setKey("");
            }}
          >
            Save key
          </Button>
          {provider.has_key ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => onSave({ id: provider.id, clearKey: true })}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function VoiceEnginesCard({
  config,
  onSaved,
}: {
  config: AdminData;
  onSaved: () => void;
}) {
  const [engineIds, setEngineIds] = useState<string[]>(config.voiceEngineIds);
  useEffect(() => setEngineIds(config.voiceEngineIds), [config.voiceEngineIds]);
  const [playing, setPlaying] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: useServerFn(setVoiceEngines),
    onSuccess: () => {
      toast.success("Voice engines updated");
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const runTestVoice = useServerFn(testVoice);
  const play = async (voiceId: string) => {
    setPlaying(voiceId);
    try {
      const result = (await runTestVoice({ data: { voiceId } })) as { audio: string; mime: string };
      const audio = new Audio(`data:${result.mime};base64,${result.audio}`);
      await audio.play();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The sample could not be played");
    } finally {
      setPlaying(null);
    }
  };

  const both = VOICE_ENGINES.every((engine) => engineIds.includes(engine.id));
  const toggle = (id: string) => {
    const next = engineIds.includes(id)
      ? engineIds.filter((value) => value !== id)
      : [...engineIds, id];
    setEngineIds(next);
    save.mutate({ data: { engineIds: next } });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Free voices</CardTitle>
            <CardDescription>
              Both free voice packs can run at the same time. Whatever is on here is what people can
              pick from — and hear — when they make a video.
            </CardDescription>
          </div>
          <Button
            variant={both ? "outline" : "default"}
            disabled={save.isPending || both}
            onClick={() => {
              const next = VOICE_ENGINES.map((engine) => engine.id);
              setEngineIds(next);
              save.mutate({ data: { engineIds: next } });
            }}
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <Volume2 />}
            {both ? "Both packs on" : "Turn both on"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {VOICE_ENGINES.map((engine) => {
          const on = engineIds.includes(engine.id);
          return (
            <div key={engine.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{engine.label}</p>
                  <p className="text-xs text-muted-foreground">{engine.blurb}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Free</Badge>
                  <Switch
                    checked={on}
                    disabled={save.isPending}
                    aria-label={`Enable ${engine.label}`}
                    onCheckedChange={() => toggle(engine.id)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {engine.voices.map((voice) => (
                  <Button
                    key={voice.id}
                    size="sm"
                    variant="outline"
                    disabled={playing !== null}
                    onClick={() => void play(voice.id)}
                  >
                    {playing === voice.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    {voice.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function GeminiKeysCard() {
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: ["gemini-keys"], queryFn: () => listGeminiKeys() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["gemini-keys"] });
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");

  const add = useMutation({
    mutationFn: useServerFn(addGeminiKeys),
    onSuccess: (result: { added: number }) => {
      toast.success(`${result.added} key${result.added === 1 ? "" : "s"} added`);
      setText("");
      setLabel("");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: useServerFn(updateGeminiKey),
    onSuccess: () => void refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: useServerFn(deleteGeminiKey),
    onSuccess: () => {
      toast.success("Key removed");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const test = useMutation({
    mutationFn: useServerFn(testGeminiKeys),
    onSuccess: (result: { results: { label: string; ok: boolean }[] }) => {
      const good = result.results.filter((r) => r.ok).length;
      toast.success(`${good} of ${result.results.length} keys working`, {
        description: result.results.map((r) => `${r.label}: ${r.ok ? "ok" : "failed"}`).join(" · "),
      });
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows: AdminGeminiKey[] = keys.data ?? [];
  const activeCount = rows.filter((row) => row.active).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Google Gemini keys</CardTitle>
            <CardDescription>
              Add as many keys as you like. Writing and pictures take turns across them, so one key
              running out never stops a video.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            disabled={test.isPending || rows.length === 0}
            onClick={() => test.mutate({})}
          >
            {test.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Test keys
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gemini-label">Name (optional)</Label>
          <Input
            id="gemini-label"
            value={label}
            placeholder="e.g. Main account"
            onChange={(event) => setLabel(event.target.value)}
          />
          <Label htmlFor="gemini-keys">Keys</Label>
          <textarea
            id="gemini-keys"
            value={text}
            rows={3}
            placeholder="Paste one key per line"
            className="w-full rounded-md border border-input bg-background p-3 text-sm"
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            disabled={add.isPending || text.trim().length < 10}
            onClick={() => add.mutate({ data: { label, keys: text } })}
          >
            {add.isPending ? <Loader2 className="animate-spin" /> : null}
            Add keys
          </Button>
        </div>

        {keys.isLoading ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Gemini keys saved yet.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {activeCount} of {rows.length} in rotation
            </p>
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.masked}
                    {row.failures > 0 ? ` · ${row.failures} failures` : ""}
                    {row.last_used_at
                      ? ` · last used ${new Date(row.last_used_at).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.active ? "secondary" : "outline"}>
                    {row.active ? "In rotation" : "Paused"}
                  </Badge>
                  <Switch
                    checked={row.active}
                    disabled={update.isPending}
                    aria-label={`Use ${row.label}`}
                    onCheckedChange={(active) => update.mutate({ data: { id: row.id, active } })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={remove.isPending}
                    aria-label={`Remove ${row.label}`}
                    onClick={() => remove.mutate({ data: { id: row.id } })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
