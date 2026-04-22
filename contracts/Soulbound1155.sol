// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @author 1001.digital
/// @title An extension that makes ERC1155 tokens soulbound — mintable and burnable, but not transferable.
abstract contract Soulbound1155 is ERC1155 {
    /// @dev Thrown when a holder-to-holder transfer is attempted.
    error NonTransferable();

    /// Block transfers between holders; allow mints (`from == 0`) and burns (`to == 0`).
    /// @dev Overrides the OZ 5.x `_update` hook which handles all token movement (mint, transfer, burn).
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        virtual
        override
    {
        if (from != address(0) && to != address(0)) revert NonTransferable();
        super._update(from, to, ids, values);
    }
}
