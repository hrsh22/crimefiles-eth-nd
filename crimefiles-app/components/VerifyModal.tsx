"use client"
import { useEffect, useState } from 'react'
import { getUniversalLink } from "@selfxyz/core";
import Link from "next/link";
import { SelfQRcodeWrapper, SelfAppBuilder, type SelfApp, countries } from "@selfxyz/qrcode";
import { useAccount } from "wagmi";

type Props = {
    open: boolean
    onClose: () => void
    onVerified?: () => void
}

export default function VerifyModal({ open, onClose, onVerified }: Props) {
    const [selfApp, setSelfApp] = useState<SelfApp | null>(null)
    const [universalLink, setUniversalLink] = useState("")
    const { address, isConnected } = useAccount()

    useEffect(() => {
        if (!open || !isConnected || !address) return
        try {
            const app = new SelfAppBuilder({
                version: 2,
                appName: process.env.NEXT_PUBLIC_SELF_APP_NAME,
                scope: process.env.NEXT_PUBLIC_SELF_SCOPE,
                endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT,
                logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
                userId: address,
                endpointType: "celo",
                userIdType: "hex",
                // userDefinedData: "CrimeFiles",
                disclosures: {
                    minimumAge: 18,
                    excludedCountries: [countries.PAKISTAN],
                    ofac: true,
                }
            }).build()
            setSelfApp(app)
            // Cast to align differing @selfxyz/common versions between packages
            setUniversalLink(getUniversalLink(app as unknown as any))
        } catch (error) {
            console.error("Failed to initialize Self app:", error)
        }
    }, [open, isConnected, address])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md bg-rose-950 border border-rose-700/40 ring-1 ring-rose-500/30 p-6">
                <h2 className="font-funnel-display text-xl text-white/90">Verify with Self</h2>
                <p className="mt-2 text-white/70 font-funnel-display text-sm">You must be 18+, pass OFAC, and not be in PAK.</p>
                <div className="mt-4">
                    {isConnected && selfApp ? (
                        <SelfQRcodeWrapper
                            selfApp={selfApp}
                            onSuccess={() => {
                                if (onVerified) onVerified()
                                onClose()
                            }}
                            onError={() => {
                                console.error("Error: Failed to verify identity")
                            }}
                        />
                    ) : (
                        <div className="text-white/60 font-funnel-display text-sm">{!isConnected ? 'Connect your wallet to continue' : 'Loading QR Code…'}</div>
                    )}
                </div>
                {universalLink && (
                    <a href={universalLink} className="mt-4 block text-center border border-white/60 hover:border-white px-4 py-2 font-funnel-display">Open Self App</a>
                )}
                <Link href="/case-files" className="mt-3 block text-center border border-white/60 hover:border-white px-4 py-2 font-funnel-display">Skip to Game</Link>
                <button onClick={onClose} className="mt-3 w-full text-white/70 hover:text-white font-funnel-display text-sm">Cancel</button>
            </div>
        </div>
    )
}


