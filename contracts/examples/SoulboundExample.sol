// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

import "./../Soulbound.sol";

contract SoulboundExample is ERC721, ERC721Burnable, Soulbound {
    uint256 private _tokenId;

    constructor()
        ERC721("Soulbound", "SBT")
    {}

    function mint() external {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal virtual override(ERC721, Soulbound)
        returns (address)
    {
        return Soulbound._update(to, tokenId, auth);
    }
}
