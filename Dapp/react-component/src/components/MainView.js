import React from 'react';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';

const USDTAddress = '0x617f3112bf5397D0467D315cC709EF968D9ba546';

// The ERC-20 Contract ABI, which is a common contract interface
// for tokens (this is the Human-Readable ABI format)
const USDTAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint)',
  'function transfer(address to, uint amount)',
  'event Transfer(address indexed from, address indexed to, uint amount)'
];

function MainView() {
  const { address, chainId, isConnected, isConnecting, isDisconnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();

  async function getBalance() {
    if (!isConnected) throw Error('User disconnected');

    const ethersProvider = new BrowserProvider(walletProvider);
    const signer = await ethersProvider.getSigner();
    // The Contract object
    const USDTContract = new Contract(USDTAddress, USDTAbi, signer);
    const USDTBalance = await USDTContract.balanceOf(address);

    console.log(formatUnits(USDTBalance, 18));
  }

  async function signMessage() {
    if (!walletProvider) return;

    const ethersProvider = new BrowserProvider(walletProvider);
    const signer = ethersProvider.getSigner();
    try {
      const signature = await signer.signMessage('hello world');
      console.log('Signature:', signature);
    } catch (error) {
      console.error('Error signing message:', error);
    }
  }

  // Conditional rendering based on walletConnect connection status
  if (isConnecting) {
    return (
      <div className="MainView">
        <p>Connecting…</p>
      </div>
    );
  }

  if (isDisconnected) {
    return (
      <div className="MainView">
        <p>Please connect wallet</p>
      </div>
    );
  }

  return (
    <div className="MainView">
      <button className="zButton" onClick={signMessage}>Join Game</button>
      <button className="zButton" onClick={getBalance}>Get User Balance</button>
    </div>
  );
}

export default MainView;
