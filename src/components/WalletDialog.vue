<script setup lang="ts">
import { useWallet, type Wallet } from "@txnlab/use-wallet-vue";
import { X } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useAppStore();
const { wallets } = useWallet();

async function handleWalletClick(wallet: Wallet) {
  try {
    store.showConnect = false;
    await wallet.connect();
    store.refresh++;
  } catch (err: any) {
    console.error(`Error connecting to ${wallet.metadata.name}:`, err);
    toast.error(err.message, { duration: 7000 });
  }
}
</script>

<template>
  <Dialog :open="store.showConnect">
    <DialogContent class="w-80 [&>button]:hidden">
      <div
        class="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
        @click="store.showConnect = false"
      >
        <X :size="18" />
      </div>
      <DialogHeader>
        <DialogTitle>Connect a Wallet</DialogTitle>
        <DialogDescription>
          <button
            v-for="wallet in wallets"
            :key="wallet.id"
            @click="handleWalletClick(wallet)"
            class="my-3 flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left text-gray-800 transition-colors hover:bg-[#E9E9FD] dark:text-[#E9E9FD] dark:hover:bg-[#192A39]"
          >
            <div
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 dark:bg-transparent"
            >
              <img
                :src="wallet.metadata.icon"
                :alt="`${wallet.metadata.name} icon`"
                class="h-8 w-8 rounded-md object-contain"
              />
            </div>
            <span class="wallet-custom-font text-lg font-bold">
              {{ wallet.metadata.name }}
            </span>
          </button>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
</template>
