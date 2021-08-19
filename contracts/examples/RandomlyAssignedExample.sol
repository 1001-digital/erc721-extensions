// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../RandomlyAssigned.sol";

contract RandomlyAssignedExample is ERC721, RandomlyAssigned {
    constructor(
        uint256 amount,
        uint256 startFrom
    )
        ERC721("RandomToken", "RT")
        RandomlyAssigned(amount, startFrom)
    {}

    function mint (uint256 amount) external
        ensureAvailabilityFor(amount)
    {
        for (uint256 index = 0; index < amount; index++) {
            _safeMint(msg.sender, nextToken());
        }
    }
}
