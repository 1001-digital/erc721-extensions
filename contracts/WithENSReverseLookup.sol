// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @author 1001.digital
/// @title Resolve ENS reverse records for on-chain display names.
abstract contract WithENSReverseLookup {

    /// @dev namehash("addr.reverse")
    bytes32 internal constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    address internal constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    /// @dev Resolve a display name for an address. Tries ENS reverse
    ///      resolution first, falls back to a shortened hex string.
    function _displayName(address addr) internal view virtual returns (string memory) {
        if (ENS_REGISTRY.code.length == 0) return _shortHex(addr);

        bytes32 node = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, _sha3Hex(addr)));

        try IENS(ENS_REGISTRY).resolver(node) returns (address resolver) {
            if (resolver != address(0) && resolver.code.length > 0) {
                try IENSResolver(resolver).name(node) returns (string memory ensName) {
                    if (bytes(ensName).length > 0) return ensName;
                } catch {}
            }
        } catch {}

        return _shortHex(addr);
    }

    /// @dev keccak256 of the lowercase hex representation of an address (no 0x prefix).
    function _sha3Hex(address addr) internal pure returns (bytes32) {
        bytes memory result = new bytes(40);
        uint160 val = uint160(addr);
        unchecked {
            for (uint256 i = 40; i > 0; --i) {
                result[i - 1] = _lowerHex(uint8(val & 0xf));
                val >>= 4;
            }
        }
        return keccak256(result);
    }

    /// @dev Format an address as "0x1234...5678" (4 prefix chars + 4 suffix chars).
    function _shortHex(address addr) internal pure returns (string memory) {
        bytes memory out = new bytes(13);
        out[0] = "0";
        out[1] = "x";
        uint160 val = uint160(addr);
        unchecked {
            for (uint256 i = 0; i < 4; ++i) {
                out[2 + i] = _upperHex(uint8(val >> (156 - i * 4)) & 0xf);
            }
        }
        out[6] = ".";
        out[7] = ".";
        out[8] = ".";
        unchecked {
            for (uint256 i = 0; i < 4; ++i) {
                out[9 + i] = _upperHex(uint8(val >> (12 - i * 4)) & 0xf);
            }
        }
        return string(out);
    }

    function _lowerHex(uint8 v) private pure returns (bytes1) {
        return bytes1(v + (v < 10 ? 0x30 : 0x57));
    }

    function _upperHex(uint8 v) private pure returns (bytes1) {
        return bytes1(v + (v < 10 ? 0x30 : 0x37));
    }
}

interface IENS {
    function resolver(bytes32 node) external view returns (address);
}

interface IENSResolver {
    function name(bytes32 node) external view returns (string memory);
}
