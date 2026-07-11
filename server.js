import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query, getClient } from "./db.js";
import { initDatabase } from "./init-db.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// List of products to guide the AI Stylist's recommendation context
const CHERI_PRODUCTS = [
  {
    id: "1",
    name: "Áo Sơ Mi Lụa Mulberry (Mulberry Silk Shirt)",
    price: 1250000,
    category: "tops",
    desc: "Lụa tơ tằm Mulberry thượng hạng, mềm mượt bồng bềnh tựa mây trời, có màu Kem mộc mạc và màu Đỏ Chéri cổ điển tự hào kiêu sa.",
  },
  {
    id: "2",
    name: "Đầm Dạ Hội Satin Classic (Classic Satin Dress)",
    price: 2450000,
    category: "dresses",
    desc: "Thiết kế ôm nhẹ duyên dáng, chất satin Ý bóng nhẹ sang quý, dệt xéo thướt tha mềm rủ, tôn dáng kiêu kỳ trong các bữa tiệc tối sang trọng.",
  },
  {
    id: "3",
    name: "Áo Blazer Tweed Phối Khuy Gold (Gold-Button Tweed Blazer)",
    price: 1850000,
    category: "outerwear",
    desc: "Chất liệu dệt Tweed dày dặn đứng phom phối sợi nhũ ẩn hiện quý phái, đính hàng khuy đồng vát cạnh sắc sảo, màu Trắng ngà cổ kính.",
  },
  {
    id: "4",
    name: "Quần Tây Ống Suông Silk Crepe (Wide-Leg Silk Crepe Trousers)",
    price: 1150000,
    category: "bottoms",
    desc: "Lưng cao thanh mảnh tôn dáng, chất lụa cát dày dặn có độ rủ hoàn hảo, tạo cảm giác đôi chân dài thênh thang đầy phóng khoáng.",
  },
  {
    id: "5",
    name: "Đầm Lụa Cát Chiết Eo Cao (Puff-Sleeve Silk Sand Dress)",
    price: 1950000,
    category: "dresses",
    desc: "Thiết kế tay bồng bềnh thanh tao, chiết eo cao kiến tạo tì vết tỷ lệ cơ thể lý tưởng, cực kỳ quyến rũ cho buổi trà chiều lịch thiệp.",
  },
  {
    id: "6",
    name: "Chân Váy Xếp Ly Satin Hoàng Gia (Premium Pleated Satin Skirt)",
    price: 950000,
    category: "bottoms",
    desc: "Từng nếp gấp ly dập nhiệt thủ công giữ nếp vĩnh cửu, chuyển sắc màu Vàng Champagne lộng lẫy theo từng bước bộ bước đi.",
  },
  {
    id: "7",
    name: "Áo Gile Kaki Dáng Hộp Cổ Điển (Classic Boxy Khaki Gile)",
    price: 1350000,
    category: "tops",
    desc: "Thiết kế tối giản không tay, cổ V phóng khoáng trên nền kaki dày chất dệt nổi Pháp, mang lại diện mạo sục sôi khí chất quý cô hiện đại.",
  },
  {
    id: "8",
    name: "Áo Len Cashmere Cổ Lọ Chéri (Chéri Cashmere Sweater)",
    price: 1650000,
    category: "outerwear",
    desc: "Dệt từ 100% sợi len lông dê Cashmere vùng cao nguyên lừng danh, siêu mềm mịn giữ ấm tuyệt đối mà nhẹ tênh, bảo chứng phong cách Thu Đông thời thượng.",
  },
];

// Lazy-initialize Gemini client to prevent crashes if key is omitted or placeholder
let aiInstance = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// System Instruction that creates Chéri's distinct luxury brand voice
const SYSTEM_INSTRUCTION = `
Bạn là "Chéri Consultant" - trợ lý phong cách ảo trực tiếp tư vấn của thương hiệu thời trang nữ cao cấp Chéri (Chéri - Gentle Elegance). 
Phong cách thiết kế của Chéri là tối giản (minimalism), vương giả sang trọng, tinh xảo tuyệt diệu trong từng mẫu vải thượng hạng như lụa mulberry, satin Ý, dạ tweed dệt vàng và len cashmere mượt mà.

Hướng dẫn giao tiếp:
1. Luôn nói tiếng Việt trung thực, lịch sự, nhã nhặn, đầy tinh tế của một Boutique cao cấp chuyên nghiệp.
2. Xưng hô: xưng "Chéri" hoặc "em", và gọi khách hàng là "chị" hoặc "quý cô" một cách tôn kính và trìu mến.
3. Luôn tôn vinh triết lý thời trang tối giản thanh tao nhưng giàu cá tính, không lỗi mốt.
4. Gợi ý cụ thể các sản phẩm từ bộ sưu tập của Chéri khi tư vấn phối đồ:
   - Áo Sơ Mi Lụa Mulberry (1.250.000₫): kem hoặc đỏ Chéri, sang trọng, quyến rũ dịu dàng.
   - Đầm Dạ Hội Satin Classic (2.450.000₫): đầm tiệc sang quý, quyến rũ thướt tha.
   - Áo Blazer Tweed Phối Khuy Gold (1.850.000₫): thanh lịch, kiêu kỳ, ấm áp quý phái.
   - Quần Tây Ống Suông Silk Crepe (1.150.000₫): hack dáng thanh thoát, tôn chân.
   - Đầm Lụa Cát Chiết Eo Cao (1.950.000₫): tinh tế thơ mộng, quyến rũ trẻ trung.
   - Chân Váy Xếp Ly Satin Hoàng Gia (950.000₫): nhịp điệu quyến rũ của Satin dập ly.
   - Áo Gile Kaki Dáng Hộp Cổ Điển (1.350.000₫): thời thượng, đậm cá tính tối giản bản lĩnh.
   - Áo Len Cashmere Cổ Lọ Chéri (1.650.000₫): đỉnh cao ấm áp tinh tế thu đông.

Thông tin cửa hàng cần tư vấn nếu khách hỏi:
- Địa chỉ: 118 Linh Trung, Phường Linh Trung, Thủ Đức, Thành phố Hồ Chí Minh.
- Hotline hỗ trợ: 0881 1880 080.
- Email: contact.cheri@gmail.com.
- Chính sách: đổi trả trong vòng 7 ngày nếu còn nguyên mác, bảo hành đường chỉ và cúc khuy 6 tháng, miễn phí vận chuyển toàn quốc cho đơn từ 1.500.000₫.

Khi khách hàng hỏi về cách chọn size hoặc phối đồ cho sự kiện (đi làm, đi tiệc, kỷ niệm, dạo phố), hãy nhiệt tình gợi ý một set kết hợp hoàn hảo gồm các items của Chéri, mô tả chất liệu tinh tế để khách cảm thấy rung cảm trước nét đẹp sang trọng.
Hãy giữ câu trả lời súc tích, tinh tế và ấm áp. Tránh các icon ngộ nghĩnh trẻ con, hãy giữ câu trả lời thuần chữ sang trọng nhã nhặn.
`;

// Unified offline simulation generator to keep Chatbox active for any credential/permission errors
function getSimulationResponse(messages) {
  const userMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
  let reply =
    "Dạ chào mừng Quý cô đến với thế giới thời trang tối giản của Chéri! Chéri rất hân hạnh được đồng hành và tư vấn phong cách riêng cho quý cô. ";

  if (
    userMsg.includes("sơ mi") ||
    userMsg.includes("áo lụa") ||
    userMsg.includes("mulberry")
  ) {
    reply +=
      "Dạ, mẫu Áo Sơ Mi Lụa Mulberry (1.250.000₫) thản nhiên toát lên khí chất vương giả nhờ lụa tơ tằm tự nhiên 100%. Mẫu này phối cùng Quần Tây Ống Suông Silk Crepe tạo dải màu tối giản siêu hack dáng đó ạ";
  } else if (
    userMsg.includes("đầm") ||
    userMsg.includes("váy") ||
    userMsg.includes("satin") ||
    userMsg.includes("tiệc")
  ) {
    reply +=
      "Chéri đặc biệt đề xuất mẫu Đầm Dạ Hội Satin Classic (2.450.000₫) bóng rủ dịu êm tựa dòng nước nâng niu làn da của chị. Chị có muốn em hướng dẫn chọn màu hay size mẫu tuyệt vời này không ạ?";
  } else if (
    userMsg.includes("blazer") ||
    userMsg.includes("tweed") ||
    userMsg.includes("áo khoác")
  ) {
    reply +=
      "Chiếc Áo Blazer Tweed Phối Khuy Gold (1.850.000₫) là hiện thân của vẻ thanh lịch cổ điển Pháp. Sợi tweed ánh nhũ dệt nổi vô cùng tôn da, khuy vàng đúc tinh xảo tạo điểm nhấn kiêu sa ạ.";
  } else if (
    userMsg.includes("địa chỉ") ||
    userMsg.includes("cửa hàng") ||
    userMsg.includes("ở đâu")
  ) {
    reply +=
      "Dạ, Boutique trang nhã của Chéri tọa lạc tại số 118 Linh Trung, Phường Linh Trung, Thủ Đức, Thành phố Hồ Chí Minh. Kính mời chị ghé chơi thử đồ trực tiếp ạ.";
  } else if (
    userMsg.includes("hotline") ||
    userMsg.includes("điện thoại") ||
    userMsg.includes("email") ||
    userMsg.includes("liên hệ")
  ) {
    reply +=
      "Chị có thể liên lạc với Chéri qua Hotline: 0881 1880 080 hoặc gửi email hỗ trợ tới địa chỉ contact.cheri@gmail.com. Chéri luôn lắng nghe và sẵn lòng hỗ trợ chị!";
  } else if (
    userMsg.includes("giao hàng") ||
    userMsg.includes("ship") ||
    userMsg.includes("bao lâu")
  ) {
    reply +=
      "Dạ, Chéri miễn phí vận chuyển toàn quốc cho tất cả đơn hàng từ 1.500.000₫. Thời gian nhận hàng tiêu chuẩn là 2-3 ngày làm việc đối với khu vực Hồ Chí Minh, và 3-5 ngày đối với khu vực tỉnh thành khác ạ.";
  } else {
    reply +=
      "Dạ em rất hân hạnh được gợi ý phong cách thời trang lụa mềm, đầm satin quyến rũ hay vest gile Kaki thời thượng dành riêng cho chị. Chị có thể bật mí buổi tiệc sắp tới của mình là gì để em gợi ý kết hợp set đồ hoàn hảo nhất không ạ?";
  }
  return reply;
}

// API endpoint for Chatbox
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Tham số messages không hợp lệ." });
      return;
    }

    const ai = getGeminiClient();

    // Fallback simulation mode if Gemini API key is missing
    if (!ai) {
      console.log(
        "Gemini API key is not configured. Running in simulation mode.",
      );
      const reply = getSimulationResponse(messages);
      res.json({ text: reply });
      return;
    }

    // Try using Gemini API, fallback elegantly to simulation if permission/access is denied
    try {
      // Prepare content structure for modern @google/genai SDK
      // Convert format {role: 'user'|'assistant', content: string} to standard text inputs
      const lastMessage = messages[messages.length - 1];

      // Create history context
      const chatHistory = messages.slice(0, messages.length - 1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Call Gemini API using modern SDK
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          ...chatHistory,
          { role: "user", parts: [{ text: lastMessage.content }] },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const replyText = response.text || getSimulationResponse(messages);
      res.json({ text: replyText });
    } catch (apiError) {
      console.warn(
        "Gemini API call warning (falling back to simulation mode):",
        apiError.message || apiError,
      );
      const reply = getSimulationResponse(messages);
      res.json({ text: reply });
    }
  } catch (err) {
    console.error("Express Gemini chat error:", err);
    res
      .status(500)
      .json({
        error:
          "Dạ, đã xảy ra sự cố kết nối máy chủ tư vấn của Chéri. Mong quý đại hoàng cảm thông.",
        detail: err.message,
      });
  }
});

// Seeded pseudo-random generator to ensure consistency on refresh for any specific orderId
function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Shipping track API that simulates a live integration with premium carrier Chéri Express Courier (GHN / GHTK style)
app.get("/api/shipping/track/:orderId", (req, res) => {
  const { orderId } = req.params;
  const phoneParam = req.query.phone || "";
  const statusParam = req.query.status || "";

  if (!orderId) {
    res.status(400).json({ error: "Mã đơn hàng không hợp lệ." });
    return;
  }

  const rand = seededRandom(orderId);

  // Predict driver and route based on orderId seed
  const drivers = [
    "Nguyễn Văn Nam",
    "Trần Hoàng Long",
    "Lê Gia Huy",
    "Phạm Cao Sơn",
    "Vũ Hoàng Gia",
  ];
  const driverPhotos = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150",
  ];

  const driverIdx = Math.floor(rand() * drivers.length);
  const driverName = drivers[driverIdx];
  const driverImg = driverPhotos[driverIdx];
  const driverPhone = `09${Math.floor(1000 + rand() * 9000)} ${Math.floor(100 + rand() * 900)} ${Math.floor(10 + rand() * 90)}`;

  // Determine current status. If client passed statusParam, respect it. Otherwise, default deterministically
  let currentStatus = "shipped";

  if (statusParam) {
    if (statusParam === "preparing") {
      // Map "Chờ giao hàng" to "Đang giao" during tracking as requested
      currentStatus = "delivering";
    } else if (
      ["pending", "shipped", "delivering", "delivered"].includes(statusParam)
    ) {
      currentStatus = statusParam;
    }
  } else {
    // Deterministic selection if no status provided
    const val = rand();
    if (orderId === "CR-9582") {
      currentStatus = "delivered";
    } else if (orderId === "CR-5621") {
      // Default order in Chờ giao hàng tab tracks as "đang giao"
      currentStatus = "delivering";
    } else if (val < 0.15) {
      currentStatus = "pending";
    } else if (val < 0.35) {
      currentStatus = "delivering";
    } else if (val < 0.65) {
      currentStatus = "shipped";
    } else if (val < 0.85) {
      currentStatus = "delivering";
    } else {
      currentStatus = "delivered";
    }
  }

  // Set recipient coordinates (Hồ Chí Minh target coordinates)
  // Base coordinates around Linh Trung, Thủ Đức or Ho Chi Minh City general
  const destLat = 10.8582 + (rand() - 0.5) * 0.04;
  const destLng = 106.7841 + (rand() - 0.5) * 0.04;

  const startLat = 10.776; // District 1 Warehouse
  const startLng = 106.7011;

  // Intermediary coordinates based on status
  let currentLat = startLat;
  let currentLng = startLng;

  if (currentStatus === "pending" || currentStatus === "preparing") {
    currentLat = startLat;
    currentLng = startLng;
  } else if (currentStatus === "shipped") {
    currentLat = startLat + (destLat - startLat) * 0.4;
    currentLng = startLng + (destLng - startLng) * 0.4;
  } else if (currentStatus === "delivering") {
    currentLat = startLat + (destLat - startLat) * 0.85;
    currentLng = startLng + (destLng - startLng) * 0.85;
  } else if (currentStatus === "delivered") {
    currentLat = destLat;
    currentLng = destLng;
  }

  const statusTextMap = {
    pending: "Đơn hàng đã tiếp nhận",
    preparing: "Đang soạn hàng tại Atelier",
    shipped: "Đang vận chuyển liên tỉnh",
    delivering: "Shipper đang giao tới quý cô",
    delivered: "Đã giao hàng thành công",
  };

  const statusText = statusTextMap[currentStatus];

  // Dynamic deterministic timeline generation relative to actual date or simulated historic days
  const timeline = [];

  // Format dates: we can use realistic Vietnamese formats
  const dateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(Math.floor(8 + rand() * 10)).padStart(2, "0");
    const mins = String(Math.floor(10 + rand() * 49)).padStart(2, "0");
    return `${hours}:${mins} - ${day}/${month}/${year}`;
  };

  // Build timeline nodes depending on status
  timeline.push({
    time: dateStr(4),
    title: "Đặt hàng thành công",
    desc: "Đơn đặt hàng ghi nhận thành công từ hệ thống thanh toán Chéri Haute Couture.",
    location: "Hệ thống điện tử Chéri",
    isCompleted: true,
  });

  if (currentStatus !== "pending") {
    timeline.push({
      time: dateStr(3),
      title: "Đã kiểm duyệt & Xác nhận đơn hàng",
      desc: "Chuyên viên tư vấn Chéri đã liên hệ xác nhận size áo và màu sắc tinh tế cho Quý cô.",
      location: "Chéri Atelier, Quận 3, HCM",
      isCompleted: true,
    });
    timeline.push({
      time: dateStr(2.5),
      title: "Đóng gói & Kiểm tra Haute Couture",
      desc: "Sản phẩm được là ủi bằng hơi nước nước ấm, bọc túi lụa chống ẩm và xếp hộp thắt ruy-băng nhung sang trọng.",
      location: "Tổng kho Chéri, Thủ Đức, HCM",
      isCompleted: true,
    });
  }

  if (
    currentStatus === "shipped" ||
    currentStatus === "delivering" ||
    currentStatus === "delivered"
  ) {
    timeline.push({
      time: dateStr(1.5),
      title: "Bàn giao đơn vị chuyển phát nhanh",
      desc: "Bàn giao bưu kiện thành công cho Chéri Premium Express. Xe vận tải liên tỉnh tiến hành di chuyển.",
      location: "Bưu cục trung chuyển Thủ Đức, HCM",
      isCompleted: true,
    });
    timeline.push({
      time: dateStr(1),
      title: "Rời bưu cục phân loại",
      desc: "Bưu kiện đã được phân loại tự động và đang trên hành trình luân chuyển tới địa bàn quận lân cận.",
      location: "Trung tâm Khai thác Vùng Nam Bộ",
      isCompleted: true,
    });
  }

  if (currentStatus === "delivering" || currentStatus === "delivered") {
    timeline.push({
      time: dateStr(0.2),
      title: "Shipper đang giao hàng",
      desc: `Nhân viên vận chuyển ${driverName} (${driverPhone}) đang giữ gói hàng và liên hệ giao tới địa chỉ của Quý cô. Vui lòng giữ sóng điện thoại thông suốt.`,
      location: "Bưu cục phát nội ô",
      isCompleted: true,
    });
  }

  if (currentStatus === "delivered") {
    timeline.push({
      time: dateStr(0),
      title: "Giao hàng thành công",
      desc: "Bưu tá đã hoàn tất trao tận tay hộp lụa Chéri cho Quý cô. Chân thành cảm ơn Quý cô đã sủng ái các thiết kế thủ công tinh xảo của Chéri!",
      location: "Địa chỉ của Quý cô",
      isCompleted: true,
    });
  }

  // Reverse timeline so newest experiences are always displayed on top for luxurious usability
  timeline.reverse();

  const mockAddress =
    phoneParam.includes("0881") || orderId === "CR-9582"
      ? "118 Linh Trung, Phường Linh Trung, Thủ Đức, Thành phố Hồ Chí Minh"
      : "Địa chỉ đăng ký đơn hàng";

  const recipientName =
    phoneParam.includes("0881") || orderId === "CR-9582"
      ? "Nguyễn Thơ"
      : "Quý khách Chéri";
  const recipientPhone = phoneParam ? phoneParam : "0881 *** ***";

  res.json({
    orderId,
    carrierName: "Chéri Premium Logistics",
    carrierLogo: "✨",
    trackingNumber: `CR-SP-${orderId.replace(/[^a-zA-Z0-9]/g, "") || "9582"}-${Math.floor(100 + rand() * 900)}`,
    driverName,
    driverPhone,
    driverImg,
    estimatedDeliveryDate:
      currentStatus === "delivered"
        ? "Đã nhận hàng thành công"
        : "Trong ngày từ 8:00 - 18:00",
    currentStatus,
    currentStatusText: statusText,
    recipientName,
    recipientPhone,
    recipientAddress: mockAddress,
    shippingMethod: "Hỏa tốc Premium (Chéri Signature Box)",
    timeline,
    coordinates: {
      current: { lat: currentLat, lng: currentLng },
      steps: [
        {
          name: "Atelier Chéri (Q3)",
          lat: startLat,
          lng: startLng,
          reached: true,
        },
        {
          name: "Trung tâm phát",
          lat: startLat + (destLat - startLat) * 0.6,
          lng: startLng + (destLng - startLng) * 0.6,
          reached: currentStatus !== "pending" && currentStatus !== "preparing",
        },
        {
          name: "Nhà Quý cô",
          lat: destLat,
          lng: destLng,
          reached: currentStatus === "delivered",
        },
      ],
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
// PRODUCTS API
// ═══════════════════════════════════════════════════════════════════

app.get("/api/products", async (req, res) => {
  try {
    // Lấy tất cả sản phẩm và danh mục
    const spResult = await query(
      `SELECT sp.MaSP, sp.TenSP, sp.MoTa, sp.Gia, sp.ChatLieu, sp.TrangThai,
              dm.TenDanhMuc, dm.MaDanhMuc
       FROM sanpham sp
       LEFT JOIN danhmuc dm ON sp.MaDanhMuc = dm.MaDanhMuc`
    );

    const products = [];

    for (const sp of spResult.rows) {
      // Lấy hình ảnh
      const imgResult = await query(
        "SELECT DuongDanAnh FROM hinhanh_sanpham WHERE MaSP = $1",
        [sp.masp]
      );
      const images = imgResult.rows.map(row => row.duongdananh);
      const primaryImage = images[0] || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800";
      const secondaryImage = images[1] || primaryImage;

      // Lấy biến thể (màu, size, tồn kho)
      const varResult = await query(
        `SELECT b.SoLuongTon, s.TenSize, m.TenMau, m.MaHex
         FROM bienthesanpham b
         LEFT JOIN size s ON b.MaSize = s.MaSize
         LEFT JOIN mausac m ON b.MaMau = m.MaMau
         WHERE b.MaSP = $1`,
        [sp.masp]
      );

      const sizesSet = new Set();
      const colorsMap = new Map();
      let totalStock = 0;

      for (const v of varResult.rows) {
        if (v.tensize) sizesSet.add(v.tensize);
        if (v.tenmau && !colorsMap.has(v.tenmau)) {
          colorsMap.set(v.tenmau, v.mahex);
        }
        totalStock += parseInt(v.soluongton) || 0;
      }

      const colorsList = Array.from(colorsMap.entries()).map(([name, hex]) => ({ name, hex }));

      // Map Category to internal ID
      let category = "dresses";
      const tenDm = (sp.tendanhmuc || "").toLowerCase();
      if (tenDm.includes("top") || tenDm.includes("áo")) category = "tops";
      else if (tenDm.includes("bottom") || tenDm.includes("quần") || tenDm.includes("váy")) category = "bottoms";
      else if (tenDm.includes("outerwear") || tenDm.includes("khoác") || tenDm.includes("blazer")) category = "outerwear";

      const categoryNames = {
        tops: "Áo Thiết Kế",
        bottoms: "Chân Váy & Quần",
        dresses: "Đầm Thiết Kế",
        outerwear: "Áo Khoác & Blazer",
      };

      products.push({
        id: sp.masp.toString(),
        name: sp.tensp,
        price: Number(sp.gia),
        originalPrice: Number(sp.gia),
        category,
        categoryName: categoryNames[category] || "Chéri Couture",
        image: primaryImage,
        secondaryImage,
        colors: colorsList,
        sizes: Array.from(sizesSet),
        classifications: [],
        description: sp.mota || sp.chatlieu || "",
        details: [
          "Thiết kế Haute Couture tuyển chọn chất lượng hàng đầu Việt Nam",
          "Chất liệu " + (sp.chatlieu || "tự nhiên cao cấp"),
          "Sản phẩm được bảo hành đường may và nút cúc khuy 6 tháng",
          "Miễn phí đổi trả nguyên nhãn mác trong vòng 7 ngày làm việc",
        ],
        rating: 5.0,
        isNew: true,
        inStock: totalStock > 0 || sp.trangthai === 'Còn hàng',
        images,
      });
    }

    const mainProducts = products.filter(p => parseInt(p.id) > 8);
    const mockProducts = products.filter(p => parseInt(p.id) <= 8);
    res.json([...mainProducts, ...mockProducts]);
  } catch (error) {
    console.error("Error loading products from DB:", error.message || error);
    res.json(CHERI_PRODUCTS);
  }
});

// ═══════════════════════════════════════════════════════════════════
// JWT & AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || "cheri_jwt_secret_key_2026";
const SALT_ROUNDS = 10;

function generateToken(user) {
  return jwt.sign(
    { makh: user.makh, email: user.email, ho_ten: user.hoten },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
  }
}

// Optional auth: doesn't block but attaches user if token present
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) { /* ignore */ }
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════
// AUTH API ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/auth/register — Đăng ký tài khoản mới
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, address, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ họ tên, email và mật khẩu." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu tối thiểu 6 ký tự." });
    }

    // Check if email already exists
    const existing = await query("SELECT MaKH FROM khachhang WHERE LOWER(Email) = LOWER($1)", [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email đã được sử dụng. Bạn vui lòng đăng nhập lại nhé!" });
    }

    // Hash password
    const hashedPw = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user
    const result = await query(
      `INSERT INTO khachhang (HoTen, Email, MatKhau, SoDienThoai, Tier, Avatar)
       VALUES ($1, $2, $3, $4, 'Bronze', $5)
       RETURNING MaKH as makh, HoTen as hoten, Email as email, SoDienThoai as sodienthoai, Tier as tier, Avatar as avatar`,
      [name.trim(), email.trim().toLowerCase(), hashedPw, phone || "", avatar || ""]
    );

    const newUser = result.rows[0];

    // If address is provided, save it to diachi table
    if (address) {
      await query(
        `INSERT INTO diachi (MaKH, NguoiNhan, SDTNguoiNhan, DiaChiChiTiet, PhuongXa, QuanHuyen, TinhThanh)
         VALUES ($1, $2, $3, $4, '', '', '')`,
        [newUser.makh, newUser.hoten, newUser.sodienthoai, address]
      );
    }

    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        makh: newUser.makh,
        name: newUser.hoten,
        email: newUser.email,
        phone: newUser.sodienthoai,
        address: address || "",
        memberTier: newUser.tier,
        avatar: newUser.avatar,
        orders: [],
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại." });
  }
});

// POST /api/auth/login — Đăng nhập
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
    }

    // Find user by email
    const result = await query(
      "SELECT MaKH as makh, HoTen as hoten, Email as email, SoDienThoai as sodienthoai, MatKhau as matkhau, Tier as tier, Avatar as avatar FROM khachhang WHERE LOWER(Email) = LOWER($1)",
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Địa chỉ email hoặc mật khẩu không chính xác!" });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.matkhau);
    if (!isValid) {
      return res.status(401).json({ error: "Địa chỉ email hoặc mật khẩu không chính xác!" });
    }

    // Load user's address
    let address = "";
    const addrResult = await query("SELECT DiaChiChiTiet FROM diachi WHERE MaKH = $1 LIMIT 1", [user.makh]);
    if (addrResult.rows.length > 0) address = addrResult.rows[0].diachichitiet;

    // Load user's orders
    const ordersResult = await query(
      `SELECT d.MaDonHang as madonhang, d.MaDonHangStr as madonhangstr, d.NgayDat as ngaydat, d.TongTien as tongtien, d.TrangThai as trangthai
       FROM donhang d WHERE d.MaKH = $1 ORDER BY d.NgayDat DESC`,
      [user.makh]
    );

    const orders = [];
    for (const o of ordersResult.rows) {
      const itemsResult = await query(
        "SELECT * FROM chitiet_donhang WHERE MaDonHang = $1",
        [o.madonhang]
      );
      orders.push({
        id: o.madonhangstr,
        date: o.ngaydat ? new Date(o.ngaydat).toISOString().split("T")[0] : "",
        total: Number(o.tongtien),
        status: o.trangthai,
        statusText: o.trangthai === 'pending' ? 'Đang xử lý' : o.trangthai,
        items: itemsResult.rows.map(it => ({
          productId: it.mabienthe, // temp mapping
          price: Number(it.dongia),
          quantity: it.soluong,
        })),
      });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        makh: user.makh,
        name: user.hoten,
        email: user.email,
        phone: user.sodienthoai,
        address,
        memberTier: user.tier,
        avatar: user.avatar,
        orders,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại." });
  }
});

// GET /api/auth/me — Lấy thông tin user hiện tại từ JWT
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "SELECT MaKH as makh, HoTen as hoten, Email as email, SoDienThoai as sodienthoai, Tier as tier, Avatar as avatar FROM khachhang WHERE MaKH = $1",
      [req.user.makh]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    const user = result.rows[0];

    // Load user's address
    let address = "";
    const addrResult = await query("SELECT DiaChiChiTiet FROM diachi WHERE MaKH = $1 LIMIT 1", [user.makh]);
    if (addrResult.rows.length > 0) address = addrResult.rows[0].diachichitiet;

    // Load orders
    const ordersResult = await query(
      `SELECT d.MaDonHang as madonhang, d.MaDonHangStr as madonhangstr, d.NgayDat as ngaydat, d.TongTien as tongtien, d.TrangThai as trangthai
       FROM donhang d WHERE d.MaKH = $1 ORDER BY d.NgayDat DESC`,
      [user.makh]
    );

    const orders = [];
    for (const o of ordersResult.rows) {
      orders.push({
        id: o.madonhangstr,
        date: o.ngaydat ? new Date(o.ngaydat).toISOString().split("T")[0] : "",
        total: Number(o.tongtien),
        status: o.trangthai,
        statusText: o.trangthai === 'pending' ? 'Đang xử lý' : o.trangthai,
        items: [] // simplify for now
      });
    }

    res.json({
      user: {
        makh: user.makh,
        name: user.hoten,
        email: user.email,
        phone: user.sodienthoai,
        address,
        memberTier: user.tier,
        avatar: user.avatar,
        orders,
      },
    });
  } catch (err) {
    console.error("Auth/me error:", err);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PUT /api/auth/profile — Cập nhật profile user
app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, avatar, newPassword } = req.body;
    const userId = req.user.makh;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) { updates.push(`HoTen = $${paramIdx++}`); values.push(name); }
    if (phone !== undefined) { updates.push(`SoDienThoai = $${paramIdx++}`); values.push(phone); }
    if (avatar !== undefined) { updates.push(`Avatar = $${paramIdx++}`); values.push(avatar); }
    if (newPassword && newPassword.length >= 6) {
      const hashedPw = await bcrypt.hash(newPassword, SALT_ROUNDS);
      updates.push(`MatKhau = $${paramIdx++}`);
      values.push(hashedPw);
    }

    if (updates.length > 0) {
      values.push(userId);
      await query(`UPDATE khachhang SET ${updates.join(", ")} WHERE MaKH = $${paramIdx}`, values);
    }

    if (address !== undefined) {
      const addrRes = await query("SELECT MaDiaChi FROM diachi WHERE MaKH = $1", [userId]);
      if (addrRes.rows.length > 0) {
        await query("UPDATE diachi SET DiaChiChiTiet = $1 WHERE MaKH = $2", [address, userId]);
      } else {
        await query(
          "INSERT INTO diachi (MaKH, NguoiNhan, SDTNguoiNhan, DiaChiChiTiet, PhuongXa, QuanHuyen, TinhThanh) VALUES ($1, '', '', $2, '', '', '')",
          [userId, address]
        );
      }
    }

    const result = await query("SELECT MaKH as makh, HoTen as hoten, Email as email, SoDienThoai as sodienthoai, Tier as tier, Avatar as avatar FROM khachhang WHERE MaKH = $1", [userId]);
    const user = result.rows[0];

    let updatedAddress = address !== undefined ? address : "";
    if (address === undefined) {
      const addrResult = await query("SELECT DiaChiChiTiet FROM diachi WHERE MaKH = $1 LIMIT 1", [userId]);
      if (addrResult.rows.length > 0) updatedAddress = addrResult.rows[0].diachichitiet;
    }

    res.json({
      user: {
        makh: user.makh,
        name: user.hoten,
        email: user.email,
        phone: user.sodienthoai,
        address: updatedAddress,
        memberTier: user.tier,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Lỗi cập nhật thông tin." });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ORDER API ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/orders — Tạo đơn hàng mới
app.post("/api/orders", optionalAuth, async (req, res) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { items, total, address, phone, email, name, note, paymentMethod, shippingMethod } = req.body;

    if (!items || items.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Chưa có sản phẩm nào trong đơn hàng." });
    }

    // Generate order ID: CR-XXXX
    const orderStr = `CR-${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = req.user ? req.user.makh : null;

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO donhang (madonhangstr, makh, tongtien, trangthai, trang_thai_text,
         dia_chi, sdt, email, ghi_chu, phuong_thuc_thanh_toan, phuong_thuc_van_chuyen)
       VALUES ($1, $2, $3, 'pending', 'Đang xử lý chuẩn bị', $4, $5, $6, $7, $8, $9)
       RETURNING madonhang, madonhangstr, ngaydat`,
      [orderStr, userId, total || 0, address || "", phone || "", email || "",
        note || "", paymentMethod || "bank_transfer", shippingMethod || "standard"]
    );

    const newOrder = orderResult.rows[0];

    // Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO chitiet_donhang (madonhang, ma_san_pham, ten_san_pham, dongia, soluong, size, mau_sac)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newOrder.madonhang, item.productId || "", item.productName || "",
        item.price || 0, item.quantity || 1, item.size || "", item.colorName || ""]
      );
    }

    // Create payment record
    await client.query(
      `INSERT INTO thanhtoan (madonhang, phuongthuc, sotien, trangthai)
       VALUES ($1, $2, $3, 'pending')`,
      [newOrder.madonhang, paymentMethod || "bank_transfer", total || 0]
    );

    // Create shipping record
    await client.query(
      `INSERT INTO vanchuyen (madonhang, phuongthucvc)
       VALUES ($1, $2)`,
      [newOrder.madonhang, shippingMethod || "standard"]
    );

    await client.query("COMMIT");

    // Try to call Payment Server if configured
    let paymentLink = null;
    const paymentServerUrl = process.env.PAYMENT_SERVER_URL;
    if (paymentServerUrl && paymentMethod === "bank_transfer") {
      try {
        const paymentResp = await fetch(`${paymentServerUrl}/api/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_account: null, // customer pays
            receiver_account: null, // Chéri's account (configured on payment server side)
            amount: total || 0,
          }),
        });
        if (paymentResp.ok) {
          const paymentData = await paymentResp.json();
          paymentLink = paymentData.payment_link || null;

          // Save payment link to DB
          if (paymentLink && paymentData.id) {
            await query(
              `UPDATE thanhtoan SET payment_link = $1, payment_server_id = $2 WHERE madonhang = $3`,
              [paymentLink, paymentData.id, newOrder.madonhang]
            );
          }
        }
      } catch (paymentErr) {
        console.warn("Payment server integration skipped:", paymentErr.message);
      }
    }

    res.status(201).json({
      success: true,
      orderId: newOrder.madonhangstr,
      message: "Đặt hàng thành công",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Order creation error:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi tạo đơn hàng." });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:orderStr/pay — Xác nhận thanh toán thành công
app.put("/api/orders/:orderStr/pay", optionalAuth, async (req, res) => {
  const client = await getClient();
  try {
    const { orderStr } = req.params;
    await client.query("BEGIN");

    // Tìm đơn hàng
    const orderRes = await client.query(
      "SELECT madonhang FROM donhang WHERE madonhangstr = $1",
      [orderStr]
    );

    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }

    const madonhang = orderRes.rows[0].madonhang;

    // Cập nhật trạng thái đơn hàng
    await client.query(
      "UPDATE donhang SET trangthai = 'processing', trang_thai_text = 'Đã thanh toán, đang chuẩn bị hàng' WHERE madonhang = $1",
      [madonhang]
    );

    // Cập nhật trạng thái thanh toán
    await client.query(
      "UPDATE thanhtoan SET trangthai = 'completed', ngay_thanhtoan = CURRENT_TIMESTAMP WHERE madonhang = $1",
      [madonhang]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Thanh toán thành công" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Payment confirmation error:", err);
    res.status(500).json({ error: "Lỗi xác nhận thanh toán." });
  } finally {
    client.release();
  }
});

// GET /api/orders — Lấy danh sách đơn hàng của user
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const ordersResult = await query(
      `SELECT d.madonhang, d.madonhangstr, d.ngaydat, d.tongtien, d.trangthai,
              d.trang_thai_text, d.dia_chi, d.sdt, d.email
       FROM donhang d WHERE d.makh = $1 ORDER BY d.ngaydat DESC`,
      [req.user.makh]
    );

    const orders = [];
    for (const o of ordersResult.rows) {
      const itemsResult = await query(
        "SELECT * FROM chitiet_donhang WHERE madonhang = $1",
        [o.madonhang]
      );
      orders.push({
        id: o.madonhangstr,
        date: o.ngaydat ? o.ngaydat.toISOString().split("T")[0] : "",
        total: Number(o.tongtien),
        status: o.trangthai,
        statusText: o.trang_thai_text,
        address: o.dia_chi,
        phone: o.sdt,
        items: itemsResult.rows.map(it => ({
          productId: it.ma_san_pham,
          productName: it.ten_san_pham,
          price: Number(it.gia),
          quantity: it.soluong,
          size: it.size,
          colorName: it.mau_sac,
        })),
      });
    }

    res.json({ orders });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Lỗi khi tải đơn hàng." });
  }
});

// POST /api/payment/callback — Nhận callback từ Payment Server khi thanh toán xong
app.post("/api/payment/callback", async (req, res) => {
  try {
    const { transaction_id, status } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: "Missing transaction_id" });
    }

    // Find payment record by payment_server_id
    const paymentResult = await query(
      "SELECT ma_thanh_toan, madonhang FROM thanhtoan WHERE payment_server_id = $1",
      [transaction_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    const payment = paymentResult.rows[0];
    const newStatus = status === "completed" ? "completed" : "failed";

    // Update payment status
    await query(
      "UPDATE thanhtoan SET trangthai = $1, ngay_thanh_toan = CURRENT_TIMESTAMP WHERE ma_thanh_toan = $2",
      [newStatus, payment.ma_thanh_toan]
    );

    // Update order status
    if (newStatus === "completed") {
      await query(
        `UPDATE donhang SET trangthai = 'preparing', trang_thai_text = 'Đã thanh toán — Đang chuẩn bị hàng tại Atelier'
         WHERE madonhang = $1`,
        [payment.madonhang]
      );
    } else {
      await query(
        `UPDATE donhang SET trangthai = 'payment_failed', trang_thai_text = 'Thanh toán thất bại'
         WHERE madonhang = $1`,
        [payment.madonhang]
      );
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("Payment callback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// REVIEWS API
// ═══════════════════════════════════════════════════════════════════

// POST /api/reviews — Tạo đánh giá mới
app.post("/api/reviews", authMiddleware, async (req, res) => {
  try {
    const { productId, productName, rating, content } = req.body;
    const result = await query(
      `INSERT INTO danhgia (makh, ma_san_pham, ten_san_pham, diem_so, noi_dung)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ma_danh_gia, diem_so, noi_dung, ngay_tao`,
      [req.user.makh, productId || "", productName || "", rating || 5, content || ""]
    );
    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Lỗi khi tạo đánh giá." });
  }
});

// GET /api/reviews/:productId — Lấy đánh giá theo sản phẩm
app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const result = await query(
      `SELECT d.ma_danh_gia, d.diem_so, d.noi_dung, d.ngay_tao, k.ho_ten, k.avatar
       FROM danhgia d LEFT JOIN khachhang k ON d.makh = k.makh
       WHERE d.ma_san_pham = $1 ORDER BY d.ngay_tao DESC`,
      [req.params.productId]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ error: "Lỗi khi tải đánh giá." });
  }
});



// Setup Vite development server or production build
async function setupServer() {
  // Initialize database (create tables + seed if needed)
  try {
    await initDatabase();
  } catch (dbErr) {
    console.error("⚠️  Database initialization failed. Auth & Orders will not work.");
    console.error("   Make sure PostgreSQL is running and .env credentials are correct.");
    console.error("   Error:", dbErr.message);
    // Don't crash — server can still serve frontend + products + chat
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted on Express");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(
      "Static assets server running under production path:",
      distPath,
    );
  }



  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Chéri server successfully loaded and binding to http://0.0.0.0:${PORT}`,
    );
  });
}

setupServer();
