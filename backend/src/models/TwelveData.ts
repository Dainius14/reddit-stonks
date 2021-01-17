export interface TwelveDataStockFile {
    data: TwelveDataStock[];
    status: string;
}

export interface TwelveDataETFFile {
    data: TwelveDataETF[];
    status: string;
}

export interface TwelveDataExchangeFile {
    data: TwelveDataExchange[];
    status: string;
}

export interface TwelveDataStock extends TwelveDataExchangeItem {
    exchange: string;
    country: string;
    type: string;
}

export interface TwelveDataETF extends TwelveDataExchangeItem {
}

export interface TwelveDataExchangeItem {
    symbol: string;
    name: string;
    currency: string;
}

export interface TwelveDataExchange {
    name: string;
    code: string;
    country: string;
    timezone: string;
}
