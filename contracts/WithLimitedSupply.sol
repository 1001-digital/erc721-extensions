// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

/// @author 1001.digital
/// @title A token tracker that limits the token supply and increments token IDs on each new mint.
abstract contract WithLimitedSupply {
    using Counters for Counters.Counter;

    // Keeps track of how many we have minted
    Counters.Counter private _tokenCount;

    /// @dev The maximum count of tokens this token tracker will hold.
    uint256 private _maxSupply;

    /// Instanciate the contract
    /// @param maxSupply_ how many tokens this collection should hold
    constructor (uint256 maxSupply_) {
        _maxSupply = maxSupply_;
    }


    /// @dev Get the max Supply
    function maxSupply() public view returns (uint256) {
        return _maxSupply;
    }

    /// @dev Get the current token count
    function tokenCount() public view returns (uint256) {
        return _tokenCount.current();
    }

    /// @dev Increment the token count and fetch the latest count
    function nextToken() internal virtual ensureAvailability returns (uint256) {
        _tokenCount.increment();

        return _tokenCount.current();
    }

    /// @dev Check whether tokens are still available
    modifier ensureAvailability() {
        require(tokenCount() < maxSupply(), "No more tokens available");
        _;
    }
}
