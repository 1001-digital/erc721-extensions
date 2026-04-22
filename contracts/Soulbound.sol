// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @author 1001.digital
/// @title An extension that makes ERC721 tokens soulbound — mintable and burnable, but not transferable.
abstract contract Soulbound is ERC721 {
    /// @dev Thrown when a holder-to-holder transfer is attempted.
    error NonTransferable();

    /// Block transfers between holders; allow mints (`from == 0`) and burns (`to == 0`).
    /// @dev Overrides the OZ 5.x `_update` hook which handles all token movement (mint, transfer, burn).
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) revert NonTransferable();
        return from;
    }
}
