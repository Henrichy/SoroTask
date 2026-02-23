import { Keypair } from "@stellar/stellar-sdk";

export function loadAccount(config) {
  const keypair = Keypair.fromSecret(config.keeperSecret);
  return keypair;
}