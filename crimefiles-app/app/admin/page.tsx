"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    useCases,
    useCreateCase,
    useDeleteCase,
    useCreateHint,
    useCreateSuspect,
    type Case,
    type Suspect,
    type CreateSuspectData
} from "@/lib/hooks/useCases";


export default function AdminPage() {
    const [activeTab, setActiveTab] = useState("cases");
    const [message, setMessage] = useState("");
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCase, setNewCase] = useState({ title: "", excerpt: "", story: "" });

    // TanStack Query hooks
    const { data: cases = [], isLoading, error } = useCases();
    const createCaseMutation = useCreateCase();
    const deleteCaseMutation = useDeleteCase();
    const queryClient = useQueryClient();

    const handleCreateCase = async () => {
        if (!newCase.title || !newCase.excerpt || !newCase.story) {
            setMessage("All fields are required");
            return;
        }

        try {
            await createCaseMutation.mutateAsync(newCase);
            setMessage("Case created successfully");
            setNewCase({ title: "", excerpt: "", story: "" });
            setShowCreateForm(false);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to create case");
        }
    };

    const handleDeleteCase = async (caseId: string) => {
        if (!confirm("Are you sure you want to delete this case?")) return;

        try {
            await deleteCaseMutation.mutateAsync(caseId);
            setMessage("Case deleted successfully");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to delete case");
        }
    };

    const renderCasesTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-funnel-display">Case Management</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="border border-green-500 text-green-500 px-4 py-2 hover:bg-green-500/10"
                    >
                        Create New Case
                    </button>
                </div>
            </div>

            {showCreateForm && (
                <div className="border border-white/10 p-4 bg-white/5">
                    <h3 className="text-lg mb-4">Create New Case</h3>
                    <div className="space-y-4">
                        <input
                            value={newCase.title}
                            onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                            placeholder="Case Title"
                            className="w-full border border-white/20 px-3 py-2 bg-transparent"
                        />
                        <input
                            value={newCase.excerpt}
                            onChange={(e) => setNewCase({ ...newCase, excerpt: e.target.value })}
                            placeholder="Case Excerpt"
                            className="w-full border border-white/20 px-3 py-2 bg-transparent"
                        />
                        <textarea
                            value={newCase.story}
                            onChange={(e) => setNewCase({ ...newCase, story: e.target.value })}
                            placeholder="Case Story"
                            rows={4}
                            className="w-full border border-white/20 px-3 py-2 bg-transparent"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateCase}
                                disabled={createCaseMutation.isPending}
                                className="border border-green-500 text-green-500 px-4 py-2 hover:bg-green-500/10"
                            >
                                {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                            </button>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="border border-gray-500 text-gray-500 px-4 py-2 hover:bg-gray-500/10"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {cases.map((case_) => (
                    <div key={case_.id} className="border border-white/10 p-4 bg-white/5">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold">{case_.title}</h3>
                                <p className="text-sm text-white/70">{case_.excerpt}</p>
                                <p className="text-xs text-white/50 mt-1">{case_.id}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedCase(case_)}
                                    className="border border-blue-500 text-blue-500 px-3 py-1 text-sm hover:bg-blue-500/10"
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={() => handleDeleteCase(case_.id)}
                                    disabled={deleteCaseMutation.isPending}
                                    className="border border-red-500 text-red-500 px-3 py-1 text-sm hover:bg-red-500/10"
                                >
                                    {deleteCaseMutation.isPending ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-white/60">
                            {case_.suspects.length} suspects • {case_.hints.length} hints
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const distQuery = useQuery({
        queryKey: ['latestDistribution', selectedCase?.id],
        enabled: !!selectedCase?.id,
        queryFn: async () => {
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(selectedCase!.id)}/distribute/latest`);
            if (!res.ok) return { distribution: null, payouts: [] as Array<{ user_address: string; amount_usd?: string | null; tx_hash?: string | null }> };
            return res.json() as Promise<{ distribution: any, payouts: Array<{ user_address: string; amount_usd?: string | null; tx_hash?: string | null }> }>;
        }
    });

    const renderRevealTab = () => (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-funnel-display mb-4">Reveal & Distribute</h2>
            <p className="text-white/70 mb-4">Enter the case CID to reveal the answer and distribute the pool to winners.</p>
            <div className="mb-4 text-xs text-white/80 font-funnel-display border border-white/10 bg-white/5 px-3 py-2">
                For demo purposes: This will reveal the solution, distribute rewards, and reset player progress for the case (entries, hints, verdicts, chats).
            </div>
            <div className="mb-4">
                <Link href="/" className="border border-white/30 px-3 py-2 hover:bg-white/10 font-funnel-display inline-block">← Back to App</Link>
            </div>

            <div className="border border-white/10 p-6 bg-white/5">
                <div className="flex gap-2 items-center mb-4">
                    <input
                        value={selectedCase?.id || ""}
                        onChange={(e) => setSelectedCase(cases.find(c => c.id === e.target.value) || null)}
                        placeholder="Case ID"
                        className="flex-1 border border-white/20 px-3 py-2 bg-transparent"
                        list="cases-list"
                    />
                    <datalist id="cases-list">
                        {cases.map(c => <option key={c.id} value={c.id} />)}
                    </datalist>
                    <button
                        onClick={async () => {
                            if (!selectedCase?.id) return;
                            try {
                                const res = await fetch(`/api/admin/cases/${encodeURIComponent(selectedCase.id)}/distribute`, { method: 'POST' });
                                const json = await res.json();

                                if (res.ok) {
                                    if (json.distributed === 0) {
                                        if (json.message?.includes('No verdicts')) {
                                            setMessage('No players submitted verdicts yet. Case progress has been reset.');
                                        } else if (json.message?.includes('No winners')) {
                                            setMessage('No players guessed correctly. Case progress has been reset.');
                                        } else if (json.message?.includes('No solution')) {
                                            setMessage('No solution set for this case. Case progress has been reset.');
                                        } else {
                                            setMessage('No rewards distributed. Case progress has been reset.');
                                        }
                                    } else {
                                        setMessage(`Successfully distributed rewards to ${json.distributed} winner(s). Case progress has been reset.`);
                                    }
                                } else {
                                    setMessage(json.error || 'Distribution failed');
                                }

                                // Refetch distribution panel
                                await distQuery.refetch();
                                // Invalidate user-facing caches so pages refresh state
                                await Promise.all([
                                    queryClient.removeQueries({ queryKey: ['entry'], exact: false }),
                                    queryClient.removeQueries({ queryKey: ['hintsUnlocks'], exact: false }),
                                    queryClient.removeQueries({ queryKey: ['verdict'], exact: false }),
                                ]);
                            } catch {
                                setMessage('Distribution failed');
                            }
                        }}
                        disabled={!selectedCase}
                        className="border border-white/40 px-4 py-2 hover:bg-white/10 disabled:opacity-50"
                    >
                        Reveal & Distribute
                    </button>
                </div>

                {selectedCase && (
                    <div className="text-sm text-white/70">
                        <p><strong>Selected Case:</strong> {selectedCase.title}</p>
                        <p><strong>Suspects:</strong> {selectedCase.suspects.map(s => s.name).join(", ")}</p>
                    </div>
                )}

                <div className="mt-6">
                    <h3 className="text-lg mb-2">Last Distribution</h3>
                    {(!selectedCase) ? (
                        <div className="text-white/60 text-sm">Select a case to view past distribution.</div>
                    ) : distQuery.isLoading ? (
                        <div className="text-white/60 text-sm">Loading…</div>
                    ) : distQuery.data?.distribution ? (
                        <div className="border border-white/10 bg-white/5 p-3">
                            {distQuery.data.payouts.length === 0 ? (
                                <div className="text-white/70 text-xs">
                                    <div className="mb-1">No winners in the last distribution.</div>
                                    <div className="text-white/50 text-xs">This could mean no players submitted verdicts, or no one guessed correctly.</div>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {distQuery.data.payouts.map((p: any, i: number) => (
                                        <li key={i} className="text-xs font-mono text-white/80 break-all">
                                            {p.user_address} — {p.amount_usd ?? '—'} {p.tx_hash ? (<>
                                                · tx: <a className="underline" href={`https://amoy.polygonscan.com/tx/${p.tx_hash}`} target="_blank" rel="noreferrer">{p.tx_hash.slice(0, 10)}…</a>
                                            </>) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <div className="text-white/60 text-xs">No past distributions yet.</div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderCaseDetails = () => {
        if (!selectedCase) return null;

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-funnel-display">Case Details: {selectedCase.title}</h2>
                    <button
                        onClick={() => setSelectedCase(null)}
                        className="border border-gray-500 text-gray-500 px-4 py-2 hover:bg-gray-500/10"
                    >
                        Back to List
                    </button>
                </div>

                <div className="grid gap-6">
                    <div className="border border-white/10 p-4 bg-white/5">
                        <h3 className="font-bold mb-2">Basic Information</h3>
                        <p><strong>ID:</strong> {selectedCase.id}</p>
                        <p><strong>Excerpt:</strong> {selectedCase.excerpt}</p>
                        <p><strong>Story:</strong> {selectedCase.story}</p>
                    </div>

                    <div className="border border-white/10 p-4 bg-white/5">
                        <h3 className="font-bold mb-2">Hints ({selectedCase.hints.length})</h3>
                        <HintEditor caseId={selectedCase.id} initialHints={selectedCase.hints} onChanged={() => { }} />
                    </div>

                    <div className="border border-white/10 p-4 bg-white/5">
                        <h3 className="font-bold mb-2">Suspects ({selectedCase.suspects.length})</h3>
                        <SuspectsEditor caseId={selectedCase.id} suspects={selectedCase.suspects} onChanged={() => { }} />
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-black text-white p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="font-funnel-display">Loading cases...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-black text-white p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center">
                        <p className="text-red-400">Failed to load cases: {error.message}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 border border-white/40 px-4 py-2 hover:bg-white/10"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-black text-white p-6">
            <div className="max-w-6xl mx-auto">
                {message && (
                    <div className="mb-4 p-3 border border-blue-500 bg-blue-500/10 text-blue-400">
                        {message}
                    </div>
                )}

                <div className="border-b border-white/10 mb-6">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab("cases")}
                            className={`pb-2 ${activeTab === "cases" ? "border-b-2 border-white" : "text-white/70"}`}
                        >
                            Cases
                        </button>
                        <button
                            onClick={() => setActiveTab("reveal")}
                            className={`pb-2 ${activeTab === "reveal" ? "border-b-2 border-white" : "text-white/70"}`}
                        >
                            Reveal & Distribute
                        </button>
                    </div>
                </div>

                {activeTab === "cases" && !selectedCase && renderCasesTab()}
                {activeTab === "cases" && selectedCase && renderCaseDetails()}
                {activeTab === "reveal" && renderRevealTab()}
            </div>
        </main>
    );
}

function HintEditor({ caseId, initialHints, onChanged }: { caseId: string; initialHints: string[]; onChanged: () => Promise<void> | void }) {
    const [newHint, setNewHint] = useState("");
    const createHintMutation = useCreateHint();

    const addHint = async () => {
        const text = newHint.trim();
        if (!text) return;
        try {
            await createHintMutation.mutateAsync({ caseId, data: { hintText: text } });
            setNewHint("");
            await onChanged();
        } catch (error) {
            console.error("Failed to create hint:", error);
        }
    };

    // We don't have IDs from selectedCase.hints; editor supports only adding new hints.
    return (
        <div className="space-y-3">
            <ul className="list-disc list-inside space-y-1">
                {initialHints.map((h, idx) => (
                    <li key={idx} className="text-sm flex items-center justify-between">
                        <span className="pr-2">{h}</span>
                    </li>
                ))}
            </ul>
            <div className="flex gap-2">
                <input value={newHint} onChange={(e) => setNewHint(e.target.value)} placeholder="New hint" className="flex-1 border border-white/20 px-3 py-2 bg-transparent" />
                <button onClick={addHint} disabled={createHintMutation.isPending || !newHint.trim()} className="border border-white/40 px-3 py-2 hover:bg-white/10 disabled:opacity-50">
                    {createHintMutation.isPending ? "Adding..." : "Add"}
                </button>
            </div>
        </div>
    );
}

function SuspectsEditor({ caseId, suspects, onChanged }: { caseId: string; suspects: Suspect[]; onChanged: () => Promise<void> | void }) {
    const [form, setForm] = useState<Partial<CreateSuspectData>>({ name: "", age: 30, occupation: "", image: "/suspect.png", gender: "M" });
    const createSuspectMutation = useCreateSuspect();

    const addSuspect = async () => {
        if (!form.name || !form.occupation || !form.image || !form.gender || !form.age) return;
        try {
            await createSuspectMutation.mutateAsync({
                caseId,
                data: form as CreateSuspectData
            });
            setForm({ name: "", age: 30, occupation: "", image: "/suspect.png", gender: "M" });
            await onChanged();
        } catch (error) {
            console.error("Failed to create suspect:", error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-3">
                {suspects.map((s) => (
                    <div key={s.id} className="border border-white/10 p-3 bg-black/30">
                        <div className="flex justify-between">
                            <div>
                                <h4 className="font-bold">{s.name}</h4>
                                <p className="text-sm text-white/70">{s.occupation}, Age {s.age}</p>
                            </div>
                            <div className="flex gap-2">
                                {/* For MVP, only add supported. Edit/delete can be wired similarly via endpoints. */}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border border-white/10 p-3 bg-black/30">
                <div className="font-bold mb-2">Add Suspect</div>
                <div className="grid md:grid-cols-2 gap-2">
                    <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="border border-white/20 px-3 py-2 bg-transparent" />
                    <input value={form.occupation || ""} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="Occupation" className="border border-white/20 px-3 py-2 bg-transparent" />
                    <input value={String(form.age ?? "")} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} placeholder="Age" className="border border-white/20 px-3 py-2 bg-transparent" />
                    <input value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Gender (M/F)" className="border border-white/20 px-3 py-2 bg-transparent" />
                    <input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image URL" className="border border-white/20 px-3 py-2 bg-transparent md:col-span-2" />
                </div>
                <div className="mt-2">
                    <button onClick={addSuspect} disabled={createSuspectMutation.isPending} className="border border-white/40 px-3 py-2 hover:bg-white/10 disabled:opacity-50">
                        {createSuspectMutation.isPending ? "Adding..." : "Add Suspect"}
                    </button>
                </div>
            </div>
        </div>
    );
}


