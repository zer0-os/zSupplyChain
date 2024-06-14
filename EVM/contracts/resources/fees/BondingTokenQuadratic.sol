// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract BondingTokenQuadratic is Ownable, ERC4626 {    
    uint internal constant BASIS = 1e5;
    uint internal constant MAX_DEP_DIV = 1e16;

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

    /** @dev See {IERC4626-previewDeposit}. */
    function previewDeposit(uint assets) public view override returns(uint256){
        uint shares = super.previewDeposit(assets);
        return shares - shares.mulDiv(entryFee, BASIS, Math.Rounding.Ceil);
    }

    /** @dev See {IERC4626-previewRedeem}. */
    function previewRedeem(uint shares) public view override returns(uint256){
        uint assets = super.previewRedeem(shares); 
        return assets - assets.mulDiv(exitFee, BASIS, Math.Rounding.Ceil);
    }


    /** @dev See {IERC4626-previewMint}. */
    function previewMint(uint shares) public view override returns(uint256){
        uint minted = super.previewMint(shares); 
        return minted - minted.mulDiv(exitFee, BASIS, Math.Rounding.Ceil);
    }


    /** @dev See {IERC4626-previewWithdraw}. */
    function previewWithdraw(uint assets) public view override returns(uint256){
        uint shares = super.previewWithdraw(assets);
        return shares - shares.mulDiv(entryFee, BASIS, Math.Rounding.Ceil);
    }

    /** @dev See {IERC4626-maxDeposit}. */
    function maxDeposit(address) public view virtual override returns (uint256) {
        return Math.sqrt(type(uint256).max)/totalSupply();
    }

    /** @dev See {IERC4626-maxMint}. */
    function maxMint(address) public view virtual override returns (uint256) {
        return Math.sqrt(type(uint256).max)/totalSupply();
    }

    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        return super._convertToShares(assets**2, rounding);
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
