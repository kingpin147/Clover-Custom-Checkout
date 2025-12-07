import { Permissions, webMethod } from 'wix-web-module';
import wixPayBackend from 'wix-pay-backend';
import wixData from 'wix-data';

/**
 * Log errors to ErrorLogs database
 */
async function logErrorToDB(location, error) {
    try {
        await wixData.insert("ErrorLogs", {
            location,
            message: error?.message || String(error),
            stack: error?.stack || null,
            timestamp: new Date()
        });
    } catch (loggingError) {
        console.error("⚠️ Failed to log error to DB:", loggingError);
    }
}

// Create a payment using dynamic product info passed from the frontend
export const createMyPayment = webMethod(Permissions.Anyone, async (paymentData) => {
    try {
        // Extract the items and total price from the data passed from the frontend
        const { items, totalPrice } = paymentData;

        console.log("Received Payment Data:", paymentData);

        // Map the items to the format that wixPayBackend.createPayment expects
        const paymentItems = items.map(item => ({
            name: item.name,
            price: item.price,
        }));

        // Create the payment with the provided details
        const payment = await wixPayBackend.createPayment({
            items: paymentItems,
            amount: totalPrice,  // Total price including shipping
            currency: "USD", // Set currency, adjust if needed
        });

        console.log("Payment Created Successfully:", payment);
        return payment;

    } catch (error) {
        console.error("Error Creating Payment:", error);
        await logErrorToDB("createMyPayment", error);
        throw new Error("Payment creation failed");
    }
});


