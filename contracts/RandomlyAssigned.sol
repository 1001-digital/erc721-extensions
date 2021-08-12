// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

/// @author 1001.digital
/// @title Randomly assign tokenIDs from a given set of tokens.
abstract contract RandomlyAssigned {
    using Counters for Counters.Counter;

    // There are 10k tokens
    uint256 public constant MAX_COUNT = 10000;

    // Keep track of how many we have minted
    Counters.Counter public count;

    // Used for random index assignment
    Counters.Counter internal nonce;
    uint256[MAX_COUNT] internal tokenMatrix;

    /// @dev Enure that there are still available tokens
    modifier ensureAvailability() {
        require(count.current() < MAX_COUNT, "No more Scapes available");
        _;
    }

    /// Get the next token ID
    /// @dev Randomly gets a new token ID and keeps track of the ones that are still available.
    /// @return the next token ID
    function nextToken() internal returns (uint256) {
        uint256 maxIndex = MAX_COUNT - count.current();
        uint256 random = uint256(keccak256(
            abi.encodePacked(
                nonce.current(),
                msg.sender,
                block.coinbase,
                block.difficulty,
                block.timestamp
            )
        )) % maxIndex;

        uint256 value = 0;
        if (tokenMatrix[random] == 0) {
            // If this matrix position is empty, set the value to the generated random number.
            value = random;
        } else {
            // Otherwise, use the previously stored number from the matrix.
            value = tokenMatrix[random];
        }

        // If the last available tokenID is still unused...
        if (tokenMatrix[maxIndex - 1] == 0) {
            // ...store that ID in the current matrix position.
            tokenMatrix[random] = maxIndex - 1;
        } else {
            // ...otherwise copy over the stored number to the current matrix position.
            tokenMatrix[random] = tokenMatrix[maxIndex - 1];
        }

        // Increment counts
        count.increment();
        nonce.increment();

        return value;
    }
}
