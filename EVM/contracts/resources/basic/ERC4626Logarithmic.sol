// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// y = m*log2(x)
/// x = 2^(y/m)
/// m = totalSupply/totalAssets

/// does not work well due to integer math when performing 2^assets
/// illustrates the need for floating point math library to perform 2**x with fractional x

contract ERC4626Logarithmic is ERC4626 {
    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) ERC4626(reserveToken) ERC20(name, symbol) {}

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        return super._convertToShares(Math.log2(assets), rounding); 
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        return 2**super._convertToAssets(shares, rounding);
    }
}
