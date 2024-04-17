<template>
  <v-app>
    <v-main>
      <router-view />
      <v-overlay v-model="store.overlay" persistent />
    </v-main>
    <DonateDialog />
    <Snackbar />
  </v-app>
</template>

<script lang="ts" setup>
const store = useAppStore();
</script>
