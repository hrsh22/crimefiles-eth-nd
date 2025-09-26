"use client";
import React, { useState, useEffect } from "react";

type Case = {
    id: string;
    title: string;
    excerpt: string;
    story: string;
    hints: string[];
    suspects: Suspect[];
    timeline?: Timeline;
};

type Suspect = {
    id: string;
    name: string;
    age: number;
    occupation: string;
    image: string;
    gender: string;
    traits?: string[];
    mannerisms?: string[];
    aiPrompt?: string;
    whereabouts?: string[];
};

type Timeline = {
    ticks: TimelineTick[];
    lanes: TimelineLane[];
    events: TimelineEvent[];
};

type TimelineTick = { id: string; label: string };
type TimelineLane = { id: string; title: string; kind: "victim" | "suspect" | "witness" | "solution" };
type TimelineEvent = { id: string; laneId: string; title: string; startTick: number; endTick?: number; tags?: string[] };

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState("cases");
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCase, setNewCase] = useState({ title: "", excerpt: "", story: "" });

    useEffect(() => {
        loadCases();
    }, []);

    const loadCases = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/cases");
            const data = await res.json();
            if (data.cases) {
                setCases(data.cases);
            }
        } catch (error) {
            console.error("Failed to load cases:", error);
            setMessage("Failed to load cases");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCase = async () => {
        if (!newCase.title || !newCase.excerpt || !newCase.story) {
            setMessage("All fields are required");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/admin/cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCase)
            });
            const data = await res.json();

            if (res.ok) {
                setMessage("Case created successfully");
                setNewCase({ title: "", excerpt: "", story: "" });
                setShowCreateForm(false);
                await loadCases();
            } else {
                setMessage(data.error || "Failed to create case");
            }
        } catch {
            setMessage("Failed to create case");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCase = async (caseId: string) => {
        if (!confirm("Are you sure you want to delete this case?")) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/admin/cases?id=${encodeURIComponent(caseId)}`, { method: "DELETE" });
            const data = await res.json();

            if (res.ok) {
                setMessage("Case deleted successfully");
                await loadCases();
            } else {
                setMessage(data.error || "Failed to delete case");
            }
        } catch {
            setMessage("Failed to delete case");
        } finally {
            setLoading(false);
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
                                disabled={loading}
                                className="border border-green-500 text-green-500 px-4 py-2 hover:bg-green-500/10"
                            >
                                {loading ? "Creating..." : "Create Case"}
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
                                    disabled={loading}
                                    className="border border-red-500 text-red-500 px-3 py-1 text-sm hover:bg-red-500/10"
                                >
                                    Delete
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

    const renderRevealTab = () => (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-funnel-display mb-4">Reveal & Distribute</h2>
            <p className="text-white/70 mb-4">Enter the case CID to reveal the answer and distribute the pool to winners.</p>

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
                        disabled={!selectedCase || loading}
                        className="border border-white/40 px-4 py-2 hover:bg-white/10 disabled:opacity-50"
                    >
                        {loading ? "Processing…" : "Reveal & Distribute"}
                    </button>
                </div>

                {selectedCase && (
                    <div className="text-sm text-white/70">
                        <p><strong>Selected Case:</strong> {selectedCase.title}</p>
                        <p><strong>Suspects:</strong> {selectedCase.suspects.map(s => s.name).join(", ")}</p>
                    </div>
                )}
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
                        <HintEditor caseId={selectedCase.id} initialHints={selectedCase.hints} onChanged={loadCases} />
                    </div>

                    <div className="border border-white/10 p-4 bg-white/5">
                        <h3 className="font-bold mb-2">Suspects ({selectedCase.suspects.length})</h3>
                        <SuspectsEditor caseId={selectedCase.id} suspects={selectedCase.suspects} onChanged={loadCases} />
                    </div>
                </div>
            </div>
        );
    };

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
    const [busy, setBusy] = useState(false);

    const addHint = async () => {
        const text = newHint.trim();
        if (!text) return;
        try {
            setBusy(true);
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/hints`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hintText: text })
            });
            if (res.ok) {
                setNewHint("");
                await onChanged();
            }
        } finally {
            setBusy(false);
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
                <button onClick={addHint} disabled={busy || !newHint.trim()} className="border border-white/40 px-3 py-2 hover:bg-white/10 disabled:opacity-50">Add</button>
            </div>
        </div>
    );
}

function SuspectsEditor({ caseId, suspects, onChanged }: { caseId: string; suspects: Suspect[]; onChanged: () => Promise<void> | void }) {
    const [busy, setBusy] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Suspect>>({ name: "", age: 30, occupation: "", image: "/suspect.png", gender: "M" });

    const addSuspect = async () => {
        if (!form.name || !form.occupation || !form.image || !form.gender || !form.age) return;
        try {
            setBusy("add");
            const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/suspects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setForm({ name: "", age: 30, occupation: "", image: "/suspect.png", gender: "M" });
                await onChanged();
            }
        } finally {
            setBusy(null);
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
                    <button onClick={addSuspect} disabled={busy === "add"} className="border border-white/40 px-3 py-2 hover:bg-white/10 disabled:opacity-50">{busy === "add" ? "Adding..." : "Add Suspect"}</button>
                </div>
            </div>
        </div>
    );
}


