import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Signer } from 'ethers';
import hre from "hardhat";
import fs from "fs";
import { BondingTokenLinear, BondingTokenQuadratic } from "../typechain-types/contracts/resources/fees";
import { ERC20Token } from "../typechain-types/contracts/mock";
const { ethers } = hre;

// Define the BondingTokenType as a union of BondingTokenLinear and BondingTokenQuadratic
type BondingTokenType = BondingTokenLinear | BondingTokenQuadratic;

const contractNames = [
  { name: "BondingTokenLinear", tokenName: "UNREFINED GOLD", tokenSymbol: "GOLD" },
  { name: "BondingTokenQuadratic", tokenName: "UNREFINED COAL", tokenSymbol: "COAL" }
];

describe("BondingToken Tests", function () {
  for (const contract of contractNames) {
    describe(`${contract.name} simulation tests`, function () {
      async function deploy() {
        const [deployer, user, user1, user2, user3] = await hre.ethers.getSigners();
        const userAddress = await user.getAddress();
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();
        const user3Address = await user3.getAddress();

        const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
        const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
        const reserveTokenAddress = await reserveToken.getAddress();

        const bondingTokenFactory = await hre.ethers.getContractFactory(contract.name);
        const bondingToken = await bondingTokenFactory.deploy(contract.tokenName, contract.tokenSymbol, reserveTokenAddress, 0, 0) as BondingTokenType;
        const bondingTokenAddress = await bondingToken.getAddress();

        return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address };
      }

      function getRandomAmount(min: bigint, max: bigint): bigint {
        const range = max - min + 1n;
        const rand = BigInt(Math.floor(Math.random() * Number(range))) + min;
        return rand;
      }

      const entryFees = [0, 100, 1000, 10000]; // 0%, .1%, 1%, 10%
      const exitFees = [0, 100, 1000, 10000]; // 0%, .1%, 1%, 10%
      const numUsers = [1, 2, 3, 4];

      async function getExpectedShares(bondingToken: BondingTokenType, assets: bigint) {
        return await bondingToken.previewDeposit(assets);
      }

      async function getExpectedAssets(bondingToken: BondingTokenType, shares: bigint) {
        return await bondingToken.previewRedeem(shares);
      }

      const allData: {
        users: { assets: string[], shares: string[] }[],
        totalSupply: string[],
        totalAssets: string[],
        tokenPrices: string[]
      } = {
        users: [],
        totalSupply: [],
        totalAssets: [],
        tokenPrices: []
      };

      describe('Simulate economy with random deposits and redeems', function () {
        let bondingToken: BondingTokenType;
        let bondingTokenAddress: string;
        let reserveToken: ERC20Token;
        let reserveTokenAddress: string;
        let users: Signer[];
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

          // Initial token donation to set price
          const initialDonationAmount = 500n * 10n ** 18n; // 500 ether in wei
          await reserveToken.mint(users[0].getAddress(), initialDonationAmount);
          await reserveToken.connect(users[0]).transfer(bondingTokenAddress, initialDonationAmount);
          allData.totalSupply.push((await bondingToken.totalSupply()).toString());
          allData.totalAssets.push((await bondingToken.totalAssets()).toString());
          allData.tokenPrices.push((await bondingToken.convertToAssets(10n ** 18n)).toString());
        });

        entryFees.forEach(entryFee => {
          exitFees.forEach(exitFee => {
            it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
              await bondingToken.setEntryFee(entryFee);
              await bondingToken.setExitFee(exitFee);
            });

            numUsers.forEach(userCount => {
              for (let i = 0; i < 3; i++) { // Each deposit and redeem in its own test case
                it(`should simulate deposits for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                  const selectedUsers = users.slice(0, userCount);

                  for (const user of selectedUsers) {
                    const userAddress = await user.getAddress();
                    const balance = await reserveToken.balanceOf(userAddress);
                    const previousBTBalance = await bondingToken.balanceOf(userAddress);

                    const max = await bondingToken.maxDeposit(userAddress);
                    const amount = balance < max ? getRandomAmount(1n, balance - 1n) : getRandomAmount(1n, max - 1n);

                    await reserveToken.connect(user).approve(bondingTokenAddress, amount);
                    const expectedShares = await getExpectedShares(bondingToken, amount);

                    await expect(bondingToken.connect(user).deposit(amount, userAddress))
                      .to.emit(bondingToken, 'Deposit')
                      .withArgs(userAddress, userAddress, amount, expectedShares);

                    const actualShares = await bondingToken.balanceOf(userAddress) - previousBTBalance;
                    const userIndex = users.indexOf(user);

                    const btBalance = await bondingToken.balanceOf(userAddress);
                    allData.users[userIndex].shares.push(btBalance.toString());

                    const rtBalance = await reserveToken.balanceOf(userAddress);
                    allData.users[userIndex].assets.push(rtBalance.toString());

                    expect(actualShares).to.equal(expectedShares);

                    // Calculate and record token data
                    const totalSupply = await bondingToken.totalSupply();
                    const totalAssets = await bondingToken.totalAssets();
                    const checkAmt = totalAssets + 1n;
                    const tokenPrice = checkAmt / await bondingToken.convertToShares(checkAmt);
                    allData.tokenPrices.push(tokenPrice.toString());
                    allData.totalSupply.push(totalSupply.toString());
                    allData.totalAssets.push(totalAssets.toString());
                  }
                });

                it(`should simulate redeems for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                  const selectedUsers = users.slice(0, userCount);

                  for (const user of selectedUsers) {
                    const userAddress = await user.getAddress();
                    const balance = await bondingToken.balanceOf(userAddress);
                    const sharesToRedeem = getRandomAmount(1n, balance - 1n);
                    const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem);
                    const previousRTBalance = await reserveToken.balanceOf(userAddress);

                    await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                      .to.emit(bondingToken, 'Withdraw')
                      .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);

                    const actualAssets = await reserveToken.balanceOf(userAddress) - previousRTBalance;
                    const userIndex = users.indexOf(user);

                    const btBalance = await bondingToken.balanceOf(userAddress);
                    allData.users[userIndex].shares.push(btBalance.toString());

                    const rtBalance = await reserveToken.balanceOf(userAddress);
                    allData.users[userIndex].assets.push(rtBalance.toString());

                    expect(actualAssets).to.equal(expectedAssets);

                    // Calculate and record token data
                    const totalSupply = await bondingToken.totalSupply();
                    const totalAssets = await bondingToken.totalAssets();
                    const checkAmt = totalAssets + 1n;
                    const tokenPrice = checkAmt / await bondingToken.convertToShares(checkAmt);
                    allData.tokenPrices.push(tokenPrice.toString());
                    allData.totalSupply.push(totalSupply.toString());
                    allData.totalAssets.push(totalAssets.toString());
                  }
                });
              }
            });
          });
        });
      });

      after(() => {
        // Generate the HTML file for the plots
        generateHTML(allData, contract.name);
      });
    });

    describe(`${contract.name} edge case tests`, function () {
      async function deploy() {
        const [deployer, user, user1, user2, user3] = await hre.ethers.getSigners();
        const userAddress = await user.getAddress();
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();
        const user3Address = await user3.getAddress();

        const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
        const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
        const reserveTokenAddress = await reserveToken.getAddress();

        const bondingTokenFactory = await hre.ethers.getContractFactory(contract.name);
        const bondingToken = await bondingTokenFactory.deploy(contract.tokenName, contract.tokenSymbol, reserveTokenAddress, 0, 0) as BondingTokenType;
        const bondingTokenAddress = await bondingToken.getAddress();

        return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address };
      }

      const entryFees = [0, 100]; // 0%, 1%
      const exitFees = [0, 100]; // 0%, 1%
      const numUsers = [1, 2, 3, 4];

      async function getExpectedShares(bondingToken: BondingTokenType, assets: bigint) {
        return await bondingToken.previewDeposit(assets);
      }

      async function getExpectedAssets(bondingToken: BondingTokenType, shares: bigint) {
        return await bondingToken.previewRedeem(shares);
      }

      const allData: {
        users: { assets: string[], shares: string[] }[],
        totalSupply: string[],
        totalAssets: string[],
        tokenPrices: string[]
      } = {
        users: [],
        totalSupply: [],
        totalAssets: [],
        tokenPrices: []
      };

      describe('Verify edge cases', function () {
        let bondingToken: BondingTokenType;
        let bondingTokenAddress: string;
        let reserveToken: ERC20Token;
        let reserveTokenAddress: string;
        let users: Signer[];
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

          // Initial token donation to set price
          const initialDonationAmount = 500n * 10n ** 18n; // 500 ether in wei
          await reserveToken.mint(users[0].getAddress(), initialDonationAmount);
          await reserveToken.connect(users[0]).transfer(bondingTokenAddress, initialDonationAmount);
          allData.totalSupply.push((await bondingToken.totalSupply()).toString());
          allData.totalAssets.push((await bondingToken.totalAssets()).toString());
          allData.tokenPrices.push((await bondingToken.convertToAssets(10n ** 18n)).toString());
        });

        entryFees.forEach(entryFee => {
          exitFees.forEach(exitFee => {
            it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
              await bondingToken.setEntryFee(entryFee);
              await bondingToken.setExitFee(exitFee);
            });

            const deposits = [10n, 10n ** 2n, 10n ** 3n, 10n ** 8n, 10n ** 18n, 10n ** 22n, 10n ** 32n, 10n ** 38n, 10n ** 39n, 10n**40n]; //should fail on 39 or 40
            numUsers.forEach(userCount => {
              deposits.forEach(deposit => {
                it(`should check edge cases with deposit ${deposit} for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                  const selectedUsers = users.slice(0, userCount);

                  for (const user of selectedUsers) {
                    const userAddress = await user.getAddress();
                    const previousBTBalance = await bondingToken.balanceOf(userAddress);

                    await reserveToken.mint(userAddress, deposit);
                    await reserveToken.connect(user).approve(bondingTokenAddress, deposit);

                    const max = await bondingToken.maxDeposit(userAddress);
                    let expectedShares: bigint;

                    if (deposit > max) {
                      await expect(bondingToken.connect(user).deposit(deposit, userAddress)).to.be.revertedWithCustomError(bondingToken, "ERC4626ExceededMaxDeposit");
                      continue;
                    } else {
                      expectedShares = await getExpectedShares(bondingToken, deposit);
                    }

                    await expect(bondingToken.connect(user).deposit(deposit, userAddress))
                      .to.emit(bondingToken, 'Deposit')
                      .withArgs(userAddress, userAddress, deposit, expectedShares);

                    const btBalance = await bondingToken.balanceOf(userAddress);
                    const actualShares = btBalance - previousBTBalance;

                    expect(actualShares).to.equal(expectedShares);
                    const userIndex = users.indexOf(user);

                    allData.users[userIndex].shares.push(btBalance.toString());
                  }
                });

                it(`should check edge cases with redeem ${deposit} for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                  const selectedUsers = users.slice(0, userCount);

                  for (const user of selectedUsers) {
                    const userAddress = await user.getAddress();
                    const balance = await bondingToken.balanceOf(userAddress);
                    const sharesToRedeem = balance < deposit ? balance : deposit;
                    const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem);
                    const previousRTBalance = await reserveToken.balanceOf(userAddress);

                    await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                      .to.emit(bondingToken, 'Withdraw')
                      .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);

                    const actualAssets = await reserveToken.balanceOf(userAddress) - previousRTBalance;
                    const userIndex = users.indexOf(user);

                    const btBalance = await bondingToken.balanceOf(userAddress);
                    allData.users[userIndex].shares.push(btBalance.toString());

                    const rtBalance = await reserveToken.balanceOf(userAddress);
                    allData.users[userIndex].assets.push(rtBalance.toString());

                    expect(actualAssets).to.equal(expectedAssets);

                    // Calculate and record token data
                    const totalSupply = await bondingToken.totalSupply();
                    const totalAssets = await bondingToken.totalAssets();
                    const checkAmt = totalAssets + 1n;
                    const tokenPrice = checkAmt / await bondingToken.convertToShares(checkAmt);
                    allData.tokenPrices.push(tokenPrice.toString());
                    allData.totalSupply.push(totalSupply.toString());
                    allData.totalAssets.push(totalAssets.toString());
                  }
                });
              });
            });
          });
        });
      });

      after(() => {
        // Generate the HTML file for the plots
        generateHTML(allData, `${contract.name}_edge`);
      });
    });

    function generateHTML(allData: any, contractName: string) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${contractName} Test Results</title>
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
          <h2>Token Price Over Time</h2>
          <canvas id="tokenPriceChart"></canvas>
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

            const tokenPriceCtx = document.getElementById('tokenPriceChart').getContext('2d');
            const tokenPriceChart = new Chart(tokenPriceCtx, {
              type: 'line',
              data: {
                labels: ${JSON.stringify(Array.from({ length: allData.tokenPrices.length }, (_, i) => i + 1))},
                datasets: [
                  {
                    label: 'Token Price',
                    data: ${JSON.stringify(allData.tokenPrices)},
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
          </script>
        </body>
        </html>
      `;

      fs.writeFileSync(`test_results_${contractName}.html`, html);
    }
  }
});
