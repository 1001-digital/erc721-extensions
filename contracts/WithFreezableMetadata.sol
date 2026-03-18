// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title A small helper to handle freezing of metadata
abstract contract WithFreezableMetadata is Ownable {
    error MetadataFrozen();

    // Whether metadata is frozen
    bool public frozen;

    /// @dev Freeze the metadata
    function freeze() external onlyOwner {
        frozen = true;
    }

    /// @dev Whether metadata is unfrozen
    modifier unfrozen() {
        if (frozen) revert MetadataFrozen();

        _;
    }
}
