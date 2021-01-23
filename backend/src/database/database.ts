import BetterSqliteDatabase, {Statement, Transaction} from 'better-sqlite3';
import {DBSubmission, DBTicker} from './database-models';

export class Database {
    private db: BetterSqliteDatabase.Database;

    constructor(filename: string) {
        this.db = new BetterSqliteDatabase(filename);
    }

    public getLastSubmissionTime(): number | undefined {
        const query = this.db.prepare(`
            SELECT created_utc
            FROM submissions
            ORDER BY created_utc DESC
            LIMIT 1
        `);

        return query.get()?.created_utc as number;
    }

    public getSubmissions(fromCreatedUtc: number): DBSubmission[] {
        const query = this.db.prepare(`
            SELECT *
            FROM submissions
            WHERE created_utc >= @from
            ORDER BY created_utc DESC
        `);

        return query.all({from: fromCreatedUtc}) as DBSubmission[];
    }

    public getSubmissionIds(fromCreatedUtc: number): string[] {
        const query = this.db.prepare(`
            SELECT id
            FROM submissions
            WHERE created_utc >= @from
            ORDER BY created_utc DESC
        `);

        return (query.all({from: fromCreatedUtc}) as {id: string}[]).map(x => x.id);
    }

    public updateSubmissionScores(updatedSubmissions: {id: string, score: number}[]) {
        const query = this.db.prepare(`
            UPDATE submissions
               SET score = @score
             WHERE id = @id
        `);
        return this.transactionOnMany(query, updatedSubmissions);
    }

    public getGroupedSubmissions(from: number): GetAllSubmissionsResult[] {
        interface GetAllSubmissionsResultNoIdsArray {
            ticker: string;
            name: string;
            day_group: string;
            subreddit: string;
            ids: string;
        }

        const query = this.db.prepare(`
            SELECT t.ticker, t.name, strftime('%Y-%m-%d', subs.created_utc, 'unixepoch', 'localtime') AS day_group, lower(subs.subreddit) AS subreddit, group_concat(subs.id) AS ids FROM submissions AS subs
            JOIN submission_has_ticker AS sht ON subs.id = sht.submission_id
            JOIN tickers AS t ON t.ticker = sht.ticker
            WHERE t.is_fake = 0 AND subs.created_utc > @from
            GROUP BY t.ticker, day_group, subs.subreddit, t.ticker
        `);

        const results = query.all({from}) as GetAllSubmissionsResultNoIdsArray[];

        return results.map(x => ({...x, ids: x.ids.split(',')}));
    }

    public getAllSubreddits() {
        const query = this.db.prepare(`
            SELECT DISTINCT subreddit
            FROM submissions
        `);

        return (query.all() as { subreddit: string }[]).map(x => x.subreddit);
    }

    public insertSubmissions(submissions: DBSubmission[]): number {
        const query = this.db.prepare(`INSERT INTO submissions (id, subreddit, title, selftext, created_utc, score, author, url)
            VALUES (@id, @subreddit, @title, @selftext, @created_utc, @score, @author, @url)`);
        return this.transactionOnMany(query, submissions);
    }

    public insertTickers(tickers: DBTicker[]): number {
        const query = this.db.prepare(`
            INSERT OR IGNORE
            INTO tickers (ticker, is_fake, name, exchange, currency)
            VALUES (@ticker, @is_fake, @name, @exchange, @currency)
        `);
        return this.transactionOnMany(query, tickers);
    }

    public insertSubmissionsToTickers(submissionAndTickersMap: Record<string, Set<string>>): number {
        const query = this.db.prepare(`INSERT INTO submission_has_ticker (submission_id, ticker)
            VALUES (@submission_id, @ticker)`);

        const submissionAndTickers = Object
            .keys(submissionAndTickersMap)
            .reduce((res: {submission_id: string, ticker: string}[], submissionId) => {
                const tickers = submissionAndTickersMap[submissionId];
                tickers.forEach(ticker => res.push({submission_id: submissionId, ticker}))
                return res;
            },[]);

        return this.transactionOnMany(query, submissionAndTickers);
    }

    public filterExistingTickers(tickers: string[]) {
        const tickerParams = tickers.map(x => '?').join(',');

        const query = this.db.prepare(`
            SELECT ticker FROM tickers
            WHERE ticker IN (${tickerParams})`);

        const results = query.all(tickers) as {ticker: string}[];
        return results.map(x => x.ticker);
    }

    public setSubmissionsUpdated(utc: number) {
        const query = this.db.prepare(`
            UPDATE meta
               SET submissions_updated_utc = @utc
             WHERE id = @id
        `);
        query.run({utc});
    }

    public getSubmissionsUpdated(): number {
        const query = this.db.prepare(`
            SELECT submissions_updated_utc FROM meta WHERE id = 0
        `);
        return query.get().submissions_updated_utc;
    }

    private transactionOnMany(query: Statement<unknown[]>, items: unknown[]): number {
        return this.db.transaction((items) => {
            let insertCount = 0;
            for (const item of items) {
                const res = query.run(item);
                insertCount += res.changes;
            }
            return insertCount;
        })(items);
    }
}

export interface GetAllSubmissionsResult {
    ticker: string;
    name: string;
    day_group: string;
    subreddit: string;
    ids: string[];
}
