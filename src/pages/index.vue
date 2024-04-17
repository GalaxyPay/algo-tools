<template>
  <div>
    <v-container>
      <v-list lines="two">
        <v-list-item
          v-for="tool in tools"
          :key="tool.title"
          :to="tool.path"
          :title="tool.title"
          :subtitle="tool.subtitle"
        >
          <template #prepend>
            <v-icon color="vuet">{{ tool.icon }}</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-container>
    <v-container>
      <v-list lines="two">
        <v-list-item
          title="Donate"
          subtitle="If you found this site helpful, please consider a donation to help out the developer. Thanks!"
          @click="clickDonate()"
        >
          <template #prepend>
            <v-icon class="mb-1" color="vuet">
              <algo-icon color="currentColor" class="ma-1" />
            </v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { tools } from "@/data";
import { useWallet } from "@txnlab/use-wallet-vue";
const store = useAppStore();
const { activeAccount } = useWallet();

function clickDonate() {
  if (activeAccount.value) store.showDonate = true;
  else store.connectMenu = true;
}
</script>
