import { createBurnCheckedInstruction, createTransferInstruction, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, sendAndConfirmTransaction, Transaction, type Connection, type Signer } from "@solana/web3.js";
import type { UserData } from "./db.js";

export const mintTokens = async({connection, wallet, mintPubKey, receiverPubKey, amount}:{connection: Connection, wallet: Signer, mintPubKey: PublicKey, receiverPubKey: PublicKey, amount: bigint}) => {
    const receiverATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        mintPubKey,
        receiverPubKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    const data = await mintTo(
        connection,
        wallet,
        mintPubKey,
        receiverATA.address,
        wallet,
        amount,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
    )

    console.log(`Successfully minted tokens with id : ${data}`);
}

export const burnTokens = async({wallet, amount, connection}: {wallet: Signer, amount: bigint, connection: Connection}) => {
    const ata = new PublicKey(process.env.OWNER_ATA || "");
    const mintPubKey = new PublicKey(process.env.TOKEN_MINT || "");
    const transaction = new Transaction();
    transaction.add(
        createBurnCheckedInstruction(
            ata,
            mintPubKey,
            wallet.publicKey,
            amount,
            Number(process.env.TOKEN_DECIMALS )|| 9,
            [],
            TOKEN_2022_PROGRAM_ID
        )
    )
    
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);

    console.log(`Burnt tokens successfully.\nConfirm with id: ${signature}`);
}

export const sendTokens = async({userData, amount, connection, wallet}: {userData: UserData, amount: bigint, connection: Connection, wallet: Signer}) => {
    const transaction = new Transaction();
    transaction.add(
        createTransferInstruction(
            new PublicKey(userData.toTokenAccount),
            new PublicKey(userData.fromTokenAccount),
            new PublicKey(userData.toUserAccount),
            amount,
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);

    console.log(`Sent back their respective token.\nConfirm id: ${signature}`);
}