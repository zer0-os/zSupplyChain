// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


/**
 * @title IZeroToken
 * @dev Interface for the BondingToken contract.
 */
interface IZeroToken {
    function setVaultFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) external;

    function setCreatorFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) external;

    function setCreatorFeeRecipient(address newRecipient) external;
}