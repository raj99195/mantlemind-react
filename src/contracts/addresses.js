export const CONTRACT_ADDRESSES = {
  testnet: {
    AgentRegistry: "0x066aefBf67D73F8439440fD6ae6adaFCEa88b2D5",
    ERC8004Identity: "0x42F4aC6290cB3C4cC5da7128D79476dfAA4e6eB9",
    MantleMindVault: "0xaC8Ec6678ABA2893729fD5b310c6b173D97eef82",
  },
  mainnet: {
    AgentRegistry: "",
    ERC8004Identity: "",
    MantleMindVault: "",
  },
};

export const CURRENT_NETWORK = "testnet";
export const ADDRESSES = CONTRACT_ADDRESSES[CURRENT_NETWORK];