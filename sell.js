var ethers = require('ethers');
var Web3 = require("web3");
const abiDecoder = require('abi-decoder'); // NodeJS
const testABI = require("./ABI.json")
const dotenv = require('dotenv');
dotenv.config();

abiDecoder.addABI(testABI);

var url = "wss://speedy-nodes-nyc.moralis.io/1919b77abdb2538bb1897b8f/bsc/testnet/ws";

let provider;
if (process.env.USE_WSS === true) {
    provider = new ethers.providers.WebSocketProvider(process.env.WSS_NODE);
} else {
    provider = new ethers.providers.JsonRpcProvider(process.env.RPC_NODE);
}

const wallet = new ethers.Wallet(process.env.MNEMONIC);
const account = wallet.connect(provider);

const router = new ethers.Contract(
    process.env.PANCAKE_SWAP_TESTNET_ROUTER,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external  payable returns (uint[] memory amounts)',
        'function swapExactETHForTokens( uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    ],
    account
);

var options = {
    timeout: 30000,
    clientConfig: {
        maxReceivedFrameSize: 100000000,
        maxReceivedMessageSize: 100000000,
    },
    reconnect: {
        auto: true,
        delay: 5000,
        maxAttempts: 15,
        onTimeout: false,
    },
};

var web3 = new Web3(new Web3.providers.WebsocketProvider(url, options));

// Listen only pending transaction
const subscription = web3.eth.subscribe("pendingTransactions", (err, res) => {
    if (err) console.error(err);
});

var init = async function () {
    // Set parameters
    const tokenIn = process.env.TEST_BNB;
    const tokenOut = '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7'
    const amountIn = ethers.utils.parseUnits('10', 18);

    const sell_tx = await router.swapExactTokensForETH( //uncomment here if you want to buy token
        amountIn,
        0,
        [tokenOut, tokenIn],
        process.env.YOUR_ADDRESS,
        Date.now() + 1000 * 60 * 5, // 5 minutes,
        {
            'gasLimit': 250000,
            'gasPrice': ethers.utils.parseUnits('10', 'gwei'),
            // 'nonce': null, //set you want buy at where position in blocks
            // 'value': amountIn
        });

    console.log(sell_tx)

};

init();