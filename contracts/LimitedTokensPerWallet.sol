// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @author 1001.digital
/// @title An extension that enables checking that an address only holds a limited amount of tokens.
abstract contract LimitedTokensPerWallet is ERC721 {
    error AboveAllowedTokenCount();

    // Stores how many tokens are allowed per wallet.
    uint256 private _allowedTokenCount;

    /// @param count the allowed token count
    /// @dev Initialize with the allowed token amount
    constructor (uint256 count) {
        _allowedTokenCount = count;
    }

    /// Track token limits in `_update`.
    /// @dev Overrides the OZ 5.x `_update` hook which handles all token movement (mint, transfer, burn).
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);

        // After super._update, balance is already incremented
        if (to != address(0)) {
            if (balanceOf(to) > _allowedTokenCount) revert AboveAllowedTokenCount();
        }

        return from;
    }
}
