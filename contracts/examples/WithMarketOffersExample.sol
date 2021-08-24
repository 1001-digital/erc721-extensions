// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../WithMarketOffers.sol";

contract WithMarketOffersExample is ERC721, WithMarketOffers {
    uint256 private _tokenId = 0;

    constructor()
        ERC721("Token", "T")
    {}

    function mint () external returns (uint256) {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);

        return _tokenId;
    }
}
