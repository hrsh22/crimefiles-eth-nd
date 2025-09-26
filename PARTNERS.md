# 🤝 CrimeFiles Partners

Simple documentation of why and where each partner is used.

---

## 🤖 ASI (Artificial Superintelligence)

**Why Used:**
- Provides AI responses for suspects in conversations
- Handles character consistency and contextual awareness
- Fast, reliable LLM API with good token efficiency

**Where Used:**
- `/lib/providers/providers_internal/asiOne.ts` - Core LLM provider
- `/app/api/cases/[caseId]/suspects/[suspectId]/messages/route.ts` - Chat message processing
- `/lib/prompts.ts` - System prompt generation for suspect personalities

---

## 💾 SQLite Database

**Why Used:**
- Simple, reliable local storage for chat history
- No external dependencies needed for development
- Fast read/write operations for conversation threads

**Where Used:**
- `/lib/db.ts` - Database operations and schema
- `/app/api/cases/[caseId]/suspects/[suspectId]/thread/route.ts` - Thread management
- `/app/api/cases/[caseId]/suspects/[suspectId]/messages/route.ts` - Message persistence

---

## ⛓️ RainbowKit + Wagmi (Wallet)

**Why Used:**
- Professional wallet connection UI
- Supports multiple wallet types (MetaMask, WalletConnect, etc.)
- Built-in network switching and error handling

**Where Used:**
- `/app/wallet.tsx` - Main wallet connection page
- `/app/case-files/page.tsx` - Case files index (requires wallet)
- `/app/case-files/[id]/page.tsx` - Case detail page (requires wallet)
- `/components/walletConnect.tsx` - Reusable wallet connection component

---

## 🔮 Future Partners

**IPFS/Filecoin** - For decentralized file storage
**Voice AI** - For text-to-speech suspect responses
**Analytics** - For user behavior and conversation insights

---

*Last Updated: September 2025*
