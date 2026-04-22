// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @author 1001.digital
/// @title An extension that caps ERC1155 balances at one of each token ID per wallet.
abstract contract OneOfEachPerWallet is ERC1155 {
    /// @dev Thrown when a mint or transfer would give an address more than one of a token ID.
    error OneTokenPerWallet();

    /// Enforce one-per-wallet per token ID in `_update`.
    /// @dev Overrides the OZ 5.x ERC1155 `_update` hook which handles mint/transfer/burn for single and batch ops.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        virtual
        override
    {
        super._update(from, to, ids, values);

        if (to != address(0)) {
            for (uint256 i = 0; i < ids.length; i++) {
                if (balanceOf(to, ids[i]) > 1) revert OneTokenPerWallet();
            }
        }
    }
}
