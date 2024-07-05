<template>
  <v-container v-if="loading" class="text-center mt-16">
    <v-progress-circular :size="120" color="primary" indeterminate />
  </v-container>
  <v-container v-else>
    <v-row v-if="store.network.name !== 'MainNet'">
      <v-col class="text-center font-italic py-12">
        This feature is only available on MainNet
      </v-col>
    </v-row>
    <template v-else>
      <template v-if="eligible?.length">
        <v-row>
          <v-col class="text-center pt-8">
            You are eligible for the following Lute badges:
          </v-col>
        </v-row>
        <v-row>
          <v-col v-for="badge in eligible" :key="Number(badge.index)" cols="12">
            <badge-card :badge="badge" @claimed="() => {}" />
          </v-col>
        </v-row>
      </template>
      <v-row v-else>
        <v-col class="text-center font-italic py-12">
          You are not currently eligible for any Lute badges
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
import { Badge } from "@/types";
import { getBadges } from "@/utils/badges";

const store = useAppStore();
const badges = ref<Badge[]>([]);
const loading = ref(false);

onMounted(async () => {
  waitGetBadges();
});

async function waitGetBadges() {
  if (store.network.name === "MainNet") {
    if (store.loading) {
      setTimeout(waitGetBadges, 50);
      return;
    }
    loading.value = true;
    badges.value = await getBadges();
    loading.value = false;
  }
}

const eligible = computed(() => {
  if (!store.account) return [];
  return badges.value.filter(
    (b) =>
      b.addrs.includes(store.account!.address) &&
      !store.account!.assets?.some((a) => a.amount && a.assetId === b.index)
  );
});

watch(
  () => store.refresh,
  () => {
    waitGetBadges();
  }
);
</script>
