// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../WithENSBound1155.sol";

contract WithENSBound1155Example is WithENSBound1155 {
    constructor() ERC1155("") {}

    function mintToName(uint256 id, uint256 amount, bytes32 node) external {
        _mintToName(id, amount, node);
    }

    function mintToNameOrFallback(
        uint256 id,
        uint256 amount,
        bytes32 node,
        address fallbackTo
    ) external {
        _mintToName(id, amount, node, fallbackTo);
    }

    function mintToAddress(uint256 id, uint256 amount, address to) external {
        _mintToAddress(id, amount, to);
    }

    function burnFromName(uint256 id, uint256 amount, bytes32 node) external {
        _burnFromName(id, amount, node);
    }

    function burnFromAddress(address from, uint256 id, uint256 amount) external {
        _burnFromAddress(from, id, amount);
    }
}
