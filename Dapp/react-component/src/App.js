import React from 'react';
import { Provider } from 'react-redux';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import store from './store.js';
import './App.css';
import MainView from './components/MainView.js';
import HeaderBar from './components/HeaderBar.js';
import Board from './components/Board.js';

const projectId = 'c553299235dcdb3c9205c101832fd376';

// Define mainnet chain
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

// Define metadata
const metadata = {
  name: 'Web3Modal',
  description: 'Web3Modal Example',
  url: 'https://web3modal.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create Ethers config
const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: true, // true by default
  rpcUrl: 'https://cloudflare-eth.com', // used for the Coinbase SDK
  defaultChainId: 1 // used for the Coinbase SDK
});

// Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId,
  enableAnalytics: true // Optional - defaults to your Cloud configuration
});

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <HeaderBar />
        <MainView />
        <Board />
      </div>
    </Provider>
  );
}

export default App;
