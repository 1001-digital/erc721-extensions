// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";

import "./../OneOfEachPerWallet.sol";

contract OneOfEachPerWalletExample is ERC1155, ERC1155Burnable, OneOfEachPerWallet {
    constructor() ERC1155("") {}

    function mint(uint256 id, uint256 amount) external {
        _mint(msg.sender, id, amount, "");
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal virtual override(ERC1155, OneOfEachPerWallet)
    {
        OneOfEachPerWallet._update(from, to, ids, values);
    }
}
