// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../WithENSBoundOwnership.sol";

contract WithENSBoundOwnershipExample is WithENSBoundOwnership {
    constructor() ERC721("ENSBoundExample", "ENSB") {}

    function mintToName(uint256 tokenId, bytes32 node) external {
        _mintToName(tokenId, node);
    }

    function mintToNameOrFallback(uint256 tokenId, bytes32 node, address fallbackTo) external {
        _mintToName(tokenId, node, fallbackTo);
    }

    function mintToAddress(uint256 tokenId, address to) external {
        _mintToAddress(tokenId, to);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function namehashOf(bytes calldata name) external pure returns (bytes32) {
        return _namehash(name);
    }
}
