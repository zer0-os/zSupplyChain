import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("BondingToken Edge Case Tests", function () {
  async function deploy() {
    const [deployer, user, user1, user2, user3, ...others] = await hre.ethers.getSigners();
    const userAddress = await user.getAddress();
    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();
    const user3Address = await user3.getAddress();

    const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
    const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
    const reserveTokenAddress = await reserveToken.getAddress();

    const bondingTokenFactory = await hre.ethers.getContractFactory("BondingToken");
    const bondingToken = await bondingTokenFactory.deploy("GOLD", "GLD", reserveTokenAddress, 0, 0);
    const bondingTokenAddress = await bondingToken.getAddress();

    return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address, others };
  }

  const entryFees = [0, 100]; // 0%, 1%
  const exitFees = [0, 100]; // 0%, 1%
  const amounts = [
    1n,
    10n ** 18n, // 1 ether in wei
    1000n * 10n ** 18n // 1000 ether in wei
  ]; // 1 wei, 1 ether, 1000 ether
  const numUsers = [1, 2];

  /**
   * Helper function to simulate the share return when depositing assets.
   * @param {bigint} amount - The amount to deposit.
   * @param {bigint} totalAssets - The current total assets in the contract.
   * @param {bigint} totalShares - The current total shares in the contract.
   * @param {number} feeBasisPoints - The entry fee in basis points.
   * @returns {bigint} - The number of shares returned after depositing.
   */
  function simulateDepositShares(
    amount: bigint,
    totalAssets: bigint,
    totalShares: bigint,
    feeBasisPoints: number
  ): bigint {
    const feeAmount = (amount * BigInt(feeBasisPoints)) / 100000n;
    const netDepositAmount = amount - feeAmount;
    if (totalShares === 0n) {
      return netDepositAmount;
    } else {
      return (netDepositAmount * totalShares) / totalAssets;
    }
  }

  /**
   * Helper function to simulate the asset return when redeeming shares.
   * @param {bigint} shares - The number of shares to redeem.
   * @param {bigint} totalAssets - The current total assets in the contract.
   * @param {bigint} totalShares - The current total shares in the contract.
   * @param {number} feeBasisPoints - The exit fee in basis points.
   * @returns {bigint} - The number of assets returned after redeeming shares.
   */
  function simulateRedeemAssets(
    shares: bigint,
    totalAssets: bigint,
    totalShares: bigint,
    feeBasisPoints: number
  ): bigint {
    const assets = (shares * totalAssets) / totalShares;
    const fee = (assets * BigInt(feeBasisPoints)) / 100000n;
    const netAssets = assets - fee;
    return netAssets;
  }

  for (const entryFee of entryFees) {
    for (const exitFee of exitFees) {
      for (const amount of amounts) {
        for (const userCount of numUsers) {
          it(`should correctly handle deposit and redeem with entry fee ${entryFee} bps and exit fee ${exitFee} bps for ${userCount} user(s) depositing ${amount.toString()} wei`, async function () {
            const { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address } = await loadFixture(deploy);

            await bondingToken.setEntryFee(entryFee);
            await bondingToken.setExitFee(exitFee);

            const users = [user, user1, user2, user3].slice(0, userCount);
            const userAddresses = [userAddress, user1Address, user2Address, user3Address].slice(0, userCount);

            // Initial state variables
            let totalAssets = 0n;
            let totalShares = 0n;

            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              const userAddress = userAddresses[i];
              
              // Mint and approve before each deposit
              await reserveToken.mint(userAddress, amount);
              await reserveToken.connect(user).approve(bondingTokenAddress, amount);

              const shares = simulateDepositShares(amount, totalAssets, totalShares, entryFee);
              totalAssets += amount; // Include the full amount (net + fee)
              totalShares += shares;

              console.log(`Deposit: User ${i + 1}`);
              console.log(`  Amount: ${amount}`);
              console.log(`  Shares: ${shares}`);
              console.log(`  Total Assets: ${totalAssets}`);
              console.log(`  Total Shares: ${totalShares}`);

              await expect(bondingToken.connect(user).deposit(amount, userAddress))
                .to.emit(bondingToken, 'Deposit')
                .withArgs(userAddress, userAddress, amount - (amount * BigInt(entryFee) / 100000n), shares);

              const contractBalance = await reserveToken.balanceOf(bondingTokenAddress);
              console.log(`  Contract balance after deposit: ${contractBalance}`);
              expect(contractBalance).to.equal(totalAssets);
            }

            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              const userAddress = userAddresses[i];
              const sharesToRedeem = await bondingToken.balanceOf(user);
              const assets = simulateRedeemAssets(sharesToRedeem, totalAssets, totalShares, exitFee);
              totalAssets -= assets;

              console.log(`Redeem: User ${i + 1}`);
              console.log(`  Shares to Redeem: ${sharesToRedeem}`);
              console.log(`  Redeemed Assets: ${assets}`);
              console.log(`  Total Assets: ${totalAssets}`);
              console.log(`  Total Shares: ${totalShares}`);

              await reserveToken.connect(user).approve(bondingTokenAddress, sharesToRedeem);
              await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                .to.emit(bondingToken, 'Withdraw')
                .withArgs(userAddress, userAddress, userAddress, assets, sharesToRedeem);

              const feeAmount = (assets * BigInt(exitFee)) / 100000n;
              if (feeAmount > 0) {
                // Ensure the fee is transferred to the contract
                const contractBalance = await reserveToken.balanceOf(bondingTokenAddress);
                console.log(`  Contract balance after redeem: ${contractBalance}`);
                expect(contractBalance).to.equal(totalAssets + feeAmount);
              }
            }
          });
        }
      }
    }
  }
});
