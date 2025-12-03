//body start code
<script>
// Redirect Wix Side-Cart "Checkout" button → /checkout-1
// Works with your exact button (centered text inside <span>)
document.addEventListener('DOMContentLoaded', () => {

  function redirectSideCartCheckout() {
    // Target the exact Checkout button in the side cart
    const buttons = document.querySelectorAll('button[data-hook="CheckoutButtonDataHook.button"]');
    
    buttons.forEach(btn => {
      // Skip if already modified
      if (btn.dataset.redirected === 'true') return;

      // Mark as processed
      btn.dataset.redirected = 'true';

      // Remove any old listeners Wix added (critical!)
      const newBtn = btn.cloneNode(true); // clones with all classes, styles, spans
      btn.parentNode.replaceWith(newBtn); // replace old with clean clone

      // Re-select the new button after cloning
      const finalBtn = newBtn.parentNode.querySelector('button[data-hook="CheckoutButtonDataHook.button"]') || newBtn;

      // Optional: Change text (uncomment if you want)
      // finalBtn.querySelector('span')?.childNodes.forEach(node => {
      //   if (node.nodeType === 3) node.textContent = 'Proceed to Checkout';
      // });

      // MAIN: Click → go to your custom checkout
      finalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // blocks Wix's handler completely

        window.location.href = '/checkout-1';
      });

      // Ensure cursor is pointer
      finalBtn.style.cursor = 'pointer';
    });
  }

  // Run now
  redirectSideCartCheckout();

  // Run every time Wix updates the cart (they do this constantly)
  const observer = new MutationObserver(() => {
    redirectSideCartCheckout();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });

  // Extra safety net (in case observer misses something)
  setInterval(redirectSideCartCheckout, 1200);

  console.log("Side-cart Checkout button now redirects to /checkout-1");
});
</script>


//body start code
<script>
document.addEventListener('DOMContentLoaded', function () {
  function replaceCheckoutButton() {
    const buttons = document.querySelectorAll('button[data-hook="CheckoutButtonDataHook.button"]');
    buttons.forEach(originalBtn => {
      if (!originalBtn || originalBtn.dataset.replaced === 'true') return;

      // Clone the full button to preserve <span>, classes, and centered text
      const newBtn = originalBtn.cloneNode(true);

      // Remove any existing Wix click handlers
      const cleanBtn = newBtn.cloneNode(true);
      originalBtn.replaceWith(cleanBtn);

      // Re-select the clean button
      const finalBtn = document.querySelector('button[data-hook="CheckoutButtonDataHook.button"]') || cleanBtn;

      // Fallback centering styles (though cloning preserves originals)
      finalBtn.style.display = 'flex';
      finalBtn.style.justifyContent = 'center';
      finalBtn.style.alignItems = 'center';
      finalBtn.style.textAlign = 'center';

      // Copy other attributes (if needed, but clone already handles most)
      Array.from(originalBtn.attributes).forEach(attr => {
        if (!['class', 'type', 'data-replaced'].includes(attr.name)) {
          finalBtn.setAttribute(attr.name, attr.value);
        }
      });

      finalBtn.dataset.replaced = 'true';

      // Redirect to /checkout-1
      finalBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.location.href = '/checkout-1';
      });
    });
  }

  // MutationObserver to catch dynamic changes
  const observer = new MutationObserver(replaceCheckoutButton);
  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback interval to wait for initial button
  const interval = setInterval(() => {
    const btn = document.querySelector('button[data-hook="CheckoutButtonDataHook.button"]');
    if (btn) {
      replaceCheckoutButton();
      clearInterval(interval);
    }
  }, 300);
});
</script>




//body end code
<script>
document.addEventListener('DOMContentLoaded', function () {

  function replaceCheckoutButton() {

    const btn = document.querySelector(

      "button[data-wix-checkout-button='CheckoutButtonDataHook.button']"

    );

    if (!btn || btn.dataset.replaced === 'true') return;

    const newBtn = document.createElement('button');

    newBtn.textContent = 'Checkout';

    newBtn.className = btn.className;

    newBtn.setAttribute('type', 'button');

    // Style to center the text

    newBtn.style.display = 'flex';

    newBtn.style.justifyContent = 'center';

    newBtn.style.alignItems = 'center';

    newBtn.style.textAlign = 'center';

    // Copy other attributes

    Array.from(btn.attributes).forEach(attr => {

      if (!['class', 'type', 'data-replaced'].includes(attr.name)) {

        newBtn.setAttribute(attr.name, attr.value);

      }

    });

    newBtn.dataset.replaced = 'true';

    newBtn.addEventListener('click', function () {

      window.location.href = '/checkout-1';

    });

    btn.replaceWith(newBtn);

  }

  // MutationObserver to catch dynamic changes

  const observer = new MutationObserver(replaceCheckoutButton);

  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback interval to wait for initial button

  const interval = setInterval(() => {

    const btn = document.querySelector("button[data-wix-checkout-button='CheckoutButtonDataHook.button']");

    if (btn) {

      replaceCheckoutButton();

      clearInterval(interval);

    }

  }, 300);

});

</script>