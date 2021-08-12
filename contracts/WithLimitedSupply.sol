// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

/// @author 1001.digital
/// @title A token tracker that limits the token supply and increments token IDs on each new mint.
abstract contract WithLimitedSupply {
    using Counters for Counters.Counter;

    /// @dev The maximum count of tokens this token tracker will hold.
    uint256 public maxSupply;

    /// @dev Keeps track of how many we have minted
    Counters.Counter public tokenCount;

    /// Instanciate the contract
    /// @param _tokenCount how many tokens this collection should hold
    constructor (uint256 _tokenCount) {
        maxSupply = _tokenCount;
    }

    /// @dev Check whether tokens are still available
    modifier ensureAvailability() {
        require(tokenCount.current() < maxSupply, "No more Scapes available");
        _;
    }

    /// Get the next token ID
    /// @dev Gets the next available token ID and keeps track of how many are still available.
    /// @return the next token ID
    function nextToken() internal ensureAvailability returns (uint256) {
        tokenCount.increment();

        return tokenCount.current();
    }
}
