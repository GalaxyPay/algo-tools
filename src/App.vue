<script setup lang="ts">
import { nfdReverseLookup } from "@/lib/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import axios from "axios";
import { Loader2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import "vue-sonner/style.css";

const store = useAppStore();
const router = useRouter();
const { algodClient, activeAddress, activeWallet } = useWallet();

async function refresh() {
  try {
    store.loading++;
    store.getCache();
    if (activeAddress.value) {
      store.account = await algodClient.value
        .accountInformation(activeAddress.value)
        .do();
    } else {
      store.account = undefined;
      if (!["/", "/vanity"].includes(router.currentRoute.value.path)) {
        router.push("/");
      }
    }

    const addrs = activeWallet.value?.accounts.map((a) => a.address);
    if (addrs?.length) {
      store.nfds = await nfdReverseLookup(addrs, store.network?.nfdUrl);
    }
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
  store.loading--;
}

onBeforeMount(async () => {
  store.loading++;
  store.tinyman = (
    await axios("https://asa-list.tinyman.org/assets.json")
  ).data;
  store.loading--;
});

watch(
  () => store.refresh,
  () => refresh(),
  { immediate: true }
);
</script>

<template>
  <div v-if="store.overlay" class="fixed inset-0 z-50 bg-black/80" />
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
      >
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
        </div>
        <div class="ml-auto flex items-center px-4 gap-4">
          <ModeSwitcher />
          <NavWallet />
        </div>
      </header>
      <div v-if="store.loading" class="flex justify-center">
        <Loader2 class="animate-spin" :size="50" />
      </div>
      <RouterView v-else />
    </SidebarInset>
  </SidebarProvider>
  <Sonner />
</template>
