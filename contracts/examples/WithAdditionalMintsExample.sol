// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../LinearlyAssigned.sol";
import "./../WithAdditionalMints.sol";

contract WithAdditionalMintsExample is ERC721, LinearlyAssigned, WithAdditionalMints {
    constructor(
        uint256 amount,
        uint256 startFrom,
        string memory _cid
    )
        ERC721("LinearToken", "TT")
        LinearlyAssigned(amount, startFrom)
        WithIPFSMetaData(_cid)
    {}

    function mint () external
        ensureAvailability()
    {
        _safeMint(msg.sender, nextToken());
    }

    // Use LinarlyAssigned implementation
    function nextToken()
        internal virtual override(LinearlyAssigned, WithLimitedSupply)
        returns (uint256)
    {
        return LinearlyAssigned.nextToken();
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
