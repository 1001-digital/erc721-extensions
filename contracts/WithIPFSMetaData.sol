// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @author 1001.digital
/// @title Handle NFT Metadata stored on IPFS
abstract contract WithIPFSMetaData is ERC721 {
    using Strings for uint256;

    /// @dev The content identifier of the folder containing all JSON files.
    string public cid;

    /// Instantiate the contract
    /// @param _cid the content identifier for the token metadata.
    /// @dev be careful & make sure your metadata is correct - you can't change this
    constructor (string memory _cid) {
        cid = _cid;
    }

    /// Get the tokenURI for a tokenID
    /// @param tokenId the token id for which to get the matadata URL
    /// @dev links to the metadata json file on IPFS.
    /// @return the URL to the token metadata file
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(
            _baseURI(), "/", tokenId.toString(), ".json"
        ));
    }

    /// Configure the baseURI for the tokenURI method.
    /// @dev override the standard OpenZeppelin implementation
    /// @return the IPFS base uri
    function _baseURI() internal view virtual override returns (string memory) {
        return string(abi.encodePacked("ipfs://", cid));
    }
}
