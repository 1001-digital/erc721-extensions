// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../LinearlyAssigned.sol";

contract LinearlyAssignedExample is ERC721, LinearlyAssigned {
    constructor(
        uint256 amount,
        uint256 startFrom
    )
        ERC721("LinearToken", "TT")
        LinearlyAssigned(amount, startFrom)
    {}

    function mint () external
        ensureAvailability()
    {
        _safeMint(msg.sender, nextToken());
    }

    function mintMany (uint256 amount) external
        ensureAvailabilityFor(amount)
    {
        for (uint256 index = 0; index < amount; index++) {
            _safeMint(msg.sender, nextToken());
        }
    }
}
