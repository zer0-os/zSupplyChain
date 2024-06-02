// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract QuadraticBondingToken is ERC4626 {
    uint entryFee; // entry fee in basis points from 1 to 100000. 1 => 0.001%. 100000 => 100%
    uint exitFee; // exit fee in basis points from 1 to 100000. 1 => 0.001%. 100000 => 100%

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) ERC4626(reserveToken) ERC20(name, symbol) {
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
    }

    function convertToShares(uint256 assets) public view override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    function convertToAssets(uint256 shares) public view override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 totalSupply_ = totalSupply();
        if (totalSupply_ == 0) {
            return assets;
        }
        return Math.mulDiv(assets, totalSupply_, (totalAssets() + 1)**2, rounding);
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 totalSupply_ = totalSupply();
        if (totalSupply_ == 0) {
            return shares;
        }
        return Math.mulDiv(shares, (totalAssets() + 1)**2, totalSupply_, rounding);
    }

    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        uint256 shares = previewDeposit(assets - ((assets * entryFee) / 100000));
        _deposit(_msgSender(), receiver, assets, shares);
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        uint256 assets = previewRedeem(shares);
        uint256 netAssets = assets - (assets * exitFee) / 100000;
        return super.redeem(netAssets, receiver, owner);
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external {
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external {
        exitFee = _exitFeeBasisPoints;
    }
}
