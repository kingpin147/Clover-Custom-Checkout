import { Permissions, webMethod } from 'wix-web-module';
import wixPayBackend from 'wix-pay-backend';

// Create a payment using dynamic product info passed from the frontend
export const createMyPayment = webMethod(Permissions.Anyone, (paymentData) => {
    // Extract the items and total price from the data passed from the frontend
    const { items, totalPrice } = paymentData;

    console.log("Received Payment Data:", paymentData);

    // Map the items to the format that wixPayBackend.createPayment expects
    const paymentItems = items.map(item => ({
        name: item.name,
        price: item.price,
    }));

    // Create the payment with the provided details
    return wixPayBackend.createPayment({
        items: paymentItems,
        amount: totalPrice,  // Total price including shipping
        currency: "USD", // Set currency, adjust if needed
    })
    .then(payment => {
        console.log("Payment Created Successfully:", payment);
        return payment;  // You can send the payment info back to the frontend or redirect to the payment page
    })
    .catch(error => {
        console.error("Error Creating Payment:", error);
        throw new Error("Payment creation failed");
    });
});


