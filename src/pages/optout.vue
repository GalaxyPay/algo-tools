<template>
  <v-container v-if="store.account" class="pb-0">
    <v-row>
      <v-col cols="12" sm="6" class="pb-0">
        <v-card>
          <v-container class="pt-1 pb-0 pl-4 text-button">
            Balance
          </v-container>
          <v-card-text class="pt-1 pb-3">
            <AlgoIcon color="currentColor" :width="13" class="mr-1" />
            {{ Number(store.account.amount) / 10 ** 6 }}
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card>
          <v-container class="pt-1 pb-0 pl-4 text-button">
            Min Balance
          </v-container>
          <v-card-text class="pt-1 pb-3">
            <AlgoIcon color="currentColor" :width="13" class="mr-1" />
            {{ Number(store.account.minBalance) / 10 ** 6 }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-container>
    <v-card>
      <v-tabs v-model="tab" color="primary">
        <v-tab v-for="t in tabs" :key="t.value" :value="t.value">
          {{ t.text }}
        </v-tab>
      </v-tabs>
      <v-window v-model="tab" v-if="store.account">
        <v-window-item value="assets">
          <v-card>
            <v-container>
              <v-row>
                <v-col
                  v-for="asset in store.account.assets"
                  :key="Number(asset.assetId)"
                  cols="12"
                  md="6"
                  lg="4"
                >
                  <AssetCard :asset="asset" />
                </v-col>
                <v-col cols="12" md="6" lg="4">
                  <AssetCard :asset="algo" />
                </v-col>
              </v-row>
            </v-container>
          </v-card>
        </v-window-item>
        <v-window-item value="apps">
          <v-card>
            <v-container>
              <v-row>
                <v-col
                  v-for="app in apps"
                  :key="Number(app.id)"
                  cols="12"
                  md="6"
                  lg="4"
                >
                  <AppCard :app="app" />
                </v-col>
              </v-row>
            </v-container>
          </v-card>
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import { modelsv2 } from "algosdk";

const store = useAppStore();
const tab = ref();

const algo = computed(() => ({
  amount: Number(store.account?.amount) || 0,
  assetId: 0,
}));

const tabs = computed(() => {
  return [
    {
      value: "assets",
      text: `Assets (${(store.account?.assets?.length || 0) + 1})`,
    },
    {
      value: "apps",
      text: `Apps (${
        (store.account?.appsLocalState?.length || 0) +
        (store.account?.createdApps?.length || 0)
      })`,
    },
  ];
});

const apps = computed(() =>
  (
    (store.account?.appsLocalState || []) as (
      | modelsv2.ApplicationLocalState
      | modelsv2.Application
    )[]
  ).concat(store.account?.createdApps || [])
);
</script>
