// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract BondingTokenQuadratic is Ownable, ERC4626 {
    using Math for uint;

    uint entryFee; // entry fee in basis points from 1 to 100000. 1 => 0.001%. 100000 => 100%
    uint exitFee; // exit fee in basis points from 1 to 100000. 1 => 0.001%. 100000 => 100%

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol) {
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
    }

    function previewDeposit(uint assets) public view override returns(uint256){
        uint shares = super.previewDeposit(assets);
        return shares - (shares * entryFee) / 100000;
    }

    function previewRedeem(uint shares) public view override returns(uint256){
        uint assets = super.previewRedeem(shares); 
        return assets - (assets * exitFee) / 100000;
    }

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        return assets * super._convertToShares(assets, rounding);
    }

    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        return Math.sqrt(super._convertToAssets(shares, rounding));
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external onlyOwner(){
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external {
        exitFee = _exitFeeBasisPoints;
    }
}
