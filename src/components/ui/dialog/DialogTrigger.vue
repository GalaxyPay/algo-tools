<script setup lang="ts">
import { DialogTrigger, type DialogTriggerProps } from "reka-ui";

const props = defineProps<DialogTriggerProps>();
</script>

<template>
  <DialogTrigger
    data-slot="dialog-trigger"
    v-bind="props"
    :as="as"
    :as-child="asChild"
  >
    <slot />
  </DialogTrigger>
</template>
