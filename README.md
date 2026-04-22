# ERC721 Contract Extensions

A set of composable extensions for the [OpenZeppelin](https://openzeppelin.com/) ERC721 and ERC1155 base contracts.

> **v0.1.0 Breaking Change**: This version targets OpenZeppelin 5.x and Solidity ^0.8.20. It is not backward compatible with OZ 4.x consumers. All `require` strings have been replaced with custom errors, `Counters` has been removed, and `_mint`/`_transfer` overrides have been replaced with the OZ 5.x `_update` hook.

## Installation

```bash
pnpm install @1001-digital/erc721-extensions
```

Then import the extensions you want:

```solidity
import "@1001-digital/erc721-extensions/contracts/WithIPFSMetaData.sol";
```

### Peer dependency

This package requires `@openzeppelin/contracts ^5.2.0` as a peer dependency.

## Available Extensions

### `WithLimitedSupply.sol`

A simple token tracker that limits the token supply.

To keep track of the token supply and to get the next available tokenID, call `nextToken()` when creating new tokens.

```solidity
contract RareToken is ERC721, WithLimitedSupply {
  constructor()
    ERC721("RareToken", "RT")
    WithLimitedSupply(1000) // Max. 1k NFTs available
  {}

  function mint () external ensureAvailability() {
    uint256 newTokenId = nextToken();
    _safeMint(msg.sender, newTokenId);
  }
}
```

The internal `nextToken()` method does not automatically check whether tokens are available but `WithLimitedSupply` provides the `ensureAvailability` modifier that you can attach to your minting function. If you implement minting multiple tokens within the same transaction, you should check availability with the `ensureAvailabilityFor(amount)` modifier.

There are two contracts that build on this: `LinearlyAssigned`, which adds the option of starting the token tracker from a specific number, and `RandomlyAssigned`, which enables semi random token ID assignments.

#### `LinearlyAssigned.sol`

Instantiate it with the max supply as well as the starting index:

```solidity
contract RareToken is ERC721, LinearlyAssigned {
  constructor()
    ERC721("RareToken", "RT")
    LinearlyAssigned(1000, 1) // Max. 1k NFTs; Start from 1
  {}

  function mint () external ensureAvailability() {
    uint256 newTokenId = nextToken();
    _safeMint(msg.sender, newTokenId);
  }
}
```

#### `RandomlyAssigned.sol`

(Semi-)randomly\* assign token IDs from a fixed collection size on mint.

```solidity
contract RandomToken is ERC721, RandomlyAssigned {
  constructor()
    ERC721("RandomToken", "RT")
    RandomlyAssigned(1000, 1) // Max. 1k NFTs; Start from 1
  {}

  function mint () external ensureAvailability() {
    uint256 newTokenId = nextToken();
    _safeMint(msg.sender, newTokenId);
  }
}
```

> \*) On-chain randomness uses `block.prevrandao` which is not truly random. This is adequate for most NFT collections, but if you need cryptographically secure randomness, use [Chainlink VRF](https://chain.link/).

### `WithSaleStart.sol`

Enables the contract owner to set and update the date of a public sale.

Builds on `Ownable` — only the contract owner can change the sale start via `setSaleStart(uint256 time)`. The sale start cannot be changed after the initial sale has started.

```solidity
contract MyToken is ERC721, WithSaleStart {
  constructor()
    ERC721("MyToken", "MT")
    Ownable(msg.sender)
    WithSaleStart(1735686000)
  {}

  function claim () external afterSaleStart {
    // ...
  }
}
```

### `HasPriceFeed.sol`

Adds [Chainlink](https://chain.link/) USD price feed support for ETH pricing. Exposes an internal `_usdToEth(uint256)` helper that converts a USD amount (with the feed's decimals) to wei using the latest oracle price.

Builds on `Ownable` — the contract owner can update the feed address via `setPriceFeed(address)`. The feed is validated for staleness (default: 1 hour), which can be customized by overriding `_maxStaleness()`.

```solidity
contract PricedToken is ERC721, HasPriceFeed {
  uint256 public mintPriceUSD = 10_00000000; // $10 (8 decimals)

  constructor(address priceFeed)
    ERC721("PricedToken", "PT")
    Ownable(msg.sender)
    HasPriceFeed(priceFeed)
  {}

  function mint() external payable {
    uint256 required = _usdToEth(mintPriceUSD);
    require(msg.value >= required, "Insufficient payment");
    // ...
  }
}
```

### `OnePerWallet.sol`

Restricts every address to holding at most one token. Enforced on all recipient addresses (EOAs and contracts alike) via the `_update` hook.

```solidity
contract OneForAllToken is ERC721, OnePerWallet {
  constructor()
    ERC721("OneForAllToken", "OFA")
  {}

  function _update(address to, uint256 tokenId, address auth)
    internal override(ERC721, OnePerWallet) returns (address)
  {
    return OnePerWallet._update(to, tokenId, auth);
  }
}
```

### `LimitedTokensPerWallet.sol`

Limits the number of tokens any single address can hold. Enforced on every recipient address, including smart contracts such as Safes, marketplaces, staking contracts, and vaults.

```solidity
contract LimitedToken is ERC721, LimitedTokensPerWallet {
  constructor()
    ERC721("LimitedToken", "LT")
    LimitedTokensPerWallet(3) // Max 3 tokens per wallet
  {}

  function _update(address to, uint256 tokenId, address auth)
    internal override(ERC721, LimitedTokensPerWallet) returns (address)
  {
    return LimitedTokensPerWallet._update(to, tokenId, auth);
  }
}
```

### `Soulbound.sol`

Makes an ERC721 token soulbound: mintable and burnable, but not transferable between holders. Enforced via the `_update` hook. Pairs well with OpenZeppelin's `ERC721Burnable` when you also want the holder to be able to retire their token.

```solidity
contract SoulboundToken is ERC721, ERC721Burnable, Soulbound {
  uint256 private _tokenId;

  constructor()
    ERC721("SoulboundToken", "SBT")
  {}

  function mint() external {
    _tokenId++;
    _safeMint(msg.sender, _tokenId);
  }

  function _update(address to, uint256 tokenId, address auth)
    internal override(ERC721, Soulbound) returns (address)
  {
    return Soulbound._update(to, tokenId, auth);
  }
}
```

### `Soulbound1155.sol`

The ERC1155 equivalent of `Soulbound`. Mints (`from == 0`) and burns (`to == 0`) are permitted; every other transfer reverts with `NonTransferable`. Combines cleanly with `ERC1155Burnable`.

```solidity
contract SoulboundEdition is ERC1155, ERC1155Burnable, Soulbound1155 {
  constructor()
    ERC1155("ipfs://Qm.../{id}.json")
  {}

  function mint(uint256 id, uint256 amount) external {
    _mint(msg.sender, id, amount, "");
  }

  function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
    internal override(ERC1155, Soulbound1155)
  {
    Soulbound1155._update(from, to, ids, values);
  }
}
```

### `WithContractMetaData.sol`

Link to your collection's contract metadata right from within your smart contract.

Builds on `Ownable` and allows the contract owner to change contract metadata even after deployment.

```solidity
contract Token is ERC721, WithContractMetaData {
  constructor()
    ERC721("Token", "T")
    Ownable(msg.sender)
    WithContractMetaData("ipfs://Qm.../metadata.json")
  {}
}
```

### `WithIPFSMetaData.sol`

Handles linking to metadata files hosted on IPFS:

- Projects embed the Content ID hash in the contract from deployment
- Tokens link to an `ipfs://` URL to be independent of particular IPFS gateways
- Tokens wrap a folder with a `metadata.json` file (and potentially all the assets of the token)

> **Note**: You should never publish metadata before public sale is complete. This prevents people from sniping rare tokens by analyzing trait distributions across metadata files.

```solidity
contract CleanToken is ERC721, WithIPFSMetaData {
  constructor()
    ERC721("CleanToken", "CT")
    WithIPFSMetaData("Qm0123456789...")
  {}
}
```

### `WithFees.sol`

Implements the [ERC-2981](https://eips.ethereum.org/EIPS/eip-2981) royalty standard. Marketplaces that support ERC-2981 will automatically query `royaltyInfo()` to determine fee recipients and amounts.

```solidity
contract SharedUpsideToken is ERC721, WithFees {
  constructor()
    ERC721("SharedUpsideToken", "SUP")
    Ownable(msg.sender)
    // 500 basis points (5%) to the given beneficiary
    WithFees(payable(0xe11Da9560b51f8918295edC5ab9c0a90E9ADa20B), 500)
  {}

  function supportsInterface(bytes4 interfaceId) public view override(WithFees, ERC721) returns (bool) {
    return WithFees.supportsInterface(interfaceId);
  }
}
```

The owner can update royalty info via `setRoyaltyInfo(address, uint96)`.

### `WithMarketOffers.sol`

Implements a simple offer-based marketplace. Owners of tokens can sell them via the built-in market.

Includes `ReentrancyGuard`, follows the checks-effects-interactions pattern, and sends fees directly to the beneficiary on each sale.

> Offers remain active until they are canceled or the token moves. Revoking an operator approval does not automatically clear an already-created offer, because sale execution is handled internally by the token contract.

```solidity
contract MarketToken is WithMarketOffers {
  uint256 private _tokenId;

  constructor(address payable beneficiary)
    ERC721("MarketToken", "MKT")
    Ownable(msg.sender)
    WithMarketOffers(beneficiary, 500) // 5% fee on secondary sales
  {}

  function mint() external {
    _tokenId++;
    _safeMint(msg.sender, _tokenId);
  }
}
```

Token owners can then call `makeOffer(tokenId, price)` or `makeOfferTo(tokenId, price, buyer)`. Buyers complete the sale with `buy(tokenId)` and the exact price in `msg.value`.

### `OnlyOnGainsCreatorFeesMarket.sol`

A variant of `WithMarketOffers` that only charges creator fees on price appreciation. If a token sells at or below its last sale price, no fee is taken.

```solidity
contract GainsToken is OnlyOnGainsCreatorFeesMarket {
  uint256 private _tokenId;

  constructor(address payable beneficiary)
    ERC721("GainsToken", "GAIN")
    Ownable(msg.sender)
    OnlyOnGainsCreatorFeesMarket(beneficiary, 1000) // 10% creator fee on gains only
  {}

  function mint() external {
    _tokenId++;
    _safeMint(msg.sender, _tokenId);
  }
}
```

### `WithFreezableMetadata.sol`

A helper for irreversibly freezing metadata. Once `freeze()` is called by the owner, any function guarded by the `unfrozen` modifier will revert.

```solidity
contract FreezableToken is ERC721, WithFreezableMetadata {
  string private _baseTokenURI;

  constructor()
    ERC721("FreezableToken", "FRZ")
    Ownable(msg.sender)
  {}

  function setBaseURI(string memory newBaseURI) external onlyOwner unfrozen {
    _baseTokenURI = newBaseURI;
  }

  function baseURI() external view returns (string memory) {
    return _baseTokenURI;
  }
}
```

### `WithTokenPrices.sol`

Enables selling tokens at default and custom prices. Use the `meetsPrice(tokenId)` modifier on your mint/purchase function.

```solidity
contract PricedToken is ERC721, WithTokenPrices {
  uint256 private _tokenId;

  constructor()
    ERC721("PricedToken", "PRICE")
    Ownable(msg.sender)
    WithTokenPrices(0.08 ether) // Default mint price
  {}

  function mint() external payable meetsPrice(_tokenId + 1) {
    _tokenId++;
    _safeMint(msg.sender, _tokenId);
  }
}
```

The owner can override individual token prices with `setTokenPrice(tokenId, price)` or batch updates with `setTokenPrices(tokenIds, price)`.

### `WithWithdrawals.sol`

A simple helper that lets the contract owner withdraw ETH from the contract via `withdraw()`. Uses `.call{value:}()` instead of `.transfer()` for gas-safety.

```solidity
contract TreasuryToken is ERC721, WithWithdrawals {
  uint256 public constant PRICE = 0.05 ether;
  uint256 private _tokenId;

  constructor()
    ERC721("TreasuryToken", "TRY")
    Ownable(msg.sender)
  {}

  function mint() external payable {
    require(msg.value == PRICE, "Wrong payment");
    _tokenId++;
    _safeMint(msg.sender, _tokenId);
  }

  receive() external payable {}
}
```

### `WithERC20Withdrawals.sol`

Lets the contract owner recover ERC20 tokens accidentally sent to the contract.

```solidity
contract RecoverableToken is ERC721, WithERC20Withdrawals {
  constructor()
    ERC721("RecoverableToken", "RCV")
    Ownable(msg.sender)
  {}
}
```

If someone transfers an ERC20 token to the NFT contract by mistake, the owner can recover it with `withdrawERC20Token(tokenAddress)`.

### `WithAdditionalMints.sol`

Enables the contract owner to expand a collection after the initial supply is minted, by adding new tokens and updating the metadata CID.

```solidity
contract ExpandableCollection is WithAdditionalMints {
  constructor()
    ERC721("ExpandableCollection", "XPND")
    Ownable(msg.sender)
    WithLimitedSupply(100)
    WithIPFSMetaData("QmInitialCollectionCid")
  {}

  function mint() external ensureAvailability() {
    _safeMint(msg.sender, nextToken());
  }
}
```

After the initial collection is live, the owner can call `addToken(cid)`, `addTokens(cid, count)`, `mintAdditionalToken(cid, to)`, or `mintAdditionalTokens(cid, count, to)` to increase supply and point metadata to the updated IPFS directory.

### `RandomlyAssigned1155.sol`

Randomly assign ERC1155 token IDs from a set of token types, each with its own supply. On each mint, a token type is selected at random weighted by its remaining supply.

```solidity
contract RandomPack is ERC1155, RandomlyAssigned1155 {
  constructor()
    ERC1155("")
    RandomlyAssigned1155(
      new uint256[](3) /* [1, 2, 3] */,
      new uint256[](3) /* [10000, 10000, 10000] */
    )
  {}

  function mint(uint256 amount) external ensureAvailabilityFor(amount) {
    for (uint256 i = 0; i < amount; i++) {
      _mint(msg.sender, nextToken(), 1, "");
    }
  }
}
```

> Uses the same on-chain randomness approach as `RandomlyAssigned`. The weighted selection loop is negligible for typical ERC1155 collections (dozens of token types).

### `WithENSReverseLookup.sol`

Resolves ENS reverse records for on-chain display names. Given an address, `_displayName` tries ENS reverse resolution first and falls back to a shortened hex string (`0x1234...5678`).

The contract checks the [ENS registry](https://docs.ens.domains/) at its canonical address (`0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`, shared across mainnet and major L2s). On chains where the registry is not deployed, the fallback is used automatically.

```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@1001-digital/erc721-extensions/contracts/WithENSReverseLookup.sol";

contract NamedToken is ERC721, WithENSReverseLookup {
  constructor()
    ERC721("NamedToken", "NT")
  {}

  function ownerDisplayName(uint256 tokenId) external view returns (string memory) {
    return _displayName(ownerOf(tokenId));
  }
}
```

`_shortHex(address)` is also available as a standalone utility for formatting addresses.

## Local Development

This project uses [Hardhat](https://hardhat.org/) and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm hardhat compile
pnpm hardhat test
pnpm typecheck
```

## Thank You

If you have any **improvement suggestions**, **feedback** or **bug reports** please feel free add an issue, or reach out via 𝕏 [@jalil.eth](https://twitter.com/jalilwahdat) or Email [jalil@1001.digital](mailto:jalil@1001.digital).
