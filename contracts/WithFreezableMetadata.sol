// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title A small helper to handle freezing of metadata
contract WithFreezableMetadata is Ownable {
    // Whether metadata is frozen
    bool public frozen;

    /// @dev Freeze the metadata
    function freeze() external onlyOwner {
        frozen = true;
    }

    /// @dev Whether metadata is unfrozen
    modifier unfrozen() {
        require(! frozen, "Metadata already frozen");

        _;
    }
}
