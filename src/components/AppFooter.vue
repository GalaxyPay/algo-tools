<template>
  <v-footer app>
    <v-col class="text-center pa-0" style="color: #9aa0a5; font-size: 9px">
      &copy; {{ new Date().getFullYear() }} AlgoTools - Version
      {{ appVersion }}
    </v-col>
    <span
      v-show="store.network.networkId != 'mainnet'"
      class="ma-n12"
      style="color: #ef6c00; font-size: 11px"
    >
      {{ store.network.networkId?.toUpperCase() }}
    </span>
  </v-footer>
</template>

<script lang="ts" setup>
const store = useAppStore();
const appVersion = __APP_VERSION__;
</script>
