// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../WithENSReverseLookup.sol";

contract WithENSReverseLookupExample is WithENSReverseLookup {
    function displayName(address addr) external view returns (string memory) {
        return _displayName(addr);
    }

    function shortHex(address addr) external pure returns (string memory) {
        return _shortHex(addr);
    }
}
