// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title Link to your collection's contract meta data right from within your smart contract.
abstract contract WithContractMetaData is Ownable {
    // The URI to the contract meta data.
    string private _contractURI;

    /// Instanciate the contract
    /// @param uri the URL to the contract metadata
    constructor (string memory uri) {
        _contractURI = uri;
    }

    /// Set the contract metadata URI
    /// @param uri the URI to set
    /// @dev the contract metadata should link to a metadata JSON file.
    function setContractURI(string memory uri) public virtual onlyOwner {
        _contractURI = uri;
    }

    /// Expose the contractURI
    /// @return the contract metadata URI.
    function contractURI() public view virtual returns (string memory) {
        return _contractURI;
    }

}
