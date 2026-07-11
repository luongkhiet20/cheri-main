import React, { useState, useEffect } from "react";
import { ArrowLeft, Smartphone, Shield, CheckCircle2, Wallet, Lock } from "lucide-react";

export default function EWalletPaymentPage({ pendingOrderData, onComplete, onCancel }) {
  const total = pendingOrderData?.total || 0;
  const [step, setStep] = useState("select"); // select | pin | processing | success
  const [selectedWallet, setSelectedWallet] = useState("momo");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

  const wallets = [
    { id: "momo", name: "MoMo", color: "#A50064", bg: "linear-gradient(135deg, #A50064 0%, #D1006C 100%)" },
    { id: "zalopay", name: "ZaloPay", color: "#008FE5", bg: "linear-gradient(135deg, #008FE5 0%, #00B4FF 100%)" },
    { id: "shopeepay", name: "ShopeePay", color: "#EE4D2D", bg: "linear-gradient(135deg, #EE4D2D 0%, #FF6633 100%)" },
  ];

  const activeWallet = wallets.find((w) => w.id === selectedWallet);

  // Auto-advance after processing
  useEffect(() => {
    if (step === "processing") {
      const timer = setTimeout(() => setStep("success"), 2200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    // Auto-focus next
    if (value && index < 5) {
      const next = document.getElementById(`pin-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prev = document.getElementById(`pin-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleSubmitPhone = (e) => {
    e.preventDefault();
    if (phone.length < 9) {
      setErrorMsg("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }
    setErrorMsg("");
    setStep("pin");
  };

  const handleSubmitPin = (e) => {
    e.preventDefault();
    const pinStr = pin.join("");
    if (pinStr.length < 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số mã PIN");
      return;
    }
    setErrorMsg("");
    setStep("processing");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: activeWallet.bg }}>
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between relative z-10">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-white font-bold text-lg tracking-wide">{activeWallet.name}</h1>
          <p className="text-white/70 text-[11px] tracking-wider">THANH TOÁN AN TOÀN</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Shield className="w-4 h-4 text-white/80" />
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Amount display */}
          <div className="text-center pt-8 pb-6 px-6 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Số tiền thanh toán</p>
            <p className="text-3xl font-bold text-gray-900">
              {Number(total).toLocaleString("vi-VN")}
              <span className="text-lg ml-1 text-gray-400">₫</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-2">Đơn hàng từ Chéri Boutique</p>
          </div>

          {/* Step: Select wallet & enter phone */}
          {step === "select" && (
            <form onSubmit={handleSubmitPhone} className="p-6 space-y-5">
              {/* Wallet selector */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Chọn ví điện tử</p>
                <div className="flex gap-2">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWallet(w.id)}
                      className={`flex-1 py-3 rounded-xl text-center transition-all text-xs font-bold tracking-wide cursor-pointer border-2 ${
                        selectedWallet === w.id
                          ? "text-white shadow-lg scale-[1.02]"
                          : "bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-200"
                      }`}
                      style={selectedWallet === w.id ? { background: w.bg, borderColor: w.color } : {}}
                    >
                      <span className="flex justify-center mb-1"><Wallet className="w-5 h-5 text-current" /></span>
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone input */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-2">
                  Số điện thoại đăng ký
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="09xxxxxxxx"
                    maxLength={11}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 focus:border-gray-300 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-lg"
                style={{ background: activeWallet.bg }}
              >
                Tiếp tục
              </button>
            </form>
          )}

          {/* Step: Enter PIN */}
          {step === "pin" && (
            <form onSubmit={handleSubmitPin} className="p-6 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white shadow-lg"
                  style={{ background: activeWallet.bg }}>
                  <Lock className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-800">Nhập mã PIN {activeWallet.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">Xác thực thanh toán cho số {phone}</p>
              </div>

              <div className="flex justify-center gap-2.5">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    id={`pin-${i}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    className="w-11 h-13 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:bg-white outline-none transition-all"
                    style={digit ? { borderColor: activeWallet.color, background: `${activeWallet.color}08` } : {}}
                  />
                ))}
              </div>

              {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-lg"
                style={{ background: activeWallet.bg }}
              >
                Xác nhận thanh toán
              </button>

              <button
                type="button"
                onClick={() => { setStep("select"); setPin(["", "", "", "", "", ""]); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer py-1"
              >
                ← Quay lại
              </button>
            </form>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="p-10 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div
                  className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${activeWallet.color}30`, borderTopColor: activeWallet.color }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Đang xử lý thanh toán...</p>
                <p className="text-[11px] text-gray-400 mt-1">Vui lòng không tắt trình duyệt</p>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="p-8 text-center space-y-5">
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg animate-bounce"
                style={{ background: activeWallet.bg }}
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Thanh toán thành công!</p>
                <p className="text-xs text-gray-400 mt-1">Giao dịch qua {activeWallet.name}</p>
                <p className="text-2xl font-bold mt-3" style={{ color: activeWallet.color }}>
                  {Number(total).toLocaleString("vi-VN")} ₫
                </p>
              </div>

              <button
                onClick={() => onComplete()}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-lg"
                style={{ background: activeWallet.bg }}
              >
                Quay lại Chéri
              </button>
            </div>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 mt-6 text-white/60 text-[10px] tracking-wider">
          <Shield className="w-3.5 h-3.5" />
          <span>Giao dịch được mã hóa SSL 256-bit</span>
        </div>
      </main>
    </div>
  );
}
