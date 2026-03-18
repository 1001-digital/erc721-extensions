// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./../WithWithdrawals.sol";
import "./../WithFreezableMetadata.sol";
import "./../WithTokenPrices.sol";
import "./../WithContractMetaData.sol";
import "./../WithERC20Withdrawals.sol";

contract MiscFeaturesExample is
    ERC721,
    WithWithdrawals,
    WithFreezableMetadata,
    WithTokenPrices,
    WithContractMetaData,
    WithERC20Withdrawals
{
    uint256 private _tokenId;
    string private _uri;

    constructor(uint256 defaultPrice, string memory contractUri)
        ERC721("MiscToken", "MT")
        Ownable(msg.sender)
        WithTokenPrices(defaultPrice)
        WithContractMetaData(contractUri)
    {}

    function mint() external payable meetsPrice(_tokenId + 1) {
        _tokenId++;
        _safeMint(msg.sender, _tokenId);
    }

    function setBaseURI(string memory uri) external onlyOwner unfrozen {
        _uri = uri;
    }

    function baseURI() external view returns (string memory) {
        return _uri;
    }

    receive() external payable {}
}
