// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../OnePerWallet.sol";

contract OnePerWalletExample is ERC721, OnePerWallet {
    uint256 private _tokenId;

    constructor()
        ERC721("OnePerWallet", "OPW")
    {}

    function mint() external {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal virtual override(ERC721, OnePerWallet)
        returns (address)
    {
        return OnePerWallet._update(to, tokenId, auth);
    }
}
