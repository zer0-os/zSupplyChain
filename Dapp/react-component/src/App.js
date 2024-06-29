import React from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { WagmiProvider, useAccountEffect } from 'wagmi'
import { arbitrum, mainnet } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import store from './store'
import './App.css';
import MainView from './components/MainView.js';
import HeaderBar from './components/HeaderBar.js';
//import OwnerView from './components/OwnerView.js';
//import UserView from './components/UserView.js';

// Setup queryClient
const queryClient = new QueryClient()

// Get projectId at https://cloud.walletconnect.com
// direnv is giving me grief.
//const projectId = process.env.walletConnectProjectId;
const projectId = 'c553299235dcdb3c9205c101832fd376';

// Create wagmiConfig
const metadata = {
  name: 'Web3Modal',
  description: 'Web3Modal Example',
  url: 'https://web3modal.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [mainnet, arbitrum]// as const
const config = defaultWagmiConfig({
  chains, // required
  projectId, // required
  metadata, // required
  enableWalletConnect: true, // Optional - true by default
  enableInjected: true, // Optional - true by default
  enableEIP6963: true, // Optional - true by default
  enableCoinbase: true, // Optional - true by default
  //...wagmiOptions // Optional - Override createConfig parameters
})

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true // Optional - defaults to your Cloud configuration
})

function App() {

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <div className="App">
            <HeaderBar />
            <MainView />
          </div>
        </WagmiProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
