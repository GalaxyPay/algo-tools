import LuteLogo from "@/components/svg/LuteLogo.vue";
import {
  mdiFire,
  mdiHandshake,
  mdiLogout,
  mdiMirror,
  mdiPencil,
} from "@mdi/js";

export const tools = [
  {
    title: "Opt-Out",
    subtitle:
      "Manage your minimum balance by opting out of assets and applications (smart contracts).",
    icon: mdiLogout,
    path: "/optout",
  },
  {
    title: "Compose Transaction",
    subtitle:
      "Constuct, sign, and send a transaction. Make payments, transfer assets, register participation keys, rekey, and more.",
    icon: mdiPencil,
    path: "/compose",
  },
  {
    title: "Burn Assets",
    subtitle: "Burn ASAs or NFTs. Trustlessly. Permenantly.",
    icon: mdiFire,
    path: "/burn",
  },
  {
    title: "Participation Keys",
    subtitle: "For node runners. Manage participation keys on your node.",
    icon: mdiHandshake,
    path: "/partkey",
  },
  {
    title: "Vanity Marketplace",
    subtitle: "Buy and sell vanity addresses.",
    icon: mdiMirror,
    path: "/vanity",
  },
  {
    title: "Lute Badges",
    subtitle: "Claim governance badges issued by Lute Wallet.",
    icon: LuteLogo,
    path: "/badge",
  },
];
