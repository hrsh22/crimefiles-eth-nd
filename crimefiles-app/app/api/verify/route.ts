import { NextResponse } from "next/server";
import { SelfBackendVerifier, AllIds, DefaultConfigStore, countries } from "@selfxyz/core";

if (!process.env.NEXT_PUBLIC_SELF_SCOPE) {
    throw new Error("NEXT_PUBLIC_SELF_SCOPE is not set");
}

if (!process.env.NEXT_PUBLIC_SELF_ENDPOINT) {
    throw new Error("NEXT_PUBLIC_SELF_ENDPOINT is not set");
}

const selfBackendVerifier = new SelfBackendVerifier(
    process.env.NEXT_PUBLIC_SELF_SCOPE,
    process.env.NEXT_PUBLIC_SELF_ENDPOINT,
    true, // mockPassport: true = staging/testnet per docs
    AllIds,
    new DefaultConfigStore({
        minimumAge: 18,
        excludedCountries: [countries.PAKISTAN],
        ofac: true,
    }),
    "hex" // must match userIdType in frontend (wallet address)
);

export async function POST(req: Request) {
    try {
        const { attestationId, proof, publicSignals, userContextData } = await req.json();
        if (!proof || !publicSignals || !attestationId || !userContextData) {
            return NextResponse.json(
                {
                    message: "Proof, publicSignals, attestationId and userContextData are required",
                },
                { status: 200 }
            );
        }

        const result = await selfBackendVerifier.verify(
            attestationId,
            proof,
            publicSignals,
            userContextData
        );

        if (result.isValidDetails.isValid) {
            const res = NextResponse.json({
                status: "success",
                result: true,
                credentialSubject: result.discloseOutput,
            });
            res.cookies.set('cf_verified', '1', {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60,
            })
            return res
        } else {
            return NextResponse.json(
                {
                    status: "error",
                    result: false,
                    reason: "Verification failed",
                    error_code: "VERIFICATION_FAILED",
                    details: result.isValidDetails,
                },
                { status: 200 }
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            {
                status: "error",
                result: false,
                reason: error?.message || "Unknown error",
                error_code: "UNKNOWN_ERROR",
            },
            { status: 200 }
        );
    }
}
