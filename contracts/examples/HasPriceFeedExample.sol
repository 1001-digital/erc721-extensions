// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../HasPriceFeed.sol";

contract HasPriceFeedExample is ERC721, HasPriceFeed {
    error InsufficientPayment();
    error TransferFailed();

    uint256 private _tokenId;
    uint256 public mintPriceUSD;

    constructor(address _priceFeed, uint256 _mintPriceUSD)
        ERC721("PricedToken", "PT")
        Ownable(msg.sender)
        HasPriceFeed(_priceFeed)
    {
        mintPriceUSD = _mintPriceUSD;
    }

    function mint() external payable {
        uint256 required = _usdToEth(mintPriceUSD);
        if (msg.value < required) revert InsufficientPayment();

        _tokenId++;
        _safeMint(msg.sender, _tokenId);

        uint256 excess = msg.value - required;
        if (excess > 0) {
            (bool sent, ) = msg.sender.call{value: excess}("");
            if (!sent) revert TransferFailed();
        }
    }

    function cost() external view returns (uint256) {
        return _usdToEth(mintPriceUSD);
    }
}
