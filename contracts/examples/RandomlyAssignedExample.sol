// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../RandomlyAssigned.sol";

contract RandomlyAssignedExample is ERC721, RandomlyAssigned {
  constructor()
    ERC721("RandomToken", "RT")
    RandomlyAssigned(20, 1) // Max 20 tokens, starting with #1
  {}

  function mint () external returns (uint256) {
    uint256 tokenId = nextToken();

    _safeMint(msg.sender, tokenId);

    return tokenId;
  }
}
