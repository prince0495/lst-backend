// First of all LST (Liquid Staking Token) can essentially be done at large scale via large firms with a lot of funds.
// So I cannot provide liquid staking for your tokens so i essentially be giving you my PARASOL (POL) spl tokens in return as a reward to the users who stake LST.
// I am not using anchor rust to deply my own solana program (Smart Contract) so I am using node (centralized) to return the PARASOL token rewards for the users who stake LST.
// I am using Helius free Webhook service to notify my backend that a new transaction has been made on the chain for my wallet.
// You should probably use 3 - 5 different webhook providers to confirm that this transaction has been made on the chain, which i am not using for the simplicity purposes.
import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { burnTokens, mintTokens, sendTokens } from './lib/utils.js';
import { userMap } from './lib/db.js';
import cors from 'cors';

const app = express();

const port = process.env.PORT || 8123;

app.use(cors());

app.use(express.json());

const connection = new Connection('https://api.devnet.solana.com');

app.get('/', (req, res) => {
    res.send('hello world');
})

app.post('/helius', async(req, res) => {
    res.status(200).json({ received: true });
    try {
        const tx = req.body[0];
        let amount: bigint;
        const decimals: number = Number(process.env.TOKEN_DECIMALS);
        const receiverPubKey = new PublicKey(tx.nativeTransfers[0].fromUserAccount);
        const mintPubKey = new PublicKey(process.env.TOKEN_MINT || "");
        const wallet = Keypair.fromSecretKey(bs58.decode(process.env.OWNER_PRIVATE_KEY || ""));

        if(tx?.transactionError) {
            res.json({success: false, message: 'Transaction failed so will not be able to stake these tokens.'});
        }
        if(tx?.tokenTransfers && tx.tokenTransfers.length > 0) {
            // SPL TOKEN transfer has been made
            const amountSent = Number(tx.tokenTransfers[0]?.tokenAmount || 0);

            const fromTokenAccount: string = tx.tokenTransfers[0]?.fromTokenAccount;
            const fromUserAccount: string = tx.tokenTransfers[0]?.fromUserAccount;
            const mint: string = tx.tokenTransfers[0]?.mint;
            const toTokenAccount: string = tx.tokenTransfers[0]?.toTokenAccount;
            const toUserAccount: string = tx.tokenTransfers[0]?.toUserAccount;
            const tokenAmount: number = amountSent;
            
            if(userMap[fromUserAccount] && userMap[fromUserAccount].mint === process.env.TOKEN_MINT) {
                // User is returning your token to you and want his token value back
                
                // Important: Here we have to return something like 5%more tokens then what he is returning to me
                // because of staking we have earned more value of our token then user token
                // but this can only be performed by big companies by mining and staking tokens.
                // Here I have to do opposite like return back them 5% less tokens instead of 5% more tokens because of transaction safe interactions on blockchain,
                // but assume you getting back atleast somewhat value of what you gave me.

                const amountToBurn = BigInt(amountSent * decimals);
                await burnTokens({wallet, amount: amountToBurn, connection});
                
                let amountToSend: bigint;
                if(tokenAmount/1.8 >= userMap[fromUserAccount].tokenAmount) {   // If i don't have funds more than he has sent, then i can't really do much as I am not actally staking tokens like helius
                    amountToSend = BigInt(userMap[fromUserAccount].tokenAmount);
                }
                else {  // If I have funds available then I'll return the value of user's tokens
                    amountToSend = BigInt((tokenAmount/1.8) * userMap[fromUserAccount].tokenDecimals);
                }

                await sendTokens({userData: userMap[fromUserAccount], amount: amountToSend, wallet, connection});
                
            }
            else {
                // Stake their tokens and return them back the value of that token i.e. POL (PARASOL) spl tokens just like similar to mSOL or hSOL
                const prevAmount = userMap[fromUserAccount] ? userMap[fromUserAccount].tokenAmount : 0;
                amount = BigInt((amountSent * 1.5) * Math.pow(10, decimals));
                console.log('amountSent=', amountSent, ' decimals=', decimals, ' final=', amount);
                await mintTokens({connection, receiverPubKey, wallet, mintPubKey, amount});

                const senderATA = getAssociatedTokenAddressSync(
                    new PublicKey(mint),
                    new PublicKey(fromUserAccount),
                    false,
                    TOKEN_2022_PROGRAM_ID
                );

                let tokenDecimals: number = 9;

                if(tx?.accountData) {
                    const account = tx.accountData.find((acc: Partial<{account: string}>) => acc.account === senderATA.toBase58());
                    tokenDecimals = account?.tokenBalanceChanges ? (account.tokenBalanceChanges[0].rawTokenAmount.decimals) : 9;
                }

                // For production cases reflex the data in the database
                userMap[fromUserAccount] = {
                    fromTokenAccount,
                    fromUserAccount,
                    mint,
                    toTokenAccount,
                    toUserAccount,
                    tokenAmount: tokenAmount + prevAmount,
                    tokenDecimals,
                };
            }
            
        }
        else if (tx?.nativeTransfers && tx.nativeTransfers.length > 0 && (!tx.tokenTransfers || tx.tokenTransfers.length === 0)) {
            // SOL has been transfered
            const amountSent = Number(tx.nativeTransfers[0]?.amount) * 2;
            amount = BigInt(amountSent);
            // Just going to send them some of my spl tokens for free
            // It's not related to liquidity staking tokens
        }
        else {
            amount = 0n;
            res.json({success: false, message: 'No special method found for your type of tokens.'});
        }

    } catch (error) {
        res.json({success: false, message: 'Failed in try loop, if you are the developer then please look into the code and fix this uncaught error'});
    }
})

app.listen(port, () => console.log(`Server started at PORT : ${port}`));