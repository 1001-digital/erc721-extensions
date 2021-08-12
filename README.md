# ERC721 Contract Extensions
A set of composable extensions for the [OpenZeppelin](https://openzeppelin.com/) ERC721 base contracts.

## Available Extensions
### `WithSaleStart.sol`
An extension that enables the contract owner to set and update the date of a public sale.

This builds upon the `Ownable` extension, so only contract deployers can change the sale start via `setSaleStart(uint256 time)`.
Also, to stay true to the trustless spirit of NFTs, it is not possible to change the sale start after the initial sale started.

To use this in your project, call the `afterSaleStart` / `beforeSaleStart` modifiers.

```solidity
contract MyToken is ERC721, WithSaleStart {
  constructor()
    ERC721("MyToken", "MT")
    WithSaleStart(1735686000)
  {}

  function claim () external afterSaleStart {
    // ...
  }
}
```

### `LimitedTokensPerWallet.sol`
Limits the amount of tokens an external wallet can hold.

```solidity
contract LimitedToken is ERC721, LimitedTokensPerWallet {
  constructor()
    ERC721("LimitedToken", "LT")
    LimitedTokensPerWallet(3) // Only allow three tokens per wallet
  {}

  // Mint & Transfer limits are taken care of by the library.
}
```

### `OnePerWallet.sol`
A more extreme version of `LimitedTokensPerWallet`, which only allows holding one token in an external wallet address.

To use this in your project just extend the Contract. If you need more control, call the `onePerWallet` modifier. 

```solidity
contract OneForAllToken is ERC721, OnePerWallet {
  constructor()
    ERC721("OneForAllToken", "OFA")
  {}

  // Mints and Transfer limites are taken care of by the library.
}
```

### `WithLimitedSupply.sol`
A simple token tracker that limits the token supply and increments token IDs on each new mint.

To keep track of the token supply and to get the next available tokenID, call `nextToken()` when creating new tokens.

```solidity
contract RareToken is ERC721, WithLimitedSupply {
  constructor()
    ERC721("RareToken", "RT")
    WithLimitedSupply(1000, 1) // Max. 1k NFTs available; start from token #1
  {}

  function mint () 
    external 
    ensureAvailability // Ensure tokens are still available
  {
    uint256 newTokenId = nextToken(); // Create a new token ID

    // ...
  }
}
```

### `RandomlyAssigned.sol`
(Semi-)randomly* assign token IDs from a fixed collection size on mint.


### `WithContractMetaData.sol`
Link to your collection's contract meta data right from within your smart contract.

Builds on `Ownable` and allows the contract owner to change contract metadata even after deployment.

Make sure the URL links to an appropriate JSON file.

```solidity
contract Token is ERC721, WithContractMetadata {
  constructor()
    ERC721("Token", "LT")
    WithContractMetadata("ipfs://0123456789123456789123456789123456789123456789/metadata.json")
  {}
}
```

To change the contract metadat URI, call `setContractURI(string uri)` as the contract owner.

### `WithIPFSMetaData.sol`
Handles linking to metadata files hosted on IPFS.

### `WithFees.sol`
Abstracts out the complexity of current fee standards.

## Installation
1. In your project run `npm install @1001-digital/erc721-exensions`
2. Within your project, import the extensions you want to use like `import "@1001-digital/erc721-exensions/contracts/WithIPFSMetaData.sol";`

## Local Development
This project uses the [Hardhat](https://hardhat.org/) development environment. To set it up locally, clone this repository and run `npm install`.

Note: You can exchange `npm run` for `hh` if you have `hh` installed globally on your system.

- Run the test suite: `npm run test`
- Spin up a local development blockchain: `npm run node`
<!-- - Deploy contract with `npm run deploy:localhost` -->

## Thank You
If you have any **improvement suggestions**, **feedback** or **bug reports** please feel free add an issue, or reach out via Twitter [@jwahdatehagh](https://twitter.com/jwahdatehagh) or Email [jalil@1001.digital](jalil@1001.digital).
