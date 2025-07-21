<script lang="ts" setup>
import { Clipboard, X } from "lucide-vue-next";
import { toast } from "vue-sonner";

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
  toast.success("Copied");
}

function close() {
  if (confirm("Did you save your mnemonic? You will need it!"))
    showMnemonic.value = false;
}
</script>

<template>
  <Dialog :open="showMnemonic">
    <DialogContent class="[&>button]:hidden">
      <div
        class="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
        @click="close()"
      >
        <X :size="18" />
      </div>
      <DialogHeader>
        <DialogTitle>Your Vanity Mnemonic</DialogTitle>
        <DialogDescription> Save this somewhere secure </DialogDescription>
      </DialogHeader>
      {{ props.mnemonic }}
      <DialogFooter>
        <Tooltip>
          <TooltipTrigger>
            <Clipboard @click="copyToClipboard()" />
          </TooltipTrigger>
          <TooltipContent>Copy to Clipboard</TooltipContent>
        </Tooltip>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
