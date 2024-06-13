import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import {Signer} from 'ethers';
import hre from "hardhat";
import fs from "fs";
import { BondingTokenLinear, BondingTokenLogarithmic, BondingTokenQuadratic} from "../typechain-types/contracts/resources/fees";
import { ERC20Token } from "../typechain-types/contracts/mock";
import { ERC4626Constant, ERC4626Logarithmic, ERC4626Quadratic } from "../typechain-types/contracts/resources/basic"
const { ethers } = hre;

const contractNames = [
  { name: "BondingTokenLinear", tokenName: "UNREFINED GOLD", tokenSymbol: "GOLD"},
  { name: "BondingTokenQuadratic", tokenName: "UNREFINED COAL", tokenSymbol: "COAL" }];
  //{ name: "BondingTokenLogarithmic", tokenName: "UNREFINED GOLD", tokenSymbol: "GOLD" }];

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
        const bondingToken = await bondingTokenFactory.deploy(contract.tokenName, contract.tokenSymbol, reserveTokenAddress, 0, 0);
        const bondingTokenAddress = await bondingToken.getAddress();
        
        return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address};
      }

      function getRandomAmount(min: bigint, max: bigint): bigint {
        const range = max - min + 1n;
        const rand = BigInt(Math.floor(Math.random() * Number(range))) + min;
        return rand;
      }

      const entryFees = [0, 100, 1000, 10000]; // 0%, .1%, 1%, 10%
      const exitFees = [0, 100, 1000, 10000]; // 0%, .1%, 1%, 10%
      const numUsers = [1, 2, 3, 4];

      async function getExpectedShares(bondingToken: BondingTokenLinear, assets: bigint, feeBasisPoints: number) {
        return await bondingToken.previewDeposit(assets);
      }

      async function getExpectedAssets(bondingToken: BondingTokenLinear, shares: bigint, feeBasisPoints: number) {
        return await bondingToken.previewRedeem(shares);
      }

      async function calcAssets(bondingToken: BondingTokenLinear, shares: bigint, totalSupply: bigint, totalAssets: bigint){
        return shares*totalAssets/(totalSupply+1n);
      }
      async function calcShares(bondingToken: BondingTokenLinear, assets: bigint, totalSupply: bigint, totalAssets: bigint){
        return assets*totalSupply/(totalAssets+1n);
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

      let totalAssets = 0n;
      let totalShares = 0n;

      describe('Simulate economy with random deposits and redeems', function () {
        let deployer: Signer;
        let bondingToken: any;
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
        });
        //simulation tests
        entryFees.forEach(entryFee => {
          exitFees.forEach(exitFee => {
            it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
              await bondingToken.setEntryFee(entryFee);
              await bondingToken.setExitFee(exitFee);
            });

            numUsers.forEach(userCount => {
              it(`should simulate econ with random deposits and redeems for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                const selectedUsers = users.slice(0, userCount);

                for (const user of selectedUsers) {
                  const userAddress = await user.getAddress();

                  for (let i = 0; i < 3; i++) { 
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

                    // Calculate and record token price
                    const tokenPrice = ((10n ** 18n) - await bondingToken.previewDeposit(10n ** 18n));
                    allData.tokenPrices.push(tokenPrice.toString());
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

                    // Calculate and record token price
                    const tokenPrice = ((10n ** 18n) - await bondingToken.previewDeposit(10n ** 18n));
                    allData.tokenPrices.push(tokenPrice.toString());
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
        generateHTML(allData, contract.name);
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
        const bondingToken = await bondingTokenFactory.deploy(contract.tokenName, contract.tokenSymbol, reserveTokenAddress, 0, 0);
        const bondingTokenAddress = await bondingToken.getAddress();

        return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address};
      }

      const entryFees = [0, 100]; // 0%, 1%
      const exitFees = [0, 100]; // 0%, 1%
      const numUsers = [1, 2, 3, 4];

      async function getExpectedShares(bondingToken: BondingTokenLinear, assets: bigint, feeBasisPoints: number) {
        return await bondingToken.previewDeposit(assets);
      }

      async function getExpectedAssets(bondingToken: BondingTokenLinear, shares: bigint, feeBasisPoints: number) {
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

      let totalAssets = 0n;
      let totalShares = 0n;

      describe('Verify edge cases', function () {
        let deployer: Signer;
        let bondingToken: any;
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
        });
        //edge case tests
        entryFees.forEach(entryFee => {
          exitFees.forEach(exitFee => {
            it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
              await bondingToken.setEntryFee(entryFee);
              await bondingToken.setExitFee(exitFee);
            });
            const deposits = [10n, 10n**2n, 10n**3n, 10n**8n, 10n**18n, 10n**24n];
            numUsers.forEach(userCount => {
              // should verify edge cases - doesn't track data for graph
              it.only(`should check edge cases with exact deposits and redeems for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                const selectedUsers = users.slice(0, userCount);
            
                for (const user of selectedUsers) {
                  const userAddress = await user.getAddress();
                  
                  for(const deposit of deposits){
                      const amount = deposit;
                      // const balance = await reserveToken.connect(deployer).mint(userAddress, amount);
                      const previousBTBalance = await bondingToken.balanceOf(userAddress);
            
                      await reserveToken.mint(userAddress, amount);
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
                  };
                  
                  const balance = await bondingToken.balanceOf(userAddress);
                  const sharesToRedeem = balance; // Adjust the logic as needed
                  const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem, exitFee);
                  const previousRTBalance = await reserveToken.balanceOf(userAddress);
        
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

                  // Calculate and record token price
                  const tokenPrice = (await bondingToken.previewDeposit(10n ** 18n)) / 10n ** 18n;
                  allData.tokenPrices.push(tokenPrice.toString());
                }
            
                allData.totalSupply.push(totalShares.toString());
                allData.totalAssets.push(totalAssets.toString());
              });
            });            
          });
        });      
      });
    });
  }
});
