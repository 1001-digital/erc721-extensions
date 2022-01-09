// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title Enables to sell tokens at default and custom prices.
contract WithTokenPrices is Ownable {
    // The default price for the tokens
    uint256 public defaultPrice;

    // Each tokenId has a price
    mapping(uint256 => uint256) public priceForToken;

    /// @param _defaultPrice The default price for tokens within the collection
    /// @dev Create the WithTokenPrices contract
    constructor(uint256 _defaultPrice) {
        defaultPrice = _defaultPrice;
    }

    /// @param _tokenId The token to update the price for
    /// @param _price The price to use for the token
    /// @dev Set a custom price for a token
    function setTokenPrice(uint256 _tokenId, uint256 _price) external onlyOwner {
        priceForToken[_tokenId] = _price;
    }

    /// @param _tokenIds The tokens to update the price for
    /// @param _price The price to use for the tokens
    /// @dev Set a custom price for multiple tokens
    function setTokenPrices(uint256[] memory _tokenIds, uint256 _price) external onlyOwner {
        for (uint256 index = 0; index < _tokenIds.length; index++) {
            priceForToken[_tokenIds[index]] = _price;
        }
    }

    /// @param _tokenId The token to check the price for
    /// @dev Ensure the sent value meets the price for the token
    modifier meetsPrice (uint256 _tokenId) {
        uint256 tokenPrice = priceForToken[_tokenId] > 0
            ? priceForToken[_tokenId]
            : defaultPrice;
        require(msg.value >= tokenPrice, "Pay up, friend");

        _;
    }
}
