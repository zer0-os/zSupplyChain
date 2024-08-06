// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;


import {IZeroToken} from './IZeroToken.sol';
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626, ERC20, Math} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BondingToken
 * @dev BondingToken contract. Enables entry and exit fees on an ERC4626 vault.
 * @custom:security-contact admin@zero.tech
 */
contract ZeroToken is IZeroToken, Ownable, ERC4626 {
    using Math for uint256;

    /// @notice Thrown when the entry fee exceeds the limit.
    error EntryFeeExceedsLimit(uint256 entryFeeBasisPoints);

    /// @notice Thrown when the exit fee exceeds the limit.
    error ExitFeeExceedsLimit(uint256 exitFeeBasisPoints);

    /// @notice Emitted when the contract is initialized.
    /// @param deployer The address of the contract deployer
    /// @param name The name of the ERC20 token.
    /// @param symbol The symbol of the ERC20 token.
    /// @param reserveToken The ERC20 token used as the reserve asset.
    event BondingTokenDeployed(
        address deployer,
        string name,
        string symbol,
        address reserveToken
    );

    /// @notice Emitted when the entry fee is set.
    /// @param entryFeeBasisPoints The new entry fee in basis points.
    event VaultEntryFeeSet(uint256 entryFeeBasisPoints);

    /// @notice Emitted when the exit fee is set.
    /// @param exitFeeBasisPoints The new exit fee in basis points.
    event VaultExitFeeSet(uint256 exitFeeBasisPoints);

    /// @notice Emitted when the entry fee is set.
    /// @param entryFeeBasisPoints The new entry fee in basis points.
    event ProtocolEntryFeeSet(uint256 entryFeeBasisPoints);

    /// @notice Emitted when the exit fee is set.
    /// @param exitFeeBasisPoints The new exit fee in basis points.
    event ProtocolExitFeeSet(uint256 exitFeeBasisPoints);

    /// @notice Emitted when the entry fee is set.
    /// @param entryFeeBasisPoints The new entry fee in basis points.
    event CreatorEntryFeeSet(uint256 entryFeeBasisPoints);

    /// @notice Emitted when the exit fee is set.
    /// @param exitFeeBasisPoints The new exit fee in basis points.
    event CreatorExitFeeSet(uint256 exitFeeBasisPoints);

    /// @notice Emitted when the vault fee recipient is set.
    /// @param recipient The new vault fee recipient.
    event VaultFeeRecipientSet(address recipient);

    /// @notice Emitted when the protocol fee recipient is set.
    /// @param recipient The new protocol fee recipient.
    event ProtocolFeeRecipientSet(address recipient);

    /// @notice Emitted when the creator fee recipient is set.
    /// @param recipient The new creator fee recipient.
    event CreatorFeeRecipientSet(address recipient);

    /// @notice The constant basis point used for fee calculations, equivalent to 10000.
    /// @dev This represents 100% in basis points, where 1 basis point is 0.01%.
    uint256 public constant BASIS = 1e4;

    /// @notice The entry fee basis points, paid to the vault.
    /// @dev This fee is applied when depositing and minting.
    uint256 public vaultEntryFee;

    /// @notice The exit fee basis points, paid to the vault.
    /// @dev This fee is applied when redeeming and withdrawing.
    uint256 public vaultExitFee;

    /// @notice The entry fee basis points, paid to protocol address.
    /// @dev This fee is applied when depositing and minting.
    uint256 public protocolEntryFee;

    /// @notice The exit fee basis points, paid to protocol address.
    /// @dev This fee is applied when redeeming and withdrawing.
    uint256 public protocolExitFee;

        /// @notice The entry fee basis points, paid to creator address.
    /// @dev This fee is applied when depositing and minting.
    uint256 public creatorEntryFee;

    /// @notice The exit fee basis points, paid to creator address.
    /// @dev This fee is applied when redeeming and withdrawing.
    uint256 public creatorExitFee;

    /// @notice The receiver of the protocol fees
    /// @dev This recipient is paid during any deposit or withdraw.
    address public protocolFeeRecipient;

    /// @notice The receiver of the creator fees
    /// @dev This recipient is paid during any deposit or withdraw.
    address public creatorFeeRecipient;

    /// @notice Initializes the contract with the given parameters and sets up the necessary inheritance.
    /// @param name The name of the ERC20 token.
    /// @param symbol The symbol of the ERC20 token.
    /// @param reserveToken The ERC20 token used as the reserve asset.
    /// @param vaultEntryFeeBps The entry fee in basis points (1 basis point = 0.01%).
    /// @param vaultExitFeeBps The exit fee in basis points (1 basis point = 0.01%).
    /// @param protocolEntryFeeBps The entry fee in basis points (1 basis point = 0.01%).
    /// @param protocolExitFeeBps The exit fee in basis points (1 basis point = 0.01%).
    /// @param creatorEntryFeeBps The entry fee in basis points (1 basis point = 0.01%).
    /// @param creatorExitFeeBps The exit fee in basis points (1 basis point = 0.01%).
    /// @dev This constructor initializes the contract by setting the entry and exit fees.
    constructor(
        string memory name,
        string memory symbol,
        IERC20 reserveToken,
        uint256 vaultEntryFeeBps,
        uint256 vaultExitFeeBps,
        uint256 protocolEntryFeeBps,
        uint256 protocolExitFeeBps,
        uint256 creatorEntryFeeBps,
        uint256 creatorExitFeeBps
    ) 
        Ownable(msg.sender)
        ERC4626(reserveToken)
        ERC20(name, symbol)
    {
        setVaultFees(vaultEntryFeeBps, vaultExitFeeBps);
        setProtocolFees(protocolEntryFeeBps, protocolExitFeeBps);
        setCreatorFees(creatorEntryFeeBps, creatorExitFeeBps);

        creatorFeeRecipient = msg.sender;
        protocolFeeRecipient = address(0);

        emit BondingTokenDeployed(msg.sender, name, symbol, address(reserveToken));
    }

    /**
     * @dev Returns the maximum amount of the underlying asset that can be withdrawn from the owner balance in the
     * Vault, through a withdraw call. 
     * Overriden with fee limiter.
     * @param owner The address to check for maximum withdraw
     */ 
    function maxWithdraw(address owner) public view virtual override returns (uint256) {
        uint assets = _convertToAssets(balanceOf(owner), Math.Rounding.Floor);
        return assets - _feeOnTotal(assets, vaultExitFee);
    }

    /**
     * @dev Previews the number of shares that would be minted for the given amount of assets,
     * after applying the entry fee.
     * @param assets The amount of assets to deposit.
     * @return shares The amount of shares that would be minted.
     */
    function previewDeposit(uint256 assets) public view override returns (uint256) {
        uint total = assets.mulDiv(protocolEntryFee + creatorEntryFee, BASIS);
        return super.previewDeposit(total - _feeOnTotal(assets, vaultEntryFee));
    }

    /**
     * @dev Previews the amount of assets required to mint the given number of shares,
     * after applying the entry fee.
     * @param shares The amount of shares to mint.
     * @return assets The amount of assets required.
     */
    function previewMint(uint256 shares) public view override returns (uint256) {
        uint256 assets = super.previewMint(shares);
        return assets + _feeOnRaw(assets, vaultEntryFee);
    }

    /**
     * @dev Previews the number of assets that would be redeemed for the given amount of shares,
     * after applying the exit fee.
     * @param shares The amount of shares to redeem.
     * @return assets The amount of assets that would be redeemed.
     */
    function previewRedeem(uint256 shares) public view override returns (uint256) {
        uint256 assets = super.previewRedeem(shares);
        return assets - _feeOnTotal(assets,  vaultExitFee);
    }

    /**
     * @dev Previews the number of shares that would be burned for the given amount of assets withdrawn,
     * after applying the exit fee.
     * @param assets The amount of assets to withdraw.
     * @return shares The amount of shares that would be burned.
     */
    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        return super.previewWithdraw(assets + _feeOnRaw(assets, vaultExitFee));
    }

    /// @dev Send entry fee to {_entryFeeRecipient}. See {IERC4626-_deposit}.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal virtual override {        
        uint256 creatorFee = assets.mulDiv(creatorEntryFee, BASIS);
        uint256 protocolFee = assets.mulDiv(protocolEntryFee, BASIS);

        super._deposit(caller, receiver, assets - creatorFee - protocolFee, shares);

        if (protocolFee > 0) {
            SafeERC20.safeTransfer(IERC20(asset()), protocolFeeRecipient, protocolFee);
        }
        if (creatorFee > 0) {
            SafeERC20.safeTransfer(IERC20(asset()), creatorFeeRecipient, creatorFee);
        }
    }

    /// @dev Send exit fee to {_exitFeeRecipient}. See {IERC4626-_deposit}.
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        uint256 creatorFee = assets.mulDiv(creatorExitFee, BASIS);
        uint256 protocolFee = assets.mulDiv(protocolExitFee, BASIS);

        super._withdraw(caller, receiver, owner, assets - creatorFee - protocolFee, shares);

        if (protocolFee > 0) {
            SafeERC20.safeTransfer(IERC20(asset()), protocolFeeRecipient, protocolFee);
        }
        if (creatorFee > 0) {
            SafeERC20.safeTransfer(IERC20(asset()), creatorFeeRecipient, creatorFee);
        }
    }

    /**
     * @dev Sets the vault fees.
     * @param entryFeeBasisPoints The new entry fee in basis points. Must not exceed 50%.
     * @param exitFeeBasisPoints The new exit fee in basis points. Must not exceed 50%.
     */
    function setVaultFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) public override onlyOwner {
        if (BASIS < entryFeeBasisPoints * 2) {
            revert EntryFeeExceedsLimit(entryFeeBasisPoints);
        }
        if (BASIS < exitFeeBasisPoints * 2) {
            revert ExitFeeExceedsLimit(exitFeeBasisPoints);
        }
        
        vaultEntryFee = entryFeeBasisPoints;
        vaultExitFee = exitFeeBasisPoints;

        emit VaultEntryFeeSet(entryFeeBasisPoints);
        emit VaultExitFeeSet(exitFeeBasisPoints);
    }

    /**
     * @dev Sets the protocol fees.
     * @param entryFeeBasisPoints The new entry fee in basis points. Must not exceed 50%.
     * @param exitFeeBasisPoints The new exit fee in basis points. Must not exceed 50%.
     */
    function setProtocolFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) public override onlyOwner {
        if (BASIS < entryFeeBasisPoints * 10) {
            revert EntryFeeExceedsLimit(entryFeeBasisPoints);
        }
        if (BASIS < exitFeeBasisPoints * 10) {
            revert ExitFeeExceedsLimit(exitFeeBasisPoints);
        }
        
        protocolEntryFee = entryFeeBasisPoints;
        protocolExitFee = exitFeeBasisPoints;

        emit ProtocolEntryFeeSet(entryFeeBasisPoints);
        emit ProtocolExitFeeSet(exitFeeBasisPoints);
    }

    /**
     * @dev Sets the creator fees.
     * @param entryFeeBasisPoints The new entry fee in basis points. Must not exceed 50%.
     * @param exitFeeBasisPoints The new exit fee in basis points. Must not exceed 50%.
     */
    function setCreatorFees(uint256 entryFeeBasisPoints, uint256 exitFeeBasisPoints) public override onlyOwner {
        if (BASIS < entryFeeBasisPoints * 10) {
            revert EntryFeeExceedsLimit(entryFeeBasisPoints);
        }
        if (BASIS < exitFeeBasisPoints * 10) {
            revert ExitFeeExceedsLimit(exitFeeBasisPoints);
        }
        
        creatorEntryFee = entryFeeBasisPoints;
        creatorExitFee = exitFeeBasisPoints;

        emit CreatorEntryFeeSet(entryFeeBasisPoints);
        emit CreatorExitFeeSet(exitFeeBasisPoints);
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

    /// @dev Decimal offset is increased from 0 to avoid inflation attack due to second round-in-favor-of-protocol introduced by fees
    function _decimalsOffset() internal view virtual override returns (uint8) {
        return 1;
    }
}