import * as React from "react";
import importedData from '../../content/results.json';
import {Table, Tooltip} from 'antd';
import {ColumnGroupType, ColumnsType} from 'antd/es/table';
import {formatISO} from "date-fns";
import './index.scss';
import classNames from 'classnames';

const data = (importedData as any) as ResultFile;

interface Row extends TickerWithSubmissionIdsForEachDay {
    key: string;
}

const renderCell = (count: number, change: number, isChangeFinite: boolean, isLastColumn: boolean) => {
    const isPositiveChange = change > 0;
    const isNegativeChange = change < 0;
    const changeClassName = classNames(
        'change',
        {'positive-change': isPositiveChange, 'negative-change': isNegativeChange}
    );

    return (
        <>
            <span className={'count'}>{count}</span>
            {!isLastColumn && change !== 0 &&
                <span
                    className={changeClassName}>{getChangeText(change, isChangeFinite)}
                </span>
            }
        </>
    )
};

function numberWithPlusSymbol(number: number) {
    return number > 0
        ? '+' + number
        : number;
}

const columns: ColumnsType<Row> = [
    {
        title: 'Ticker',
        key: 'ticker',
        fixed: 'left',
        width: 80,
        sorter: (a, b) => b.ticker.localeCompare(a.ticker),
        render: (row: Row) => <Tooltip title={row.stockData?.companyName}>{row.ticker}</Tooltip>
    },
    {
        title: 'Stock data',
        fixed: 'left',
        children: [
            {
                title: 'Price',
                key: 'price',
                width: 80,
                dataIndex: ['stockData', 'latestPrice'],
                sorter: (a: Row, b: Row) => (a.stockData?.latestPrice || 0) - (b.stockData?.latestPrice || 0),
            },
            {
                title: 'Change',
                key: 'change',
                width: 80,
                dataIndex: ['stockData', 'change'],
                sorter: (a: Row, b: Row) => (a.stockData?.change || 0) - (b.stockData?.change || 0),
                render: (change) => ({
                    props: {
                        className: classNames({'positive-change': change > 0, 'negative-change': change < 0})
                    },
                    children: change
                })
            },
            {
                title: 'Change %',
                key: 'changePercent',
                width: 80,
                dataIndex: ['stockData', 'changePercent'],
                sorter: (a: Row, b: Row) => (a.stockData?.changePercent || 0) - (b.stockData?.changePercent || 0),
                render: (change) => ({
                    props: {
                        className: classNames({'positive-change': change > 0, 'negative-change': change < 0})
                    },
                    children: Math.round(change * 100 * 100) / 100 + '%'
                })
            }
        ]
    },
    ...data.days.map((day, dayIndex) => ({
        title: formatISO(new Date(day), {representation: 'date'}),
        children: [
            {
                title: 'Total',
                className: 'total-column',
                width: 80,
                key: day + 'total',
                sorter: (a: Row, b: Row) => {
                    const aSubmissions = a.days.find(x => x.date === day)!.subreddits
                        .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0)
                    const bSubmissions = b.days.find(x => x.date === day)!.subreddits
                        .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0)
                    return aSubmissions - bSubmissions;
                },
                render: (row: Row) => {
                    const isLastColumn = dayIndex === data.days.length - 1;
                    const currentDay = row.days.find(x => x.date === day)!;
                    const allTickerCountForDay = currentDay.subreddits
                        .reduce((sum ,subreddit) => sum + subreddit.submissionIds.length, 0)
                    return renderCell(allTickerCountForDay, currentDay.totalChange, currentDay.isChangeFinite, isLastColumn);
                }
            },
            ...data.subreddits.map(subreddit => {
            return {
                title: subreddit,
                className: 'subreddit-column',
                width: 80,
                key: day + subreddit,
                sorter: (a: Row, b: Row) => {
                    const aSubmissions = a.days.find(x => x.date === day)!.subreddits.find(x => x.subreddit === subreddit)!.submissionIds.length;
                    const bSubmissions = b.days.find(x => x.date === day)!.subreddits.find(x => x.subreddit === subreddit)!.submissionIds.length;
                    return aSubmissions - bSubmissions;
                },
                render: (row: Row) => {
                    const isLastColumn = dayIndex === data.days.length - 1;
                    const currentDay = row.days.find(x => x.date === day)!;
                    const currentSubreddit = currentDay.subreddits.find(x => x.subreddit === subreddit)!;
                    return renderCell(currentSubreddit.submissionIds.length, currentSubreddit.change, currentSubreddit.isChangeFinite, isLastColumn);
                }
            };
        })]
    } as ColumnGroupType<Row>))
];

(columns[3] as ColumnGroupType<Row>).children[0].defaultSortOrder = 'descend';

const rows: Row[] = data.results.map(tickerWithSubmissionIds => ({
    key: tickerWithSubmissionIds.ticker,
    ...tickerWithSubmissionIds,
})).sort((a, b) => a.ticker.localeCompare(b.ticker));

function getChangeText(change: number, isFinite: boolean) {
    let changePercent;
    if (isFinite) {
        changePercent = Math.round(change * 100);
        if (change > 0) {
            changePercent = `+${changePercent}`;
        }
        changePercent += '%'
    }
    else {
        changePercent = change > 0 ? 'new' : 'none';
    }
    return changePercent;
}


const IndexPage = () => {
    return (
        <main>
            <div>Updated at: {data.updatedAt}</div>
            <Table
                rowClassName={(_, i) => classNames({ 'odd-row': i % 2 === 1 })}
                showSorterTooltip={false}
                sortDirections={['descend', 'ascend']}
                size={'small'}
                columns={columns}
                dataSource={rows}
                pagination={{
                    defaultPageSize: 50
                }}
                bordered={true}
            />
        </main>
    )
}

interface StockData {
    companyName: string;
    latestPrice: number;
    change: number;
    changePercent: number;
    low: number;
    high: number;
    open: number;
    close: number;
}

interface Submission {
    id: string;
    score: number;
    title: string;
    url: string;
}

interface ResultFile {
    results: TickerWithSubmissionIdsForEachDay[];
    submissions: { [_: string]: Submission };
    days: string[];
    subreddits: string[];
    updatedAt: string;
}

interface TickerWithSubmissionIdsForEachDay {
    ticker: string;
    days: DayWithSubreddits[];
    stockData?: StockData;
}

interface DayWithSubreddits {
    date: string;
    subreddits: SubredditWithSubmissionIds[];
    totalChange: number;
    isChangeFinite: boolean;
}

interface SubredditWithSubmissionIds {
    subreddit: string;
    submissionIds: string[];
    change: number;
    isChangeFinite: boolean;
}

export default IndexPage
