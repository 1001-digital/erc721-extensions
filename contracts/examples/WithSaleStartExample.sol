// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../WithSaleStart.sol";

contract WithSaleStartExample is ERC721, WithSaleStart {
  uint256 private _tokenId = 0;

  constructor(
    uint256 time
  )
    ERC721("MyToken", "MT")
    WithSaleStart(time)
  {}

  function mint () external afterSaleStart returns (uint256) {
    _tokenId++;
    _safeMint(msg.sender, _tokenId);

    return _tokenId;
  }
}
