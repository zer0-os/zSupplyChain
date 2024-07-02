function ConnectButton() {
  return <w3m-button />
}

function HeaderBar() {
  return (
    <header className="App-header">
      <h1 className="App-logo"></h1>
      <ConnectButton />
    </header>
  );
}

export default HeaderBar;