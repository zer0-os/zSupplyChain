// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// quadratic term, with coefficient defined by the ratios of totalSupply to totalAssets
/// y = ax^2 + 0x + 0
/// x = sqrt(y/a)
/// a = totalSupply/totalAssets

contract ERC4626Quadratic is ERC4626 {
    uint internal constant DIV = 1e10;
    constructor(string memory name, string memory symbol, IERC20 reserveToken) ERC4626(reserveToken) ERC20(name, symbol) {}

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        return super._convertToShares(assets**2, rounding);
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        return Math.sqrt(super._convertToAssets(shares, rounding));
    }
}
