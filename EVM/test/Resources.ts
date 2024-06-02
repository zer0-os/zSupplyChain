import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import fs from "fs";
import { BondingToken } from "../typechain-types/contracts/resources";
//import { ERC20Token } from "../typechain-types/contracts/test";

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
    100n * 10n ** 18n // 1000 ether in wei
  ]; // 1 wei, 1 ether, 100 ether
  const numUsers = [1, 2];

  async function getExpectedShares(bondingToken: BondingToken, amount: bigint, feeBasisPoints: number) {
    const netAmount = amount - (amount * BigInt(feeBasisPoints) / 100000n);
    return await bondingToken.convertToShares(netAmount);
  }

  async function getExpectedAssets(bondingToken: BondingToken, shares: bigint, feeBasisPoints: number) {
    const grossAssets = await bondingToken.convertToAssets(shares);
    const fee = grossAssets * BigInt(feeBasisPoints) / 100000n;
    return grossAssets - fee;
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

            let totalAssets = 0n;
            let totalShares = 0n;

            const data = {
              user1: { assets: [] as string[], shares: [] as string[] },
              user2: { assets: [] as string[], shares: [] as string[] },
              totalSupply: [] as string[],
              totalAssets: [] as string[],
            };

            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              const userAddress = userAddresses[i];

              await reserveToken.mint(userAddress, amount);
              await reserveToken.connect(user).approve(bondingTokenAddress, amount);

              const expectedShares = await getExpectedShares(bondingToken, amount, entryFee);
              const contractBalanceBefore = await reserveToken.balanceOf(bondingTokenAddress);

              await expect(bondingToken.connect(user).deposit(amount, userAddress))
                .to.emit(bondingToken, 'Deposit')
                .withArgs(userAddress, userAddress, amount - (amount * BigInt(entryFee) / 100000n), expectedShares);

              const contractBalanceAfter = await reserveToken.balanceOf(bondingTokenAddress);
              const actualShares = await bondingToken.balanceOf(userAddress);
              totalAssets = contractBalanceAfter;
              totalShares += expectedShares; // Updated to correctly track the total shares

              if (i === 0) {
                data.user1.assets.push(contractBalanceAfter.toString());
                data.user1.shares.push(actualShares.toString());
              } else if (i === 1) {
                data.user2.assets.push(contractBalanceAfter.toString());
                data.user2.shares.push(actualShares.toString());
              }
              data.totalSupply.push(totalShares.toString());
              data.totalAssets.push(totalAssets.toString());

              expect(contractBalanceAfter).to.equal(totalAssets);
              expect(actualShares).to.equal(expectedShares);
            }

            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              const userAddress = userAddresses[i];
              const sharesToRedeem = await bondingToken.balanceOf(userAddress);

              const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem, exitFee);
              const contractBalanceBefore = await reserveToken.balanceOf(bondingTokenAddress);

              await reserveToken.connect(user).approve(bondingTokenAddress, sharesToRedeem);
              await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                .to.emit(bondingToken, 'Withdraw')
                .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);

              const contractBalanceAfter = await reserveToken.balanceOf(bondingTokenAddress);
              const actualAssets = contractBalanceBefore - contractBalanceAfter;
              totalAssets = contractBalanceAfter;

              if (i === 0) {
                data.user1.assets.push(contractBalanceAfter.toString());
                data.user1.shares.push((await bondingToken.balanceOf(userAddress)).toString());
              } else if (i === 1) {
                data.user2.assets.push(contractBalanceAfter.toString());
                data.user2.shares.push((await bondingToken.balanceOf(userAddress)).toString());
              }
              data.totalSupply.push(totalShares.toString());
              data.totalAssets.push(totalAssets.toString());

              expect(actualAssets).to.equal(expectedAssets);
              expect(contractBalanceAfter).to.equal(totalAssets);
            }

            // Generate the HTML file for the plots
            generateHTML(data, entryFee, exitFee, amount, userCount);
          });
        }
      }
    }
  }

  function generateHTML(data: any, entryFee: number, exitFee: number, amount: bigint, userCount: number) {
    const user1Assets = data.user1.assets;
    const user1Shares = data.user1.shares;
    const user2Assets = data.user2.assets;
    const user2Shares = data.user2.shares;
    const totalSupply = data.totalSupply;
    const totalAssets = data.totalAssets;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BondingToken Test Results</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <h2>User 1 Assets Over Time</h2>
      <canvas id="user1AssetsChart"></canvas>
      <h2>User 1 Shares Over Time</h2>
      <canvas id="user1SharesChart"></canvas>
      <h2>User 2 Assets Over Time</h2>
      <canvas id="user2AssetsChart"></canvas>
      <h2>User 2 Shares Over Time</h2>
      <canvas id="user2SharesChart"></canvas>
      <h2>Total Supply Over Time</h2>
      <canvas id="totalSupplyChart"></canvas>
      <h2>Total Assets Over Time</h2>
      <canvas id="totalAssetsChart"></canvas>
      <script>
        const user1AssetsCtx = document.getElementById('user1AssetsChart').getContext('2d');
        const user1AssetsChart = new Chart(user1AssetsCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: user1Assets.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'User 1 Assets',
                data: ${JSON.stringify(user1Assets)},
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });

        const user1SharesCtx = document.getElementById('user1SharesChart').getContext('2d');
        const user1SharesChart = new Chart(user1SharesCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: user1Shares.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'User 1 Shares',
                data: ${JSON.stringify(user1Shares)},
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });

        const user2AssetsCtx = document.getElementById('user2AssetsChart').getContext('2d');
        const user2AssetsChart = new Chart(user2AssetsCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: user2Assets.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'User 2 Assets',
                data: ${JSON.stringify(user2Assets)},
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });

        const user2SharesCtx = document.getElementById('user2SharesChart').getContext('2d');
        const user2SharesChart = new Chart(user2SharesCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: user2Shares.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'User 2 Shares',
                data: ${JSON.stringify(user2Shares)},
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });

        const totalSupplyCtx = document.getElementById('totalSupplyChart').getContext('2d');
        const totalSupplyChart = new Chart(totalSupplyCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: totalSupply.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'Total Supply',
                data: ${JSON.stringify(totalSupply)},
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });

        const totalAssetsCtx = document.getElementById('totalAssetsChart').getContext('2d');
        const totalAssetsChart = new Chart(totalAssetsCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: totalAssets.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'Total Assets',
                data: ${JSON.stringify(totalAssets)},
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                fill: false
              }
            ]
          },
          options: {
            scales: {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
          }
        });
      </script>
    </body>
    </html>
    `;

    fs.writeFileSync(`test_results.html`, html);
  }
});
