import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Lock, CheckCircle2, Shield, Eye, EyeOff } from "lucide-react";

export default function VisaPaymentPage({ pendingOrderData, onComplete, onCancel }) {
  const total = pendingOrderData?.total || 0;
  const [step, setStep] = useState("form"); // form | processing | success
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Detect card type
  const getCardType = (num) => {
    const clean = num.replace(/\s/g, "");
    if (/^4/.test(clean)) return "visa";
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "mastercard";
    if (/^35/.test(clean)) return "jcb";
    if (/^3[47]/.test(clean)) return "amex";
    return null;
  };

  const cardType = getCardType(cardNumber);

  const cardBrands = {
    visa: { name: "VISA", color: "#1A1F71", gradient: "linear-gradient(135deg, #1A1F71 0%, #2563EB 100%)" },
    mastercard: { name: "Mastercard", color: "#EB001B", gradient: "linear-gradient(135deg, #111111 0%, #333333 100%)" },
    jcb: { name: "JCB", color: "#0E4C96", gradient: "linear-gradient(135deg, #0E4C96 0%, #1E6CC7 100%)" },
    amex: { name: "AMEX", color: "#2E77BC", gradient: "linear-gradient(135deg, #2E77BC 0%, #1E5EA6 100%)" },
  };

  const activeBrand = cardType ? cardBrands[cardType] : null;

  // Auto-advance after processing
  useEffect(() => {
    if (step === "processing") {
      const timer = setTimeout(() => setStep("success"), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const formatCardNumber = (value) => {
    const clean = value.replace(/\D/g, "").slice(0, 16);
    return clean.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value) => {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return clean.slice(0, 2) + "/" + clean.slice(2);
    return clean;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCard = cardNumber.replace(/\s/g, "");
    
    if (cleanCard.length < 13) {
      setErrorMsg("Số thẻ không hợp lệ");
      return;
    }
    if (!cardName.trim()) {
      setErrorMsg("Vui lòng nhập tên chủ thẻ");
      return;
    }
    if (expiryDate.length < 5) {
      setErrorMsg("Ngày hết hạn không hợp lệ");
      return;
    }
    if (cvv.length < 3) {
      setErrorMsg("Mã CVV không hợp lệ");
      return;
    }
    setErrorMsg("");
    setStep("processing");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between relative z-10">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-white font-bold text-lg tracking-wide">Thanh toán thẻ</h1>
          <p className="text-white/50 text-[11px] tracking-wider">SECURE PAYMENT GATEWAY</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Lock className="w-4 h-4 text-white/60" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-8">
        {/* Card Preview */}
        <div
          className="w-full max-w-sm h-48 rounded-2xl p-6 mb-6 relative overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            background: activeBrand?.gradient || "linear-gradient(135deg, #374151 0%, #6B7280 100%)",
          }}
        >
          {/* Card chip */}
          <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 mb-5 shadow-sm" />

          {/* Card number */}
          <p className="text-white text-lg tracking-[0.25em] font-mono mb-4">
            {cardNumber || "•••• •••• •••• ••••"}
          </p>

          {/* Card details */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-white/50 text-[9px] uppercase tracking-widest">Chủ thẻ</p>
              <p className="text-white text-sm font-medium tracking-wider uppercase">
                {cardName || "YOUR NAME"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[9px] uppercase tracking-widest">Hết hạn</p>
              <p className="text-white text-sm font-mono">{expiryDate || "MM/YY"}</p>
            </div>
          </div>

          {/* Card brand badge */}
          <div className="absolute top-5 right-6">
            {cardType === "visa" && (
              <span className="text-white text-2xl font-black italic tracking-wider">VISA</span>
            )}
            {cardType === "mastercard" && (
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-red-500 opacity-80" />
                <div className="w-7 h-7 rounded-full bg-yellow-400 opacity-80" />
              </div>
            )}
            {cardType === "jcb" && (
              <span className="text-white text-xl font-black">JCB</span>
            )}
            {cardType === "amex" && (
              <span className="text-white text-xl font-black">AMEX</span>
            )}
            {!cardType && (
              <CreditCard className="w-8 h-8 text-white/30" />
            )}
          </div>

          {/* Decorative circles */}
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/5" />
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
          {/* Amount */}
          <div className="text-center pt-6 pb-4 px-6 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Số tiền thanh toán</p>
            <p className="text-2xl font-bold text-gray-900">
              {Number(total).toLocaleString("vi-VN")}
              <span className="text-base ml-1 text-gray-400">₫</span>
            </p>
          </div>

          {/* Step: Form */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Card Number */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1.5">
                  Số thẻ
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 font-mono tracking-wider focus:border-gray-300 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1.5">
                  Tên chủ thẻ
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 uppercase tracking-wider focus:border-gray-300 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Expiry + CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1.5">
                    Ngày hết hạn
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 font-mono text-center tracking-widest focus:border-gray-300 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1.5">
                    Mã CVV
                  </label>
                  <div className="relative">
                    <input
                      type={showCvv ? "text" : "password"}
                      inputMode="numeric"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 font-mono text-center tracking-widest focus:border-gray-300 focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                    >
                      {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Accepted cards */}
              <div className="flex items-center justify-center gap-3 py-1">
                <span className={`text-xs font-black italic px-2 py-0.5 rounded transition-all ${cardType === "visa" ? "bg-[#1A1F71] text-white" : "bg-gray-100 text-gray-400"}`}>VISA</span>
                <div className={`flex -space-x-1.5 px-2 py-0.5 rounded transition-all ${cardType === "mastercard" ? "bg-gray-800" : "bg-gray-100"}`}>
                  <div className={`w-4 h-4 rounded-full ${cardType === "mastercard" ? "bg-red-500" : "bg-gray-300"}`} />
                  <div className={`w-4 h-4 rounded-full ${cardType === "mastercard" ? "bg-yellow-400" : "bg-gray-200"}`} />
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded transition-all ${cardType === "jcb" ? "bg-[#0E4C96] text-white" : "bg-gray-100 text-gray-400"}`}>JCB</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded transition-all ${cardType === "amex" ? "bg-[#2E77BC] text-white" : "bg-gray-100 text-gray-400"}`}>AMEX</span>
              </div>

              {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-lg flex items-center justify-center gap-2"
                style={{ background: activeBrand?.gradient || "linear-gradient(135deg, #374151 0%, #1f2937 100%)" }}
              >
                <Lock className="w-4 h-4" />
                Thanh toán {Number(total).toLocaleString("vi-VN")} ₫
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer py-1"
              >
                Hủy và quay lại
              </button>
            </form>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="p-10 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#1A1F71] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Đang xác thực giao dịch...</p>
                <p className="text-[11px] text-gray-400 mt-1">Liên hệ ngân hàng phát hành thẻ</p>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="p-8 text-center space-y-5">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg animate-bounce bg-gradient-to-br from-emerald-400 to-emerald-600">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Thanh toán thành công!</p>
                <p className="text-xs text-gray-400 mt-1">
                  Giao dịch qua thẻ {activeBrand?.name || "quốc tế"} ••••{cardNumber.replace(/\s/g, "").slice(-4)}
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-3">
                  {Number(total).toLocaleString("vi-VN")} ₫
                </p>
              </div>

              <button
                onClick={() => onComplete()}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600"
              >
                Quay lại Chéri
              </button>
            </div>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 mt-6 text-white/40 text-[10px] tracking-wider">
          <Shield className="w-3.5 h-3.5" />
          <span>PCI DSS Compliant • SSL 256-bit Encryption</span>
        </div>
      </main>
    </div>
  );
}
