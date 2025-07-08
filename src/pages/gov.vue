<template>
  <v-container>
    <v-card :title="session?.title">
      <v-card-text>
        {{
          Math.round(
            (session?.total_committed_stake_of_voted_governors /
              session?.total_committed_stake) *
              100
          )
        }}% Voted
      </v-card-text>
    </v-card>
  </v-container>
  <v-container>
    <v-data-table
      :items="items"
      :headers="headers"
      density="comfortable"
      :loading="loading"
      items-per-page="-1"
    >
      <template #[`item.name`]="{ item }: any">
        <div :class="item.rank < 12 ? 'text-vuet' : ''">
          {{ item.name }}
        </div>
      </template>
      <template #[`item.score`]="{ value }">
        <div>
          {{ (value / 10 ** 12).toLocaleString() }} M
          <v-tooltip
            activator="parent"
            location="top"
            :text="
              (value / 10 ** 6).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })
            "
          />
        </div>
      </template>
      <template #bottom />
    </v-data-table>
  </v-container>
</template>

<script setup lang="ts">
import { fetchAsync } from "@/utils";
const BASE_URL = "https://governance.algorand.foundation/api";
const loading = ref(true);
const session = ref();
const headers: any[] = [
  { title: "Rank", key: "rank" },
  { title: "Name", key: "name" },
  { title: "Score", key: "score" },
];

const items = ref();

onBeforeMount(async () => {
  session.value = await fetchAsync(
    `${BASE_URL}/voting-sessions/period-15-voting-session-1`
  );

  const temp: any[] = session.value.topics.map((t: any) => ({
    name: t.title,
    score: Math.round(
      session.value.total_committed_stake_of_voted_governors *
        ((t.topic_options[0].vote_percentage -
          t.topic_options[1].vote_percentage) /
          100)
    ),
  }));
  temp.sort((a, b) => b.score - a.score);
  items.value = temp.map((i, idx) => ({ rank: idx + 1, ...i }));
  loading.value = false;
});
</script>
