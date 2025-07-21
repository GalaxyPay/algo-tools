<script lang="ts" setup>
import { modelsv2 } from "algosdk";

const store = useAppStore();

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

<template>
  <div v-if="store.account" class="flex flex-1 flex-col gap-4 p-4 pt-0">
    <div class="grid auto-rows-min gap-4 md:grid-cols-2">
      <Card class="bg-muted/50">
        <CardHeader>
          <CardTitle>Balance</CardTitle>
          <CardDescription class="flex gap-1.5">
            <AlgoSymbol color="currentColor" :width="13" />
            {{ Number(store.account.amount) / 10 ** 6 }}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card class="bg-muted/50">
        <CardHeader>
          <CardTitle>Min Balance</CardTitle>
          <CardDescription class="flex gap-1.5">
            <AlgoSymbol color="currentColor" :width="13" />
            {{ Number(store.account.minBalance) / 10 ** 6 }}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
    <Card class="bg-muted/50">
      <CardHeader>
        <Tabs default-value="assets">
          <TabsList>
            <TabsTrigger
              v-for="tab in tabs"
              :key="tab.value"
              :value="tab.value"
            >
              {{ tab.text }}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="assets" as-child>
            <div
              class="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4"
            >
              <AssetCard
                v-for="asset in store.account.assets"
                :key="Number(asset.assetId)"
                :asset="asset"
              />
              <AssetCard :asset="algo" />
            </div>
          </TabsContent>
          <TabsContent value="apps">
            <div class="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              <AppCard v-for="app in apps" :key="Number(app.id)" :app="app" />
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  </div>
</template>
