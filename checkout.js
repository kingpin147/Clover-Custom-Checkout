import { myGetCurrentCartFunction, myGetCheckoutFunction } from 'backend/currentCart.web';
import { createMyOrder, updateMyOrderPaymentStatus } from 'backend/order.web';
import { createMyPayment } from 'backend/wixPay.web';
import wixPay from "wix-pay";
import wixData from "wix-data";
import { lookupInmateByDIN } from 'backend/DIM_API';
import wixEcomFrontend from "wix-ecom-frontend";

let items = [];
let country = null,
    city = null,
    subdivision = null,
    postalCode = null,
    addressLine = null;

$w.onReady(async () => {
    $w('#inmateFacility').collapse();
    $w('#inmateFacility').disable();
    $w('#orderSummary').collapse();
    // const checkoutId = await myCreateCheckoutFromCurrentCartFunction();
    // console.log(checkoutId);
    await loadCartAndBind();

    // Listen for cart changes (quantity, remove, address update, etc.)
    wixEcomFrontend.onCartChange(async () => {
        console.log("Cart changed — refreshing...");
        await loadCartAndBind();
    });
});

async function loadCartAndBind() {
    try {
        const cart = await myGetCurrentCartFunction();
        console.log("Current Cart:", cart);

        if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
            $w('#orderSummary').collapse();
            $w('#paymentButton').disable();
            return;
        }

        // Expand UI
        $w('#orderSummary').expand();
        $w('#paymentButton').enable();

        items = cart.lineItems;

        // === GET THE TRUTH: Checkout object (has correct shipping after address) ===
        let checkout;
        try {
            checkout = await myGetCheckoutFunction(cart.checkoutId);
            console.log("Checkout (with accurate shipping):", checkout);
        } catch (err) {
            console.warn("Could not fetch checkout, will use cart fallback", err);
            checkout = null;
        }

        // === Extract values — PRIORITY: checkout > cart ===
        const currency = cart.currency || "USD";
        const currencySymbol = cart.subtotal?.formattedAmount?.match(/^[^\d.,]+/)?.[0] || '$';

        // === Calculate correct totals using checkout priority ===
        const subtotalAmount = parseFloat(cart.subtotal?.amount || 0);

        let shippingCost = 0;
        let shippingTitle = "Standard Shipping";

        if (checkout?.shippingInfo?.selectedCarrierServiceOption?.cost?.price?.amount) {
            shippingCost = parseFloat(checkout.shippingInfo.selectedCarrierServiceOption.cost.price.amount);
            shippingTitle = checkout.shippingInfo.selectedCarrierServiceOption.title || shippingTitle;
        } else if (checkout?.priceSummary?.shipping?.amount) {
            shippingCost = parseFloat(checkout.priceSummary.shipping.amount);
        }

        // Use checkout total if available — this is the source of truth
        let grandTotal = subtotalAmount + shippingCost; // default fallback

        if (checkout?.priceSummary?.total?.amount) {
            grandTotal = parseFloat(checkout.priceSummary.total.amount);
        } else if (checkout?.payNow?.total?.amount) {
            grandTotal = parseFloat(checkout.payNow.total.amount);
        }
        $w('#subTotal').text = `${currencySymbol}${subtotalAmount.toFixed(2)}`;
        $w('#deliveryAmount').text = `${currencySymbol}${shippingCost.toFixed(2)} (${shippingTitle})`;
        $w('#grandTotal').text = `${currencySymbol}${grandTotal.toFixed(2)}`;

        // === Repeater: Show products ===
        const repeaterData = items.map(item => ({
            _id: item._id,
            productImage: item.media || item.image || "",
            productName: item.productName?.original || "Unknown Item",
            productQty: `Qty: ${item.quantity || 1}`,
            productPrice: item.price?.formattedConvertedAmount || item.price?.formattedAmount || "$0.00"
        }));

        $w('#productRepeater').data = repeaterData;
        $w('#productRepeater').onItemReady(($item, itemData) => {
            $item('#productImage').src = itemData.productImage;
            $item('#productName').text = itemData.productName;
            $item('#productQty').text = itemData.productQty;
            $item('#productPrice').text = itemData.productPrice;
        });

        // === PAYMENT BUTTON CLICK ===
       $w('#paymentButton').onClick(async () => {
    if (grandTotal <= 0) {
        console.log("Total is zero. Cannot proceed.");
        return;
    }

    if (!country || !postalCode) {
        console.log("Please complete shipping address.");
        return;
    }

    try {
        // 1. Get fresh data
        const latestCart = await myGetCurrentCartFunction();
        const latestCheckout = await myGetCheckoutFunction(latestCart.checkoutId);

        if (!latestCheckout?.priceSummary?.total?.amount) {
            throw new Error("Checkout not ready or missing price summary");
        }

        // 2. Final amounts (from checkout = source of truth)
        const finalShipping = latestCheckout.shippingInfo?.selectedCarrierServiceOption?.cost?.price?.amount
            ? parseFloat(latestCheckout.shippingInfo.selectedCarrierServiceOption.cost.price.amount)
            : parseFloat(latestCheckout.priceSummary.shipping?.amount || 0);

        const shippingTitle = latestCheckout.shippingInfo?.selectedCarrierServiceOption?.title || "Standard Shipping";
        const finalTotal = parseFloat(latestCheckout.priceSummary.total.amount);

        // 3. PAYMENT ITEMS — CORRECT (lineItemPrice.amount already includes quantity)
        const paymentItems = latestCart.lineItems.map(item => ({
            name: (item.productName?.original || "Item").substring(0, 100),
            price: Number(parseFloat(item.lineItemPrice?.amount || 0).toFixed(2))
        }));

        if (finalShipping > 0) {
            paymentItems.push({
                name: shippingTitle,
                price: Number(finalShipping.toFixed(2))
            });
        }

        const payment = await createMyPayment({
            items: paymentItems,
            totalPrice: Number(finalTotal.toFixed(2))
        });

        console.log("Payment created:", payment.id);

        // 4. BUILD ORDER — THIS IS THE FIX FOR TAX ERROR
        const order = {
            channelInfo: { type: "WEB" },
            currency: latestCart.currency,
            buyerInfo: {
                email: $w('#email').value?.trim(),
                firstName: $w('#firstName').value?.trim(),
                lastName: $w('#lastName').value?.trim(),
                phone: $w('#phoneNumber').value?.trim()
            },
            recipientInfo: {
                contactDetails: {
                    firstName: $w('#firstName').value?.trim(),
                    lastName: $w('#lastName').value?.trim(),
                    email: $w('#email').value?.trim(),
                    phone: $w('#phoneNumber').value?.trim()
                },
                address: {
                    country,
                    addressLine1: addressLine,
                    city,
                    subdivision,
                    postalCode
                }
            },
            shippingInfo: latestCheckout.shippingInfo,
            priceSummary: latestCheckout.priceSummary,

            // CRITICAL: Copy full line items from checkout (includes taxDetails!)
            lineItems: latestCheckout.lineItems.map(item => ({
                catalogReference: item.catalogReference,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                lineItemPrice: item.lineItemPrice,
                fullPrice: item.fullPrice,
                priceBeforeDiscounts: item.priceBeforeDiscounts,
                totalPriceBeforeTax: item.totalPriceBeforeTax,
                totalPriceAfterTax: item.totalPriceAfterTax,

                // THIS FIXES THE TAX ERROR
                taxDetails: item.taxDetails || { totalTax: { amount: "0" }, taxRate: "0" },
                // OR use taxInfo if your backend expects that instead:
                // taxInfo: { taxExempt: true }  // only if tax is truly exempt

                itemType: { preset: "PHYSICAL" },
                physicalProperties: item.physicalProperties
            }))
        };

        // 5. Create order
        const createdOrder = await createMyOrder(order, { includeChannelInfo: true });
        console.log("Order created successfully:", createdOrder._id);

        // 6. Start payment
        const paymentResult = await wixPay.startPayment(payment.id, {
            showThankYouPage: true
        });

        if (paymentResult.status === "Successful") {
            await updateMyOrderPaymentStatus({
                orderId: createdOrder._id,
                paymentId: payment.id,
                status: "APPROVED"
            });
            console.log("Payment successful!");
        } else {
            console.warn("Payment canceled/failed:", paymentResult.status);
        }

    } catch (err) {
        console.error("Payment/Order Error:", err);
        await logErrorToDB("paymentButton", err);

        // Show user-friendly error
        if ($w("#errorMessage")) {
            $w("#errorMessage").text = "Order failed. Please try again or contact support.";
            $w("#errorMessage").expand();
        }
    }

});
    } catch (err) {
        console.error("Failed to load cart:", err);
        await logErrorToDB("loadCartAndBind", err);
        $w('#orderSummary').collapse();
        $w('#paymentButton').disable();
    }
}

// === Inmate Search ===
$w('#search').onClick(async () => {
    const din = $w('#dinNumber').value?.trim();
    if (!din) return console.log("Enter DIN number");

    $w('#search').label = "Searching...";
    $w('#search').disable();

    try {
        const result = await lookupInmateByDIN(din);
        if (result.status == "RELEASED") {
            $w('#custody').expand();
            $w('#email').collapse();
            $w('#phoneNumber').collapse();
            $w('#paymentButton').collapse();
            $w('#firstName').collapse();
            $w('#lastName').collapse();
            $w('#inmateFacility').collapse();
            $w('#fullAddress').collapse();
            return;

        }
        $w('#custody').collapse();
        const firstName = result.inmateName?.split(' ')[0] || '';
        const lastName = result.inmateName?.split(' ').slice(1).join(' ') || '';
        const facilityName = result.facilityName || "Unknown Facility";
        addressLine = result.addressLine || result.facilityAddress;

        // Extract address parts
        country = "US";
        city = result.city;
        console.log(city);
        subdivision = result.subdivision;
        console.log(subdivision);
        postalCode = result.postalCode;
        console.log(postalCode);

        // Populate form
        $w('#firstName').value = firstName;
        $w('#lastName').value = `${lastName}, DIN #${result.din}`;
        $w('#inmateFacility').value = facilityName;
        $w('#fullAddress').value = addressLine;

        // Disable inmate fields
        ['#firstName', '#lastName', '#inmateFacility', '#fullAddress'].forEach(id => {
            $w(id).disable();
            $w(id).expand();
        });

        // Enable buyer fields
        $w('#email').enable();
        $w('#email').expand();
        $w('#phoneNumber').enable();
        $w('#phoneNumber').expand();
        $w('#paymentButton').expand();

        // Trigger cart refresh with shipping address (this enables shipping calculation)
        await loadCartAndBind();

    } catch (err) {
        console.error("Inmate lookup failed:", err);
        console.log("Inmate not found or server error.");
        $w('#custody').text= "Inmate not found or server error. Try again with correct DIN Number";
        $w('#custody').expand();
    } finally {
        $w('#search').label = "Search";
        $w('#search').enable();
    }
});

// Error logging
async function logErrorToDB(location, error) {
    try {
        await wixData.insert("ErrorLogs", {
            location,
            message: error.message || String(error),
            stack: error.stack,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Failed to log error", e);
    }
}