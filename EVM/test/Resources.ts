import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import fs from "fs";
import { BondingToken } from "../typechain-types/contracts/resources/fees";

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

  function getRandomAmount(min: bigint, max: bigint): bigint {
    const range = max - min + 1n;
    const rand = BigInt(Math.floor(Math.random() * Number(range))) + min;
    return rand;
  }

  const entryFees = [0, 100]; // 0%, 1%
  const exitFees = [0, 100]; // 0%, 1%
  const numUsers = [1, 2, 3, 4];

  async function getExpectedShares(bondingToken: BondingToken, assets: bigint, feeBasisPoints: number) {
    return await bondingToken.previewDeposit(assets);
  }

  async function getExpectedAssets(bondingToken: BondingToken, shares: bigint, feeBasisPoints: number) {
    return await bondingToken.previewRedeem(shares);
  }

  const allData: {
    users: { assets: string[], shares: string[] }[],
    totalSupply: string[],
    totalAssets: string[]
  } = {
    users: [],
    totalSupply: [],
    totalAssets: []
  };

  let totalAssets = 0n;
  let totalShares = 0n;

  describe("Perform Deposits and Redeems with Single Deployment", function () {
    let bondingToken: BondingToken;
    let bondingTokenAddress: string;
    let reserveToken: any;
    let reserveTokenAddress: string;
    let users: any[];
    let userAddresses: string[];
    const initialMintAmount = 1000n * 10n ** 18n; // Mint 1000 ether in wei

    before(async function () {
      const deployment = await loadFixture(deploy);
      bondingToken = deployment.bondingToken;
      bondingTokenAddress = deployment.bondingTokenAddress;
      reserveToken = deployment.reserveToken;
      reserveTokenAddress = deployment.reserveTokenAddress;
      users = [deployment.user, deployment.user1, deployment.user2, deployment.user3];
      userAddresses = [deployment.userAddress, deployment.user1Address, deployment.user2Address, deployment.user3Address];

      // Mint and approve initial amounts for each user
      for (const user of users) {
        const userAddress = await user.getAddress();
        await reserveToken.mint(userAddress, initialMintAmount);
        await reserveToken.connect(user).approve(bondingTokenAddress, initialMintAmount);
      }

      // Initialize allData.users array with correct length
      users.forEach((_, index) => {
        allData.users[index] = { assets: [], shares: [] };
      });
    });

    entryFees.forEach(entryFee => {
      exitFees.forEach(exitFee => {
        it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
          await bondingToken.setEntryFee(entryFee);
          await bondingToken.setExitFee(exitFee);
        });

        numUsers.forEach(userCount => {
          it(`should handle deposits and redeems for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
            const selectedUsers = users.slice(0, userCount);
            const selectedUserAddresses = userAddresses.slice(0, userCount);

            for (const user of selectedUsers) {
              const userAddress = await user.getAddress();

              for (let i = 0; i < 3; i++) { // Assuming you want 3 random deposits per user 
                const balance = await reserveToken.balanceOf(userAddress);
                const amount = getRandomAmount(1n, balance - 1n);
                const previousBTBalance = await bondingToken.balanceOf(userAddress);

                await reserveToken.connect(user).approve(bondingTokenAddress, amount);

                const expectedShares = await getExpectedShares(bondingToken, amount, entryFee);

                await expect(bondingToken.connect(user).deposit(amount, userAddress))
                  .to.emit(bondingToken, 'Deposit')
                  .withArgs(userAddress, userAddress, amount, expectedShares);

                const actualShares = await bondingToken.balanceOf(userAddress) - previousBTBalance;
                totalAssets += amount;
                totalShares += expectedShares;

                const userIndex = users.indexOf(user);
                allData.users[userIndex].assets.push(totalAssets.toString());
                allData.users[userIndex].shares.push(actualShares.toString());

                expect(actualShares).to.equal(expectedShares);
              }
            }

            for (const user of selectedUsers) {
              const userAddress = await user.getAddress();

              for (let i = 0; i < 3; i++) { // Assuming you want 3 random redeems per user
                const balance = await bondingToken.balanceOf(userAddress);
                const sharesToRedeem = getRandomAmount(1n, balance - 1n);
                const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem, exitFee);
                const previousRTBalance = await reserveToken.balanceOf(user);
                
                await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                  .to.emit(bondingToken, 'Withdraw')
                  .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);

                const actualAssets = await reserveToken.balanceOf(userAddress) - previousRTBalance;
                totalAssets -= expectedAssets;
                totalShares -= sharesToRedeem;

                const userIndex = users.indexOf(user);
                allData.users[userIndex].assets.push(totalAssets.toString());
                allData.users[userIndex].shares.push((await bondingToken.balanceOf(userAddress)).toString());

                expect(actualAssets).to.equal(expectedAssets);
              }
            }

            allData.totalSupply.push(totalShares.toString());
            allData.totalAssets.push(totalAssets.toString());
          });
        });
      });
    });
  });

  after(() => {
    // Generate the HTML file for the plots
    generateHTML(allData);
  });

  function generateHTML(allData: any) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BondingToken Test Results</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      ${allData.users.map((userData: any, index: number) => `
        <h2>User ${index + 1} Assets Over Time</h2>
        <canvas id="user${index + 1}AssetsChart"></canvas>
        <h2>User ${index + 1} Shares Over Time</h2>
        <canvas id="user${index + 1}SharesChart"></canvas>
      `).join('')}
      <h2>Total Supply Over Time</h2>
      <canvas id="totalSupplyChart"></canvas>
      <h2>Total Assets Over Time</h2>
      <canvas id="totalAssetsChart"></canvas>
      <script>
        ${allData.users.map((userData: any, index: number) => `
          const user${index + 1}AssetsCtx = document.getElementById('user${index + 1}AssetsChart').getContext('2d');
          const user${index + 1}AssetsChart = new Chart(user${index + 1}AssetsCtx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(Array.from({ length: userData.assets.length }, (_, i) => i + 1))},
              datasets: [
                {
                  label: 'User ${index + 1} Assets',
                  data: ${JSON.stringify(userData.assets)},
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

          const user${index + 1}SharesCtx = document.getElementById('user${index + 1}SharesChart').getContext('2d');
          const user${index + 1}SharesChart = new Chart(user${index + 1}SharesCtx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(Array.from({ length: userData.shares.length }, (_, i) => i + 1))},
              datasets: [
                {
                  label: 'User ${index + 1} Shares',
                  data: ${JSON.stringify(userData.shares)},
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
        `).join('')}

        const totalSupplyCtx = document.getElementById('totalSupplyChart').getContext('2d');
        const totalSupplyChart = new Chart(totalSupplyCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(Array.from({ length: allData.totalSupply.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'Total Supply',
                data: ${JSON.stringify(allData.totalSupply)},
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
            labels: ${JSON.stringify(Array.from({ length: allData.totalAssets.length }, (_, i) => i + 1))},
            datasets: [
              {
                label: 'Total Assets',
                data: ${JSON.stringify(allData.totalAssets)},
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
