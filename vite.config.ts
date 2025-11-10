// Plugins
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import Fonts from "unplugin-fonts/vite";
import Vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";
import mkcert from "vite-plugin-mkcert";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

// Utilities
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  base: "",
  plugins: [
    VueRouter({
      dts: "src/typed-router.d.ts",
    }),
    AutoImport({
      imports: [
        "vue",
        {
          "vue-router/auto": ["useRoute", "useRouter"],
        },
        "pinia",
        { "@/stores/app": ["useAppStore"] },
      ],
      dts: "src/auto-imports.d.ts",
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
    Components({
      dts: "src/components.d.ts",
    }),
    Vue(),
    tailwindcss(),
    Fonts({
      google: {
        families: [
          {
            name: "Roboto",
            styles: "wght@100;300;400;500;700;900",
          },
        ],
      },
    }),
    mkcert(),
    nodePolyfills(),
    vueDevTools(),
  ],
  define: {
    "process.env": {},
    "process.version": JSON.stringify(process.version),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    port: 3030,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          algokit: ["@algorandfoundation/algokit-utils"],
          useWallet: ["@txnlab/use-wallet-vue"],
        },
      },
    },
    target: "esnext",
  },
  optimizeDeps: {
    include: ["@algorandfoundation/algokit-utils"],
    exclude: ["lute-connect"],
  },
});
