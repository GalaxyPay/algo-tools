/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Composables
import { createVuetify } from "vuetify";

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  defaults: {
    VBtn: {
      variant: "outlined",
      color: "primary",
    },
    VCardActions: {
      VBtn: {
        variant: "outlined",
      },
    },
    VSelect: {
      variant: "outlined",
      density: "comfortable",
    },
    VTextField: {
      variant: "outlined",
      density: "comfortable",
    },
    VTextarea: {
      variant: "outlined",
    },
    VAutocomplete: {
      density: "comfortable",
    },
  },
  theme: {
    defaultTheme: "dark",
    themes: {
      dark: {
        colors: {
          primary: "#2196f3",
          secondary: "#5CBBF6",
          error: "#ff5252",
          vuet: "#41b982",
        },
      },
    },
  },
});
