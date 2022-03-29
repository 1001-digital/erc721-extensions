// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./../WithMarketOffers.sol";

contract WithMarketOffersExample is WithMarketOffers {
    uint256 private _tokenId = 0;

    constructor()
        ERC721("Token", "T")
        WithMarketOffers(payable(msg.sender), 1000)
    {}

    function mint () external returns (uint256) {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);

        return _tokenId;
    }
}
