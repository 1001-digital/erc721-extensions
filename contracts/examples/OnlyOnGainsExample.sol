// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../OnlyOnGainsCreatorFeesMarket.sol";

contract OnlyOnGainsExample is OnlyOnGainsCreatorFeesMarket {
    uint256 private _tokenId;

    constructor()
        ERC721("GainsToken", "GT")
        Ownable(msg.sender)
        OnlyOnGainsCreatorFeesMarket(payable(msg.sender), 1000)
    {}

    function mint() external returns (uint256) {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);

        return _tokenId;
    }
}
