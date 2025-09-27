# Case Files

An interactive Next.js application for investigative case files. Players read a brief, follow structured hints, interrogate suspects via a demo chat, and pick a prime suspect. This version is frontend-only.

## 🌟 Features

- **Case-driven gameplay**: Browse cases, read the story and hints, and select a suspect
- **Demo chat**: Interrogate suspects with local, frontend-only responses
- **Responsive design**: Tailwind CSS UI optimized for mobile and desktop

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.0.0

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd case-files
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

### Environment Variables

Add to your `.env.local`:
```bash
# Turso / libsql (server-only)
# Use these to enable remote DB. If not set, local file DB is used.
LIBSQL_URL=libsql://<your-db>.turso.io
LIBSQL_AUTH_TOKEN=xxxx
# Local fallback path (optional)
# CRIMEFILES_DB_PATH=/absolute/path/to/crimefiles.db

# Wallet Connect (required for wallet connection)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id

# Blockchain Network (optional)
# Set to "mainnet" for Polygon mainnet or "testnet" for Polygon Amoy testnet (default: testnet)
NEXT_PUBLIC_WAGMI_CHAIN=testnet

# Alchemy RPC (optional - for enhanced RPC performance)
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key

# LLM Provider (for AI chat features)
ASI_ONE_BASE_URL=https://api.asi1.ai
ASI_ONE_API_KEY=your_asi_one_api_key
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.0 with React 18
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **State Management**: React Query (@tanstack/react-query)
- **TypeScript**: Full type safety

## 🔧 Backend

None. All interactions are simulated locally in the browser.

## 🔒 How It Works

1. **Open Cases**: Navigate to `/case-files` and choose a case
2. **Read & Decide**: Review the brief and hints, then select a suspect
3. **Interrogate**: Open the Interrogation overlay and chat (local demo)

Key implementation point:

- The case detail page at `app/case-files/[id]/page.tsx` implements the UI, local chat, and TTS via browser SpeechSynthesis.

## 📁 Project Structure

```
├── app/
│   ├── case-files/
│   │   ├── [id]/page.tsx     # Case detail view; verdict encryption + submission
│   │   ├── header.tsx        # Local header for case-files
│   │   └── page.tsx          # Case index with cards
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   ├── providers.tsx         # Providers (React Query only)
│   └── wallet.tsx            # Landing hero (no wallet)
├── components/               # Shared UI (header, footer, wallet connect)
├── lib/
│   ├── prompts.ts            # Prompt builders (kept for reference)
│   ├── case-seeds.ts         # Seed generators (unused in UI)
│   └── generated-store.ts    # Ephemeral store (unused in UI)
└── public/
    ├── assets/               # Backgrounds and branding
    └── case-videos/          # Case hero videos (1.mp4, 2.mp4, 3.mp4)
```

## 🔗 Backend/Blockchain

Now integrated with Polygon x402 for micropayments.

Frontend env:

```bash
NEXT_PUBLIC_X402_FACILITATOR_URL=https://x402.polygon.technology
NEXT_PUBLIC_X402_SELLER_BASE_URL=http://localhost:4021
```

Seller backend (in `x402-backend/`):

```bash
SELLER_RECEIVE_ADDRESS=0xYourReceivingAddress
FACILITATOR_URL=https://x402.polygon.technology
ENTRY_PRICE_USD=$0.01
HINT_PRICE_USD=$0.002
VERDICT_PRICE_USD=$0.005
```

Run seller locally:

```bash
cd x402-backend
npm i
node seller.js
```

## 🎨 UI Surface

- **Case Index**: Browse open cases with counts for hints and suspects
- **Case Detail**: Read the brief and hints, select a suspect, and interrogate via demo chat
- **Header/Footer**: Shared navigation and branding

## 📝 Scripts

- `npm run dev`: Start development server with Turbopack
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
 - `npm run db:reset`: Reset DB and re-run migrations

After running `npm run db:reset`, the app will refetch queries on mount/focus. If a page still shows old data, switch away and back or refresh once.
