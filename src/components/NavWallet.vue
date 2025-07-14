<script setup lang="ts">
import { useSidebar } from "@/components/ui/sidebar";
import { bigintToString, formatAddr } from "@/lib/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import { ChevronsUpDown, Clipboard, LogOut } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useAppStore();
const { isMobile } = useSidebar();
const { activeAddress, activeWallet } = useWallet();

function handleCopyAddress() {
  if (activeAddress.value) {
    navigator.clipboard.writeText(activeAddress.value);
    toast.success("Copied");
  }
}
async function handleAccountChange(addr: string) {
  if (activeWallet.value) {
    activeWallet.value.setActiveAccount(addr);
  }
}
async function handleDisconnect() {
  if (activeWallet.value) {
    try {
      store.getCache();
      await activeWallet.value.disconnect();
    } catch (err: any) {
      console.error("Error disconnecting wallet:", err);
      toast.error(err.message, { duration: 7000 });
    }
  }
}

const activeAvatar = computed<string>(
  () => getAvatarUrl(activeAddress.value) || ""
);
const otherAccounts = computed(
  () =>
    activeWallet.value?.accounts.filter(
      (a) => a.address !== activeAddress.value
    ) || []
);

function getAvatarUrl(addr: string | null) {
  if (!addr) return undefined;
  const rawAvatarUrl =
    store.nfds[addr]?.properties?.userDefined?.avatar ||
    store.nfds[addr]?.properties?.verified?.avatar;
  if (!rawAvatarUrl) return undefined;
  if (!rawAvatarUrl.startsWith("ipfs://")) return rawAvatarUrl;
  const cid = rawAvatarUrl.replace("ipfs://", "");
  const nfdUrl = `https://images.nf.domains/ipfs/${cid}`;
  return nfdUrl;
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <WalletDialog v-if="!activeAddress" />
      <DropdownMenu v-else>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="size-8 rounded-lg">
              <AvatarImage :src="activeAvatar" />
              <AvatarFallback class="rounded-lg">
                {{ activeAddress.substring(0, 2) }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="font-medium">{{ formatAddr(activeAddress) }}</span>
              <span class="truncate text-xs">{{
                store.nfds[activeAddress]?.name
              }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel class="p-0 font-normal">
              <div class="mb-2 flex items-center gap-2 px-2 pt-2">
                <div class="size-6">
                  <img
                    :src="activeWallet?.metadata.icon"
                    :alt="`${activeWallet?.metadata.name} icon`"
                    class="max-h-full max-w-full"
                  />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{
                    `${activeWallet?.metadata.name} (${formatAddr(
                      activeAddress
                    )})`
                  }}
                </p>
              </div>
              <div class="flex items-center gap-1 px-1 py-1">
                <AlgoSymbol color="currentColor" :height="13" />
                {{
                  store.account?.amount != null
                    ? bigintToString(store.account?.amount, 6, false, 2)
                    : "-"
                }}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <template v-if="otherAccounts.length">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch To:</DropdownMenuLabel>
              <DropdownMenuItem
                v-for="acct in otherAccounts"
                :key="acct.address"
                @click="handleAccountChange(acct.address)"
              >
                <div class="flex items-center gap-2">
                  <img :src="getAvatarUrl(acct.address)" class="size-4" />
                  {{ formatAddr(acct.address) }}
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </template>
          <DropdownMenuItem @click="handleCopyAddress()">
            <Clipboard />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" @click="handleDisconnect()">
            <LogOut />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
