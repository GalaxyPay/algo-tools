/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "vue-router/auto-routes";
import { useWallet } from "@txnlab/use-wallet-vue";
import { toast } from "vue-sonner";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  linkActiveClass: "bg-accent",
});

router.beforeEach(async (to: any, _from: any, next: any) => {
  const store = useAppStore();
  const { activeAddress } = useWallet();
  // redirect to root if not connected
  if (!activeAddress.value && to.path != "/") {
    await store.getCache();
    if (!activeAddress.value && !["/gov", "/vanity"].includes(to.name)) {
      toast.warning("Connect your wallet first");
      return next({ path: "/" });
    }
  }
  next();
});

export default router;
