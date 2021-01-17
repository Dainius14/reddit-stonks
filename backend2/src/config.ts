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

export { config };

interface Config {
    isDevelopment: boolean;
    iexIsSandbox: boolean;
    iexToken: string;
    port: number;
    databasePath: string;
    availableSubreddits: string[];
    scrapeStartDay: string;
}

function getEnvVariable(variable: string | undefined, name: string) {
    if (!variable) {
        throw new Error(`Environment variable ${name} was not provided`);
    }
    return variable;
}
