<template>
  <router-view />
  <v-overlay v-model="store.overlay" persistent />
  <DonateDialog />
  <Snackbar />
</template>

<script lang="ts" setup>
const store = useAppStore();
</script>
