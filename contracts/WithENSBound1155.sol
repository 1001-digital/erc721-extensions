// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./WithENSReverseLookup.sol";

/// @author 1001.digital
/// @title Soulbound ERC1155 whose balances can be bound to ENS namehashes or to plain addresses.
/// @dev For each id, one or more namehashes can hold a balance; the holder is whoever that
///      namehash currently resolves to. Address-bound balances live alongside and behave as
///      standard soulbound ERC1155 holdings. Tokens cannot be transferred or approved.
abstract contract WithENSBound1155 is ERC1155, WithENSReverseLookup {

    error Soulbound();
    error InvalidBinding();

    mapping(uint256 => mapping(bytes32 => uint256)) private _balanceByName;
    mapping(uint256 => mapping(bytes32 => address)) private _lastEmittedHolder;
    mapping(address => mapping(uint256 => uint256)) private _addressBoundBalance;

    /// @notice Number of tokens of `id` bound to `node` (regardless of current resolution).
    function balanceOfByName(uint256 id, bytes32 node) public view returns (uint256) {
        return _balanceByName[id][node];
    }

    /// @notice The address we last emitted a TransferSingle to for this (id, node) binding.
    function lastHolderOf(uint256 id, bytes32 node) external view returns (address) {
        return _lastEmittedHolder[id][node];
    }

    /// @notice Balance for an account: address-bound tokens plus any ENS-bound tokens of `id`
    ///         whose binding currently resolves to `account` via its primary ENS name.
    function balanceOf(address account, uint256 id) public view virtual override returns (uint256) {
        return _addressBoundBalance[account][id] + _ensBalanceOfId(account, id);
    }

    /// @notice Re-emit a TransferSingle moving the (id, node) holding from the previously
    ///         emitted address to the name's current resolution. Also syncs OZ's internal
    ///         balance so subsequent burns can succeed against the live owner.
    /// @dev Reverts `UnresolvedName` if the name is currently unresolvable.
    function syncHolder(uint256 id, bytes32 node) external returns (address current) {
        current = _resolveName(node);
        (, address last) = _alignOzBalance(id, node, current);
        if (last != current) _lastEmittedHolder[id][node] = current;
    }

    /// @dev Mint strictly ENS-bound; reverts if `node` can't be resolved on-chain.
    function _mintToName(uint256 id, uint256 amount, bytes32 node) internal virtual {
        _mintToName(id, amount, node, address(0));
    }

    /// @dev Mint bound to `node`; if resolution fails (CCIP-Read, unset, etc.) and `fallbackTo`
    ///      is non-zero, fall through to an address-bound mint. Reverts if both fail.
    function _mintToName(uint256 id, uint256 amount, bytes32 node, address fallbackTo) internal virtual {
        if (node == bytes32(0)) revert InvalidBinding();
        address resolved = _tryResolveName(node);
        if (resolved != address(0)) {
            // Move any existing balance to the current resolution before adding more, so OZ's
            // `_balances` stays consolidated at a single holder per (id, node).
            (uint256 existing, address last) = _alignOzBalance(id, node, resolved);
            _balanceByName[id][node] = existing + amount;
            if (last != resolved) _lastEmittedHolder[id][node] = resolved;
            _mint(resolved, id, amount, "");
        } else if (fallbackTo != address(0)) {
            _addressBoundBalance[fallbackTo][id] += amount;
            _mint(fallbackTo, id, amount, "");
        } else {
            revert UnresolvedName(node);
        }
    }

    /// @dev Mint a plain soulbound balance bound to a fixed address.
    function _mintToAddress(uint256 id, uint256 amount, address to) internal virtual {
        if (to == address(0)) revert InvalidBinding();
        _addressBoundBalance[to][id] += amount;
        _mint(to, id, amount, "");
    }

    /// @dev Burn `amount` from the (id, node) binding. Aligns OZ's balance to the live
    ///      resolution first so the burn's TransferSingle reports the current owner.
    ///      Reverts `UnresolvedName` if the name can't be resolved.
    function _burnFromName(uint256 id, uint256 amount, bytes32 node) internal virtual {
        address current = _resolveName(node);
        (uint256 existing, address last) = _alignOzBalance(id, node, current);
        if (last != current) _lastEmittedHolder[id][node] = current;
        // Checked subtraction: if a holder also carries address-bound balance of the same id,
        // OZ's `_burn` may accept `amount > existing` against the summed balance — this guards
        // us against silently underflowing the per-name tracker.
        _balanceByName[id][node] = existing - amount;
        _burn(current, id, amount);
    }

    /// @dev Burn `amount` of `id` from an address-bound holder. Checked subtraction guards
    ///      against `amount` exceeding the address-bound portion when the holder also has
    ///      ENS-bound balance of the same id (OZ's balance check alone wouldn't catch this).
    function _burnFromAddress(address from, uint256 id, uint256 amount) internal virtual {
        _addressBoundBalance[from][id] -= amount;
        _burn(from, id, amount);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual override {
        if (from != address(0) && to != address(0)) revert Soulbound();
        super._update(from, to, ids, values);
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert Soulbound();
    }

    /// @dev If the (id, node) binding has stored balance held by someone other than `target`
    ///      in OZ's view, move it to `target` via a direct `super._update` (emits a
    ///      TransferSingle, bypasses our soulbound check since we call super directly).
    ///      Returns the pre-align balance and last-emitted holder so callers can avoid
    ///      re-reading the same storage slots.
    function _alignOzBalance(uint256 id, bytes32 node, address target)
        private
        returns (uint256 existing, address last)
    {
        existing = _balanceByName[id][node];
        last = _lastEmittedHolder[id][node];
        if (existing > 0 && last != address(0) && last != target) {
            uint256[] memory ids = new uint256[](1);
            uint256[] memory vals = new uint256[](1);
            ids[0] = id;
            vals[0] = existing;
            super._update(last, target, ids, vals);
        }
    }

    /// @dev Reverse-resolve `account` to its primary ENS name and return the count of tokens
    ///      of `id` bound to that name. Forward-verifies; returns 0 if unverified.
    function _ensBalanceOfId(address account, uint256 id) internal view returns (uint256) {
        if (ENS_REGISTRY.code.length == 0) return 0;

        bytes32 reverseNodeHash = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, _sha3Hex(account)));
        address reverseResolver = IENS(ENS_REGISTRY).resolver(reverseNodeHash);
        if (reverseResolver == address(0) || reverseResolver.code.length == 0) return 0;

        string memory name;
        try IENSResolver(reverseResolver).name(reverseNodeHash) returns (string memory n) {
            name = n;
        } catch { return 0; }
        if (bytes(name).length == 0) return 0;

        bytes32 forwardNode = _namehash(bytes(name));
        address forwardResolver = IENS(ENS_REGISTRY).resolver(forwardNode);
        if (forwardResolver == address(0) || forwardResolver.code.length == 0) return 0;

        try IAddrResolver(forwardResolver).addr(forwardNode) returns (address resolved) {
            if (resolved != account) return 0;
        } catch { return 0; }

        return _balanceByName[id][forwardNode];
    }
}
