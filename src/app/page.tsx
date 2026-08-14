"use client";

import { useState, useEffect } from "react";
import { validateSolanaAddress } from "./utils/solanaKit";
import QRCodeDisplay from "./components/QRCodeDisplay";

export default function Home() {
  // Connection states
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [network, setNetwork] = useState<"devnet" | "mainnet">("devnet");
  
  // Balance states
  const [address, setAddress] = useState("");
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [irysBalance, setIrysBalance] = useState<string | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  
  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [autoFund, setAutoFund] = useState(false);
  const [fundAmount, setFundAmount] = useState("0.005");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    url: string;
    id: string;
    size: number;
    fundingTxId?: string | null;
    fundingAmountSol?: number | null;
    finalIrysBalance?: string;
  } | null>(null);
  
  // Withdraw & Transfer states
  const [operationType, setOperationType] = useState<"withdraw" | "transfer">("withdraw");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipientMode, setRecipientMode] = useState<"own" | "other">("own");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [transferringSol, setTransferringSol] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{
    success: boolean;
    amountWithdrawn: string;
    newBalance: string;
    txDetails: any;
  } | null>(null);
  const [transferResult, setTransferResult] = useState<{
    success: boolean;
    signature: string;
    senderAddress: string;
    destinationAddress: string;
    amountTransferred: string;
    newSenderSolBalance?: string;
    explorerUrl?: string;
  } | null>(null);
  
  // Inline Section Notification
  const [sectionNotice, setSectionNotice] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
    signature?: string;
    explorerUrl?: string;
  } | null>(null);

  // QR Modal states
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalAddress, setQrModalAddress] = useState("");
  const [qrModalTitle, setQrModalTitle] = useState("Recargar Wallet de Solana");

  // Top Toast & Console UI states
  const [logs, setLogs] = useState<string[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Helper to add logs (silent logging without auto-opening console)
  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Helper to open QR modal
  const handleOpenQrModal = (targetAddr: string, title = "Recargar Wallet de Solana") => {
    if (!targetAddr) {
      setError("No hay dirección de wallet disponible para mostrar el código QR.");
      return;
    }
    setQrModalAddress(targetAddr);
    setQrModalTitle(title);
    setShowQrModal(true);
  };

  // Clear notifications
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Load balances
  const handleCheckBalances = async (silent = false) => {
    if (!privateKey.trim()) {
      setError("Por favor ingresa tu clave privada.");
      return;
    }
    setFetchingBalance(true);
    if (!silent) addLog("Consultando saldos en Solana e Irys...");
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateKey, network }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al obtener balances");
      }
      setAddress(data.address);
      setSolBalance(data.solanaBalance);
      setIrysBalance(data.irysBalance);
      if (!silent) addLog("Saldos actualizados correctamente.");
    } catch (err: any) {
      setError(err.message || "Fallo al consultar balances.");
      addLog(`❌ Error en balance: ${err.message}`);
    } finally {
      setFetchingBalance(false);
    }
  };

  // Handle File selection
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      addLog(`Archivo seleccionado: ${e.dataTransfer.files[0].name}`);
    }
  };

  // Upload File
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKey.trim()) {
      setError("Se requiere la clave privada para firmar la subida.");
      return;
    }
    if (!file) {
      setError("Por favor selecciona un archivo para subir.");
      return;
    }

    setUploading(true);
    setUploadResult(null);
    addLog(`Iniciando subida de: ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);
    
    if (autoFund) {
      addLog(`Autofondeo habilitado con un monto de: ${fundAmount} SOL`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("privateKey", privateKey);
    formData.append("network", network);
    formData.append("autoFund", String(autoFund));
    formData.append("fundAmount", fundAmount);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Fallo durante la subida");
      }

      setUploadResult(data);
      if (data.finalIrysBalance) {
        setIrysBalance(data.finalIrysBalance);
      }
      setSuccessMsg("¡Archivo subido exitosamente a la red descentralizada!");
      addLog(`✅ Archivo subido con éxito.`);
      addLog(`Gateway URL: ${data.url}`);
      if (data.fundingTxId) {
        addLog(`Fondeo exitoso: ${data.fundingAmountSol} SOL. Tx: ${data.fundingTxId}`);
      }
      // Reload balances
      await handleCheckBalances(true);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al subir el archivo.");
      addLog(`❌ Error en subida: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Direct SOL Transfer to another wallet using Solana Kit (@solana/kit)
  const handleTransferSol = async () => {
    if (!privateKey.trim()) {
      const msg = "Se requiere la clave privada para realizar la transferencia.";
      setError(msg);
      setSectionNotice({ type: "error", title: "Falta Credencial", message: msg });
      return;
    }

    const target = destinationAddress.trim();

    if (!target) {
      const msg = "Por favor ingresa la dirección de la wallet de destino.";
      setError(msg);
      setSectionNotice({ type: "error", title: "Wallet Destino Requerida", message: msg });
      return;
    }

    if (!validateSolanaAddress(target)) {
      const msg = `La dirección '${target}' no es una wallet de Solana válida.`;
      setError(msg);
      setSectionNotice({ type: "error", title: "Dirección Inválida", message: msg });
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      const msg = "Por favor especifica un monto válido en SOL a transferir.";
      setError(msg);
      setSectionNotice({ type: "error", title: "Monto Inválido", message: msg });
      return;
    }

    setTransferringSol(true);
    setTransferResult(null);
    setSectionNotice({
      type: "info",
      title: "Enviando Transferencia en la Red de Solana...",
      message: `Transmitiendo ${withdrawAmount} SOL a la wallet ${truncateAddress(target)}...`,
    });
    addLog(`Iniciando transferencia de ${withdrawAmount} SOL a ${target} usando Solana Kit (@solana/kit)...`);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateKey,
          network,
          destinationAddress: target,
          amount: withdrawAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en la transferencia con Solana Kit");
      }

      setTransferResult(data);
      if (data.newSenderSolBalance) {
        setSolBalance(data.newSenderSolBalance);
      }
      const successText = `¡Se enviaron ${data.amountTransferred} SOL exitosamente a la wallet ${truncateAddress(data.destinationAddress)}!`;
      setSuccessMsg(successText);
      setSectionNotice({
        type: "success",
        title: "¡Transferencia Completada en Solana!",
        message: successText,
        signature: data.signature,
        explorerUrl: data.explorerUrl,
      });
      addLog(`✅ Transferencia exitosa vía @solana/kit. Signature: ${data.signature}`);
      addLog(`Wallet Destino: ${data.destinationAddress}`);
      addLog(`Solana Explorer: ${data.explorerUrl}`);
      await handleCheckBalances(true);
    } catch (err: any) {
      setError(err.message || "Fallo en la transferencia con Solana Kit.");
      setSectionNotice({
        type: "error",
        title: "Error en la Transferencia",
        message: err.message || "Fallo al procesar la transferencia con Solana Kit.",
      });
      addLog(`❌ Error en transferencia (Solana Kit): ${err.message}`);
    } finally {
      setTransferringSol(false);
    }
  };

  // Withdraw Funds from Irys with optional forwarding to destination wallet
  const handleWithdraw = async (amount: string) => {
    if (!privateKey.trim()) {
      const msg = "Se requiere la clave privada para autorizar el retiro.";
      setError(msg);
      setSectionNotice({ type: "error", title: "Falta Credencial", message: msg });
      return;
    }
    if (!amount) {
      const msg = "Por favor especifica un monto a retirar.";
      setError(msg);
      setSectionNotice({ type: "error", title: "Monto Requerido", message: msg });
      return;
    }

    const target = recipientMode === "other" ? destinationAddress.trim() : undefined;

    if (recipientMode === "other" && target && !validateSolanaAddress(target)) {
      const msg = `La dirección de destino '${target}' no es una wallet de Solana válida.`;
      setError(msg);
      setSectionNotice({ type: "error", title: "Dirección Inválida", message: msg });
      return;
    }

    setWithdrawing(true);
    setWithdrawResult(null);
    const destInfo = target ? ` (y envío a wallet externa ${truncateAddress(target)})` : " (a tu wallet propia)";
    setSectionNotice({
      type: "info",
      title: "Solicitando Retiro de Irys...",
      message: `Procesando retiro de ${amount === "all" ? "todo el saldo disponible" : amount + " SOL"}${destInfo}...`,
    });
    addLog(`Solicitando retiro de Irys: ${amount === "all" ? "Todo el saldo disponible" : amount + " SOL"}${destInfo}...`);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateKey,
          network,
          amount,
          destinationAddress: target,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al retirar fondos");
      }

      setWithdrawResult(data);
      setIrysBalance(data.newBalance);

      if (data.forwardedTransfer) {
        setTransferResult(data.forwardedTransfer);
        const msg = `¡Retiro exitoso de Irys! Se transfirieron ${data.forwardedTransfer.amountTransferred} SOL a la wallet ${truncateAddress(target!)} en la red de Solana.`;
        setSuccessMsg(msg);
        setSectionNotice({
          type: "success",
          title: "¡Retiro y Reenvío Exitoso!",
          message: msg,
          signature: data.forwardedTransfer.signature,
          explorerUrl: data.forwardedTransfer.explorerUrl,
        });
        addLog(`✅ Retiro y transferencia a otra wallet completada vía @solana/kit. Signature: ${data.forwardedTransfer.signature}`);
      } else {
        const msg = `¡Retiro exitoso de ${data.amountWithdrawn} SOL devueltos a tu wallet propia!`;
        setSuccessMsg(msg);
        setSectionNotice({
          type: "success",
          title: "¡Retiro Completado Exitosamente!",
          message: msg,
        });
        addLog(`✅ Retiro completado. Nuevo balance en Irys: ${data.newBalance} SOL`);
      }

      await handleCheckBalances(true);
    } catch (err: any) {
      setError(err.message || "Fallo al procesar el retiro.");
      setSectionNotice({
        type: "error",
        title: "Error en el Retiro",
        message: err.message || "Fallo al procesar el retiro de Irys.",
      });
      addLog(`❌ Error de retiro: ${err.message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Helper to set maximum available amount reserving a tiny fee buffer based on active operation mode
  const handleSetMaxAmount = () => {
    if (operationType === "withdraw") {
      const irysVal = irysBalance ? parseFloat(irysBalance) : 0;
      const maxIrys = Math.max(0, irysVal - 0.000005);
      setWithdrawAmount(maxIrys > 0 ? maxIrys.toFixed(6) : "0");
    } else {
      const solVal = solBalance ? parseFloat(solBalance) : 0;
      const maxSol = Math.max(0, solVal - 0.00001);
      setWithdrawAmount(maxSol > 0 ? maxSol.toFixed(6) : "0");
    }
  };

  const truncateAddress = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addLog(`Copiado al portapapeles: ${label}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Header Panel */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/70 border-b border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/25">
              I
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-200">
                Irys Solana Uploader
              </h1>
              <p className="text-sm text-zinc-500">Subida Descentralizada Permanente en la Red de Solana</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Activity Logs Console Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isConsoleOpen;
                setIsConsoleOpen(nextState);
                if (nextState && typeof window !== "undefined" && window.innerWidth < 1024) {
                  setTimeout(() => {
                    document.getElementById("mobile-activity-console")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
                isConsoleOpen
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-md shadow-violet-950/50 ring-1 ring-violet-500/30"
                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
              }`}
              title="Toggle Consola de Actividad"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${logs.length > 0 ? "bg-emerald-400 opacity-75" : "bg-zinc-400 opacity-40"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${logs.length > 0 ? "bg-emerald-500" : "bg-zinc-500"}`}></span>
              </span>
              <span className="font-mono">📟 Consola</span>
              {logs.length > 0 && (
                <span className="bg-zinc-800 text-zinc-300 text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-zinc-700">
                  {logs.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <span className="text-sm text-zinc-400 font-medium px-2 hidden sm:inline">Red:</span>
              <button
                type="button"
                onClick={() => { setNetwork("devnet"); setSolBalance(null); setIrysBalance(null); }}
                className={`px-3 py-1 text-sm sm:text-sm font-semibold rounded-md transition-all ${
                  network === "devnet"
                    ? "bg-violet-600 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Devnet
              </button>
              <button
                type="button"
                onClick={() => { setNetwork("mainnet"); setSolBalance(null); setIrysBalance(null); }}
                className={`px-3 py-1 text-sm sm:text-sm font-semibold rounded-md transition-all ${
                  network === "mainnet"
                    ? "bg-violet-600 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Mainnet
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toast notifications */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
        {error && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slide-in">
            <span className="text-lg mt-0.5">⚠️</span>
            <div className="flex-1 text-sm leading-relaxed">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 text-sm">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slide-in">
            <span className="text-lg mt-0.5">✅</span>
            <div className="flex-1 text-sm leading-relaxed">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 text-sm">✕</button>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-8">
        <div className="w-full flex flex-col gap-8">
          
          {/* Section 1: Wallet Config */}
          <section className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-5 rounded-full bg-violet-600"></span>
              <h2 className="text-base font-bold text-zinc-200">1. Credenciales de la Wallet</h2>
            </div>
            
            <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
              Ingresa la llave privada de tu billetera de Solana. Soporta formato Base58 (string largo) o array de bytes (ej: <code className="bg-zinc-950 px-1 py-0.5 rounded text-zinc-400">[12, 45, 87...]</code>).
              <span className="text-indigo-400 block mt-1">🔒 Esta llave solo se procesa de forma segura en tu Next.js backend local y nunca sale de tu servidor local.</span>
            </p>

            <div className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Ingresa private key (Base58 o Array JSON)"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm font-mono pr-12 text-zinc-200 transition-all placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm font-semibold px-2 py-1 rounded"
                >
                  {showKey ? "Ocultar" : "Mostrar"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCheckBalances(false)}
                  disabled={fetchingBalance || !privateKey}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
                >
                  {fetchingBalance ? (
                    <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></span>
                  ) : null}
                  Consultar Saldos
                </button>
              </div>

              {/* Prominent Address Card */}
              {address && (
                <div className="mt-2 p-4 bg-zinc-950/90 border border-zinc-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                      🔑
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-zinc-400 font-medium block">Dirección Pública de Tu Wallet:</span>
                      <span className="font-mono text-sm text-zinc-200 font-normal tracking-normal break-all">
                        {address}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(address, "Dirección Pública")}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span> Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenQrModal(address, "Recargar Mi Wallet de Solana")}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold px-3.5 py-2 rounded-lg transition-all shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📱</span> Ver QR / Recargar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Balance Cards Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Solana Balance */}
            <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 font-medium">Billetera Solana</span>
                <span className="text-cyan-400 text-sm font-bold bg-cyan-950/50 px-2 py-0.5 rounded-md">SOL</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black font-mono tracking-tight text-zinc-100">
                  {solBalance !== null ? `${solBalance}` : "---"}
                </span>
                <span className="text-sm text-zinc-500 block mt-1">Saldo libre en la blockchain</span>
              </div>
            </div>

            {/* Irys Balance */}
            <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 font-medium">Bóveda de Irys</span>
                <span className="text-violet-400 text-sm font-bold bg-violet-950/50 px-2 py-0.5 rounded-md">SOL</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black font-mono tracking-tight text-zinc-100">
                  {irysBalance !== null ? `${irysBalance}` : "---"}
                </span>
                <span className="text-sm text-zinc-500 block mt-1">Saldo disponible para almacenamiento</span>
              </div>
            </div>
          </div>

          {/* Section 2: Upload Files */}
          <section className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-5 rounded-full bg-violet-600"></span>
              <h2 className="text-base font-bold text-zinc-200">2. Carga y Almacenamiento Permanente</h2>
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-6">
              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("fileInput")?.click()}
                className={`border-2 border-dashed border-zinc-800 hover:border-violet-600 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-zinc-950/50 ${
                  file ? "border-violet-500/40 bg-violet-950/5" : ""
                }`}
              >
                <input
                  id="fileInput"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0]);
                      addLog(`Archivo seleccionado: ${e.target.files[0].name}`);
                    }
                  }}
                  className="hidden"
                />
                <span className="text-2xl text-zinc-600">📁</span>
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-200">{file.name}</p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {(file.size / 1024).toFixed(2)} KB • {file.type || "Desconocido"}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-zinc-400 font-medium">Arrastra tu archivo aquí o haz clic para buscar</p>
                    <p className="text-sm text-zinc-600 mt-1">Cualquier tipo de archivo (Imágenes, JSON, Videos, etc.)</p>
                  </div>
                )}
              </div>

              {/* Autofund Option */}
              <div className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-900 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFund}
                    onChange={(e) => setAutoFund(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-zinc-950 border-zinc-800"
                  />
                  <div>
                    <span className="text-sm font-bold text-zinc-300">Autofondeo Automático de Irys</span>
                    <span className="text-sm text-zinc-500 block mt-0.5">
                      Fondea tu saldo Irys justo antes de subir el archivo si hace falta.
                    </span>
                  </div>
                </label>

                {autoFund && (
                  <div className="flex flex-col gap-2 mt-2 pl-7">
                    <span className="text-sm text-zinc-400 font-medium">Monto a fondear (SOL):</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        placeholder="Monto en SOL"
                        className="bg-zinc-950 border border-zinc-850 focus:border-violet-500 rounded-lg px-3 py-1.5 text-sm text-zinc-200 font-mono w-32"
                      />
                      <button
                        type="button"
                        onClick={() => setFundAmount("0.002")}
                        className="bg-zinc-900 hover:bg-zinc-850 text-sm px-2.5 py-1 rounded border border-zinc-800 text-zinc-400 font-medium"
                      >
                        0.002
                      </button>
                      <button
                        type="button"
                        onClick={() => setFundAmount("0.005")}
                        className="bg-zinc-900 hover:bg-zinc-850 text-sm px-2.5 py-1 rounded border border-zinc-800 text-zinc-400 font-medium"
                      >
                        0.005
                      </button>
                      <button
                        type="button"
                        onClick={() => setFundAmount("0.01")}
                        className="bg-zinc-900 hover:bg-zinc-850 text-sm px-2.5 py-1 rounded border border-zinc-800 text-zinc-400 font-medium"
                      >
                        0.01
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <button
                type="submit"
                disabled={uploading || !file || !privateKey}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Subiendo archivo de forma permanente...
                  </>
                ) : (
                  "Subir a la Red Permanente"
                )}
              </button>
            </form>
          </section>

          {uploadResult && (
            <section className="bg-gradient-to-br from-violet-950/30 to-indigo-950/30 border border-violet-800/50 rounded-2xl p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-violet-900/40 pb-3">
                <h3 className="text-base font-bold text-violet-300 flex items-center gap-2">
                  <span>🎉</span> Subida Completada con Éxito
                </h3>
                <span className="text-sm font-mono font-semibold text-violet-400 bg-violet-950/70 border border-violet-800/50 px-3 py-1 rounded-full">
                  Red Permanente Irys
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Image Preview if applicable */}
                {file && file.type.startsWith("image/") && (
                  <div className="md:col-span-4 h-48 relative rounded-xl border border-violet-900/40 overflow-hidden bg-zinc-950/90 flex items-center justify-center shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={uploadResult.url} 
                      alt="Uploaded preview" 
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  </div>
                )}

                <div className={`${file && file.type.startsWith("image/") ? "md:col-span-8" : "md:col-span-12"} text-sm text-zinc-400 font-mono bg-zinc-950/90 rounded-xl p-4 border border-zinc-900 flex flex-col gap-3 justify-center`}>
                  <div>
                    <span className="text-zinc-500 text-sm block mb-0.5">ID DE TRANSACCIÓN IRYS:</span>
                    <span className="text-violet-300 font-bold break-all select-all">{uploadResult.id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-sm block mb-0.5 flex items-center justify-between">
                      GATEWAY URL:
                      <button 
                        onClick={() => copyToClipboard(uploadResult.url, "Gateway URL")} 
                        className="text-sm text-violet-400 hover:text-violet-200 font-bold cursor-pointer transition-colors"
                      >
                        📋 Copiar URL
                      </button>
                    </span>
                    <a 
                      href={uploadResult.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-indigo-400 hover:underline break-all font-semibold"
                    >
                      {uploadResult.url} ↗
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm pt-2 border-t border-zinc-900">
                    <div>
                      <span className="text-zinc-500">TAMAÑO DEL ARCHIVO: </span>
                      <span className="text-zinc-200 font-bold">{(uploadResult.size / 1024).toFixed(2)} KB</span>
                    </div>
                    {uploadResult.fundingTxId && (
                      <div>
                        <span className="text-zinc-500">TX DE FONDEO: </span>
                        <span className="text-emerald-400 font-bold break-all">{uploadResult.fundingTxId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Enviar SOL & Retiro de Fondos */}
          <section className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-900">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600"></span>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">3. Enviar SOL & Retiro de Fondos</h2>
                  <p className="text-sm text-zinc-400">Transfiere SOL a cualquier wallet o gestiona el retiro de tus fondos en Irys</p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-sm font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Red Solana (@solana/kit)
              </span>
            </div>

            {/* Step 1: Primary Operation Mode Tabs */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                1. Selecciona el Tipo de Operación
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 p-1.5 bg-zinc-950 border border-zinc-850 rounded-2xl gap-2">
                {/* Tab 1: Enviar SOL Directo */}
                <button
                  type="button"
                  onClick={() => { setOperationType("transfer"); setRecipientMode("other"); setSectionNotice(null); }}
                  className={`p-4 rounded-xl text-left transition-all flex flex-col gap-1.5 cursor-pointer border ${
                    operationType === "transfer"
                      ? "bg-zinc-900 border-emerald-500/60 shadow-lg shadow-emerald-950/30"
                      : "bg-transparent border-transparent hover:bg-zinc-900/50 text-zinc-400"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                      operationType === "transfer" ? "text-emerald-300" : "text-zinc-200"
                    }`}>
                      <span>💸</span> Enviar SOL Directo (Wallet ➔ Wallet)
                    </span>
                    <span className={`text-sm font-semibold ${
                      operationType === "transfer" ? "text-emerald-400/90" : "text-zinc-500"
                    }`}>
                      Transferencia de SOL usando tu Private Key
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                    Envía SOL directamente desde la billetera ingresada a cualquier otra dirección de Solana.
                  </p>
                </button>

                {/* Tab 2: Retiros de Bóveda Irys */}
                <button
                  type="button"
                  onClick={() => { setOperationType("withdraw"); setSectionNotice(null); }}
                  className={`p-4 rounded-xl text-left transition-all flex flex-col gap-1.5 cursor-pointer border ${
                    operationType === "withdraw"
                      ? "bg-zinc-900 border-violet-500/60 shadow-lg shadow-violet-950/30"
                      : "bg-transparent border-transparent hover:bg-zinc-900/50 text-zinc-400"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                      operationType === "withdraw" ? "text-violet-300" : "text-zinc-200"
                    }`}>
                      <span>📦</span> Retiros de Bóveda Irys
                    </span>
                    <span className={`text-sm font-semibold ${
                      operationType === "withdraw" ? "text-violet-400/90" : "text-zinc-500"
                    }`}>
                      Del Nodo Irys a tu Wallet o Wallet Externa
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                    Extrae el saldo depositado en la bóveda de Irys de vuelta a la red de Solana.
                  </p>
                </button>
              </div>
            </div>

            {/* Sub-modes for Irys Withdrawals */}
            {operationType === "withdraw" && (
              <div className="flex flex-col gap-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-900">
                <span className="text-sm font-bold uppercase tracking-wider text-zinc-400">Modalidad de Retiro de Irys:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRecipientMode("own"); setDestinationAddress(""); }}
                    className={`px-3.5 py-2.5 rounded-lg text-sm font-bold transition-all text-left border ${
                      recipientMode === "own"
                        ? "bg-zinc-900 border-violet-500/60 text-violet-300 shadow-sm"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    📦 Retirar a mi Wallet Propia
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("other")}
                    className={`px-3.5 py-2.5 rounded-lg text-sm font-bold transition-all text-left border ${
                      recipientMode === "other"
                        ? "bg-zinc-900 border-indigo-500/60 text-indigo-300 shadow-sm"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    🚀 Retirar y Reenviar a Wallet Externa
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Context & Balance Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
              operationType === "transfer"
                ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-200"
                : "bg-cyan-950/20 border-cyan-900/40 text-cyan-200"
            }`}>
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-xl shrink-0">💡</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold uppercase tracking-wider opacity-80">
                    {operationType === "transfer"
                      ? "Origen de Fondos: Tu Billetera de Solana"
                      : "Origen de Fondos: Saldo Depositado en Nodo Irys"}
                  </span>
                  <span className="text-sm text-zinc-300">
                    {operationType === "transfer"
                      ? "La transferencia de SOL se enviará directamente desde el saldo disponible en tu wallet usando tu Private Key."
                      : recipientMode === "own"
                      ? "Los fondos se extraerán del nodo de Irys y se depositarán directamente en tu wallet ingresada."
                      : "Los fondos se extraerán de Irys a tu wallet y luego se reenviarán a la wallet externa elegida."}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 bg-zinc-950/80 px-3.5 py-2 rounded-lg border border-zinc-800/80 shrink-0">
                <span className="text-sm text-zinc-400 font-medium">
                  {operationType === "transfer" ? "Saldo en Wallet:" : "Saldo en Irys:"}
                </span>
                <span className={`font-mono text-sm font-extrabold ${
                  operationType === "transfer" ? "text-emerald-400" : "text-cyan-400"
                }`}>
                  {operationType === "transfer"
                    ? (solBalance ? `${solBalance} SOL` : "0.000000 SOL")
                    : (irysBalance ? `${irysBalance} SOL` : "0.000000 SOL")}
                </span>
              </div>
            </div>

            {/* Step 2: Destination Wallet Configuration */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>2. Wallet Destino de la Operación</span>
                <span className="text-sm font-normal text-zinc-500">
                  {operationType === "transfer"
                    ? "Wallet pública receptora de SOL"
                    : recipientMode === "own"
                    ? "Tu wallet ingresada"
                    : "Wallet externa de destino"}
                </span>
              </label>

              {/* Recipient Details Display Box */}
              {operationType === "withdraw" && recipientMode === "own" ? (
                <div className="bg-zinc-950/90 border border-zinc-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center text-base font-bold shrink-0 shadow-sm">
                      ✓
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-zinc-400 font-medium block">Wallet Destino Confirmada (Tu Wallet):</span>
                      <span className="font-mono text-sm text-zinc-100 font-normal truncate block">
                        {address ? address : "Ingresa tu private key arriba para detectar tu wallet"}
                      </span>
                    </div>
                  </div>
                  {address && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(address, "Wallet Destino")}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenQrModal(address, "QR Wallet Destino")}
                        className="bg-violet-950/80 hover:bg-violet-900 border border-violet-700/60 text-violet-300 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>📱</span> Código QR
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 bg-zinc-950/80 border border-zinc-850 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-300">
                      {operationType === "transfer"
                        ? "Ingresa la Wallet a la que enviarás SOL:"
                        : "Ingresa la Wallet Destino Externa:"}
                    </span>
                    {destinationAddress.trim() && (
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded ${
                        validateSolanaAddress(destinationAddress.trim())
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-red-950 text-red-400 border border-red-800"
                      }`}>
                        {validateSolanaAddress(destinationAddress.trim()) ? "✓ Wallet Válida" : "✕ Dirección Inválida"}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="Dirección pública de Solana (ej: 7xKX...)"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3.5 py-2 text-sm font-mono text-zinc-200 transition-all placeholder:text-zinc-600 pr-16"
                      />
                      {destinationAddress && (
                        <button
                          type="button"
                          onClick={() => setDestinationAddress("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm font-semibold"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    {destinationAddress.trim() && validateSolanaAddress(destinationAddress.trim()) && (
                      <button
                        type="button"
                        onClick={() => handleOpenQrModal(destinationAddress.trim(), "QR Wallet Externa de Destino")}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-indigo-300 hover:text-indigo-100 text-sm font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>📱</span> QR
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Amount Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  {operationType === "transfer" ? "3. Monto de SOL a Enviar" : "3. Monto a Retirar de Irys (SOL)"}
                </label>
                <span className="text-sm text-zinc-500 font-mono">
                  {operationType === "transfer" ? "Máximo libre en Wallet: " : "Máximo disponible en Irys: "}
                  <strong className="text-zinc-300">
                    {operationType === "transfer"
                      ? (solBalance ? `${solBalance} SOL` : "0.00 SOL")
                      : (irysBalance ? `${irysBalance} SOL` : "0.00 SOL")}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[180px]">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Ej: 0.005"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-100 transition-all placeholder:text-zinc-700"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-cyan-400 bg-cyan-950/90 border border-cyan-800/80 px-2 py-0.5 rounded-md font-mono shadow-sm">SOL</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount("0.002")}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    0.002
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount("0.005")}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    0.005
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount("0.01")}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    0.01
                  </button>
                  <button
                    type="button"
                    onClick={handleSetMaxAmount}
                    title={operationType === "transfer" ? "Seleccionar máximo SOL disponible en tu wallet" : "Seleccionar máximo SOL disponible en Irys"}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-violet-500/50 text-sm font-extrabold px-3 py-2 rounded-lg transition-all shadow-md shadow-violet-600/30 flex items-center gap-1 cursor-pointer transform active:scale-95"
                  >
                    <span>⚡</span> MAX
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4: Primary Action CTA Button */}
            <div className="flex flex-col gap-3 pt-3 border-t border-zinc-900">
              {operationType === "transfer" ? (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleTransferSol}
                    disabled={
                      transferringSol ||
                      !withdrawAmount ||
                      !privateKey ||
                      !destinationAddress.trim() ||
                      !validateSolanaAddress(destinationAddress.trim())
                    }
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {transferringSol ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>💸</span>
                    )}
                    <span>
                      Enviar {withdrawAmount ? `${withdrawAmount} SOL` : "SOL"} a Wallet Destino
                    </span>
                  </button>

                  <div className="flex justify-between items-center px-1 pt-1">
                    <span className="text-sm text-zinc-400 font-medium">
                      Origen: <strong className="text-zinc-200">{truncateAddress(address) || "Tu Wallet"}</strong>
                    </span>
                    <span className="text-sm text-zinc-500 font-mono">
                      Destino: <strong className="text-zinc-300">{truncateAddress(destinationAddress) || "Wallet Externa"}</strong>
                    </span>
                  </div>
                </div>
              ) : recipientMode === "own" ? (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleWithdraw(withdrawAmount)}
                    disabled={withdrawing || !withdrawAmount || !privateKey}
                    className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {withdrawing ? (
                      <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>📦</span>
                    )}
                    <span>
                      Retirar {withdrawAmount ? `${withdrawAmount} SOL` : "Fondos"} de Irys a mi Wallet Propia
                    </span>
                  </button>

                  <div className="flex justify-between items-center px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleWithdraw("all")}
                      disabled={withdrawing || !privateKey}
                      className="text-sm text-zinc-400 hover:text-zinc-200 font-semibold underline underline-offset-2 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Retirar TODO el saldo disponible en Irys ({irysBalance ? `${irysBalance} SOL` : "0.00 SOL"})
                    </button>

                    <span className="text-sm text-zinc-500 font-mono">
                      Destino: <strong className="text-zinc-300">{truncateAddress(address) || "Tu Wallet Propia"}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleWithdraw(withdrawAmount)}
                    disabled={
                      withdrawing ||
                      !withdrawAmount ||
                      !privateKey ||
                      !destinationAddress.trim()
                    }
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {withdrawing ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>🚀</span>
                    )}
                    <span>
                      Retirar de Irys y Reenviar {withdrawAmount ? `${withdrawAmount} SOL` : ""} a Wallet Destino
                    </span>
                  </button>

                  <div className="flex justify-between items-center px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleWithdraw("all")}
                      disabled={withdrawing || !privateKey || !destinationAddress.trim()}
                      className="text-sm text-zinc-400 hover:text-zinc-200 font-semibold underline underline-offset-2 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Retirar TODO de Irys y Reenviar a Wallet Destino ({irysBalance ? `${irysBalance} SOL` : "0.00 SOL"})
                    </button>

                    <span className="text-sm text-zinc-500 font-mono">
                      Destino: <strong className="text-zinc-300">{truncateAddress(destinationAddress) || "Wallet Externa"}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* In-Section Status / Notification Banner */}
            {sectionNotice && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all animate-fade-in ${
                  sectionNotice.type === "success"
                    ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-200"
                    : sectionNotice.type === "error"
                    ? "bg-red-950/60 border-red-800/60 text-red-200"
                    : "bg-indigo-950/60 border-indigo-800/60 text-indigo-200 animate-pulse"
                }`}
              >
                <span className="text-base shrink-0 mt-0.5">
                  {sectionNotice.type === "success"
                    ? "✅"
                    : sectionNotice.type === "error"
                    ? "⚠️"
                    : "⏳"}
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <p className="font-bold mb-0.5">{sectionNotice.title}</p>
                  <p className="text-zinc-300">{sectionNotice.message}</p>
                  {sectionNotice.signature && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/80 font-mono text-sm flex flex-wrap items-center justify-between gap-2">
                      <span className="text-zinc-400">
                        Signature: {truncateAddress(sectionNotice.signature)}
                      </span>
                      {sectionNotice.explorerUrl && (
                        <a
                          href={sectionNotice.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline font-semibold"
                        >
                          Ver en Explorer ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSectionNotice(null)}
                  className="text-zinc-400 hover:text-zinc-200 text-sm font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </section>

          {transferResult && (
            <section className="bg-gradient-to-br from-indigo-950/30 to-violet-950/30 border border-indigo-800/50 rounded-2xl p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-indigo-900/40 pb-3">
                <h3 className="text-base font-bold text-indigo-300 flex items-center gap-2">
                  <span>💸</span> Transferencia Exitosa en Solana
                </h3>
                <span className="text-sm font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-3 py-1 rounded-full">
                  Confirmada en Red Solana
                </span>
              </div>
              
              <div className="text-sm text-zinc-400 font-mono bg-zinc-950/90 rounded-xl p-4 border border-zinc-900 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5">
                  <span className="text-zinc-500 text-sm block mb-0.5">SIGNATURE (ID DE TRANSACCIÓN):</span>
                  <span className="text-indigo-300 font-bold break-all select-all">{transferResult.signature}</span>
                </div>
                <div className="md:col-span-4">
                  <span className="text-zinc-500 text-sm block mb-0.5">WALLET DESTINO:</span>
                  <span className="text-zinc-200 break-all">{transferResult.destinationAddress}</span>
                </div>
                <div className="md:col-span-3 flex flex-col md:items-end justify-center gap-1.5 border-t md:border-t-0 pt-2 md:pt-0 border-zinc-900">
                  <div>
                    <span className="text-zinc-500 text-sm block md:text-right">MONTO TRANSFERIDO:</span>
                    <span className="text-emerald-400 font-black text-base">{transferResult.amountTransferred} SOL</span>
                  </div>
                  {transferResult.explorerUrl && (
                    <a 
                      href={transferResult.explorerUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-sm text-indigo-400 hover:underline font-bold flex items-center gap-1"
                    >
                      Ver en Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {isConsoleOpen && (
        <section 
          id="mobile-activity-console"
          className="lg:hidden max-w-7xl mx-auto px-6 mt-8 animate-fade-in"
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col min-h-[250px]">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Consola de Actividad
                </h3>
                {logs.length > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 text-sm px-2 py-0.5 rounded-full font-mono">
                    {logs.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-sm text-zinc-500 hover:text-zinc-300 font-bold px-2 py-1 rounded bg-zinc-950 border border-zinc-800 cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setIsConsoleOpen(false)}
                  className="text-sm text-zinc-400 hover:text-white font-bold px-2 py-1 rounded bg-zinc-950 border border-zinc-800 cursor-pointer"
                >
                  Ocultar
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl p-3 font-mono text-sm text-zinc-300 overflow-y-auto max-h-[300px] flex flex-col gap-2 leading-relaxed scrollbar-thin">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-zinc-600 italic">
                  No hay logs de actividad aún...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="p-2 rounded bg-zinc-900/40 border border-zinc-900 break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {isConsoleOpen && (
        <div 
          className="hidden lg:block fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
          onClick={() => setIsConsoleOpen(false)}
        />
      )}

      <div
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 z-50 w-[440px] max-w-[90vw] bg-zinc-950/95 border-l border-zinc-800/90 shadow-2xl backdrop-blur-xl flex-col transition-transform duration-300 ease-in-out ${
          isConsoleOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono">
              Consola de Actividad
            </h3>
            {logs.length > 0 && (
              <span className="bg-zinc-800 text-zinc-400 text-sm px-2 py-0.5 rounded-full font-mono">
                {logs.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-sm text-zinc-500 hover:text-zinc-300 font-bold px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800 cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setIsConsoleOpen(false)}
              className="text-zinc-400 hover:text-white text-base font-bold w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center border border-zinc-800 transition-all cursor-pointer"
              title="Cerrar Consola"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer Body - Logs Display */}
        <div className="flex-1 bg-zinc-950/80 p-4 font-mono text-sm text-zinc-300 overflow-y-auto flex flex-col gap-2 leading-relaxed scrollbar-thin">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic gap-2 py-12">
              <span className="text-3xl">📟</span>
              <span>No hay logs de actividad aún...</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-900 break-words hover:border-zinc-800 transition-colors">
                {log}
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3 border-t border-zinc-900 bg-zinc-900/40 text-[11px] text-zinc-500 flex justify-between items-center font-mono shrink-0">
          <span>Irys System Console</span>
          <span>Solana Kit</span>
        </div>
      </div>

      {/* QR Code Modal Overlay */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md md:max-w-[500px] w-full p-6 md:p-8 shadow-2xl relative flex flex-col items-center gap-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800 transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">
                📱
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mt-2">{qrModalTitle}</h3>
              <p className="text-sm text-zinc-400">Escanea este código QR desde Phantom, Solflare o tu app de wallet para recargar o transferir SOL</p>
            </div>

            {/* QR Code Image Container */}
            <div className="bg-white p-4.5 rounded-2xl shadow-inner border border-zinc-200 my-1">
              <QRCodeDisplay text={qrModalAddress} size={250} />
            </div>

            {/* Address Box & Copy Button */}
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5 text-left">
              <span className="text-sm text-zinc-500 font-mono">Dirección pública completa:</span>
              <span className="font-mono text-sm text-indigo-300 font-normal break-all select-all leading-relaxed">
                {qrModalAddress}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(qrModalAddress, "Dirección QR")}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-bold py-2.5 rounded-lg transition-all border border-zinc-800 flex items-center justify-center gap-2 mt-1 cursor-pointer"
              >
                <span>📋</span> Copiar Dirección Completa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
