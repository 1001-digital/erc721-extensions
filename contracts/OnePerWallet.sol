// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@1001-digital/check-address/contracts/CheckAddress.sol";

/// @author 1001.digital
/// @title An extension that enables checking that an address only holds one token.
abstract contract OnePerWallet is ERC721 {
    // Mapping owner address to token
    mapping (address => uint256) private _ownedToken;

    /// Require an externally owned account to only hold one token.
    /// @param wallet the address to check
    /// @dev Only allow one token per wallet
    modifier onePerWallet(address wallet) {
        if (CheckAddress.isExternal(wallet)) {
            require(_ownedToken[wallet] == 0, "Can only hold one token per wallet");
        }

        _;
    }

    /// Require any account on the network to only hold one token.
    /// @param account the address to checkk
    /// @dev Only allow one token per account
    modifier onePerAccount(address account) {
        require(
            msg.sender == tx.origin &&
            _ownedToken[account] == 0,
            "Can only hold one token per account"
        );

        _;
    }

    /// Query the owner of a token.
    /// @param owner the address of the owner
    /// @dev Get the the token of an owner
    function tokenOf(address owner) public view virtual returns (uint256) {
        require(_ownedToken[owner] > 0, "No token for this account.");

        // We subtract 1 as we added 1 to account for 0-index based collections
        return _ownedToken[owner] - 1;
    }

    /// Store `_ownedToken` instead of `_balances`.
    /// @param to the address to which to mint the token
    /// @param tokenId the tokenId that should be minted
    /// @dev overrides the OpenZeppelin `_mint` method to accomodate for our own balance tracker
    function _mint(address to, uint256 tokenId) internal virtual override onePerWallet(to) {
        super._safeMint(to, tokenId);

        // We add one to account for 0-index based collections
        _ownedToken[to] = tokenId + 1;
    }

    /// Track transfers in `_ownedToken` instead of `_balances`
    /// @param from the address from which to transfer the token
    /// @param to the address to which to transfer the token
    /// @param tokenId the tokenId that is being transferred
    /// @dev overrides the OpenZeppelin `_transfer` method to accomodate for our own balance tracker
    function _transfer(address from, address to, uint256 tokenId) internal virtual override onePerWallet(to) {
        super._transfer(from, to, tokenId);

        _ownedToken[from] = 0;
        // We add one to account for 0-index based collections
        _ownedToken[to] = tokenId + 1;
    }
}
