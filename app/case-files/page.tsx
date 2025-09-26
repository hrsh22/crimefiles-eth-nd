"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Wallet from "../wallet";
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

export default function CaseFilesIndexPage() {
    const { isConnected } = useAccount();
    const [blockClicks, setBlockClicks] = useState(false);

    const { data: cases = [], isLoading, error } = useQuery({
        queryKey: ['cases'],
        queryFn: async () => {
            const res = await fetch('/api/admin/cases');
            if (!res.ok) throw new Error('Failed to fetch cases');
            const data = await res.json();
            return data.cases || [];
        },
        enabled: isConnected,
    });

    useEffect(() => {
        if (isConnected) {
            setBlockClicks(true);
            const t = setTimeout(() => setBlockClicks(false), 600);
            return () => clearTimeout(t);
        }
        setBlockClicks(false);
    }, [isConnected]);

    if (!isConnected) {
        return <Wallet />;
    }

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-4rem)] grid place-items-center bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="font-funnel-display">Loading cases...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-[calc(100vh-4rem)] grid place-items-center bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10] text-white">
                <div className="text-center">
                    <p className="font-funnel-display text-red-400 mb-4">Failed to load cases</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="border border-white/40 px-4 py-2 hover:bg-white/10"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-4rem)] text-white relative overflow-hidden bg-gradient-to-b from-[#0b0c10] via-[#0f1218] to-[#0b0c10]">

            <div className="max-w-7xl mx-auto h-full px-4 py-8 flex flex-col">
                <div className="flex items-end justify-between">
                    <h1 className="text-3xl md:text-4xl font-funnel-display">Open Case Files</h1>
                    <p className="text-white/70 font-funnel-display">{cases.length} active investigations</p>
                </div>

                {blockClicks && <div className="fixed inset-0 z-40" />}
                <div className="mt-6 flex-1 overflow-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-4">
                        {cases.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <p className="text-white/60 font-funnel-display">No cases available</p>
                            </div>
                        ) : (
                            cases.map((c) => (
                                <Link key={c.id} href={`/case-files/${c.id}`} className="group block">
                                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20">
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-white to-transparent" />
                                        <div className="p-5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-funnel-display text-xl">{c.title}</span>
                                                <span className="text-xs text-white/60">#{c.id.slice(0, 6)}</span>
                                            </div>
                                            <div className="mt-2 text-sm text-white/70 line-clamp-2 font-funnel-display">
                                                {c.excerpt}
                                            </div>
                                            <div className="mt-4 flex -space-x-2">
                                                {c.suspects.slice(0, 3).map((s) => (
                                                    <Image key={s.id} src={s.image} alt={s.name} width={28} height={28} className="rounded-full ring-1 ring-white/20" />
                                                ))}
                                            </div>
                                            <div className="mt-6 flex items-center justify-between text-sm">
                                                <span className="text-white/50 font-funnel-display uppercase tracking-wider">{c.hints.length} hints • {c.suspects.length} suspects</span>
                                                <span className="font-funnel-display text-white/80 group-hover:text-white transition-colors">Open ›</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

}
