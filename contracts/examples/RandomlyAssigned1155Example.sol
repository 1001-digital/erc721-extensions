// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import "./../RandomlyAssigned1155.sol";

contract RandomlyAssigned1155Example is ERC1155, RandomlyAssigned1155 {
    constructor(
        uint256[] memory tokenIds,
        uint256[] memory supplies
    )
        ERC1155("")
        RandomlyAssigned1155(tokenIds, supplies)
    {}

    function mint(uint256 amount) external
        ensureAvailabilityFor(amount)
    {
        for (uint256 i = 0; i < amount; i++) {
            _mint(msg.sender, nextToken(), 1, "");
        }
    }
}
