// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockENSRegistry {
    mapping(bytes32 => address) private _resolvers;

    function setResolver(bytes32 node, address addr) external {
        _resolvers[node] = addr;
    }

    function resolver(bytes32 node) external view returns (address) {
        return _resolvers[node];
    }
}

contract MockENSResolver {
    mapping(bytes32 => string) private _names;

    function setName(bytes32 node, string calldata ensName) external {
        _names[node] = ensName;
    }

    function name(bytes32 node) external view returns (string memory) {
        return _names[node];
    }
}
