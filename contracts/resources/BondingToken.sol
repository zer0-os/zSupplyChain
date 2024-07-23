// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;


import {IBondingToken} from './IBondingToken.sol';
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626, ERC20, Math} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/**
 * @title BondingToken
 * @dev BondingToken contract. Enables entry and exit fees on an ERC4626 vault.
 */

contract BondingToken is IBondingToken, Ownable, ERC4626{
    using Math for uint;

    /// @notice The constant basis point used for fee calculations, equivalent to 10000.
    /// @dev This represents 100% in basis points, where 1 basis point is 0.01%.
    uint public constant BASIS = 1e4;

    /// @notice The entry fee basis points.
    /// @dev This fee is applied when depositing and minting.
    uint public entryFee;

    /// @notice The exit fee basis points.
    /// @dev This fee is applied when redeeming and withdrawing.
    uint public exitFee;

    /// @notice Initializes the contract with the given parameters and sets up the necessary inheritance.
    /// @param name The name of the ERC20 token.
    /// @param symbol The symbol of the ERC20 token.
    /// @param reserveToken The ERC20 token used as the reserve asset.
    /// @param entryFeeBasisPoints The entry fee in basis points (1 basis point = 0.01%).
    /// @param exitFeeBasisPoints The exit fee in basis points (1 basis point = 0.01%).
    /// @dev This constructor initializes the contract by setting the entry and exit fees.
    /// @dev If the DECIMAL_OFFSET between the asset and share tokens is 0, 
    /// the user SHOULD make a significant initial deposit to avoid the inflation attack.
    /// See: https://docs.openzeppelin.com/contracts/5.x/erc4626
    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol){
        setEntryFee(entryFeeBasisPoints);
        setExitFee(exitFeeBasisPoints);
    }
    
    /**
     * @dev Previews the number of shares that would be minted for the given amount of assets,
     * after applying the entry fee.
     * @param assets The amount of assets to deposit.
     * @return shares The amount of shares that would be minted.
     */
    function previewDeposit(uint assets) public view override returns(uint256) {
        return super.previewDeposit(assets - _feeOnTotal(assets, entryFee));
    }

    /**
     * @dev Previews the amount of assets required to mint the given number of shares,
     * after applying the entry fee.
     * @param shares The amount of shares to mint.
     * @return assets The amount of assets required.
     */
    function previewMint(uint shares) public view override returns(uint256) {
        uint256 assets = super.previewMint(shares);
        return assets + _feeOnRaw(assets, entryFee);
    }

    /**
     * @dev Previews the number of assets that would be redeemed for the given amount of shares,
     * after applying the exit fee.
     * @param shares The amount of shares to redeem.
     * @return assets The amount of assets that would be redeemed.
     */
    function previewRedeem(uint shares) public view override returns(uint256) {
        uint256 assets = super.previewRedeem(shares);
        return assets - _feeOnTotal(assets, exitFee);
    }

    /**
     * @dev Previews the number of shares that would be burned for the given amount of assets withdrawn,
     * after applying the exit fee.
     * @param assets The amount of assets to withdraw.
     * @return shares The amount of shares that would be burned.
     */
    function previewWithdraw(uint assets) public view override returns(uint256) {
        return super.previewWithdraw(assets + _feeOnRaw(assets, exitFee));
    }

    /**
     * @dev Sets the entry fee.
     * @param entryFeeBasisPoints The new entry fee in basis points. Must not exceed 50%.
     */
    function setEntryFee(uint256 entryFeeBasisPoints) public override onlyOwner {
        require(BASIS >= entryFeeBasisPoints * 2, "Fee exceeds 50 percent");
        entryFee = entryFeeBasisPoints;
    }

    /**
     * @dev Sets the exit fee.
     * @param exitFeeBasisPoints The new exit fee in basis points. Must not exceed 50%.
     */
    function setExitFee(uint256 exitFeeBasisPoints) public override onlyOwner {
        require(BASIS >= exitFeeBasisPoints * 2, "Fee exceeds 50 percent");
        exitFee = exitFeeBasisPoints;
    }

    /// @dev Calculates the fees that should be added to an amount `assets` that does not already include fees.
    /// Used in {IERC4626-mint} and {IERC4626-withdraw} operations.
    function _feeOnRaw(uint256 assets, uint256 feeBasisPoints) private pure returns (uint256) {
        return assets.mulDiv(feeBasisPoints, BASIS, Math.Rounding.Ceil);
    }

    /// @dev Calculates the fee part of an amount `assets` that already includes fees.
    /// Used in {IERC4626-deposit} and {IERC4626-redeem} operations.
    function _feeOnTotal(uint256 assets, uint256 feeBasisPoints) private pure returns (uint256) {
        return assets.mulDiv(feeBasisPoints, feeBasisPoints + BASIS, Math.Rounding.Ceil);
    }
}