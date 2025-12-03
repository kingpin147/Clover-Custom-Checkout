import { Permissions, webMethod } from "wix-web-module";
import { currentCart } from "wix-ecom-backend";
import { checkout } from "wix-ecom-backend";

export const myCreateCheckoutFromCurrentCartFunction = webMethod(
  Permissions.Anyone,
  async (checkoutId) => {
    try {

      
      console.log("Success! Checkout created, checkoutId:", checkoutId);
      return checkoutId;
    } catch (error) {
      console.error(error);
      // Handle the error
    }
  },
);

export const myGetCurrentCartFunction = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const myCurrentCart = await currentCart.getCurrentCart();
      console.log("Success! Retrieved current cart:", myCurrentCart);
      return myCurrentCart;
    } catch (error) {
      console.error(error);
      // Handle the error
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
      console.error(error);
      // Handle the error
    }
  },
);