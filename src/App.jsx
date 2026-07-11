import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles } from "lucide-react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Chatbox from "./components/Chatbox";
import QuickViewModal from "./components/QuickViewModal";
import SearchModal from "./components/SearchModal";
import ReviewModal from "./components/ReviewModal";
import AboutPage from "./components/AboutPage";
import OrderingGuidePage from "./components/OrderingGuidePage";
import FAQsPage from "./components/FAQsPage";
import {
  ReturnPolicyPage,
  WarrantyPolicyPage,
  PrivacyPolicyPage,
  ShippingPolicyPage,
} from "./components/PolicyPages";
import TrackingPage from "./components/TrackingPage";
import VirtualTryOnPage from "./components/VirtualTryOnPage";
import { CHERI_PRODUCTS } from "./data";

// ─── Tách ra từ App.tsx ─────────────────────────────────────────────────────
import { safeLocalStorage } from "./utils";
import { DEFAULT_AVATAR, GUEST_USER, DEFAULT_USER } from "./constants/defaults";
import HomePage from "./views/HomePage";
import ProductsPage from "./views/ProductsPage";
import WishlistPage from "./views/WishlistPage";
import CartPage from "./views/CartPage";
import LoginPage from "./views/LoginPage";
import RegisterPage from "./views/RegisterPage";
import CheckoutPage from "./views/CheckoutPage";
import OrderSuccessPage from "./views/OrderSuccessPage";
import AccountPage from "./views/AccountPage";
import PaymentPage from "./views/PaymentPage";
import EWalletPaymentPage from "./views/EWalletPaymentPage";
import VisaPaymentPage from "./views/VisaPaymentPage";
import { apiCreateOrder, apiRegister, apiLogin, apiUpdateProfile } from "./utils/api";

export default function App() {
  // Page Routing State: "home" | "products" | "about" | "wishlist" | "cart" | "account" | "login" | "register"
  const [currentPage, setCurrentPage] = useState("home");
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingPhone, setTrackingPhone] = useState("");

  // Tab states for order listings in account view
  const [selectedOrderTab, setSelectedOrderTab] = useState("all");
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Selected review product targets
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [selectedReviewPreset, setSelectedReviewPreset] = useState("");

  // Track which items are already evaluated to disable review actions
  const [reviewedItems, setReviewedItems] = useState(() => {
    const saved = safeLocalStorage.getItem("cheri_reviewed_items");
    return saved ? JSON.parse(saved) : {};
  });

  const [products, setProducts] = useState([]);
  const productLaneRef = useRef(null);

  const scrollProductLane = (direction) => {
    if (productLaneRef.current) {
      const { scrollLeft, clientWidth } = productLaneRef.current;
      const scrollAmount = clientWidth * 0.75;
      productLaneRef.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Load products dynamically from spreadsheet API
  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("API load status failing");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch((err) => {
        console.warn(
          "Could not load dynamic products, using fallback static catalog",
          err,
        );
        setProducts(CHERI_PRODUCTS);
      });
  }, []);

  // Authentication & Membership Persistence
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return safeLocalStorage.getItem("cheri_is_logged_in") === "true";
  });

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const defaults = [
      {
        email: "contact.cheri@gmail.com",
        password: "cheri123",
        name: "Nguyễn Thơ",
        phone: "0881 1880 080",
        address:
          "118 Linh Trung, Phường Linh Trung, Thủ Đức, Thành phố Hồ Chí Minh",
        memberTier: "Gold",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
        orders: DEFAULT_USER.orders,
      },
      {
        email: "test@gmail.com",
        password: "123456",
        name: "Huyền My",
        phone: "0909 123 456",
        address: "79 Đường 3/2, Quận 10, Thành phố Hồ Chí Minh",
        memberTier: "Silver",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
        orders: [],
      },
    ];
    const saved = safeLocalStorage.getItem("cheri_registered_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults if they are missing
          const merged = [...parsed];
          defaults.forEach((def) => {
            const exists = merged.some(
              (u) =>
                u &&
                u.email &&
                u.email.toLowerCase() === def.email.toLowerCase(),
            );
            if (!exists) {
              merged.push(def);
            }
          });
          safeLocalStorage.setItem(
            "cheri_registered_users",
            JSON.stringify(merged),
          );
          return merged;
        }
      } catch (e) {
        console.error(e);
      }
    }
    safeLocalStorage.setItem(
      "cheri_registered_users",
      JSON.stringify(defaults),
    );
    return defaults;
  });

  // App States with LocalStorage Hydration
  const [cart, setCart] = useState(() => {
    const savedUser = safeLocalStorage.getItem("cheri_user");
    const isLogged = safeLocalStorage.getItem("cheri_is_logged_in") === "true";
    let email = "";
    if (isLogged && savedUser) {
      try {
        email = JSON.parse(savedUser).email || "";
      } catch (e) {}
    }
    const key = email ? `cheri_cart_${email.toLowerCase()}` : "cheri_cart_guest";
    const saved = safeLocalStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState(() => {
    const saved = safeLocalStorage.getItem("cheri_wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  const [userProfile, setUserProfile] = useState(() => {
    const saved = safeLocalStorage.getItem("cheri_user");
    const isLogged = safeLocalStorage.getItem("cheri_is_logged_in") === "true";
    if (isLogged && saved) {
      const parsed = JSON.parse(saved);
      // Auto-populate multiple orders for the default user to test tracking/reviews tabs
      if (
        parsed.email === "contact.cheri@gmail.com" &&
        parsed.orders.length <= 1
      ) {
        parsed.orders = DEFAULT_USER.orders;
        safeLocalStorage.setItem("cheri_user", JSON.stringify(parsed));
      }
      return parsed;
    }
    return GUEST_USER;
  });

  // Category & Filters States
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  // Interaction States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [headerSearchInput, setHeaderSearchInput] = useState("");

  // Visual Search by Image States
  const [visualSearchPreview, setVisualSearchPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [similarityScore, setSimilarityScore] = useState(0);
  const [scanCompleted, setScanCompleted] = useState(false);

  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Detailed Modal Selectors
  const [selectedSize, setSelectedSize] = useState("S");
  const [selectedColor, setSelectedColor] = useState({ name: "", hex: "" });
  const [selectedClassification, setSelectedClassification] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  // Toast Notification System
  const [toast, setToast] = useState(null);

  // Promo Code State
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Login form local states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Register form local states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regSelectedAvatar, setRegSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Profile password modification local states
  const [accPassword, setAccPassword] = useState("");
  const [accConfirmPassword, setAccConfirmPassword] = useState("");

  // Checkout Form State
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [checkoutPayment, setCheckoutPayment] = useState("bank_transfer");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [selectedCartItemIds, setSelectedCartItemIds] = useState(() => {
    const saved = safeLocalStorage.getItem("cheri_selected_cart_ids");
    return saved ? JSON.parse(saved) : [];
  });
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [showRegisterSuggestion, setShowRegisterSuggestion] = useState(true);

  const activeUserEmailRef = useRef(userProfile?.email || "");

  // Sync state with localStorage on changes
  useEffect(() => {
    const currentEmail = userProfile?.email || "";
    if (activeUserEmailRef.current !== currentEmail) {
      activeUserEmailRef.current = currentEmail;
      return;
    }
    const key = currentEmail ? `cheri_cart_${currentEmail.toLowerCase()}` : "cheri_cart_guest";
    safeLocalStorage.setItem(key, JSON.stringify(cart));
  }, [cart, userProfile]);

  useEffect(() => {
    safeLocalStorage.setItem("cheri_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    safeLocalStorage.setItem("cheri_user", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    safeLocalStorage.setItem(
      "cheri_is_logged_in",
      isLoggedIn ? "true" : "false",
    );
  }, [isLoggedIn]);

  // Set checkout defaults once profile is loaded
  useEffect(() => {
    if (isLoggedIn && userProfile) {
      setCheckoutName(userProfile.name || "");
      setCheckoutPhone(userProfile.phone || "");
      setCheckoutAddress(userProfile.address || "");
      setCheckoutEmail(userProfile.email || "");
    }
  }, [userProfile, isLoggedIn]);

  // Synchronize selected cart item IDs to local storage
  useEffect(() => {
    safeLocalStorage.setItem(
      "cheri_selected_cart_ids",
      JSON.stringify(selectedCartItemIds),
    );
  }, [selectedCartItemIds]);

  // Toast auto-dismisser helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Quick action: Add immediately to cart using first size/color/classification
  const handleQuickAddToCart = (product, e) => {
    e.stopPropagation();
    if (!product.inStock) {
      showToast(`${product.name} đã hết hàng `, "info");
      return;
    }
    const defaultColor =
      product.colors && product.colors.length > 0
        ? product.colors[0]
        : undefined;
    const defaultSize =
      product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined;
    const defaultClassification =
      product.classifications && product.classifications.length > 0
        ? product.classifications[0]
        : undefined;

    // Check if duplicate already in cart
    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.size === defaultSize &&
        item.color?.hex === defaultColor?.hex &&
        item.classification === defaultClassification,
    );

    let addedId = "";
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
      addedId = updated[existingIndex].id;
    } else {
      const newItem = {
        id: `cart-${product.id}-${Date.now()}`,
        product,
        size: defaultSize,
        color: defaultColor,
        classification: defaultClassification,
        quantity: 1,
      };
      setCart([...cart, newItem]);
      addedId = newItem.id;
    }
    // Automatically select the added item
    setSelectedCartItemIds((prev) =>
      prev.includes(addedId) ? prev : [...prev, addedId],
    );
    const sizeText = defaultSize ? ` (Size ${defaultSize})` : "";
    showToast(`Đã thêm vào giỏ hàng${sizeText} `);
  };

  // Toggle favorite state
  const handleToggleWishlist = (productId, e) => {
    e.stopPropagation();
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter((id) => id !== productId));
      showToast("Đã bỏ thích ", "info");
    } else {
      setWishlist([...wishlist, productId]);
      showToast("Đã thêm vào yêu thích ");
    }
  };

  // Remove directly from cart
  const handleRemoveFromCart = (itemId) => {
    setCart(cart.filter((item) => item.id !== itemId));
    setSelectedCartItemIds((prev) => prev.filter((id) => id !== itemId));
    showToast("Đã xóa khỏi giỏ hàng", "info");
  };

  // Adjust item quantities
  const handleUpdateQuantity = (itemId, increment) => {
    let shouldRemove = false;
    const updated = cart
      .map((item) => {
        if (item.id === itemId) {
          const newQty = increment ? item.quantity + 1 : item.quantity - 1;
          if (newQty <= 0) {
            shouldRemove = true;
            return null;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item !== null);
      
    if (shouldRemove) {
      setSelectedCartItemIds(prev => prev.filter(id => id !== itemId));
    }
    setCart(updated);
  };

  // Trigger Detail Focus View Modal
  const openQuickView = (product) => {
    setQuickViewProduct(product);
    setSelectedSize(
      product.sizes && product.sizes.length > 0 ? product.sizes[0] : "",
    );
    setSelectedColor(
      product.colors && product.colors.length > 0 ? product.colors[0] : null,
    );
    setSelectedClassification(
      product.classifications && product.classifications.length > 0
        ? product.classifications[0]
        : "",
    );
    setPreviewImage(product.image);
  };

  // Add customized item from quick view modal
  const handleAddFromModal = () => {
    if (!quickViewProduct) return;
    if (!quickViewProduct.inStock) {
      showToast(
        `Sản phẩm ${quickViewProduct.name} hiện đã hết hàng `,
        "info",
      );
      return;
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === quickViewProduct.id &&
        (!quickViewProduct.sizes ||
          quickViewProduct.sizes.length === 0 ||
          item.size === selectedSize) &&
        (!quickViewProduct.colors ||
          quickViewProduct.colors.length === 0 ||
          (item.color &&
            selectedColor &&
            item.color.hex === selectedColor.hex)) &&
        (!quickViewProduct.classifications ||
          quickViewProduct.classifications.length === 0 ||
          item.classification === selectedClassification),
    );

    let addedId = "";
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
      addedId = updated[existingIndex].id;
    } else {
      const newItem = {
        id: `cart-${quickViewProduct.id}-${Date.now()}`,
        product: quickViewProduct,
        size:
          quickViewProduct.sizes && quickViewProduct.sizes.length > 0
            ? selectedSize
            : undefined,
        color:
          quickViewProduct.colors && quickViewProduct.colors.length > 0
            ? selectedColor || undefined
            : undefined,
        classification:
          quickViewProduct.classifications &&
          quickViewProduct.classifications.length > 0
            ? selectedClassification
            : undefined,
        quantity: 1,
      };
      setCart([...cart, newItem]);
      addedId = newItem.id;
    }
    setSelectedCartItemIds((prev) =>
      prev.includes(addedId) ? prev : [...prev, addedId],
    );
    setQuickViewProduct(null);
    showToast(`Đã thêm ${quickViewProduct.name} vào giỏ hàng thành công `);
  };

  // Direct purchase from quick view modal, redirecting to checkout page
  const handleBuyNowFromModal = () => {
    if (!quickViewProduct) return;
    if (!quickViewProduct.inStock) {
      showToast(
        `Sản phẩm ${quickViewProduct.name} hiện đã hết hàng `,
        "info",
      );
      return;
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === quickViewProduct.id &&
        (!quickViewProduct.sizes ||
          quickViewProduct.sizes.length === 0 ||
          item.size === selectedSize) &&
        (!quickViewProduct.colors ||
          quickViewProduct.colors.length === 0 ||
          (item.color &&
            selectedColor &&
            item.color.hex === selectedColor.hex)) &&
        (!quickViewProduct.classifications ||
          quickViewProduct.classifications.length === 0 ||
          item.classification === selectedClassification),
    );

    let purchasedId = "";
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
      purchasedId = updated[existingIndex].id;
    } else {
      const newItem = {
        id: `cart-${quickViewProduct.id}-${Date.now()}`,
        product: quickViewProduct,
        size:
          quickViewProduct.sizes && quickViewProduct.sizes.length > 0
            ? selectedSize
            : undefined,
        color:
          quickViewProduct.colors && quickViewProduct.colors.length > 0
            ? selectedColor || undefined
            : undefined,
        classification:
          quickViewProduct.classifications &&
          quickViewProduct.classifications.length > 0
            ? selectedClassification
            : undefined,
        quantity: 1,
      };
      setCart([...cart, newItem]);
      purchasedId = newItem.id;
    }
    setSelectedCartItemIds([purchasedId]); // ONLY select this item
    setQuickViewProduct(null);
    setCurrentPage("checkout"); // Directly route to the new Checkout phase
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(`Đang chuyển đến thanh toán `);
  };

  // Coupon code applier simulation
  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.toUpperCase().trim();
    if (code === "CHERIVIP") {
      setAppliedDiscount({ code: "CHERIVIP", percent: 10 });
      showToast("Áp dụng CHERIVIP — Giảm 10% ");
    } else if (code === "SLOWFASHION") {
      setAppliedDiscount({ code: "SLOWFASHION", percent: 15 });
      showToast("Áp dụng SLOWFASHION — Giảm 15% ");
    } else {
      showToast("Mã không hợp lệ hoặc đã hết hạn", "info");
    }
    setPromoCode("");
  };

  // Simulate complete checkout order process
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (selectedCartItems.length === 0) {
      showToast("Vui lòng chọn sản phẩm để đặt hàng", "info");
      return;
    }

    if (
      !checkoutName.trim() ||
      !checkoutPhone.trim() ||
      !checkoutAddress.trim() ||
      !checkoutEmail.trim()
    ) {
      showToast("Vui lòng điền đầy đủ thông tin", "info");
      return;
    }

    const orderItems = selectedCartItems.map((item) => ({
      productId: item.product.id,
      productName:
        item.product.name +
        (item.classification ? ` [${item.classification}]` : ""),
      price: item.product.price,
      quantity: item.quantity,
      size: item.size || "",
      colorName: item.color?.name || "",
    }));

    const finalTotal = totalCalculated.final;

    const orderPayload = {
      items: orderItems,
      total: finalTotal,
      address: checkoutAddress,
      phone: checkoutPhone,
      email: checkoutEmail,
      name: checkoutName,
      note: orderNote,
      paymentMethod: checkoutPayment,
      shippingMethod: shippingMethod
    };

    if (checkoutPayment === 'bank_transfer') {
      setPendingOrderData(orderPayload);
      setCurrentPage("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (checkoutPayment === 'e_wallet') {
      setPendingOrderData(orderPayload);
      setCurrentPage("ewallet_payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (checkoutPayment === 'credit_card') {
      setPendingOrderData(orderPayload);
      setCurrentPage("visa_payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const response = await apiCreateOrder(orderPayload);
      const orderId = response.orderId || `CR-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder = {
        id: orderId,
        date: new Date().toISOString().split("T")[0],
        items: orderItems,
        total: finalTotal,
        status: "pending",
        statusText: "Đang xử lý chuẩn bị",
        address: checkoutAddress,
        phone: checkoutPhone,
      };

      setLastPlacedOrder(newOrder);
              if (isLoggedIn && userProfile) {
                setUserProfile(prev => ({
                  ...prev,
                  orders: [newOrder, ...(prev.orders || [])]
                }));
              }

      // Xóa item đã mua khỏi giỏ
      const remainingCartItems = cart.filter(
        (item) => !selectedCartItemIds.includes(item.id),
      );
      setCart(remainingCartItems);
      setSelectedCartItemIds([]);

      setAppliedDiscount(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast(`Đặt hàng thành công! `);
      
      setCurrentPage("orderSuccess");
    } catch (err) {
      showToast(err.message || "Tạo đơn hàng thất bại", "error");
    }
  };

  // Profile data updating handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (accPassword || accConfirmPassword) {
      if (!accPassword || !accConfirmPassword) {
        showToast("Vui lòng nhập cả mật khẩu mới và xác nhận mật khẩu", "info");
        return;
      }
      if (accPassword.length < 6) {
        showToast("Tối thiểu 6 ký tự", "info");
        return;
      }
      if (accConfirmPassword.length < 6) {
        showToast("Tối thiểu 6 ký tự", "info");
        return;
      }
      if (accPassword !== accConfirmPassword) {
        showToast("Xác nhận mật khẩu mới không khớp ", "info");
        return;
      }
    }

    try {
      const data = await apiUpdateProfile({
        name: userProfile.name,
        phone: userProfile.phone,
        address: userProfile.address,
        avatar: userProfile.avatar,
        newPassword: accPassword ? accPassword : undefined,
      });

      setUserProfile({
        ...userProfile,
        name: data.user.name,
        phone: data.user.phone,
        address: data.user.address,
        avatar: data.user.avatar,
        memberTier: data.user.memberTier || userProfile.memberTier,
      });

      const updatedUsers = registeredUsers.map((u) => {
        if (u.email.toLowerCase() === userProfile.email.toLowerCase()) {
          return {
            ...u,
            name: data.user.name,
            phone: data.user.phone,
            address: data.user.address,
            avatar: data.user.avatar,
            password: accPassword ? accPassword : u.password,
          };
        }
        return u;
      });

      setRegisteredUsers(updatedUsers);
      safeLocalStorage.setItem(
        "cheri_registered_users",
        JSON.stringify(updatedUsers),
      );

      setAccPassword("");
      setAccConfirmPassword("");

      showToast("Cập nhật thông tin hồ sơ và mật mã thành công! ");
    } catch (err) {
      showToast(err.message || "Cập nhật thông tin thất bại", "error");
    }
  };

  // Dynamically filter historical orders based on user selected status tabs
  const filteredOrders = useMemo(() => {
    // Unique list of orders to prevent any possible duplication
    const uniqueOrders = userProfile.orders.filter(
      (order, idx, self) => self.findIndex((o) => o.id === order.id) === idx,
    );

    if (selectedOrderTab === "all") return uniqueOrders;
    if (selectedOrderTab === "preparing") {
      return uniqueOrders.filter((o) => o.status === "preparing");
    }
    if (selectedOrderTab === "shipped") {
      return uniqueOrders.filter(
        (o) => o.status === "shipped" || o.status === "delivering",
      );
    }
    return uniqueOrders.filter((o) => o.status === selectedOrderTab);
  }, [userProfile.orders, selectedOrderTab]);

  // Helper functions for custom premium order tabs, deadline estimations, and repurchases
  const getOrderCountByStatus = (status) => {
    const uniqueOrders = userProfile.orders.filter(
      (order, idx, self) => self.findIndex((o) => o.id === order.id) === idx,
    );

    if (status === "all") {
      return uniqueOrders.length;
    }
    if (status === "preparing") {
      return uniqueOrders.filter((o) => o.status === "preparing").length;
    }
    if (status === "shipped") {
      return uniqueOrders.filter(
        (o) => o.status === "shipped" || o.status === "delivering",
      ).length;
    }
    return uniqueOrders.filter((o) => o.status === status).length;
  };

  const getMatchingProduct = (item) => {
    if (!products || products.length === 0) return undefined;

    // 1. Try finding by ID first
    let found = products.find((p) => p.id === item.productId);
    if (found) return found;

    // 2. Try finding by matching name keywords (e.g. "Sơ Mi", "Blazer", "Đầm", "Quần")
    const nameLower = (item.productName || "").toLowerCase();

    if (nameLower.includes("sơ mi") || nameLower.includes("shirt")) {
      found = products.find(
        (p) =>
          p.category === "tops" ||
          p.name.toLowerCase().includes("sơ mi") ||
          p.name.toLowerCase().includes("shirt"),
      );
    } else if (nameLower.includes("blazer") || nameLower.includes("tweed")) {
      found = products.find(
        (p) =>
          p.category === "outerwear" ||
          p.name.toLowerCase().includes("blazer") ||
          p.name.toLowerCase().includes("tweed"),
      );
    } else if (
      nameLower.includes("đầm dạ hội") ||
      nameLower.includes("satin")
    ) {
      found = products.find(
        (p) =>
          p.category === "dresses" ||
          p.name.toLowerCase().includes("satin") ||
          p.name.toLowerCase().includes("đầm"),
      );
    } else if (nameLower.includes("quần") || nameLower.includes("trousers")) {
      found = products.find(
        (p) =>
          p.category === "bottoms" ||
          p.name.toLowerCase().includes("quần") ||
          p.name.toLowerCase().includes("trousers"),
      );
    } else if (
      nameLower.includes("tay bồng") ||
      nameLower.includes("đầm lụa")
    ) {
      found = products
        .slice()
        .reverse()
        .find(
          (p) =>
            p.category === "dresses" || p.name.toLowerCase().includes("đầm"),
        );
    } else if (nameLower.includes("gile") || nameLower.includes("kaki")) {
      found = products.find(
        (p) =>
          p.category === "tops" ||
          p.name.toLowerCase().includes("gile") ||
          p.name.toLowerCase().includes("kaki"),
      );
    } else if (nameLower.includes("len") || nameLower.includes("cashmere")) {
      found = products.find(
        (p) =>
          p.category === "outerwear" ||
          p.name.toLowerCase().includes("len") ||
          p.name.toLowerCase().includes("cashmere"),
      );
    } else if (nameLower.includes("xếp ly") || nameLower.includes("skirt")) {
      found = products.find(
        (p) =>
          p.category === "bottoms" ||
          p.name.toLowerCase().includes("xếp ly") ||
          p.name.toLowerCase().includes("skirt"),
      );
    }

    if (found) return found;

    // 3. Fallback to index-based deterministic selection
    const idx = parseInt(item.productId) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < products.length) {
      return products[idx];
    }

    return products[0];
  };

  const getProductImage = (productId, productName = "") => {
    const found = getMatchingProduct({ productId, productName });
    if (found) return found.image;

    // Aesthetic Unsplash static fallbacks based on ID matches
    if (productId === "1")
      return "https://images.unsplash.com/photo-1548624149-f95ab51fc05b?auto=format&fit=crop&q=80&w=200";
    if (productId === "2")
      return "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=200";
    if (productId === "3")
      return "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=200";
    if (productId === "4")
      return "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&q=80&w=200";
    if (productId === "5")
      return "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=200";
    return "https://images.unsplash.com/photo-1548624149-f95ab51fc05b?auto=format&fit=crop&q=80&w=200";
  };

  const getDeadlineDate = (orderDateStr) => {
    try {
      const d = new Date(orderDateStr);
      d.setDate(d.getDate() + 30);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "20/07/2026";
    }
  };

  const handleReorderItem = (productId, productName = "", size, colorName) => {
    const product =
      getMatchingProduct({ productId, productName }) ||
      CHERI_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      showToast("Không tìm thấy thông tin sản phẩm này ", "info");
      return;
    }

    // Find color object
    const matchedColor =
      product.colors?.find((c) => c.name === colorName) || product.colors?.[0];

    const newItem = {
      id: `cart-${product.id}-${Date.now()}`,
      product,
      size:
        size ||
        (product.sizes && product.sizes.length > 0
          ? product.sizes[0]
          : undefined),
      color: matchedColor,
      quantity: 1,
    };

    const updatedCart = [...cart, newItem];
    setCart(updatedCart);
    showToast(
      `Đã thêm tiếp 1 bộ "${product.name}" vào giỏ hàng thành công! `,
      "success",
    );
  };

  // Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const queryEmail = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    if (password.length < 6) {
      showToast("Tối thiểu 6 ký tự", "info");
      return;
    }

    try {
      const data = await apiLogin({ email: queryEmail, password });
      setIsLoggedIn(true);
      setUserProfile({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        address: data.user.address,
        memberTier: data.user.memberTier || "Bronze",
        avatar: data.user.avatar || "",
        orders: data.user.orders || []
      });
      const userCartKey = `cheri_cart_${data.user.email.toLowerCase()}`;
      const savedUserCart = safeLocalStorage.getItem(userCartKey);
      setCart(savedUserCart ? JSON.parse(savedUserCart) : []);
      showToast("Đăng nhập thành công", "success");
      setCurrentPage("home");
      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      showToast(error.message || "Đăng nhập thất bại!", "info");
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const name = regName.trim();
    const email = regEmail.trim();
    const phone = regPhone.trim();
    const address = regAddress.trim();
    const password = regPassword;
    const confirmPass = regConfirmPassword;

    if (!name || !email || !phone || !address || !password) {
      showToast(
        "Vui lòng điện đầy đủ thông tin để hoàn tất đăng ký ",
        "info",
      );
      return;
    }

    if (password.length < 6) {
      showToast("Tối thiểu 6 ký tự", "info");
      return;
    }

    if (confirmPass.length < 6) {
      showToast("Tối thiểu 6 ký tự", "info");
      return;
    }

    if (password !== confirmPass) {
      showToast("Xác nhận mật khẩu không khớp ", "info");
      return;
    }

    try {
      const data = await apiRegister({ name, email, phone, address, password, avatar: "" });
      setIsLoggedIn(true);
      setUserProfile({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        address: data.user.address,
        memberTier: data.user.memberTier || "Bronze",
        avatar: data.user.avatar || "",
        orders: []
      });
      const userCartKey = `cheri_cart_${data.user.email.toLowerCase()}`;
      const savedUserCart = safeLocalStorage.getItem(userCartKey);
      setCart(savedUserCart ? JSON.parse(savedUserCart) : []);
      showToast("Đăng ký tài khoản thành công");
      setCurrentPage("home");

      setRegName("");
      setRegEmail("");
      setRegPhone("");
      setRegAddress("");
      setRegPassword("");
      setRegConfirmPassword("");
    } catch (error) {
      showToast(error.message || "Lỗi khi đăng ký!", "info");
    }
  };

  // Unified filter lookup for search and category selections
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy, products]);

  // Filter active selected items in cart
  const selectedCartItems = useMemo(() => {
    return cart.filter((item) => selectedCartItemIds.includes(item.id));
  }, [cart, selectedCartItemIds]);

  // Unified totals calculation
  const totalCalculated = useMemo(() => {
    const subtotal = selectedCartItems.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0,
    );
    const promoDiscountAmount = appliedDiscount
      ? Math.round(subtotal * (appliedDiscount.percent / 100))
      : 0;
    const preTax = subtotal - promoDiscountAmount;
    const tax = Math.round(preTax * 0.08); // VAT 8% in Vietnam

    // Free delivery for standard shipping orders above 1.500.000đ, otherwise 30.000đ. Express is always 50.000đ.
    const shipping =
      selectedCartItems.length === 0
        ? 0
        : shippingMethod === "express"
          ? 50000
          : subtotal >= 1500000
            ? 0
            : 30000;
    const final = preTax + tax + shipping;

    return {
      subtotal,
      discount: promoDiscountAmount,
      tax,
      shipping,
      final,
    };
  }, [selectedCartItems, appliedDiscount, shippingMethod]);

  // Quick action for global search popup
  const handleTriggerHeaderSearch = (e) => {
    e.preventDefault();
    setSearchQuery(headerSearchInput);
    setIsSearchOpen(false);
    setHeaderSearchInput("");
    setCurrentPage("products");
  };

  // Start automated scanning flow after preset selection or file upload
  const runSimulatedScan = (imgUrl, fileName) => {
    setIsScanning(true);
    setVisualSearchPreview(imgUrl);
    setScanProgress(10);
    setScanStep("Đang kết nối Atelier Chéri AI...");
    setMatchedProduct(null);
    setScanCompleted(false);

    // Progressive visual scan timeline
    setTimeout(() => {
      setScanProgress(40);
      setScanStep("Đang phân tích cấu trúc phom dáng & nếp vải...");
    }, 400);

    setTimeout(() => {
      setScanProgress(68);
      setScanStep("Nhận diện tông màu tự nhiên & độ bóng chất liệu...");
    }, 900);

    setTimeout(() => {
      setScanProgress(92);
      setScanStep("So khớp với thư viện thiết kế độc quyền Chéri...");
    }, 1400);

    setTimeout(() => {
      setScanProgress(100);
      setScanStep("Độc bản tương thích hoàn hảo đã sẵn sàng!");
      setIsScanning(false);
      setScanCompleted(true);

      // Match heuristic checking for product keywords
      const nameLower = fileName.toLowerCase();
      let matchedId = "";

      if (
        nameLower.includes("sơ mi") ||
        nameLower.includes("shirt") ||
        nameLower.includes("mulberry")
      ) {
        matchedId = "1";
      } else if (
        nameLower.includes("đầm") ||
        nameLower.includes("dress") ||
        nameLower.includes("gown") ||
        nameLower.includes("satin")
      ) {
        matchedId = "2";
      } else if (
        nameLower.includes("blazer") ||
        nameLower.includes("tweed") ||
        nameLower.includes("khoác") ||
        nameLower.includes("jacket")
      ) {
        matchedId = "3";
      } else if (
        nameLower.includes("quần") ||
        nameLower.includes("bottom") ||
        nameLower.includes("trousers") ||
        nameLower.includes("crepe")
      ) {
        matchedId = "4";
      } else if (
        nameLower.includes("váy") ||
        nameLower.includes("skirt") ||
        nameLower.includes("mermaid")
      ) {
        matchedId = "5";
      }

      if (matchedId) {
        const p = CHERI_PRODUCTS.find((item) => item.id === matchedId);
        if (p) {
          setMatchedProduct(p);
          setSimilarityScore(94 + Math.floor(Math.random() * 5));
          showToast("Tìm kiếm bằng hình ảnh thành công! ", "success");
          return;
        }
      }

      setMatchedProduct(null);
      showToast(
        "Không tìm thấy tệp hình ảnh tương thích với sản phẩm ",
        "info",
      );
    }, 1900);
  };

  // Upload custom file search
  const handleImageUploadSearch = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    runSimulatedScan(url, file.name);
  };

  // Quick preset template selections
  const handlePresetVisualSearch = (presetId) => {
    let url = "";
    let mockName = "";
    if (presetId === "1") {
      url =
        "https://images.unsplash.com/photo-1548624149-f95ab51fc05b?auto=format&fit=crop&q=80&w=200";
      mockName = "áo sơ mi lụa mulberry";
    } else if (presetId === "2") {
      url =
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=200";
      mockName = "đầm dạ hội satin classic";
    } else if (presetId === "3") {
      url =
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=200";
      mockName = "blazer dạ tweed sang trọng";
    } else {
      url =
        "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&q=80&w=200";
      mockName = "quần tây ống suông silk crepe";
    }
    runSimulatedScan(url, mockName);
  };

  const handleClearVisualSearch = () => {
    setVisualSearchPreview(null);
    setMatchedProduct(null);
    setScanProgress(0);
    setScanStep("");
    setScanCompleted(false);
  };

  // formatVND đã được chuyển sang src/utils/format.ts và import ở đầu file

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col justify-between selection:bg-[#74070e]/10 selection:text-[#74070e]">
      {/* Dynamic Header */}
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page === "account" && !isLoggedIn) {
            setCurrentPage("login");
            showToast("Vui lòng đăng nhập để tiếp tục ", "info");
          } else {
            setCurrentPage(page);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenSearch={() => setIsSearchOpen(true)}
        isLoggedIn={isLoggedIn}
        userName={userProfile.name}
        userAvatar={userProfile.avatar}
      />

      {/* Global Toast Notify Indicator */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="bg-[#74070e] text-white text-xs uppercase tracking-widest font-light py-3 px-6 rounded-full shadow-2xl flex items-center space-x-2 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Primary Layout Pages */}
      <main className="flex-grow">
        {/* VIEW 1: HOME PAGE */}
        {currentPage === "home" && (
          <HomePage
            products={products}
            wishlist={wishlist}
            onOpenQuickView={openQuickView}
            onQuickAddToCart={handleQuickAddToCart}
            onToggleWishlist={handleToggleWishlist}
            onNavigate={setCurrentPage}
            onSetCategory={setSelectedCategory}
          />
        )}

        {/* VIEW 2: PRODUCTS CATALOGUE */}
        {currentPage === "products" && (
          <ProductsPage
            products={products}
            filteredProducts={filteredProducts}
            wishlist={wishlist}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            sortBy={sortBy}
            onOpenQuickView={openQuickView}
            onQuickAddToCart={handleQuickAddToCart}
            onToggleWishlist={handleToggleWishlist}
            onSetCategory={setSelectedCategory}
            onSetSearchQuery={setSearchQuery}
            onSetSortBy={setSortBy}
          />
        )}
        {/* VIEW 3: ABOUT INTRO EDITORIAL */}
        {currentPage === "about" && <AboutPage />}

        {/* VIEW: VIRTUAL TRY-ON EXPERIMENTAL SUITE */}
        {currentPage === "tryon" && (
          <VirtualTryOnPage
            onNavigate={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onAddToCart={(product, e) => handleQuickAddToCart(product, e)}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {/* VIEW 8: ORDERING GUIDE */}
        {currentPage === "ordering_guide" && (
          <OrderingGuidePage
            onNavigateToStore={() => {
              setCurrentPage("products");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {/* VIEW 9: FAQs PAGE */}
        {currentPage === "faqs" && <FAQsPage />}

        {/* POLICY VIEWS */}
        {currentPage === "return_policy" && <ReturnPolicyPage />}
        {currentPage === "warranty_policy" && <WarrantyPolicyPage />}
        {currentPage === "privacy_policy" && <PrivacyPolicyPage />}
        {currentPage === "shipping_policy" && <ShippingPolicyPage />}

        {/* VIEW: ORDER TRACKING PAGE */}
        {currentPage === "tracking" && (
          <TrackingPage
            initialOrderId={trackingOrderId}
            initialPhone={trackingPhone}
            showToast={showToast}
            onNavigate={(page) => {
              setCurrentPage(page);
              if (page !== "tracking") {
                setTrackingOrderId("");
                setTrackingPhone("");
              }
            }}
          />
        )}

        {/* VIEW 4: WISHLIST / FAVORITE DIRECTORY */}
        {currentPage === "wishlist" && (
          <WishlistPage
            products={products}
            wishlist={wishlist}
            onOpenQuickView={openQuickView}
            onRemoveFromWishlist={(id) =>
              setWishlist(wishlist.filter((w) => w !== id))
            }
            onNavigate={setCurrentPage}
            showToast={showToast}
          />
        )}
        {/* VIEW 5: CART & SIMULATED CHECKOUT */}
        {currentPage === "cart" && (
          <CartPage
            cart={cart}
            selectedCartItemIds={selectedCartItemIds}
            selectedCartItems={selectedCartItems}
            totalCalculated={totalCalculated}
            appliedDiscount={appliedDiscount}
            promoCode={promoCode}
            onSetPromoCode={setPromoCode}
            onApplyPromo={handleApplyPromo}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onSetSelectedCartItemIds={setSelectedCartItemIds}
            onNavigate={setCurrentPage}
            showToast={showToast}
          />
        )}
        {/* VIEW 5.2: DETAILED INTERACTIVE CHECKOUT STAGES */}
        {currentPage === "checkout" && (
          <CheckoutPage
            selectedCartItems={selectedCartItems}
            checkoutName={checkoutName}
            checkoutPhone={checkoutPhone}
            checkoutAddress={checkoutAddress}
            checkoutEmail={checkoutEmail}
            orderNote={orderNote}
            checkoutPayment={checkoutPayment}
            shippingMethod={shippingMethod}
            totalCalculated={totalCalculated}
            appliedDiscount={appliedDiscount}
            onSetCheckoutName={setCheckoutName}
            onSetCheckoutPhone={setCheckoutPhone}
            onSetCheckoutAddress={setCheckoutAddress}
            onSetCheckoutEmail={setCheckoutEmail}
            onSetOrderNote={setOrderNote}
            onSetCheckoutPayment={setCheckoutPayment}
            onSetShippingMethod={setShippingMethod}
            onPlaceOrder={handlePlaceOrder}
            onNavigate={setCurrentPage}
            showRegisterSuggestion={showRegisterSuggestion}
          />
        )}
        {/* VIEW 5.2.5: PAYMENT - Bank Transfer (QR) */}
        {currentPage === "payment" && (
          <PaymentPage
            pendingOrderData={pendingOrderData}
            onComplete={(newOrder) => {
              setLastPlacedOrder(newOrder);
              if (isLoggedIn && userProfile) {
                setUserProfile(prev => ({
                  ...prev,
                  orders: [newOrder, ...(prev.orders || [])]
                }));
              }
              const remainingCartItems = cart.filter(
                (item) => !selectedCartItemIds.includes(item.id),
              );
              setCart(remainingCartItems);
              setSelectedCartItemIds([]);
              setAppliedDiscount(null);
              showToast("Hoàn tất thanh toán! ");
              setCurrentPage("orderSuccess");
            }}
            onCancel={() => setCurrentPage("checkout")}
          />
        )}

        {/* VIEW 5.2.6: E-WALLET PAYMENT (MoMo/ZaloPay/ShopeePay) */}
        {currentPage === "ewallet_payment" && (
          <EWalletPaymentPage
            pendingOrderData={pendingOrderData}
            onComplete={async () => {
              try {
                const response = await apiCreateOrder(pendingOrderData);
                const orderId = response.orderId || `CR-${Math.floor(1000 + Math.random() * 9000)}`;
                const newOrder = {
                  id: orderId,
                  date: new Date().toISOString().split("T")[0],
                  items: pendingOrderData.items,
                  total: pendingOrderData.total,
                  status: "pending",
                  statusText: "Đã thanh toán (Ví điện tử)",
                  address: pendingOrderData.address,
                  phone: pendingOrderData.phone,
                };
                setLastPlacedOrder(newOrder);
                if (isLoggedIn && userProfile) {
                  setUserProfile(prev => ({
                    ...prev,
                    orders: [newOrder, ...(prev.orders || [])]
                  }));
                }
                const remainingCartItems = cart.filter(
                  (item) => !selectedCartItemIds.includes(item.id),
                );
                setCart(remainingCartItems);
                setSelectedCartItemIds([]);
                setAppliedDiscount(null);
                showToast("Thanh toán ví điện tử thành công! ");
                setCurrentPage("orderSuccess");
              } catch (err) {
                showToast(err.message || "Thanh toán thất bại", "error");
                setCurrentPage("checkout");
              }
            }}
            onCancel={() => setCurrentPage("checkout")}
          />
        )}

        {/* VIEW 5.2.7: VISA/CARD PAYMENT */}
        {currentPage === "visa_payment" && (
          <VisaPaymentPage
            pendingOrderData={pendingOrderData}
            onComplete={async () => {
              try {
                const response = await apiCreateOrder(pendingOrderData);
                const orderId = response.orderId || `CR-${Math.floor(1000 + Math.random() * 9000)}`;
                const newOrder = {
                  id: orderId,
                  date: new Date().toISOString().split("T")[0],
                  items: pendingOrderData.items,
                  total: pendingOrderData.total,
                  status: "pending",
                  statusText: "Đã thanh toán (Thẻ quốc tế)",
                  address: pendingOrderData.address,
                  phone: pendingOrderData.phone,
                };
                setLastPlacedOrder(newOrder);
                if (isLoggedIn && userProfile) {
                  setUserProfile(prev => ({
                    ...prev,
                    orders: [newOrder, ...(prev.orders || [])]
                  }));
                }
                const remainingCartItems = cart.filter(
                  (item) => !selectedCartItemIds.includes(item.id),
                );
                setCart(remainingCartItems);
                setSelectedCartItemIds([]);
                setAppliedDiscount(null);
                showToast("Thanh toán thẻ thành công! ");
                setCurrentPage("orderSuccess");
              } catch (err) {
                showToast(err.message || "Thanh toán thất bại", "error");
                setCurrentPage("checkout");
              }
            }}
            onCancel={() => setCurrentPage("checkout")}
          />
        )}

        {/* VIEW 5.3: RECEIPT SUCCESS SCREEN */}
        {currentPage === "orderSuccess" && (
          <OrderSuccessPage
            lastPlacedOrder={lastPlacedOrder}
            showRegisterSuggestion={showRegisterSuggestion}
            onNavigate={setCurrentPage}
            onCloseRegisterSuggestion={() => setShowRegisterSuggestion(false)}
            onRegisterSubmit={handleRegisterSubmit}
            regName={regName}
            regEmail={regEmail}
            regPhone={regPhone}
            regAddress={regAddress}
            regPassword={regPassword}
            regConfirmPassword={regConfirmPassword}
            onSetRegName={setRegName}
            onSetRegEmail={setRegEmail}
            onSetRegPhone={setRegPhone}
            onSetRegAddress={setRegAddress}
            onSetRegPassword={setRegPassword}
            onSetRegConfirmPassword={setRegConfirmPassword}
          />
        )}

        {/* VIEW 6: ACCOUNT & ORDER DIRECTORY */}
        {currentPage === "account" && (
          <AccountPage
            setUserProfile={setUserProfile}
            userProfile={userProfile}
            selectedOrderTab={selectedOrderTab}
            filteredOrders={filteredOrders}
            activeDropdownId={activeDropdownId}
            accPassword={accPassword}
            accConfirmPassword={accConfirmPassword}
            onSetSelectedOrderTab={setSelectedOrderTab}
            onSetActiveDropdownId={setActiveDropdownId}
            onSetAccPassword={setAccPassword}
            onSetAccConfirmPassword={setAccConfirmPassword}
            onUpdateProfile={handleUpdateProfile}
            onLogout={() => {
              setIsLoggedIn(false);
              setUserProfile(GUEST_USER);
              safeLocalStorage.setItem("cheri_is_logged_in", "false");
              safeLocalStorage.removeItem("cheri_user");
              const guestCart = safeLocalStorage.getItem("cheri_cart_guest");
              setCart(guestCart ? JSON.parse(guestCart) : []);
              showToast("Đăng xuất thành công", "info");
              setCurrentPage("home");
            }}
            onNavigate={setCurrentPage}
            showToast={showToast}
            getMatchingProduct={getMatchingProduct}
            reviewedItems={reviewedItems}
            setReviewTarget={setReviewTarget}
            setReviewRating={setReviewRating}
            setReviewText={setReviewText}
            setSelectedReviewPreset={setSelectedReviewPreset}
            setReviewModalOpen={setReviewModalOpen}
            setTrackingOrderId={setTrackingOrderId}
            setTrackingPhone={setTrackingPhone}
            onReorderItem={handleReorderItem}
            getOrderCountByStatus={getOrderCountByStatus}
            getDeadlineDate={getDeadlineDate}
            getProductImage={getProductImage}
          />
        )}
        {/* VIEW 7: LOGIN RECRUITMENT PAGE */}
        {currentPage === "login" && (
          <LoginPage
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            showLoginPassword={showLoginPassword}
            isForgotPassword={isForgotPassword}
            forgotEmail={forgotEmail}
            onSetLoginEmail={setLoginEmail}
            onSetLoginPassword={setLoginPassword}
            onSetShowLoginPassword={setShowLoginPassword}
            onSetIsForgotPassword={setIsForgotPassword}
            onSetForgotEmail={setForgotEmail}
            onLoginSubmit={handleLoginSubmit}
            onNavigate={setCurrentPage}
            showToast={showToast}
          />
        )}
        {/* VIEW 8: REGISTER NEW ACCOUNT PAGE */}
        {currentPage === "register" && (
          <RegisterPage
            regName={regName}
            regPhone={regPhone}
            regEmail={regEmail}
            regAddress={regAddress}
            regPassword={regPassword}
            regConfirmPassword={regConfirmPassword}
            showRegPassword={showRegPassword}
            onSetRegName={setRegName}
            onSetRegPhone={setRegPhone}
            onSetRegEmail={setRegEmail}
            onSetRegAddress={setRegAddress}
            onSetRegPassword={setRegPassword}
            onSetRegConfirmPassword={setRegConfirmPassword}
            onSetShowRegPassword={setShowRegPassword}
            onRegisterSubmit={handleRegisterSubmit}
            onNavigate={setCurrentPage}
          />
        )}
      </main>

      {/* Global MODAL: Product Detail Quick-View */}
      <QuickViewModal
        quickViewProduct={quickViewProduct}
        previewImage={previewImage}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        selectedClassification={selectedClassification}
        wishlist={wishlist}
        onClose={() => setQuickViewProduct(null)}
        onSetPreviewImage={setPreviewImage}
        onSetSelectedColor={setSelectedColor}
        onSetSelectedSize={setSelectedSize}
        onSetSelectedClassification={setSelectedClassification}
        onToggleWishlist={handleToggleWishlist}
        onBuyNow={handleBuyNowFromModal}
        onAddToCart={handleAddFromModal}
        showToast={showToast}
      />

      {/* Global MODAL: Search input overlay */}
      <SearchModal
        isSearchOpen={isSearchOpen}
        headerSearchInput={headerSearchInput}
        visualSearchPreview={visualSearchPreview}
        isScanning={isScanning}
        scanStep={scanStep}
        scanProgress={scanProgress}
        matchedProduct={matchedProduct}
        similarityScore={similarityScore}
        scanCompleted={scanCompleted}
        onClose={() => setIsSearchOpen(false)}
        onSetHeaderSearchInput={setHeaderSearchInput}
        onTriggerHeaderSearch={handleTriggerHeaderSearch}
        onImageUploadSearch={handleImageUploadSearch}
        onPresetVisualSearch={handlePresetVisualSearch}
        onClearVisualSearch={handleClearVisualSearch}
        onQuickAddToCart={handleQuickAddToCart}
        onOpenQuickView={openQuickView}
        onNavigate={setCurrentPage}
        showToast={showToast}
      />

      {/* Global MODAL: Interactive product review evaluation */}
      <ReviewModal
        reviewModalOpen={reviewModalOpen}
        reviewTarget={reviewTarget}
        reviewRating={reviewRating}
        reviewText={reviewText}
        selectedReviewPreset={selectedReviewPreset}
        onClose={() => setReviewModalOpen(false)}
        onSetReviewRating={setReviewRating}
        onSetReviewText={setReviewText}
        onSetSelectedReviewPreset={setSelectedReviewPreset}
        getProductImage={getProductImage}
        onReviewSubmit={(e) => {
          if (e && e.preventDefault) e.preventDefault();
          const parts = [];
          if (selectedReviewPreset) parts.push(selectedReviewPreset);
          if (reviewText.trim()) parts.push(reviewText.trim());
          const customComment =
            parts.join(" - ") || "Sản phẩm tuyệt hảo tinh tế!";
          showToast("Cảm ơn bạn đã đánh giá! ", "success");
          setReviewModalOpen(false);
          const currentReviewed = JSON.parse(
            safeLocalStorage.getItem("cheri_reviewed_items") || "{}",
          );
          if (reviewTarget) {
            const itemKey = reviewTarget.isOrderReview
              ? reviewTarget.orderId
              : `${reviewTarget.orderId}_${reviewTarget.productId}`;
            currentReviewed[itemKey] = {
              rating: reviewRating,
              text: customComment,
              date: new Date().toLocaleDateString("vi-VN"),
            };
            safeLocalStorage.setItem(
              "cheri_reviewed_items",
              JSON.stringify(currentReviewed),
            );
            setReviewedItems(currentReviewed);
          }
        }}
      />

      {/* Boutique Chatbox Trực Tuyến */}
      <Chatbox />

      {/* Footer component matches screenshot */}
      <Footer
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
