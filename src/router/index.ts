/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from "vue-router/auto";
import { setupLayouts } from "virtual:generated-layouts";
import { useWallet } from "@txnlab/use-wallet-vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  extendRoutes: setupLayouts,
});

router.beforeEach(async (to: any, _from: any, next: any) => {
  const store = useAppStore();
  const { activeAccount } = useWallet();
  // redirect to root if not connected
  if (!activeAccount.value && to.path != "/") {
    await store.getCache();
    if (!activeAccount.value && to.name != "/vanity") {
      store.connectMenu = true;
      return next({ path: "/" });
    }
  }
  next();
});

export default router;
