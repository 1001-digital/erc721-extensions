# @1001-digital/erc721-extensions

## 0.4.0

### Minor Changes

- [`23d8a03`](https://github.com/1001-digital/erc721-extensions/commit/23d8a03e5365091d3a3284bdd1ff32efcbabf484) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add `OneOfEachPerWallet` (ERC1155) extension — caps each wallet at one unit of any given token ID. A wallet may hold multiple distinct IDs, but never more than one of the same ID. Complements the existing ERC721 `OnePerWallet`.

## 0.3.0

### Minor Changes

- [#24](https://github.com/1001-digital/erc721-extensions/pull/24) [`808ebd6`](https://github.com/1001-digital/erc721-extensions/commit/808ebd65fbe2a82ac3c28ca3573c42256e4dce55) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add `Soulbound` (ERC721) and `Soulbound1155` (ERC1155) extensions — tokens are mintable and burnable but cannot be transferred between holders. Pairs with OpenZeppelin's `ERC721Burnable` / `ERC1155Burnable`.

## 0.2.0

### Minor Changes

- [`a53734b`](https://github.com/1001-digital/erc721-extensions/commit/a53734b21cf2c77d3dc88f5b3cd089893558e456) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add `WithENSReverseLookup` extension for resolving ENS reverse records as on-chain display names. Falls back to a shortened hex format (`0x1234...5678`) on chains without an ENS registry.

  Move mock contracts (`MockERC20`, `MockPriceFeed`) to `contracts/mocks/` and add `MockENSRegistry`/`MockENSResolver`. Add `setPrice` and other setters to `MockPriceFeed`.

## 0.1.2

### Patch Changes

- [`c69da8b`](https://github.com/1001-digital/erc721-extensions/commit/c69da8b309f48879dfac1a275f1e607b4e3ef549) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add 1155 randomly assigned extension (fixes [#17](https://github.com/1001-digital/erc721-extensions/issues/17))

## 0.1.1

### Patch Changes

- [`dfc6353`](https://github.com/1001-digital/erc721-extensions/commit/dfc6353b2c845b5c89d02aeafbe0c58ddea0d3a2) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Improve natspec and examples

## 0.1.0

### Minor Changes

- [`4139a02`](https://github.com/1001-digital/erc721-extensions/commit/4139a020f23c031a06ef46dbd4bb2cc77df6eab1) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Refactor / simplify OfferWithdrawn event emition. Fixes [#16](https://github.com/1001-digital/erc721-extensions/issues/16)

- [`997511d`](https://github.com/1001-digital/erc721-extensions/commit/997511d9a2063e5376ab0036826bb86fa0ee4b46) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Upgrade to OpenZeppelin V5

- [`997511d`](https://github.com/1001-digital/erc721-extensions/commit/997511d9a2063e5376ab0036826bb86fa0ee4b46) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add more test coverage

- [`997511d`](https://github.com/1001-digital/erc721-extensions/commit/997511d9a2063e5376ab0036826bb86fa0ee4b46) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Ensure price consistency when filling orders

- [`997511d`](https://github.com/1001-digital/erc721-extensions/commit/997511d9a2063e5376ab0036826bb86fa0ee4b46) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Upgrade to hardhat3
