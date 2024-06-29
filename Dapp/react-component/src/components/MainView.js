import { useAccount, useSignMessage } from 'wagmi'

function MainView() {
  const { address, isConnecting, isDisconnected } = useAccount()
  const { signMessage } = useSignMessage()

  // conditional rendering based on walletConnect connection status
  // connecting
  if (isConnecting) return (
    <div className="MainView">
      <p>Connecting…</p>
    </div>
  )
  // disconnected
  if (isDisconnected) return (
    <div className="MainView">
      <p>Please connect wallet</p>
    </div>
  )
  // connected
  return (
    <div className="MainView">
      <button className="zButton" onClick={() => signMessage({ message: 'hello world' })}>Create Game</button>
    </div>
  )
}

export default MainView;