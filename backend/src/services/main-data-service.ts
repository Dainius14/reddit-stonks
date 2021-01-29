import {add, formatISO} from 'date-fns';
import twelveDataStocks from '../data/stocks.json';
import twelveDataEtfs from '../data/etf.json';
import {TwelveDataETF, TwelveDataETFFile, TwelveDataStock, TwelveDataStockFile} from '../models/TwelveData';
import {GetAllSubmissionsResult} from '../database/database';
import {DayWithSubredditsDTO, TickerWithSubmissionIdsForEachDayDTO} from '../models/dto';

export class MainDataService {

    private readonly twelveDataStockMap = new Map<string, TwelveDataStock>();
    private readonly twelveDataEtfMap = new Map<string, TwelveDataETF>();

    constructor() {
        (twelveDataStocks as TwelveDataStockFile).data.forEach(x => this.twelveDataStockMap.set(x.symbol, x));
        (twelveDataEtfs as TwelveDataETFFile).data.forEach(x => this.twelveDataEtfMap.set(x.symbol, x));
    }

    transformToStructuredData(groupedSubmissionResult: GetAllSubmissionsResult[], firstDay: Date, lastDay: Date, subreddits: string[]): TickerWithSubmissionIdsForEachDayDTO[] {
        const result = this.createStructuredData(groupedSubmissionResult);
        this.fillEmptyDays(result, firstDay, lastDay);
        this.reverseDaysSorting(result);
        this.fillEmptySubreddits(result, subreddits);

        return result;
    }


    private createStructuredData(groupedSubmissionResult: GetAllSubmissionsResult[]) {
        const result: TickerWithSubmissionIdsForEachDayDTO[] = [];

        let prevTicker: string = '';
        let prevDayGroup: string = '';
        let prevSubredditGroup: string = '';
        let currentTickerGroup: TickerWithSubmissionIdsForEachDayDTO;
        let currentDayGroup: DayWithSubredditsDTO;
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
                    tickerName: row.name,
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

    getDayGroupsAsc(firstDay: Date, lastDay: Date) {
        const groups = [];
        let currDay = new Date(firstDay);
        while (currDay < lastDay) {
            groups.push(currDay);
            currDay = add(currDay, {days: 1});
        }
        return groups
            .map(date => formatISO(date, {representation: 'date'}));
    }

    fillEmptyDays(tickerGroups: TickerWithSubmissionIdsForEachDayDTO[], firstDay: Date, lastDay: Date) {
        const dayGroups = this.getDayGroupsAsc(firstDay, lastDay);
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


    fillEmptySubreddits(tickerGroups: TickerWithSubmissionIdsForEachDayDTO[], subreddits: string[]) {
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

    private reverseDaysSorting(tickerGroups: TickerWithSubmissionIdsForEachDayDTO[]) {
        for (const tickerGroup of tickerGroups) {
            tickerGroup.days.reverse();
        }
    }
}
