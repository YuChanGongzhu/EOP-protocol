# Injective EVM Demo Foundry Project

A demonstration project which show how to compile, test, deploy, verify, and interact
with EVM smart contracts on Injective Testnet.

## Tutorial

This is a demo repo intended to accompany the following series of tutorials:


* [Setup Foundry and compile a smart contract](https://docs.injective.network/developers-evm/smart-contracts/compile-foundry.md)
* [Test a smart contract using Foundry](https://docs.injective.network/developers-evm/smart-contracts/test-foundry.md)
* [Deploy a smart contract using Foundry](https://docs.injective.network/developers-evm/smart-contracts/deploy-foundry.md)
* [Verify a smart contract using Foundry](https://docs.injective.network/developers-evm/smart-contracts/verify-foundry.md)
* [Interact with a smart contract using Foundry](https://docs.injective.network/developers-evm/smart-contracts/interact-foundry.md)

## How to use this repo

```shell
# create an account, save in  key store
cast wallet import injTest --interactive

# install dependencies
forge install foundry-rs/forge-std

# compile smart contracts
forge build

# test smart contracts
forge test

# deploy smart contracts
forge create \
  src/Counter.sol:Counter \
  --rpc-url injectiveEvm \
  --legacy \
  --account injTest \
  --gas-price 160000000 \
  --gas-limit 2000000 \
  --broadcast

# verify smart contracts
forge verify-contract \
  --rpc-url injectiveEvm \
  --verifier blockscout \
  --verifier-url 'https://testnet.blockscout-api.injective.network/api/' \
  ${SC_ADDRESS} \
  src/Counter.sol:Counter

# interact with smart contracts - query
cast call \
  --rpc-url injectiveEvm \
  ${SC_ADDRESS} \
  "value()"

# interact with smart contracts - transaction
cast send \
  --legacy \
  --rpc-url injectiveEvm \
  --gas-price 160000000 \
  --gas-limit 2000000 \
  --account injTest \
  ${SC_ADDRESS} \
  "increment(uint256)" \
  1

```

## Author

[Brendan Graetz](https://blog.bguiz.com/)

## Licence

MIT
