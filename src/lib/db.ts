// Generally you should use a production url for a database like PostgreSQL or MongoDB or any of your choice
// But I am gonna use in memory storage as it's just for test purposes and not many users gonna come to my website
// Main reason I can use because I am Liquid Staking Tokens on devnet, not on mainnet, otherwise i have to connect it with db
// I wanted to keep things simple and readable so I have used in memory storage
// As also I should have wrote an anchor rust program for it so make it truely decentralized, so I should just not use database

export type UserData = {
    fromTokenAccount: string,
    fromUserAccount: string,
    mint: string,
    toTokenAccount: string,
    toUserAccount: string,
    tokenAmount: number
    tokenDecimals: number,
}

type UserMap = {
    [key: string] : UserData
}

export const userMap : UserMap = {};