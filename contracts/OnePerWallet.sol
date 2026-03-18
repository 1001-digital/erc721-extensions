// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @author 1001.digital
/// @title An extension that enables checking that an address only holds one token.
abstract contract OnePerWallet is ERC721 {
    /// @dev Thrown when a mint or transfer would give an address more than one token.
    error OneTokenPerWallet();
    /// @dev Thrown when querying the token of an address that holds none.
    error NoTokenForAccount();

    // Mapping owner address to token
    mapping (address => uint256) private _ownedToken;

    /// Query the owner of a token.
    /// @param owner the address of the owner
    /// @dev Get the the token of an owner
    function tokenOf(address owner) public view virtual returns (uint256) {
        if (_ownedToken[owner] == 0) revert NoTokenForAccount();

        // We subtract 1 as we added 1 to account for 0-index based collections
        return _ownedToken[owner] - 1;
    }

    /// Track token ownership and enforce one-per-wallet in `_update`.
    /// @dev Overrides the OZ 5.x `_update` hook which handles all token movement (mint, transfer, burn).
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);

        // Clear previous owner's tracking
        if (from != address(0)) {
            _ownedToken[from] = 0;
        }

        // Enforce one-per-wallet and track new owner
        if (to != address(0)) {
            if (balanceOf(to) > 1) revert OneTokenPerWallet();
            // We add one to account for 0-index based collections
            _ownedToken[to] = tokenId + 1;
        }

        return from;
    }
}
