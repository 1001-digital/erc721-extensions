// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../WithIPFSMetaData.sol";

contract WithIPFSMetaDataExample is
    ERC721,
    WithIPFSMetaData
{
    /// @dev Thrown when all tokens have been minted.
    error MaxSupplyReached();

    uint256 private _tokenId = 0;
    uint256 public MAX_SUPPLY = 100;

    constructor(string memory _cid)
        ERC721("CleanToken", "CT")
        WithIPFSMetaData(_cid)
    {}

    function mint () external {
        if (_tokenId >= MAX_SUPPLY) revert MaxSupplyReached();

        _tokenId++;
        _safeMint(msg.sender, _tokenId);
    }

    // Use WithIPFSMetaData implementation
    function _baseURI()
        internal view override(ERC721, WithIPFSMetaData)
        returns (string memory)
    {
        return WithIPFSMetaData._baseURI();
    }

    // Use WithIPFSMetaData implementation
    function tokenURI(uint256 tokenId)
        public view override(ERC721, WithIPFSMetaData)
        returns (string memory)
    {
        return WithIPFSMetaData.tokenURI(tokenId);
    }
}
