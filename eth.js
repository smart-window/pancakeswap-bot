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

var init = function () {
    subscription.on("data", (txHash) => {
        setTimeout(async () => {
            try {
                let tx = await web3.eth.getTransaction(txHash);
                // Listen only pancake swap
                if (tx?.to === process.env.PANCAKE_SWAP_TESTNET_ROUTER) {
                    const decodedData = abiDecoder.decodeMethod(tx.input);
                    // if (decodedData.name === "amountIn" || decodedData.name === "swapExactETHForTokens") {
                    // Listen only buy tokens
                    if (decodedData.name === "swapETHForExactTokens" || decodedData.name === "swapExactETHForTokens") {
                        // Listen only direct buy
                        if (decodedData.params.find(item => item.name === 'path').value.length === 2) {
                            // console.log(decodedData)
                            // console.log(tx)
                            // Set parameters
                            const tokenIn = process.env.TEST_BNB;
                            const tokenOut = decodedData.params.find(item => item.name === 'path').value[1];
                            const amountIn = ethers.utils.parseUnits(`${tx.value * 3 * 1e-18}`, 'ether');

                            // Calculate amount out min
                            let amountOutMin = 0
                            // if (parseInt(process.env.SLIPPAGE) !== 0) {
                            //     const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
                            //     amountOutMin = amounts[1].sub(amounts[1].div(`${process.env.SLIPPAGE}`))
                            // }

                            // buy token
                            const buy_tx_hash = await router.swapExactETHForTokens( //uncomment here if you want to buy token
                                amountOutMin,
                                [tokenIn, tokenOut],
                                process.env.YOUR_ADDRESS,
                                Date.now() + 1000 * 60 * 5, // 5 minutes
                                {
                                    'gasLimit': tx.gas,
                                    'gasPrice': Number(tx.gasPrice) + Number(tx.gasPrice) / 10,
                                    'nonce': null, //set you want buy at where position in blocks
                                    'value': amountIn
                                });
                            let buy_tx = await web3.eth.getTransaction(buy_tx_hash.hash);

                            console.log(buy_tx)
                            // console.log(abiDecoder.decodeMethod(buy_tx.data))
                            // console.log(parseInt(buy_tx.value._hex.toString(), 16))
                            // const sell_tx = await router.swapExactTokensForETH( //uncomment here if you want to buy token
                            //     amountIn,
                            //     0,
                            //     [tokenIn, tokenOut],
                            //     process.env.YOUR_ADDRESS,
                            //     Date.now() + 1000 * 60 * 5, // 5 minutes
                            // );

                        }
                    }
                }
            } catch (err) {
                // console.error(err);
            }
        });
    });
};

init();