// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@1001-digital/check-address/contracts/CheckAddress.sol";

/// @author 1001.digital
/// @title An extension that enables checking that an address only holds a limited amount of tokens.
abstract contract LimitedTokensPerWallet is ERC721 {
    // Stores how many tokens are allowed per wallet.
    uint256 private _allowedTokenCount;

    /// @param count the allowed token count
    /// @dev Initialize with the allowed token amount
    constructor (uint256 count) {
        _allowedTokenCount = count;
    }

    /// Require an externally owned account to only hold limited tokens.
    /// @param wallet the address of
    /// @dev Only allow one token per wallet
    modifier withinTokenLimit(address wallet, uint256 additionalTokens) {
        if (CheckAddress.isExternal(wallet)) {
            require(
                (balanceOf(wallet) + additionalTokens) <= _allowedTokenCount,
                "Above the allowed token count"
            );
        }

        _;
    }

    /// Only allow minting if within the allowed token limit
    /// @param to the address to which to mint the token
    /// @param tokenId the tokenId that should be minted
    /// @dev overrides the OpenZeppelin `_mint` method to accomodate our token limit
    function _mint(address to, uint256 tokenId)
        internal virtual override
        withinTokenLimit(to, 1)
    {
        super._mint(to, tokenId);
    }

    /// Only allow transfers if within the allowed token limit
    /// @param from the address from which to transfer the token
    /// @param to the address to which to transfer the token
    /// @param tokenId the tokenId that is being transferred
    /// @dev overrides the OpenZeppelin `_transfer` method to accomodate accomodate our token limit
    function _transfer(address from, address to, uint256 tokenId)
        internal virtual override
        withinTokenLimit(to, 1)
    {
        super._transfer(from, to, tokenId);
    }
}
