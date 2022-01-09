// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./WithLimitedSupply.sol";
import "./WithIPFSMetaData.sol";

/// @author 1001.digital
/// @title A token tracker that increments token IDs on each new mint.
abstract contract WithAdditionalMints is WithLimitedSupply, WithIPFSMetaData, Ownable {

    /// @param _cid The new collection CID which holds the metadata for the updated collection.
    /// @dev Add a new token to the supply
    function addToken(string memory _cid) public onlyOwner {
        addTokens(_cid, 1);
    }

    /// @param _cid The new collection CID which holds the metadata for the updated collection.
    /// @param _count The count of additional tokens.
    /// @dev Add a new token to the supply
    function addTokens(string memory _cid, uint256 _count) public virtual onlyOwner {
        _setCID(_cid);
        _setSupply(totalSupply() + _count);
    }

    /// @param _cid The new collection CID which holds the metadata for the updated collection.
    /// @param _to The owner of the new token.
    /// @dev Add and mint a new token
    function mintAdditionalToken(string memory _cid, address _to) public onlyOwner {
        addToken(_cid);

        _safeMint(_to, nextToken());
    }

    /// @param _cid The new collection CID which holds the metadata for the updated collection.
    /// @param _count The number of tokens to mint.
    /// @param _to The owner of the new tokens.
    /// @dev Add and mint new tokens
    function mintAdditionalTokens(string memory _cid, uint256 _count, address _to) public onlyOwner {
        addTokens(_cid, _count);

        for (uint256 index = 0; index < _count; index++) {
            _safeMint(_to, nextToken());
        }
    }
}
