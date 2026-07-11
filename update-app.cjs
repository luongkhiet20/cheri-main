const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Add pendingOrderData state
code = code.replace(
  /const \[lastPlacedOrder, setLastPlacedOrder\] = useState\(null\);/,
  'const [lastPlacedOrder, setLastPlacedOrder] = useState(null);\n  const [pendingOrderData, setPendingOrderData] = useState(null);'
);

const searchBlock = `    const finalTotal = totalCalculated.final;

    try {
      const response = await apiCreateOrder({
        address: checkoutAddress,
        phone: checkoutPhone,
        items: orderItems
      });

      const orderId = response.orderId || \`CR-\${Math.floor(1000 + Math.random() * 9000)}\`;

      const newOrder = {
        id: orderId,
        date: new Date().toISOString().split("T")[0],
        items: orderItems,
        total: finalTotal,
        status: "pending",
        statusText: "Chờ thanh toán",
        address: checkoutAddress,
        phone: checkoutPhone,
      };

      setLastPlacedOrder(newOrder);

      // Xóa item đã mua khỏi giỏ
      const remainingCartItems = cart.filter(
        (item) => !selectedCartItemIds.includes(item.id),
      );
      setCart(remainingCartItems);
      setSelectedCartItemIds([]); // clear selection ids

      setAppliedDiscount(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast(\`Đã tạo đơn hàng thành công. Vui lòng thanh toán! ✨\`);
      
      // CHUYỂN SANG TRANG THANH TOÁN PAYMENT PAGE
      setCurrentPage("payment");

    } catch (err) {
      showToast(err.message || "Tạo đơn hàng thất bại", "error");
    }`;

const replaceBlock = `    const finalTotal = totalCalculated.final;

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

    if (checkoutPayment === 'bank_transfer' || checkoutPayment === 'e_wallet') {
      setPendingOrderData(orderPayload);
      setCurrentPage("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const response = await apiCreateOrder(orderPayload);
      const orderId = response.orderId || \`CR-\${Math.floor(1000 + Math.random() * 9000)}\`;

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

      // Xóa item đã mua khỏi giỏ
      const remainingCartItems = cart.filter(
        (item) => !selectedCartItemIds.includes(item.id),
      );
      setCart(remainingCartItems);
      setSelectedCartItemIds([]);

      setAppliedDiscount(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast(\`Đặt hàng thành công! ✨\`);
      
      setCurrentPage("orderSuccess");
    } catch (err) {
      showToast(err.message || "Tạo đơn hàng thất bại", "error");
    }`;

code = code.replace(searchBlock, replaceBlock);

// Update PaymentPage component call
code = code.replace(
  /<PaymentPage\s+orderId=\{lastPlacedOrder\?\.id\}\s+total=\{lastPlacedOrder\?\.total\}\s+onComplete=\{.*?\s+onCancel=\{.*?\s+\/>/s,
  `<PaymentPage
            pendingOrderData={pendingOrderData}
            onComplete={(newOrder) => {
              setLastPlacedOrder(newOrder);
              const remainingCartItems = cart.filter(
                (item) => !selectedCartItemIds.includes(item.id),
              );
              setCart(remainingCartItems);
              setSelectedCartItemIds([]);
              setAppliedDiscount(null);
              showToast("Hoàn tất thanh toán! ✨");
              setCurrentPage("orderSuccess");
            }}
            onCancel={() => setCurrentPage("checkout")}
          />`
);

fs.writeFileSync('src/App.jsx', code);
console.log('App.jsx updated');
