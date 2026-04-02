---
"@1001-digital/erc721-extensions": minor
---

Add `WithENSReverseLookup` extension for resolving ENS reverse records as on-chain display names. Falls back to a shortened hex format (`0x1234...5678`) on chains without an ENS registry.

Move mock contracts (`MockERC20`, `MockPriceFeed`) to `contracts/mocks/` and add `MockENSRegistry`/`MockENSResolver`. Add `setPrice` and other setters to `MockPriceFeed`.
