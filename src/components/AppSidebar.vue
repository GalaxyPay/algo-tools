<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import { networks, tools } from "@/data";
import { NetworkId, useNetwork } from "@txnlab/use-wallet-vue";
import { set } from "idb-keyval";

const router = useRouter();
const store = useAppStore();
const { activeNetwork, setActiveNetwork } = useNetwork();
const appVersion = __APP_VERSION__;

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});

async function switchNetwork(val: NetworkId) {
  const network = networks.find((n) => n.networkId === val);
  if (!network) throw Error("Invalid Network");
  console.log(network);
  await setActiveNetwork(val);
  await set("network", network);
  await store.getCache();
  store.refresh++;
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" @click="router.push('/')" tooltip="Home">
            <img
              src="/favicon.ico"
              class="flex aspect-square size-7 mx-0.5 items-center justify-center"
            />
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">AlgoTools</span>
              <span class="truncate text-xs">{{ store.network?.name }}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Tools</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem v-for="item in tools()" :key="item.title">
            <SidebarMenuButton size="lg" as-child :tooltip="item.title">
              <RouterLink :to="item.path">
                <component :is="item.icon" v-if="item.icon" class="mx-2" />
                {{ item.title }}
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              as-child
              tooltip="Donate"
              @click="store.showDonate = true"
            >
              <div class="flex items-center gap-2 cursor-pointer">
                <AlgoSymbol color="currentColor" :width="16" class="mx-2" />
                Donate
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup class="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Network</SidebarGroupLabel>
        <div class="px-4 pt-2">
          <Select
            :model-value="activeNetwork"
            @update:model-value="(val) => switchNetwork(val as NetworkId)"
          >
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  v-for="network in networks"
                  :key="network.name"
                  :value="network.networkId"
                >
                  {{ network.name }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div class="pt-2 text-center text-muted-foreground text-tiny">
          &copy; {{ new Date().getFullYear() }} AlgoTools - Version
          {{ appVersion }}
        </div>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <NavWallet />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
  <DonateDialog />
</template>
