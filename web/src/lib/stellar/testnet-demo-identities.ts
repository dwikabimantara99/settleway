export type TestnetDemoWalletRole = "buyer" | "seller" | "platform";

export interface TestnetDemoIdentity {
  identity_alias: string;
  public_address: string;
  balance_snapshot_label: string;
}

export const TESTNET_DEMO_IDENTITIES: Record<
  TestnetDemoWalletRole,
  TestnetDemoIdentity
> = {
  platform: {
    identity_alias: "settleway-testnet-admin",
    public_address: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
    balance_snapshot_label: "~9998.42 XLM",
  },
  buyer: {
    identity_alias: "settleway-testnet-buyer-demo",
    public_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
    balance_snapshot_label: "~9999.99 XLM",
  },
  seller: {
    identity_alias: "settleway-testnet-seller-demo",
    public_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
    balance_snapshot_label: "~9999.99 XLM",
  },
};
