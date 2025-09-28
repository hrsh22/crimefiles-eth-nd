"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Wallet from "@/app/wallet";
import { useAccount, useWalletClient } from 'wagmi';
import { useThread, useOptimisticSendMessage, chatKeys } from '@/lib/hooks/useChat';
import { useCase } from '@/lib/hooks/useCases';
import { Volume2, Loader2, Square } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const { isConnected, address } = useAccount();
    const { data: walletClient } = useWalletClient();

    const { data: caseFile, isLoading, error } = useCase(id, isConnected && !!id);

    // Frontend-only: rely on local cases; skip remote fetch

    const [selectedSuspectId, setSelectedSuspectId] = useState<string>("");
    const [activeTab, setActiveTab] = useState<number>(1);
    const [currentSuspectIndex, setCurrentSuspectIndex] = useState<number>(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [isInterrogationOpen, setIsInterrogationOpen] = useState<boolean>(false);
    const [chatInput, setChatInput] = useState<string>("");
    const [messages, setMessages] = useState<Array<{ sender: "you" | "suspect"; text: string }>>([]);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [agentLeads, setAgentLeads] = useState<Array<{ title: string; tags: string[]; justification: string }>>([]);
    const [agentConsistency, setAgentConsistency] = useState<number | null>(null);

    // TTS states
    const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
    const [playingIdx, setPlayingIdx] = useState<number | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Timeline interactivity state
    const [timelineZoom, setTimelineZoom] = useState<number>(140); // px per tick
    const [visibleLaneIds, setVisibleLaneIds] = useState<string[]>([]);
    const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

    const allTags = useMemo(() => {
        const t = caseFile?.timeline;
        if (!t) return new Set<string>();
        const tags = new Set<string>();
        for (const ev of t.events) {
            for (const tg of (ev.tags ?? [])) tags.add(tg);
        }
        return tags;
    }, [caseFile]);

    useEffect(() => {
        const t = caseFile?.timeline;
        if (!t) return;
        setVisibleLaneIds(t.lanes.filter((l: any) => l.kind !== 'solution').map((l: any) => l.id));
        const defaults = new Set<string>(Array.from(allTags));
        defaults.delete('Solution');
        setActiveTags(defaults);
    }, [caseFile, allTags]);

    const toggleLane = (laneId: string) => {
        setVisibleLaneIds(prev => prev.includes(laneId) ? prev.filter(id => id !== laneId) : [...prev, laneId]);
    };

    const toggleTag = (tag: string) => {
        setActiveTags(prev => {
            const next = new Set(prev);
            if (next.has(tag)) next.delete(tag); else next.add(tag);
            return next;
        });
    };

    // Entry and hints payment state
    const queryClient = useQueryClient();
    const entryStatus = useQuery({
        queryKey: ["entry", id, address],
        enabled: !!id && !!address,
        queryFn: async () => {
            const res = await fetch(`/api/user/cases/${encodeURIComponent(id)}/entry/status?userAddress=${encodeURIComponent(address || "")}`);
            if (!res.ok) return { hasEntry: false } as { hasEntry: boolean };
            return res.json() as Promise<{ hasEntry: boolean; entry?: any }>;
        }
    });
    const hasEntry = !!entryStatus.data?.hasEntry;

    const hintsUnlocks = useQuery({
        queryKey: ["hintsUnlocks", id, address],
        enabled: hasEntry && !!id && !!address,
        queryFn: async () => {
            const res = await fetch(`/api/user/cases/${encodeURIComponent(id)}/hints/unlocks?userAddress=${encodeURIComponent(address || "")}`);
            if (!res.ok) return { unlockedIndices: [] as number[] };
            return res.json() as Promise<{ unlockedIndices: number[] }>;
        }
    });

    const verdictQuery = useQuery({
        queryKey: ["verdict", id, address],
        enabled: hasEntry && !!id && !!address,
        queryFn: async () => {
            const res = await fetch(`/api/user/cases/${encodeURIComponent(id)}/verdict?userAddress=${encodeURIComponent(address || "")}`);
            if (!res.ok) return { verdict: null } as { verdict: any };
            return res.json() as Promise<{ verdict: any }>;
        }
    });
    const [isPaying, setIsPaying] = useState<boolean>(false);
    const [payingVerdictId, setPayingVerdictId] = useState<string | null>(null);
    const [myVerdictSuspectId, setMyVerdictSuspectId] = useState<string | null>(null);

    const TabNames = ["Case File", "Hints", "Suspects", "Timeline", "Your Verdict"];

    const selectedSuspect = useMemo(() => {
        if (!caseFile) return undefined;
        return caseFile.suspects.find((s: any) => s.id === selectedSuspectId);
    }, [caseFile, selectedSuspectId]);

    const visibleHintsCount = useMemo(() => {
        if (!caseFile) return 0;
        if (!hasEntry) return 0;
        const unlocked = hintsUnlocks.data?.unlockedIndices?.length || 0;
        return Math.min(1 + unlocked, caseFile.hints.length);
    }, [caseFile, hasEntry, hintsUnlocks.data]);

    const unlockNextHint = async () => {
        if (!caseFile || !walletClient || !address) return;
        if (visibleHintsCount >= (caseFile?.hints?.length || 0)) return;
        try {
            setIsPaying(true);
            const nextIndex = Math.min(visibleHintsCount, caseFile.hints.length - 1);
            const { payHintUnlock } = await import('@/lib/x402');
            const result = await payHintUnlock(walletClient, caseFile.id, nextIndex);
            if (!result.ok) throw new Error('Payment failed');
            const backend = await fetch(`/api/user/cases/${encodeURIComponent(caseFile.id)}/hints/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: address, hintIndex: nextIndex, txHash: result.txHash, facilitator: process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || 'https://x402.polygon.technology' })
            });
            if (!backend.ok) throw new Error('Failed to record hint unlock');
            await queryClient.invalidateQueries({ queryKey: ["hintsUnlocks", id, address] });
        } finally {
            setIsPaying(false);
        }
    };

    // Verdict data from query
    useEffect(() => {
        if (verdictQuery.data?.verdict?.suspect_id) setMyVerdictSuspectId(verdictQuery.data.verdict.suspect_id);
    }, [verdictQuery.data]);

    const payEntry = async () => {
        if (!caseFile || !walletClient || !address) return;
        try {
            setIsPaying(true);
            const { payEntry } = await import('@/lib/x402');
            const result = await payEntry(walletClient, caseFile.id);
            if (!result.ok) throw new Error('Payment failed');
            const backend = await fetch(`/api/user/cases/${encodeURIComponent(caseFile.id)}/entry/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: address, txHash: result.txHash, facilitator: process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || 'https://x402.polygon.technology' })
            });
            if (!backend.ok) throw new Error('Failed to record entry');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["entry", id, address] }),
                queryClient.invalidateQueries({ queryKey: ["hintsUnlocks", id, address] }),
                queryClient.invalidateQueries({ queryKey: ["verdict", id, address] }),
            ]);
        } finally {
            setIsPaying(false);
        }
    };

    const handlePrev = () => {
        if (!caseFile) return;
        setCurrentSuspectIndex((prev) => (prev - 1 + caseFile.suspects.length) % caseFile.suspects.length);
    };

    const handleNext = () => {
        if (!caseFile) return;
        setCurrentSuspectIndex((prev) => (prev + 1) % caseFile.suspects.length);
    };

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchEndX(null);
    };

    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        setTouchEndX(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (touchStartX === null || touchEndX === null) return;
        const distance = touchStartX - touchEndX;
        const minSwipeDistance = 50;
        if (distance > minSwipeDistance) {
            handleNext();
        } else if (distance < -minSwipeDistance) {
            handlePrev();
        }
        setTouchStartX(null);
        setTouchEndX(null);
    };

    const stopTts = () => {
        try { if (typeof window !== 'undefined') window.speechSynthesis.cancel(); } catch { }
        utteranceRef.current = null;
        setPlayingIdx(null);
        setGeneratingIdx(null);
    };

    const playTts = async (text: string, idx: number) => {
        try {
            if (playingIdx === idx) { stopTts(); return; }
            // stop any currently playing audio before starting a new one
            if (playingIdx !== null && playingIdx !== idx) { stopTts(); }
            setGeneratingIdx(idx);
            const utter = new SpeechSynthesisUtterance(text);
            try {
                const voices = window.speechSynthesis.getVoices();
                const isFemale = (selectedSuspect?.gender || '').toUpperCase().startsWith('F');
                const preferred = voices.find(v => isFemale ? /female|nova|ariana|samantha/i.test(v.name) : /male|daniel|alex|fred|google.*english.*male/i.test(v.name));
                if (preferred) utter.voice = preferred;
                utter.pitch = isFemale ? 1.1 : 0.95;
                utter.rate = 1.0;
            } catch { }
            utter.onend = () => {
                setPlayingIdx((cur) => (cur === idx ? null : cur));
                utteranceRef.current = null;
            };
            utter.onerror = () => {
                setPlayingIdx(null);
                setGeneratingIdx(null);
                utteranceRef.current = null;
            };
            utteranceRef.current = utter;
            setGeneratingIdx(null);
            setPlayingIdx(idx);
            window.speechSynthesis.speak(utter);
        } catch (e) {
            setPlayingIdx(null);
            setGeneratingIdx(null);
            utteranceRef.current = null;
            console.error("Failed to speak:", e);
        }
    };

    // Use TanStack Query for thread data
    const { data: threadData } = useThread(
        address || "",
        caseFile?.id || "",
        selectedSuspectId,
        isConnected && !!caseFile && !!selectedSuspectId && !!address
    );

    // Update messages when thread data changes
    useEffect(() => {
        if (threadData?.messages) {
            const mapped = threadData.messages.map(m => ({
                sender: m.role === "user" ? "you" as const : "suspect" as const,
                text: m.content
            }));
            setMessages(mapped);
        }
    }, [threadData]);

    const hydrateMessagesForSuspect = async () => {
        setChatInput("");
        setMessages([]);
        // The useThread hook will automatically refetch when selectedSuspectId changes
        setAgentLeads([]);
        setAgentConsistency(null);
    };

    const openInterrogation = async (suspectId: string) => {
        if (!address) return; // Wallet connection required
        setSelectedSuspectId(suspectId);
        if (caseFile) {
            const idx = caseFile.suspects.findIndex((s: any) => s.id === suspectId);
            if (idx >= 0) setCurrentSuspectIndex(idx);
        }
        setIsInterrogationOpen(true);
        await hydrateMessagesForSuspect();
        // Force-fetch thread immediately to avoid initial empty state
        if (caseFile && address) {
            await queryClient.refetchQueries({ queryKey: chatKeys.thread(address, caseFile.id, suspectId) });
        }
    };

    const switchInterrogationTo = (direction: "prev" | "next") => {
        if (!caseFile || !caseFile.suspects.length) return;
        stopTts();
        const idx = caseFile.suspects.findIndex((s: any) => s.id === selectedSuspectId);
        const len = caseFile.suspects.length;
        const nextIdx = direction === "prev" ? (idx <= 0 ? len - 1 : idx - 1) : (idx >= len - 1 ? 0 : idx + 1);
        const nextId = caseFile.suspects[nextIdx].id;
        setSelectedSuspectId(nextId);
        hydrateMessagesForSuspect();
        if (address) {
            queryClient.refetchQueries({ queryKey: chatKeys.thread(address, caseFile.id, nextId) });
        }
    };

    const closeInterrogation = () => {
        stopTts();
        setIsInterrogationOpen(false);
    };

    const sendMessageMutation = useOptimisticSendMessage();

    const handleSendMessage = async () => {
        const trimmed = chatInput.trim();
        if (!trimmed || !selectedSuspectId || isSending || !address || !caseFile) return;

        console.log(`💬 Sending message to suspect: ${selectedSuspectId}`);
        // const userMsg = { sender: "you" as const, text: trimmed };
        setChatInput("");

        try {
            setIsSending(true);
            const res = await sendMessageMutation.mutateAsync({
                caseId: caseFile.id,
                suspectId: selectedSuspectId,
                data: { userMessage: trimmed, userAddress: address },
                optimisticMessage: { role: "user" as const, content: trimmed }
            });
            if (res?.leads) setAgentLeads(res.leads);
            if (typeof res?.consistency === 'number') setAgentConsistency(res.consistency);
        } catch (error) {
            console.error("💥 Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const chatScrollRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!isInterrogationOpen) return;
        const el = chatScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [isInterrogationOpen, messages]);

    useEffect(() => {
        // Prevent background/body scroll while overlay is open
        if (isInterrogationOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = prev; };
        }
    }, [isInterrogationOpen]);

    if (!isConnected) {
        return <Wallet />;
    }

    if (isLoading) {
        return (
            <div className="h-[calc(100vh-4rem)] grid place-items-center bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="font-funnel-display">Loading case...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-4rem)] grid place-items-center bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10] text-white">
                <div className="max-w-xl w-full px-6 py-10 bg-[#121417] border border-zinc-700/60 text-center">
                    <h1 className="text-2xl font-funnel-display mb-4">Case not found</h1>
                    <p className="text-zinc-400 mb-6">The case you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.</p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/case-files" className="border border-amber-400/60 text-amber-300 px-4 py-2 hover:bg-amber-400/10">
                            ← Back to all cases
                        </Link>
                        <button
                            onClick={() => window.location.reload()}
                            className="border border-white/40 px-4 py-2 hover:bg-white/10"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!caseFile) {
        return (
            <div className="h-[calc(100vh-4rem)] grid place-items-center bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10] text-white">
                <div className="max-w-xl w-full px-6 py-10 bg-[#121417] border border-zinc-700/60 text-center">
                    <h1 className="text-2xl font-funnel-display mb-4">Case not found</h1>
                    <p className="text-zinc-400 mb-6">The case you&apos;re looking for doesn&apos;t exist.</p>
                    <Link href="/case-files" className="border border-amber-400/60 text-amber-300 px-4 py-2 hover:bg-amber-400/10">
                        ← Back to all cases
                    </Link>
                </div>
            </div>
        );
    }

    const timeline = caseFile.timeline;

    return (
        <>
            <main className="w-full h-[calc(100vh-4rem)] text-white relative overflow-hidden bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10]">
                <div className="flex h-full">
                    {/* Left vertical tabs */}
                    <aside className="w-56 h-full p-6 border-r border-white/10 bg-black/30 backdrop-blur overflow-auto">
                        <div className="font-funnel-display text-sm tracking-widest text-white/60 uppercase mb-4">Dossier</div>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                onClick={() => setActiveTab(n)}
                                className={`${activeTab === n ? "text-white" : "text-white/60"} font-funnel-display text-xl w-full text-left px-2 py-2 transition-colors`}
                            >
                                {`${TabNames[n - 1]}`}
                            </button>
                        ))}
                    </aside>

                    {/* Right content area */}
                    <section className="flex-1 h-full overflow-auto">
                        {activeTab === 1 && (
                            <div className="relative">
                                <div className="relative overflow-hidden border-b border-white/10 bg-black/30">
                                    <div className="absolute inset-0 bg-[url('/assets/background/caseBg.svg')] bg-cover bg-center opacity-10" aria-hidden="true" />
                                    <div className="relative p-8 md:p-10">
                                        <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-white/60">
                                            <span>Dossier</span>
                                            <span className="h-1 w-1 rounded-full bg-white/30" />
                                            <span className="truncate">ID {String(caseFile.id).slice(0, 8)}…</span>
                                        </div>
                                        <h1 className="mt-2 text-4xl md:text-5xl font-funnel-display">{caseFile.title}</h1>
                                        {caseFile.excerpt && (
                                            <p className="mt-2 text-white/80 font-funnel-display max-w-3xl">{caseFile.excerpt}</p>
                                        )}
                                        <div className="mt-6 flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                                {caseFile.suspects.length} suspects
                                            </span>
                                            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                                                {caseFile.hints.length} hints
                                            </span>
                                            {caseFile.timeline && (
                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                                                    {caseFile.timeline.events.length} timeline events
                                                </span>
                                            )}
                                        </div>
                                        {caseFile.suspects.length > 0 && (
                                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                                <div className="text-[11px] uppercase tracking-widest text-white/60">Key suspects</div>
                                                <div className="flex -space-x-2">
                                                    {caseFile.suspects.slice(0, 5).map((s: any) => (
                                                        <Image key={s.id} src={s.image || "/suspect.png"} alt={s.name} width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20" />
                                                    ))}
                                                </div>
                                                {caseFile.suspects.length > 5 && (
                                                    <span className="text-xs text-white/60 font-funnel-display">+{caseFile.suspects.length - 5} more</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-8 md:p-10">
                                    <div className="text-[11px] uppercase tracking-widest text-zinc-400">Case Narrative</div>
                                    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 shadow-sm">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none" aria-hidden="true" />
                                            <div className="relative p-6 md:p-8">
                                                {!hasEntry ? (
                                                    <div className="space-y-4">
                                                        <p className="font-funnel-display text-white/80">Entry required to view the full case narrative.</p>
                                                        <button onClick={payEntry} disabled={isPaying || !walletClient} className={`border border-amber-400/60 text-amber-300 px-4 py-2 font-funnel-display ${isPaying ? 'opacity-60' : 'hover:bg-amber-400/10'}`}>
                                                            {isPaying ? 'Processing…' : 'Pay Entry Fee'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="font-funnel-display text-white/90 leading-8 whitespace-pre-wrap break-words max-w-5xl first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:leading-none first-letter:font-semibold first-letter:text-white/80">
                                                        {caseFile.story}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 2 && (
                            <div className="p-10">
                                <h2 className="text-4xl font-funnel-display mb-2">Hints</h2>
                                <p className="text-white/70 font-funnel-display mb-6">Clues gathered so far</p>
                                <ul className="mt-3 space-y-3">
                                    {caseFile.hints.map((hint: any, idx: number) => {
                                        const isUnlocked = idx < visibleHintsCount;
                                        return (
                                            <li key={idx} className="flex items-center gap-3 font-funnel-display">
                                                <Image src="/assets/background/hintIcon.png" alt="hint" width={22} height={20} />
                                                {isUnlocked ? (
                                                    <span className="text-white/90">{hint}</span>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-white/50">
                                                        <span className="select-none">Locked hint</span>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="mt-5">
                                    <button
                                        onClick={unlockNextHint}
                                        disabled={!hasEntry || !walletClient || isPaying || visibleHintsCount >= caseFile.hints.length}
                                        className="border border-white/30 text-white/80 px-3 py-1 hover:bg-white/10 disabled:opacity-50 font-funnel-display"
                                    >
                                        {isPaying ? 'Processing…' : (visibleHintsCount >= caseFile.hints.length ? 'All hints unlocked' : 'Unlock next hint')}
                                    </button>
                                </div>
                                <div className="mt-4 text-xs text-white/50">
                                    {visibleHintsCount}/{caseFile.hints.length} hints unlocked
                                </div>
                            </div>
                        )}

                        {activeTab === 3 && (
                            <div className="p-10">
                                <div className="relative select-none flex flex-col justify-center items-center">
                                    <div
                                        className="overflow-hidden"
                                        onTouchStart={onTouchStart}
                                        onTouchMove={onTouchMove}
                                        onTouchEnd={onTouchEnd}
                                    >
                                        <div
                                            className="flex transition-transform duration-300 ease-out"
                                            style={{ transform: `translateX(-${currentSuspectIndex * 100}%)` }}
                                        >
                                            {caseFile.suspects.map((suspect) => (
                                                <div key={suspect.id} className="min-w-full ">
                                                    <div className="min-h-[70vh] grid items-stretch px-6 md:px-20">
                                                        <div className="grid md:grid-cols-3 gap-6 w-full">
                                                            <div className="md:col-span-2 self-center">
                                                                <div className="mt-10">
                                                                    <div className="text-5xl md:text-6xl font-funnel-display">
                                                                        {suspect.name}
                                                                    </div>
                                                                </div>
                                                                {suspect.description && (
                                                                    <p className="text-xl leading-snug font-funnel-display py-4 max-w-xl text-white/80">
                                                                        {suspect.description}
                                                                    </p>
                                                                )}
                                                                <div className="mt-6">
                                                                    <div className="grid grid-cols-4 items-center">
                                                                        <div>
                                                                            <div className="text-[12px] tracking-[0.3em] uppercase text-white/50">Occupation</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[12px] tracking-[0.3em] uppercase text-white/50">Age</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[12px] tracking-[0.3em] uppercase text-white/50">Gender</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-2 border-t border-dashed border-white/20" />
                                                                    <div className="mt-4 grid grid-cols-4 items-center">
                                                                        <div className="text-2xl font-funnel-display">{suspect.occupation}</div>
                                                                        <div className="text-2xl font-funnel-display">{suspect.age}</div>
                                                                        <div className="text-2xl font-funnel-display">{suspect.gender}</div>
                                                                        <div>
                                                                            <button onClick={() => openInterrogation(suspect.id)} className="border border-white/40 text-white px-3 py-1 hover:bg-white/10 font-funnel-display">
                                                                                Interrogate
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="md:col-span-1 flex md:justify-end order-first md:order-last">
                                                                <Image className="rounded-md mt-6 md:mt-0" src={suspect.image || "/suspect.png"} alt="suspect" width={360} height={360} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {caseFile.suspects.length > 1 && (
                                        <div className="mt-3 flex justify-center gap-2">
                                            {caseFile.suspects.map((_, i) => (
                                                <span key={i} className={`h-1.5 w-6 ${i === currentSuspectIndex ? "bg-white" : "bg-white/40"}`} />
                                            ))}
                                        </div>
                                    )}

                                    {caseFile.suspects.length > 1 && (
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4">
                                            <button
                                                aria-label="Previous suspect"
                                                onClick={handlePrev}
                                                className="h-10 w-10 grid place-items-center text-white/80 hover:text-white"
                                            >
                                                ‹
                                            </button>
                                            <button
                                                aria-label="Next suspect"
                                                onClick={handleNext}
                                                className="h-10 w-10 grid place-items-center text-white/80 hover:text-white"
                                            >
                                                ›
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 4 && (
                            <div className="p-6 md:p-10">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-3xl md:text-4xl font-funnel-display">Case Timeline</h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setTimelineZoom((z) => Math.max(100, z - 20))} className="h-8 w-8 grid place-items-center border border-white/30 text-white/80 hover:bg-white/10" aria-label="Zoom out">−</button>
                                        <div className="text-white/60 text-xs w-16 text-center">{timelineZoom}px</div>
                                        <button onClick={() => setTimelineZoom((z) => Math.min(260, z + 20))} className="h-8 w-8 grid place-items-center border border-white/30 text-white/80 hover:bg-white/10" aria-label="Zoom in">+</button>
                                    </div>
                                </div>

                                {!timeline ? (
                                    <div className="text-white/60 font-funnel-display">No timeline data for this case.</div>
                                ) : (
                                    <>
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] uppercase tracking-widest text-white/60 mr-1">Tags</span>
                                            {Array.from(allTags).map((tag) => {
                                                const checked = activeTags.has(tag);
                                                const label = tag === 'Solution' ? 'Lead' : tag;
                                                return (
                                                    <button key={tag} onClick={() => toggleTag(tag)} className={`px-2 py-1 border text-xs font-funnel-display ${checked ? 'bg-white/15 border-white/40 text-white' : 'bg-black/30 border-white/20 text-white/70'} hover:bg-white/10`} aria-pressed={checked}>
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="mb-4 flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] uppercase tracking-widest text-white/60 mr-1">Lanes</span>
                                            {timeline.lanes.map((lane) => {
                                                const checked = visibleLaneIds.includes(lane.id);
                                                const label = lane.kind === 'solution' ? 'Leads' : lane.title;
                                                return (
                                                    <button key={lane.id} onClick={() => toggleLane(lane.id)} className={`px-2 py-1 border text-xs font-funnel-display ${checked ? 'bg-white/15 border-white/40 text-white' : 'bg-black/30 border-white/20 text-white/70'} hover:bg-white/10`} aria-pressed={checked}>
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="w-full border border-white/10 bg-black/30 rounded-lg overflow-hidden">
                                            <div className="grid grid-cols-[200px_1fr]">
                                                <div className="border-r border-white/10 bg-black/50">
                                                    <div className="h-10 md:h-12 border-b border-white/10" />
                                                    {timeline.lanes.filter(l => visibleLaneIds.includes(l.id)).map((lane) => (
                                                        <div key={lane.id} className="h-16 md:h-20 flex items-center px-4 border-b border-white/10">
                                                            <div className={`font-funnel-display ${lane.kind === 'solution' ? 'text-emerald-300' : lane.kind === 'victim' ? 'text-white' : lane.kind === 'witness' ? 'text-sky-300' : 'text-white/80'}`}>{lane.kind === 'solution' ? 'Leads' : lane.title}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="overflow-x-auto overscroll-contain">
                                                    <div className="sticky top-0 z-10 bg-black/60 backdrop-blur border-b border-white/10">
                                                        <div className="grid" style={{ gridTemplateColumns: `200px repeat(${timeline.ticks.length}, minmax(${timelineZoom}px, 1fr))` }}>
                                                            <div className="h-10 md:h-12 border-r border-white/10 bg-black/50" />
                                                            {timeline.ticks.map((t) => (
                                                                <div key={t.id} className="h-10 md:h-12 border-r border-white/10 grid place-items-center font-funnel-display text-white/70 text-xs md:text-sm">
                                                                    {t.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        {timeline.lanes.filter(l => visibleLaneIds.includes(l.id)).map((lane) => (
                                                            <div key={lane.id} className="relative border-b border-white/10">
                                                                <div className="grid" style={{ gridTemplateColumns: `200px repeat(${timeline.ticks.length}, minmax(${timelineZoom}px, 1fr))` }}>
                                                                    <div className="h-16 md:h-20 border-r border-white/10 bg-transparent" />
                                                                    {timeline.ticks.map((t) => (
                                                                        <div key={t.id} className="h-16 md:h-20 border-r border-white/5" />
                                                                    ))}
                                                                </div>
                                                                <div className="absolute inset-0 px-2 md:px-3 grid" style={{ gridTemplateColumns: `200px repeat(${timeline.ticks.length}, minmax(${timelineZoom}px, 1fr))` }}>
                                                                    <div />
                                                                    {timeline.events
                                                                        .filter(e => e.laneId === lane.id)
                                                                        .filter(e => {
                                                                            const tags = e.tags ?? [];
                                                                            if (activeTags.size === 0) return true;
                                                                            if (tags.length === 0) return true;
                                                                            return tags.some(t => activeTags.has(t));
                                                                        })
                                                                        .map((e) => {
                                                                            const colStart = e.startTick;
                                                                            const colEnd = (e.endTick ?? e.startTick);
                                                                            const span = Math.max(1, colEnd - colStart + 1);
                                                                            const isLead = (e.tags ?? []).includes('Solution');
                                                                            const title = isLead && !activeTags.has('Solution') ? 'Lead (redacted)' : e.title;
                                                                            return (
                                                                                <div key={e.id} className="h-full py-2" style={{ gridColumn: `${colStart + 1} / span ${span}` }}>
                                                                                    <div className={`h-full w-full rounded border px-2 md:px-3 flex items-center gap-2 text-xs md:text-sm font-funnel-display shadow-sm hover:shadow ${lane.kind === 'solution' ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' : lane.kind === 'victim' ? 'bg-white/10 border-white/30 text-white' : lane.kind === 'witness' ? 'bg-sky-500/15 border-sky-400/40 text-sky-200' : 'bg-amber-500/10 border-amber-400/40 text-amber-200'}`} title={title}>
                                                                                        <span className="truncate flex-1">{title}</span>
                                                                                        {(e.tags ?? []).slice(0, 3).map((tag, i) => (
                                                                                            <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] ${tag === 'Means' ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30' : tag === 'Motive' ? 'bg-orange-500/20 text-orange-200 border border-orange-400/30' : tag === 'Opportunity' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30' : tag === 'Witness' ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30' : tag === 'Solution' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-white/10 text-white/80 border border-white/20'}`}>{tag === 'Solution' ? 'Lead' : tag}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 5 && (
                            <div className="p-10">
                                <h2 className="text-4xl font-funnel-display mb-4">Your Verdict</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {caseFile.suspects.map((c) => (
                                        <div key={c.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                            <div className="p-5 flex items-center gap-4">
                                                <Image src={c.image || "/suspect.png"} alt={c.name} width={56} height={56} className="rounded-md" />
                                                <div className="font-funnel-display text-2xl">{c.name}</div>
                                            </div>
                                            <div className="border-t border-white/10 flex items-center justify-end px-4 py-3">
                                                {myVerdictSuspectId === c.id ? (
                                                    <span className="font-funnel-display text-emerald-300 border border-emerald-400/40 px-3 py-1">Submitted</span>
                                                ) : (
                                                    <button onClick={async () => {
                                                        if (!walletClient || !address) return;
                                                        setIsPaying(true);
                                                        setPayingVerdictId(c.id);
                                                        try {
                                                            const { payVerdict } = await import('@/lib/x402');
                                                            const result = await payVerdict(walletClient, caseFile.id, c.id);
                                                            if (!result.ok) throw new Error('Payment failed');
                                                            const backend = await fetch(`/api/user/cases/${encodeURIComponent(caseFile.id)}/verdict`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ userAddress: address, suspectId: c.id, txHash: result.txHash, facilitator: process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || 'https://x402.polygon.technology' })
                                                            });
                                                            if (!backend.ok) throw new Error('Failed to record verdict');
                                                            setMyVerdictSuspectId(c.id);
                                                        } finally { setIsPaying(false); setPayingVerdictId(null); }
                                                    }} className="font-funnel-display border border-white/40 px-3 py-1 hover:bg-white/10 disabled:opacity-50" disabled={!hasEntry || (!!myVerdictSuspectId) || (isPaying && payingVerdictId === c.id)}>
                                                        {isPaying && payingVerdictId === c.id ? 'Processing…' : 'Accuse'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </section>

                    {isInterrogationOpen && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-0 overflow-hidden">
                            <div className="w-full h-full grid grid-cols-1 md:grid-cols-[380px_1fr] min-h-0">
                                {/* Left: suspect details */}
                                <aside className="hidden md:block h-full border-r border-white/10 bg-black/70 overflow-y-auto p-6">
                                    <div className="flex items-center gap-4">
                                        <Image className="rounded-md" src={selectedSuspect?.image || "/suspect.png"} alt="suspect" width={120} height={120} />
                                        <div>
                                            <div className="text-2xl font-funnel-display">{selectedSuspect?.name}</div>
                                            <div className="text-white/70 font-funnel-display">{selectedSuspect?.occupation} • {selectedSuspect?.age} • {selectedSuspect?.gender}</div>
                                        </div>
                                    </div>
                                    {selectedSuspect?.description && (
                                        <p className="mt-4 text-white/80 font-funnel-display leading-relaxed">
                                            {selectedSuspect.description}
                                        </p>
                                    )}
                                    <div className="mt-6">
                                        <div className="text-[11px] uppercase tracking-widest text-white/60 mb-2">Whereabouts</div>
                                        {Array.isArray(selectedSuspect?.whereabouts) && selectedSuspect!.whereabouts!.length > 0 ? (
                                            <ul className="space-y-1 text-white/85 font-funnel-display border border-white/10 bg-white/5 p-3 list-disc list-inside">
                                                {selectedSuspect!.whereabouts!.map((w, i) => (
                                                    <li key={i}>{w}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="border border-white/10 bg-white/5 p-3 font-funnel-display text-white/80">Unknown / not disclosed</div>
                                        )}
                                    </div>
                                    {Array.isArray(selectedSuspect?.traits) && selectedSuspect!.traits!.length > 0 && (
                                        <div className="mt-6">
                                            <div className="text-[11px] uppercase tracking-widest text-white/60 mb-2">Traits</div>
                                            <ul className="space-y-1 text-white/85 font-funnel-display">
                                                {selectedSuspect!.traits!.map((t, i) => (
                                                    <li key={i}>• {t}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {Array.isArray(selectedSuspect?.mannerisms) && selectedSuspect!.mannerisms!.length > 0 && (
                                        <div className="mt-6">
                                            <div className="text-[11px] uppercase tracking-widest text-white/60 mb-2">Mannerisms</div>
                                            <ul className="space-y-1 text-white/85 font-funnel-display">
                                                {selectedSuspect!.mannerisms!.map((m, i) => (
                                                    <li key={i}>• {m}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="mt-6 flex items-center gap-3">
                                        <button onClick={() => switchInterrogationTo("prev")} className="h-8 w-8 grid place-items-center border border-white/30 hover:bg-white/10">‹</button>
                                        <button onClick={() => switchInterrogationTo("next")} className="h-8 w-8 grid place-items-center border border-white/30 hover:bg-white/10">›</button>
                                    </div>
                                    <div className="mt-6">
                                        <button onClick={closeInterrogation} className="text-white/70 hover:text-white">Close</button>
                                    </div>
                                </aside>

                                {/* Right: chat */}
                                <section className="h-full bg-black/60 border-l border-white/10 flex flex-col min-h-0">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                        <div className="font-funnel-display text-xl">
                                            {selectedSuspect?.name ? `Interrogating ${selectedSuspect.name}` : "Interrogation"}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {typeof agentConsistency === 'number' && (
                                                <span className="font-funnel-display text-sm text-white/80 border border-white/20 px-2 py-0.5 rounded">Consistency {Math.round(agentConsistency * 100)}%</span>
                                            )}
                                            <button onClick={closeInterrogation} aria-label="Close interrogation" className="text-white/70 hover:text-white">✕</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain" ref={chatScrollRef}>
                                        {messages.map((m, idx) => (
                                            <div key={idx} className={`flex ${m.sender === "you" ? "justify-end" : "justify-start"}`}>
                                                <div className={`${m.sender === "you" ? "bg-white text-black" : "bg-white/10 text-white"} px-3 py-2 rounded-md max-w-[80%]`}>
                                                    <div className="text-xs opacity-70 mb-0.5">{m.sender === "you" ? "You" : selectedSuspect?.name || "Suspect"}</div>
                                                    <div className="font-funnel-display">{m.text}</div>
                                                    {m.sender !== "you" && (
                                                        <div className="mt-1 flex justify-end">
                                                            <button onClick={() => (playingIdx === idx ? stopTts() : playTts(m.text, idx))} aria-label={playingIdx === idx ? "Stop voice" : (generatingIdx === idx ? "Generating voice" : "Play voice")} className="h-8 w-8 grid place-items-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 shadow-sm transition transform hover:scale-105">
                                                                {playingIdx === idx ? (
                                                                    <Square className="h-4 w-4" />
                                                                ) : generatingIdx === idx ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Volume2 className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {isSending && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/10 text-white px-3 py-2 rounded-md max-w-[80%]">
                                                    <div className="flex items-center gap-1 h-4">
                                                        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
                                                        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
                                                        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <style jsx>{`
                                        @keyframes blink { 0% { opacity: .2 } 20% { opacity: 1 } 100% { opacity: .2 } }
                                        .typing-dot { animation: blink 1.4s infinite both; }
                                        .typing-dot:nth-child(2) { animation-delay: .2s; }
                                        .typing-dot:nth-child(3) { animation-delay: .4s; }
                                    `}</style>
                                    </div>
                                    <div className="px-4 pt-3 border-t border-white/10 bg-black/60">
                                        {agentLeads.length > 0 && (
                                            <div className="mb-2">
                                                <div className="text-[11px] uppercase tracking-widest text-white/60 mb-1">Agent Leads</div>
                                                <ul className="space-y-1">
                                                    {agentLeads.map((l, i) => (
                                                        <li key={i} className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-100 p-2 font-funnel-display">
                                                            <div className="text-sm">{l.title}</div>
                                                            <div className="mt-1 text-xs opacity-80">{l.justification}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 px-4 pb-3 bg-black/60">
                                        <input
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter" && !isSending) handleSendMessage(); }}
                                            placeholder="Ask a question..."
                                            className="flex-1 border border-white/20 px-3 py-2 outline-none bg-transparent placeholder:text-white/50"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || isSending}
                                            className={`h-10 px-4 border border-white/40 text-white ${(!chatInput.trim() || isSending) ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"}`}
                                        >
                                            Send
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            {/* Entry gate overlay */}
            {(!hasEntry) && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center">
                    <div className="w-full max-w-sm mx-4 border border-white/15 bg-black/60 p-6 text-white">
                        <div className="font-funnel-display text-xl mb-2">Case Entry Required</div>
                        {(entryStatus.isLoading || entryStatus.isFetching) ? (
                            <div className="flex items-center gap-3 text-white/70">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                Checking your entry status…
                            </div>
                        ) : (
                            <>
                                <p className="text-white/70 mb-4 font-funnel-display">Pay a small entry fee to access this case.</p>
                                <div className="flex items-center gap-3">
                                    <button onClick={payEntry} disabled={isPaying || !walletClient} className={`border border-amber-400/60 text-amber-300 px-4 py-2 font-funnel-display ${isPaying ? 'opacity-60' : 'hover:bg-amber-400/10'}`}>
                                        {isPaying ? 'Processing…' : 'Pay Entry Fee'}
                                    </button>
                                    <Link href="/case-files" className="border border-white/30 px-3 py-2 hover:bg-white/10 font-funnel-display">Cancel</Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
