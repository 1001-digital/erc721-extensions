// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./WithENSReverseLookup.sol";

/// @author 1001.digital
/// @title Soulbound ERC721 whose owner can be bound to an ENS namehash or to a plain address.
/// @dev Each token is minted in one of two modes:
///        * ENS-bound — `ownerOf` performs a live forward resolution every call.
///        * Address-bound — owner is fixed at mint time (standard soulbound behavior).
///      Tokens cannot be transferred or approved. The implementing contract decides who
///      may mint in which mode.
abstract contract WithENSBoundOwnership is ERC721, WithENSReverseLookup {

    /// @dev Thrown when a transfer or approval would violate soulbound semantics.
    error Soulbound();
    /// @dev Thrown when the bound ENS name has no resolver or no `addr` record.
    error UnresolvedName(bytes32 node);
    /// @dev Thrown when binding to the zero namehash or zero address.
    error InvalidBinding();

    /// @dev Zero for address-bound tokens.
    mapping(uint256 => bytes32) private _nameOf;

    /// @dev Only changes on mint and burn.
    mapping(bytes32 => uint256) private _balanceByName;

    /// @dev `from` field for `syncOwnership`'s Transfer event when live resolution drifts.
    ///      Only written for ENS-bound tokens; address-bound tokens fall back to `ownerOf`.
    mapping(uint256 => address) private _lastEmittedOwner;

    /// @dev ENS-bound tokens are counted via `_balanceByName` and the holder's reverse record.
    mapping(address => uint256) private _addressBoundBalance;

    /// @notice The ENS namehash bound to a token, or `bytes32(0)` for address-bound tokens.
    function nameOf(uint256 tokenId) public view returns (bytes32) {
        _requireOwned(tokenId);
        return _nameOf[tokenId];
    }

    /// @notice Number of tokens bound to a given ENS namehash.
    function balanceOfName(bytes32 node) public view returns (uint256) {
        return _balanceByName[node];
    }

    /// @notice The current owner of a token.
    /// @dev For ENS-bound tokens, performs a live forward resolution and reverts
    ///      `UnresolvedName` if the name has no resolver or `addr` record.
    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        bytes32 node = _nameOf[tokenId];
        if (node != bytes32(0)) return _resolveName(node);
        return super.ownerOf(tokenId);
    }

    /// @notice Total token count for an address: address-bound tokens plus any
    ///         ENS-bound tokens currently resolving to this address via its primary name.
    /// @dev Reverse-resolves `owner` to a name and forward-verifies that the name
    ///      resolves back to `owner`. Unverified reverse records contribute nothing.
    function balanceOf(address owner) public view virtual override returns (uint256) {
        return _addressBoundBalance[owner] + _ensBalanceOf(owner);
    }

    /// @notice Re-emit a `Transfer` event if the token's resolved owner has changed.
    /// @dev Permissionless. Address-bound tokens never drift, so this is a no-op for them.
    /// @return current The address that owns the token right now.
    function syncOwnership(uint256 tokenId) external returns (address current) {
        current = ownerOf(tokenId);
        // Address-bound: fall back to `current` so the diff is always zero.
        address previous = _nameOf[tokenId] == bytes32(0) ? current : _lastEmittedOwner[tokenId];
        if (current != previous) {
            _lastEmittedOwner[tokenId] = current;
            emit Transfer(previous, current, tokenId);
        }
    }

    /// @dev Mint a token bound to an ENS namehash. The implementing contract is
    ///      responsible for any access control (e.g. requiring `msg.sender` to be
    ///      the resolved address, restricting which names are eligible, etc.).
    function _mintToName(uint256 tokenId, bytes32 node) internal virtual {
        if (node == bytes32(0)) revert InvalidBinding();
        address resolved = _resolveName(node);
        // Bind before _mint so `_update` can distinguish ENS-bound from address-bound mints.
        _nameOf[tokenId] = node;
        unchecked { _balanceByName[node] += 1; }
        _mint(resolved, tokenId);
    }

    /// @dev Mint a plain soulbound token bound to a fixed address.
    function _mintToAddress(uint256 tokenId, address to) internal virtual {
        if (to == address(0)) revert InvalidBinding();
        _mint(to, tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address from) {
        from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) revert Soulbound();
        if (from == address(0)) {
            if (_nameOf[tokenId] != bytes32(0)) {
                _lastEmittedOwner[tokenId] = to;
            } else {
                unchecked { _addressBoundBalance[to] += 1; }
            }
        } else {
            bytes32 node = _nameOf[tokenId];
            if (node != bytes32(0)) {
                unchecked { _balanceByName[node] -= 1; }
                delete _nameOf[tokenId];
                delete _lastEmittedOwner[tokenId];
            } else {
                unchecked { _addressBoundBalance[from] -= 1; }
            }
        }
    }

    function approve(address, uint256) public virtual override {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert Soulbound();
    }

    /// @dev Reverts if the name has no resolver or no `addr` record (expired / unset).
    function _resolveName(bytes32 node) internal view returns (address) {
        address resolver = IENS(ENS_REGISTRY).resolver(node);
        if (resolver == address(0) || resolver.code.length == 0) revert UnresolvedName(node);
        address resolved = IAddrResolver(resolver).addr(node);
        if (resolved == address(0)) revert UnresolvedName(node);
        return resolved;
    }

    /// @dev Reverse-resolve `owner` to its primary ENS name and return the count
    ///      of ENS-bound tokens for that name. Forward-verifies the name points back
    ///      to `owner`; otherwise returns 0.
    function _ensBalanceOf(address owner) internal view returns (uint256) {
        if (ENS_REGISTRY.code.length == 0) return 0;

        bytes32 reverseNode = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, _sha3Hex(owner)));
        address reverseResolver = IENS(ENS_REGISTRY).resolver(reverseNode);
        if (reverseResolver == address(0) || reverseResolver.code.length == 0) return 0;

        string memory name;
        try IENSResolver(reverseResolver).name(reverseNode) returns (string memory n) {
            name = n;
        } catch { return 0; }
        if (bytes(name).length == 0) return 0;

        bytes32 forwardNode = _namehash(bytes(name));
        address forwardResolver = IENS(ENS_REGISTRY).resolver(forwardNode);
        if (forwardResolver == address(0) || forwardResolver.code.length == 0) return 0;

        try IAddrResolver(forwardResolver).addr(forwardNode) returns (address resolved) {
            if (resolved != owner) return 0;
        } catch { return 0; }

        return _balanceByName[forwardNode];
    }

    /// @dev Compute the ENS namehash of a dot-separated name, e.g. "vault.alice.eth".
    ///      Walks right-to-left, hashing labels into the running node.
    function _namehash(bytes memory name) internal pure returns (bytes32 node) {
        uint256 labelEnd = name.length;
        for (uint256 i = name.length; i > 0; --i) {
            if (name[i - 1] == 0x2e /* '.' */) {
                node = keccak256(abi.encodePacked(node, _hashSlice(name, i, labelEnd)));
                labelEnd = i - 1;
            }
        }
        node = keccak256(abi.encodePacked(node, _hashSlice(name, 0, labelEnd)));
    }

    function _hashSlice(bytes memory data, uint256 start, uint256 end) private pure returns (bytes32 h) {
        assembly {
            h := keccak256(add(add(data, 0x20), start), sub(end, start))
        }
    }
}
