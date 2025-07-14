<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import { tools } from "@/data";

const router = useRouter();

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});
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
              <!-- <span class="truncate text-xs">{{ env }}</span> -->
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
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
            <DonateDialog>
              <SidebarMenuButton size="lg" as-child tooltip="Donate">
                <div class="flex items-center gap-2 cursor-pointer">
                  <AlgoSymbol color="currentColor" :width="16" class="mx-2" />
                  Donate
                </div>
              </SidebarMenuButton>
            </DonateDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <NavWallet />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
