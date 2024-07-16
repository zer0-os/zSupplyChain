// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBondingToken
 * @dev Interface for the BondingToken contract.
 */
interface IBondingToken {
    /**
     * @dev Returns the entry fee in basis points, the numerator of the fee ratio applied.
     */
    function entryFee() external view returns (uint);

    /**
     * @dev Returns the exit fee in basis points, the numerator of the fee ratio applied.
     */
    function exitFee() external view returns (uint);

    /**
     * @dev Previews the number of shares that would be minted for the given amount of assets,
     * after applying the entry fee.
     * @param assets The amount of assets to deposit.
     * @return shares The amount of shares that would be minted.
     */
    function previewDeposit(uint assets) external view returns (uint256);

    /**
     * @dev Previews the amount of assets required to mint the given number of shares,
     * after applying the exit fee.
     * @param shares The amount of shares to mint.
     * @return assets The amount of assets required.
     */
    function previewMint(uint shares) external view returns (uint256);

    /**
     * @dev Previews the number of assets that would be redeemed for the given amount of shares,
     * after applying the exit fee.
     * @param shares The amount of shares to redeem.
     * @return assets The amount of assets that would be redeemed.
     */
    function previewRedeem(uint shares) external view returns (uint256);

    /**
     * @dev Previews the number of shares that would be burned for the given amount of assets withdrawn,
     * after applying the entry fee.
     * @param assets The amount of assets to withdraw.
     * @return shares The amount of shares that would be burned.
     */
    function previewWithdraw(uint assets) external view returns (uint256);

    /**
     * @dev Sets the entry fee.
     * @param entryFeeBasisPoints The new entry fee in basis points. Must not exceed 50%.
     */
    function setEntryFee(uint256 entryFeeBasisPoints) external;

    /**
     * @dev Sets the exit fee.
     * @param exitFeeBasisPoints The new exit fee in basis points. Must not exceed 50%.
     */
    function setExitFee(uint256 exitFeeBasisPoints) external;

    /**
     * @dev Returns the entry fee ratio.
     * @return The entry fee ratio.
     */
    function getEntryFeeRatio() external view returns (uint);

    /**
     * @dev Returns the exit fee ratio.
     * @return The exit fee ratio.
     */
    function getExitFeeRatio() external view returns (uint);
}
