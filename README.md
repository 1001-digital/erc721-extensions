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
A simple token tracker that limits the token supply.

To keep track of the token supply and to get the next available tokenID, call `nextToken()` when creating new tokens.

```solidity
contract RareToken is ERC721, WithLimitedSupply {
  constructor()
    ERC721("RareToken", "RT")
    WithLimitedSupply(1000) // Max. 1k NFTs available
  {}

  function mint () external {
    uint256 newTokenId = nextToken(); // Create a new token ID

    // ...
  }
}
```

There are two Contracts that build on this: `LinearlyAssigned`, which adds the option of starting the token tracker from a specific number and `RandomlyAssigned`, wich enables semi random token ID assignments.

#### `LinearlyAssigned.sol`
Instanciate it with the max supply as well as the starting index:

```solidity
contract RareToken is ERC721, LinarlyAssigned {
  constructor()
    ERC721("RareToken", "RT")
    LinarlyAssigned(1000, 1) // Max. 1k NFTs available; Start counting from 1 (instead of 0)
  {}

  function mint () external {
    uint256 newTokenId = nextToken(); // Create a new token ID

    // ...
  }
}
```

#### `RandomlyAssigned.sol`
(Semi-)randomly* assign token IDs from a fixed collection size on mint.

```solidity
contract RandomToken is ERC721, RandomlyAssigned {
  constructor()
    ERC721("RandomToken", "RT")
    RandomlyAssigned(1000, 1) // Max. 1k NFTs available; Start counting from 1 (instead of 0)
  {}

  function mint () external {
    uint256 newTokenId = nextToken(); // Create a new random token ID

    // ...
  }
}
```

*) We can't create proper random numbers on chain. But this does the job well enough, if you hide your metadata during public sale and are not too valuable of an NFT project (pot. exploit costs a lot of gas, thus making it economically unfeasible to do for profit for 'normal' NFT collections). If you want true random assignment, check out [Chainlink](https://chain.link/).


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
Handles linking to metadata files hosted on IPFS and follows best practices doing so:

- Projects have to embed the Content ID hash in the contract right from the start
- Project owners can never change the CID
- Tokens link to an `ipfs://`-URL to be independent of particular IPFS Gateways.
- Tokens wrap a folder with a `metadata.json` file (and pot. all the assets of the token).

> **Note**: You should never publish metadata before public sale is complete.<br> <small>This is to prevent people from trying to snipe rare tokens (rarity can be derived from going through all metadata files and looking at the trait and attribute distributions). Although very expensive (in gas fees) to do so, it is potentially possible and thus bad practice.</small>

```solidity
contract CleanToken is ERC721, WithIPFSMetaData {
  constructor()
    ERC721("CleanToken", "CT")
    WithIPFSMetaData("0123456789123456789123456789123456789123456789")
  {}
}
```

#### `WithIPFSMetadataAndPreviewMetadata.sol`
*TODO*

### `WithFees.sol`
Aims to abstracts out the complexity of current fee standards.

```solidity
contract SharedUpsideToken is ERC721, WithFees {
  constructor()
    ERC721("SharedUpsideToken", "SUP")
    // 500 Basis Points (5%) of secondary sales 
    // should go to the given beneficiary address
    WithFees(0xe11Da9560b51f8918295edC5ab9c0a90E9ADa20B, 500)
  {}

  function supportsInterface(bytes4 interfaceId) public view override(WithFees, ERC721) returns (bool) {
    return WithFees.supportsInterface(interfaceId);
  }
}
```

### `WithWithdrawals.sol`
A simple helper that implements a withdrawal function.

Just call `withdraw` as the contract owner.

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
