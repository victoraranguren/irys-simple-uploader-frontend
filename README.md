# Irys Solana Uploader - Fullstack Next.js Application

A modern, fullstack Web3 application built with **Next.js**, **React 19**, **TailwindCSS**, and **Solana Kit (`@solana/kit`)** to interactively upload files permanently and decentralised to **Arweave** via the **Irys Network** (formerly Bundlr) using a **Solana (SOL)** wallet.

This repository serves as the frontend interface corresponding to the CLI educational guide [`irys-simple-uploader`](https://github.com/victoraranguren/irys-simple-uploader), turning command-line workflows into a fullstack Web Application powered exclusively by **Solana Kit (`@solana/kit`)**.

---

## ⚡ Key Features

- **🔐 Private Key Credential Manager**:
  - Supports both **Base58** private key strings (e.g. exported from Phantom/Solflare) and **JSON Uint8Arrays** (e.g. keypair files from Solana CLI `[12, 45, 87...]`).
  - Processed securely in Next.js server-side backend without exposing keys.

- **📊 Real-time Balance Monitor**:
  - Displays free **Solana Wallet Balance (SOL)** on-chain.
  - Displays pre-funded **Irys Vault Balance (SOL)** reserved for Arweave storage.

- **📁 Permanent Decentralized Upload (Arweave via Irys)**:
  - Drag-and-drop file uploader supporting images, JSON, videos, and documents.
  - **Auto-funding**: Automatically funds the Irys node from your Solana wallet right before upload if the vault balance is low.
  - Direct preview and clickable **Arweave Gateway URLs**.

- **💸 Solana Kit (`@solana/kit`) Integration**:
  - Built using the modern, modular **Solana Kit (`@solana/kit`)** SDK and `@solana-program/system`.
  - Handles address validation (`isAddress`), transaction message building (`createTransactionMessage`), keypair signers, and on-chain SOL transfers with native pipelines.

- **🔄 Withdrawals & Transfers**:
  - **Withdraw from Irys**: Return unused funds from the Irys vault back to your connected wallet.
  - **Target Wallet Selector**: Switch between your **Connected Wallet (Default)** and an **External Destination Wallet (Optional)**.
  - **Direct SOL Transfer**: Send SOL on-chain to any wallet using `@solana/kit` with real-time address validation.
  - **`⚡ MAX` Preset Button**: Automatically calculates maximum available balance reserving a small fee buffer.

- **📱 QR Code Modal**:
  - Instant QR code modal generation for scanning addresses via Phantom, Solflare, or mobile wallets to deposit/recharge SOL.

- **🖥️ Live Activity Console**:
  - Built-in audit log console showing timestamps, transactions, signatures, and direct links to **Solana Explorer**.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Library & UI**: [React 19](https://react.dev/), Vanilla CSS & [TailwindCSS v4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Solana SDK**: [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) (v2) & [`@solana-program/system`](https://www.npmjs.com/package/@solana-program/system)
- **Decentralized Storage**: [`@irys/upload`](https://www.npmjs.com/package/@irys/upload) & [`@irys/upload-solana`](https://www.npmjs.com/package/@irys/upload-solana)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended).
- **npm** or **pnpm**.
- A **Solana Wallet** with SOL balance (Devnet SOL for testing or Mainnet SOL for production).

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/victoraranguren/irys-simple-uploader-frontend
   cd irys-simple-uploader-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📂 Project Structure

```text
irys-simple-uploader-frontend/
├── src/
│   └── app/
│       ├── api/
│       │   ├── balance/
│       │   │   └── route.ts     # POST: Fetches Solana & Irys balances
│       │   ├── upload/
│       │   │   └── route.ts     # POST: Handles file upload & auto-funding
│       │   ├── withdraw/
│       │   │   └── route.ts     # POST: Handles Irys unfunding & optional forwarding
│       │   └── transfer/
│       │       └── route.ts     # POST: Direct SOL transfer using @solana/kit
│       ├── utils/
│       │   ├── irys.ts          # Irys connection & keypair helper
│       │   └── solanaKit.ts     # @solana/kit transaction pipeline & validation
│       ├── globals.css          # Styling system tokens
│       ├── layout.tsx           # App layout container
│       └── page.tsx             # Interactive Main UI
├── package.json
└── README.md
```

---

## 🔗 Relationship with CLI Backend (`irys-simple-uploader`)

This frontend implements the exact underlying concepts covered in the CLI backend [`irys-simple-uploader`](https://github.com/victoraranguren/irys-simple-uploader):

| Feature | CLI Backend (`irys-simple-uploader`) | Frontend Web App (`irys-simple-uploader-frontend`) |
| :--- | :--- | :--- |
| **Interface** | Terminal Scripts (`ts-node`) | Interactive React GUI |
| **Network** | Devnet / Mainnet flags | Dynamic UI Switcher |
| **Balance** | `npm run balance` | Real-time Balance Monitor |
| **Upload** | `index.ts` script | Drag & drop file uploader |
| **Withdraw** | `withdraw.ts` | One-click withdrawal with target selector |
| **Solana SDK** | Terminal Helpers | **Solana Kit (`@solana/kit`)** |
| **QR Code** | N/A | Instant Modal QR Generator |

---

## 📚 Official References & Documentation

- **Irys Documentation**: [https://docs.irys.xyz](https://docs.irys.xyz)
- **Solana Kit (`@solana/kit`)**: [https://www.npmjs.com/package/@solana/kit](https://www.npmjs.com/package/@solana/kit)
- **Solana Explorer**: [https://explorer.solana.com](https://explorer.solana.com)
