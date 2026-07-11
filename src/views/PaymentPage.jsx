import React from "react";
import { CreditCard, CheckCircle2, ArrowLeft, LogOut } from "lucide-react";
import { apiCreateOrder } from "../utils/api";

export default function PaymentPage({ 
  pendingOrderData, 
  onComplete, 
  onCancel 
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const total = pendingOrderData?.total || 0;

  const handleComplete = async () => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      // Gọi API tạo đơn hàng thực sự khi ấn hoàn thành thanh toán
      const response = await apiCreateOrder(pendingOrderData);
      const orderId = response.orderId || `CR-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newOrder = {
        id: orderId,
        date: new Date().toISOString().split("T")[0],
        items: pendingOrderData.items,
        total: pendingOrderData.total,
        status: "pending",
        statusText: "Đã thanh toán (Chờ xác nhận)",
        address: pendingOrderData.address,
        phone: pendingOrderData.phone,
      };

      onComplete(newOrder); 
    } catch (err) {
      setErrorMsg(err.message || "Xác nhận thanh toán thất bại. Vui lòng thử lại.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E8E1D9] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-center relative">
          <button 
            onClick={onCancel}
            className="absolute left-6 text-[#1A1A1A] hover:text-[#74070e] transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Trở lại</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-[#E8E1D9] text-center relative overflow-hidden">
          
          <h2 className="text-2xl font-serif text-[#1A1A1A] mb-2">Quét Mã QR Để Thanh Toán</h2>
          <p className="text-[#666666] mb-6">Quý khách vui lòng quét mã bên dưới để hoàn tất</p>
          
          <div className="border border-[#E8E1D9] rounded-xl p-4 inline-block mb-6 relative group bg-white shadow-sm">
            <img 
              src="/images/qr-code.jpg" 
              alt="Mã QR Thanh toán"
              className="w-64 h-auto object-contain mx-auto"
              onError={(e) => {
                e.target.src = "https://placehold.co/400x400/F5F2EB/A9A9A9?text=QR+Code";
              }}
            />
          </div>

          <div className="flex flex-col gap-2 mb-8 text-lg font-medium text-[#1A1A1A]">
            <span>Tổng cộng:</span>
            <span className="text-2xl text-[#74070e] font-serif">
              {Number(total).toLocaleString("vi-VN")} ₫
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className="w-full h-12 bg-[#1A1A1A] hover:bg-[#74070e] text-white flex items-center justify-center gap-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Hoàn Thành
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full h-12 bg-white hover:bg-gray-50 border border-[#E8E1D9] text-[#1A1A1A] flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              Thoát
            </button>
          </div>
          
        </div>
      </main>
    </div>
  );
}
