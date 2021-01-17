import {DBSubmission} from '../database/database-models';
import {add, formatISO, startOfDay, sub} from 'date-fns';
import twelveDataStocks from '../data/stocks.json';
import twelveDataEtfs from '../data/etf.json';
import fakeTickersImport from '../data/fake-tickers.json';
import {TwelveDataETF, TwelveDataETFFile, TwelveDataStock, TwelveDataStockFile} from '../models/TwelveData';
import {StockData} from '../controllers/stocks.controller';
import {GetAllSubmissionsResult} from '../database/database';

export class MainDataService {

    private readonly tickerRegex = /[A-Z]{3,5}/g;

    private readonly fakeTickers = new Set<string>(fakeTickersImport);
    private readonly twelveDataStockMap = new Map<string, TwelveDataStock>();
    private readonly twelveDataEtfMap = new Map<string, TwelveDataETF>();

    constructor() {
        (twelveDataStocks as TwelveDataStockFile).data.forEach(x => this.twelveDataStockMap.set(x.symbol, x));
        (twelveDataEtfs as TwelveDataETFFile).data.forEach(x => this.twelveDataEtfMap.set(x.symbol, x));
    }

    transformToStructuredData(groupedSubmissionResult: GetAllSubmissionsResult[], firstDay: Date, subreddits: string[]): TickerWithSubmissionIdsForEachDay[] {
        const result = this.createStructuredData(groupedSubmissionResult);
        this.fillEmptyDays(result, firstDay);
        this.reverseDaysSorting(result);
        this.fillEmptySubreddits(result, subreddits);

        return result;
    }


    private createStructuredData(groupedSubmissionResult: GetAllSubmissionsResult[]) {
        const result: TickerWithSubmissionIdsForEachDay[] = [];

        let prevTicker: string = '';
        let prevDayGroup: string = '';
        let prevSubredditGroup: string = '';
        let currentTickerGroup: TickerWithSubmissionIdsForEachDay;
        let currentDayGroup: DayWithSubreddits;
        for (let i = 0; i < groupedSubmissionResult.length; i++) {
            const row = groupedSubmissionResult[i];

            const currentSubredditGroup = {
                subreddit: row.subreddit,
                submissionIds: row.ids,
            };

            if (row.ticker !== prevTicker) {
                currentDayGroup = {
                    date: row.day_group,
                    subreddits: [currentSubredditGroup],
                };

                currentTickerGroup = {
                    ticker: row.ticker,
                    days: [currentDayGroup],
                };
                result.push(currentTickerGroup);
            }
            else if (row.day_group !== prevDayGroup) {
                currentDayGroup = {
                    date: row.day_group,
                    subreddits: [currentSubredditGroup],
                };
                currentTickerGroup!.days.push(currentDayGroup);
            }
            else if (row.subreddit !== prevSubredditGroup) {
                currentDayGroup!.subreddits.push(currentSubredditGroup);
            }

            prevTicker = row.ticker;
            prevDayGroup = row.day_group;
            prevSubredditGroup = row.subreddit;
        }
        return result;
    }

    getDayGroupsAsc(firstDay: Date) {
        const groups = [];
        let currDay = new Date(firstDay);
        const lastDay = new Date();
        while (currDay < lastDay) {
            groups.push(currDay);
            currDay = add(currDay, {days: 1});
        }
        return groups
            .map(date => formatISO(date, {representation: 'date'}));
    }

    fillEmptyDays(tickerGroups: TickerWithSubmissionIdsForEachDay[], firstDay: Date) {
        const dayGroups = this.getDayGroupsAsc(firstDay);
        for (const tickerGroup of tickerGroups) {

            for (let i = 0; i < dayGroups.length; i++) {
                const expectedDayGroup = dayGroups[i];
                const currentDayGroup = tickerGroup.days[i];

                if (!currentDayGroup || currentDayGroup.date !== expectedDayGroup) {
                    tickerGroup.days.splice(i, 0, {
                        date: expectedDayGroup,
                        subreddits: []
                    });
                }
            }
        }
    }


    fillEmptySubreddits(tickerGroups: TickerWithSubmissionIdsForEachDay[], subreddits: string[]) {
        for (const tickerGroup of tickerGroups) {
            for (const day of tickerGroup.days) {
                day.subreddits.sort((a, b) => a.subreddit.localeCompare(b.subreddit))

                for (let i = 0; i < subreddits.length; i++) {
                    const expectedSubredditGroup = subreddits[i];
                    const currentSubredditGroup = day.subreddits[i];

                    if (!currentSubredditGroup || currentSubredditGroup.subreddit !== expectedSubredditGroup) {
                        day.subreddits.splice(i, 0, {
                            subreddit: expectedSubredditGroup,
                            submissionIds: []
                        });
                    }
                }
            }
        }
    }

    private reverseDaysSorting(tickerGroups: TickerWithSubmissionIdsForEachDay[]) {
        for (const tickerGroup of tickerGroups) {
            tickerGroup.days.reverse();
        }
    }
}



interface TickerWithSubmissionIdsForEachDay {
    ticker: string;
    stockData?: StockData;
    days: DayWithSubreddits[];
}

interface DayWithSubreddits {
    date: string;
    subreddits: SubredditWithSubmissionIds[];
}

interface SubredditWithSubmissionIds {
    subreddit: string;
    submissionIds: string[];
}
