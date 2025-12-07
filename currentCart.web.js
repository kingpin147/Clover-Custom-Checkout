import { Permissions, webMethod } from "wix-web-module";
import { currentCart } from "wix-ecom-backend";
import { auth } from "@wix/essentials";
import { checkout } from "@wix/ecom";
import wixData from "wix-data";

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

export const createMyCheckout = webMethod(
  Permissions.Anyone,
  async (options) => {
    try {
      // Validate required fields
      if (!options?.lineItems || options.lineItems.length === 0) {
        throw new Error("lineItems array is required and must not be empty");
      }
      if (!options?.channelType) {
        throw new Error("channelType is required");
      }

      // Auto-generate unique _id for each line item (critical!)
      const lineItems = options.lineItems.map((item, index) => ({
        ...item,
        _id: item._id || `item_${Date.now()}_${index}`,
      }));

      const checkoutOptions = {
        ...options,
        lineItems,
      };

      // Proper Elevation for createCheckout
      const elevatedCreateCheckout = auth.elevate(checkout.createCheckout);
      const newCheckout = await elevatedCreateCheckout(checkoutOptions);

      console.log("Checkout created successfully:", newCheckout._id);
      return newCheckout;

    } catch (error) {
      console.error("createMyCheckout failed:", error);
      await logErrorToDB("createMyCheckout", error);
      throw error;
    }
  }
);

export const updateMyCheckout = webMethod(
  Permissions.Anyone,
  async (_id, checkoutInfo, options) => {
    try {
      // Proper Elevation for updateCheckout
      const elevatedUpdateCheckout = auth.elevate(checkout.updateCheckout);
      const updatedCheckout = await elevatedUpdateCheckout(_id, checkoutInfo, options);

      console.log("Success! Updated checkout:", updatedCheckout._id);
      return updatedCheckout;
    } catch (error) {
      console.error("updateMyCheckout failed:", error);
      await logErrorToDB("updateMyCheckout", error);
      throw error;
    }
  }
);

export const myGetCurrentCartFunction = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const myCurrentCart = await currentCart.getCurrentCart();
      console.log("Success! Retrieved current cart:", myCurrentCart);
      return myCurrentCart;
    } catch (error) {
      console.error("myGetCurrentCartFunction failed:", error);
      await logErrorToDB("myGetCurrentCartFunction", error);
      throw error;
    }
  },
);

export const myGetCheckoutFunction = webMethod(
  Permissions.Anyone,
  async (checkoutId) => {
    try {
      const retrievedCheckout = await checkout.getCheckout(checkoutId);
      console.log("Success! Retrieved checkout:", retrievedCheckout);
      return retrievedCheckout;
    } catch (error) {
      console.error("myGetCheckoutFunction failed:", error);
      await logErrorToDB("myGetCheckoutFunction", error);
      throw error;
    }
  },
);