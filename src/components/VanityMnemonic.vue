<template>
  <v-dialog v-model="showMnemonic" max-width="800" persistent>
    <v-card>
      <v-card-title>Your Vanity Mnemonic</v-card-title>
      <v-card-text>{{ props.mnemonic }}</v-card-text>
      <v-card-actions>
        <span>
          <v-btn
            variant="plain"
            color="currentColor"
            icon="mdi-content-copy"
            @click="copyToClipboard()"
          />
          <v-tooltip activator="parent" text="Copy to clipboard" />
        </span>
        <v-spacer />
        <v-btn text="Close" color="grey" @click="close()" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  mnemonic: { type: String, required: true },
});
const emit = defineEmits(["close"]);

const store = useAppStore();

const showMnemonic = computed({
  get() {
    return props.visible;
  },
  set(value) {
    if (!value) {
      emit("close");
      store.refresh++;
    }
  },
});

function copyToClipboard() {
  navigator.clipboard.writeText(props.mnemonic);
}

function close() {
  if (confirm("Did you save your mnemonic? You will need it!"))
    showMnemonic.value = false;
}
</script>
