// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract BasicLogarithmicBondingToken is ERC4626 {
    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) ERC4626(reserveToken) ERC20(name, symbol) {}

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 totalSupply_ = totalSupply();
        if (totalSupply_ == 0) {
            return assets;
        }
        return Math.mulDiv(assets, totalSupply_, Math.log2(totalAssets() + 1) + 1, rounding); // using log2 for example
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 totalSupply_ = totalSupply();
        if (totalSupply_ == 0) {
            return shares;
        }
        return Math.mulDiv(shares, Math.log2(totalAssets() + 1) + 1, totalSupply_, rounding); // using log2 for example
    }
}
