// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../LimitedTokensPerWallet.sol";

contract LimitedTokensPerWalletExample is ERC721, LimitedTokensPerWallet {
    uint256 private _tokenId;

    constructor(uint256 limit)
        ERC721("LimitedTokens", "LT")
        LimitedTokensPerWallet(limit)
    {}

    function mint() external {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal virtual override(ERC721, LimitedTokensPerWallet)
        returns (address)
    {
        return LimitedTokensPerWallet._update(to, tokenId, auth);
    }
}
