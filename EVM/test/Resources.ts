import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

// Helper function to calculate expected amounts
function calculateExpectedAmounts(entryFee: bigint, exitFee: bigint, amount: bigint) {
  const entryFeeAmount = (amount * entryFee) / 10000n;
  const amountAfterEntryFee = amount - entryFeeAmount;
  const exitFeeAmount = (amountAfterEntryFee * exitFee) / 10000n;
  const amountAfterExitFee = amountAfterEntryFee - exitFeeAmount;

  return {
    entryFeeAmount,
    amountAfterEntryFee,
    exitFeeAmount,
    amountAfterExitFee
  };
}

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
    const bondingToken = await bondingTokenFactory.deploy("GOLD", "GLD", reserveTokenAddress, 0n, 0n);
    const bondingTokenAddress = await bondingToken.getAddress();

    const mintAmt = 1000n * 10n**18n; // 1000 ether in wei
    await reserveToken.mint(userAddress, mintAmt);
    await reserveToken.mint(user1Address, mintAmt);
    await reserveToken.mint(user2Address, mintAmt);
    await reserveToken.mint(user3Address, mintAmt);
    await reserveToken.connect(user).approve(bondingTokenAddress, mintAmt);
    await reserveToken.connect(user1).approve(bondingTokenAddress, mintAmt);
    await reserveToken.connect(user2).approve(bondingTokenAddress, mintAmt);
    await reserveToken.connect(user3).approve(bondingTokenAddress, mintAmt);

    return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, user1, user2, user3, others };
  }

  const entryFees = [0n, 100n]; // 0%, 1%
  const exitFees = [0n, 100n]; // 0%, 1%
  const amounts = [
    1n, 
    1n, 
    10n**18n, // 1 ether in wei
    1000n * 10n**18n // 1000 ether in wei
  ]; // 1 wei, 1 ether, 1000 ether
  const numUsers = [1, 2];

  for (const entryFee of entryFees) {
    for (const exitFee of exitFees) {
      for (const amount of amounts) {
        for (const numUser of numUsers) {
          it(`Simulates economy with entryFee=${entryFee}, exitFee=${exitFee}, amount=${amount}, numUsers=${numUser}`, async function () {
            const { bondingToken, bondingTokenAddress, reserveToken, user, user1, user2, user3, others } = await loadFixture(deploy);

            // Set entry and exit fees
            await bondingToken.setEntryFee(entryFee);
            await bondingToken.setExitFee(exitFee);

            const users = [user, user1, user2, user3].slice(0, numUser);

            // Users buy BT
            for (const u of users) {
              const { entryFeeAmount, amountAfterEntryFee } = calculateExpectedAmounts(entryFee, exitFee, amount);

              console.log(`User deposit: ${amount.toString()}`);
              console.log(`Entry Fee: ${entryFeeAmount.toString()}`);
              console.log(`Amount after Entry Fee: ${amountAfterEntryFee.toString()}`);

              await expect(bondingToken.connect(u).deposit(amount, u.address))
                .to.emit(bondingToken, 'Deposit')
                .withArgs(u.address, u.address, amountAfterEntryFee, amount);

              const btBalance = await bondingToken.balanceOf(u.address);
              console.log(`BT Balance of user ${u.address}: ${btBalance.toString()}`);
              expect(btBalance).to.equal(amountAfterEntryFee);

              const rtBalance = await reserveToken.balanceOf(bondingTokenAddress);
              const expectedRTBalance = amountAfterEntryFee * BigInt(users.length);
              console.log(`RT Balance of bonding token: ${rtBalance.toString()}, expected: ${expectedRTBalance.toString()}`);
              expect(rtBalance).to.equal(expectedRTBalance);
            }

            // Users sell BT
            for (const u of users) {
              const { amountAfterEntryFee, amountAfterExitFee } = calculateExpectedAmounts(entryFee, exitFee, amount);

              console.log(`User withdraw: ${amountAfterEntryFee.toString()}`);
              console.log(`Exit Fee: ${amountAfterExitFee.toString()}`);
              console.log(`Amount after Exit Fee: ${amountAfterExitFee.toString()}`);

              await expect(bondingToken.connect(u).redeem(amountAfterEntryFee, u.address, u.address))
                .to.emit(bondingToken, 'Withdraw')
                .withArgs(u.address, u.address, u.address, amountAfterExitFee, amountAfterEntryFee);

              const btBalance = await bondingToken.balanceOf(u.address);
              console.log(`BT Balance of user ${u.address} after withdraw: ${btBalance.toString()}`);
              expect(btBalance).to.equal(0n);

              const rtBalance = await reserveToken.balanceOf(u.address);
              console.log(`RT Balance of user ${u.address}: ${rtBalance.toString()}`);
              expect(rtBalance).to.equal(amountAfterExitFee);
            }

            // Final checks for contract balances
            const totalRTDeposited = amount * BigInt(users.length);
            const totalEntryFees = (totalRTDeposited * entryFee) / 10000n;
            const totalBTMinted = totalRTDeposited - totalEntryFees;

            const totalRTWithdrawn = totalBTMinted;
            const totalExitFees = (totalRTWithdrawn * exitFee) / 10000n;
            const totalRTReceivedByUsers = totalRTWithdrawn - totalExitFees;

            const finalContractBalance = await reserveToken.balanceOf(bondingTokenAddress);
            console.log(`Final contract balance: ${finalContractBalance.toString()}`);
            expect(finalContractBalance).to.equal(0n);

            const finalRTBalance = totalRTDeposited - totalRTReceivedByUsers;
            console.log(`Final RT Balance: ${finalRTBalance.toString()}, total entry fees + exit fees: ${(totalEntryFees + totalExitFees).toString()}`);
            expect(finalRTBalance).to.equal(totalEntryFees + totalExitFees);
          });
        }
      }
    }
  }
});
