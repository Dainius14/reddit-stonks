import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const isDev = process.env.NODE_ENV == "development";

const config: Config = {
    isDevelopment: isDev,
    iexIsSandbox: process.env.IEX_CLOUD_IS_SANDBOX === 'true',
    iexToken: getEnvVariable(process.env.IEX_CLOUD_TOKEN, 'IEX_CLOUD_TOKEN'),
    port: +(process.env.PORT || 3000),
    databasePath: getEnvVariable(process.env.DB_PATH, 'DB_PATH'),
    availableSubreddits: getEnvVariable(process.env.SUBREDDITS_TO_SCRAPE, 'SUBREDDITS_TO_SCRAPE').split(',').sort(),
    scrapeStartDay: getEnvVariable(process.env.SCRAPE_START_DATE, 'SCRAPE_START_DATE'),
};

const redditConfig: RedditConfig = {
    username: getEnvVariable(process.env.REDDIT_USER_NAME, 'REDDIT_USER_NAME'),
    password: getEnvVariable(process.env.REDDIT_PASSWORD, 'REDDIT_PASSWORD'),
    clientId: getEnvVariable(process.env.REDDIT_CLIENT_ID, 'REDDIT_CLIENT_ID'),
    clientSecret: getEnvVariable(process.env.REDDIT_CLIENT_SECRET, 'REDDIT_CLIENT_SECRET'),
}

export { config, redditConfig };

interface Config {
    isDevelopment: boolean;
    iexIsSandbox: boolean;
    iexToken: string;
    port: number;
    databasePath: string;
    availableSubreddits: string[];
    scrapeStartDay: string;
}

interface RedditConfig {
    username: string;
    password: string;
    clientId: string;
    clientSecret: string;
}

function getEnvVariable(variable: string | undefined, name: string) {
    if (!variable) {
        throw new Error(`Environment variable ${name} was not provided`);
    }
    return variable;
}
