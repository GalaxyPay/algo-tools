<script lang="ts" setup>
import { tools } from "@/data";

const store = useAppStore();
</script>

<template>
  <div
    class="flex flex-col gap-3 p-4 pt-0 mx-auto lg:min-w-200 xl:min-w-250 2xl:min-w-300"
  >
    <RouterLink v-for="item in tools()" :key="item.title" :to="item.path">
      <Card class="bg-muted/50 hover:bg-accent">
        <div class="flex items-center px-6 gap-4">
          <component :is="item.icon" v-if="item.icon" class="text-vuet" />
          <div>
            <CardTitle>
              {{ item.title }}
            </CardTitle>
            <CardDescription>
              {{ item.subtitle }}
            </CardDescription>
          </div>
        </div>
      </Card>
    </RouterLink>
    <Card class="bg-muted/50 hover:bg-accent" @click="store.showDonate = true">
      <div class="flex items-center px-6 gap-4">
        <AlgoSymbol color="currentColor" :width="20" class="text-vuet mx-0.5" />
        <div>
          <CardTitle>Donate</CardTitle>
          <CardDescription>
            If you found this site helpful, please consider a donation to help
            out the developer. Thanks!
          </CardDescription>
        </div>
      </div>
    </Card>
  </div>
</template>
