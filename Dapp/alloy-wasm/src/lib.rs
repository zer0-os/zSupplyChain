use wasm_bindgen::prelude::*;
use alloy::providers::{Provider, ProviderBuilder};
use eyre::Result;

#[wasm_bindgen]
pub async fn get_latest_block() -> Result<String, JsValue> {
    // Set up the HTTP transport which is consumed by the RPC client.
    let rpc_url = "https://eth.merkle.io".parse().map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    // Create a provider with the HTTP transport using the `reqwest` crate.
    let provider = ProviderBuilder::new().on_http(rpc_url);
    
    // Get the latest block number.
    let latest_block = provider.get_block_number().await.map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    // Return the block number as a string.
    Ok(latest_block.to_string())
}
