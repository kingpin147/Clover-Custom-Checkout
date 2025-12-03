// backend/order.jsw

import { webMethod, Permissions } from 'wix-web-module';
import { auth } from "@wix/essentials";
import { orders, orderTransactions } from "@wix/ecom";
import wixData from 'wix-data';

/**
 * Create an order using elevated permissions
 */
export const createMyOrder = webMethod(
  Permissions.Anyone,
  async (order, options) => {
    try {
      const elevatedCreateOrder = auth.elevate(orders.createOrder);
      const result = await elevatedCreateOrder(order, options);
      return result;
    } catch (error) {
      console.error("❌ Order creation failed:", error);
      await logErrorToDB("createMyOrder", error);
      throw error;
    }
  }
);

/**
 * Update order payment status using elevated permissions
 */
export const updateMyOrderPaymentStatus = webMethod(
  Permissions.Anyone,
  async (identifiers) => {
    try {
      const elevatedUpdateStatus = auth.elevate(orderTransactions.updatePaymentStatus);
      const result = await elevatedUpdateStatus(identifiers, {
        status: identifiers.status
      });
      return result;
    } catch (error) {
      console.error("❌ Failed to update order payment status:", error);
      await logErrorToDB("updateMyOrderPaymentStatus", error);
      throw error;
    }
  }
);

/**
 * Log any error to a collection named ErrorLogs
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
