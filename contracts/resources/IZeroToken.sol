// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


/**
 * @title IZeroToken
 * @dev Interface for the BondingToken contract.
 */
interface IZeroToken {
    /**
     * @dev Sets the vault fees.
     * @param entryFeeBasisPoints The new entry fee in basis points. Must not exceed 50%.
     */
    function setVaultFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) external;
    
    /**
     * @dev Sets the creator fees.
     * @param exitFeeBasisPoints The new exit fee in basis points. Must not exceed 50%.
     */
    function setCreatorFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) external;
}
