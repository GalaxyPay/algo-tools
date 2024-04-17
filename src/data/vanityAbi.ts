import algosdk from "algosdk";

export const vanityAbi = new algosdk.ABIContract({
  name: "VanityMarket",
  methods: [
    {
      name: "post",
      args: [
        {
          type: "pay",
          name: "payment",
          desc: "A payment transaction for 5% of the price into escrow. Must be from the owner.",
        },
        {
          type: "account",
          name: "owner",
          desc: "The account that owns the listing.",
        },
        {
          type: "uint64",
          name: "price",
          desc: "The asking price in microAlgos.",
        },
        {
          type: "byte[32]",
          name: "key",
          desc: "A 32-byte representation of the secret key for the vanity account.",
        },
      ],
      returns: {
        type: "void",
      },
      desc: "This method receives a payment and lists a vanity address for sale.\nThe caller may opt into this app during this call, and must rekey to the app escrow address.",
    },
    {
      name: "purchase",
      args: [
        {
          type: "pay",
          name: "payment",
          desc: "A payment transaction of the asking price to the owner.",
        },
        {
          type: "account",
          name: "vanity",
          desc: "The address of the vanity account to be purchased.",
        },
      ],
      returns: {
        type: "void",
      },
      desc: "If buyer pays asking price to owner, method rekeys vanity to sender.",
    },
    {
      name: "rescind",
      args: [
        {
          type: "account",
          name: "vanity",
          desc: "The address of the vanity account to be removed.",
        },
      ],
      returns: {
        type: "void",
      },
      desc: "If sender is owner, method refunds their escrow funds and rekeys vanity to them.",
    },
  ],
  networks: {},
});
