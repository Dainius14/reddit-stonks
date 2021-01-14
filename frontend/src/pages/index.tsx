import * as React from 'react';
import importedData from '../../content/results.json';
import {Tooltip} from 'antd';
import {ColumnGroupType, ColumnsType, ColumnType} from 'antd/es/table';
import {formatISO} from "date-fns";
import './index.scss';
import classNames from 'classnames';
import { RSTable } from "../components/table/table";
import {RSFilter} from '../components/filter/filter';
import {CheckboxValueType} from 'antd/es/checkbox/Group';
import {calculateData} from '../helpers/data-calculations';
import {LocalStorage} from '../helpers/local-storage';
import {Input} from 'antd';
import {SearchOutlined} from '@ant-design/icons';
import {formatDate} from '../utilities';
import {RSExpandedRow} from '../components/expanded-row';
import {store} from 'gatsby/dist/redux';

const data = (importedData as any) as ResultFile;

export interface Row extends TickerWithSubmissionIdsForEachDay {
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
const rows: Row[] = data.results.map(tickerWithSubmissionIds => ({
    key: tickerWithSubmissionIds.ticker,
    ...tickerWithSubmissionIds,
}));

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

export interface Submission {
    id: string;
    score: number;
    title: string;
    url: string;
    subreddit: string;
    created_utc: string;
}

interface ResultFile {
    results: TickerWithSubmissionIdsForEachDay[];
    submissions: Record<string, Submission>;
    days: string[];
    subreddits: string[];
    updatedAt: string;
}

export interface TickerWithSubmissionIdsForEachDay {
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


export default class IndexPage extends React.Component<IndexPageProps, IndexPageState> {

    readonly state: IndexPageState = {
        selectedSubreddits: data.subreddits,
        searchText: ''
    };

    private readonly originalTableColumns: ColumnType<Row>[] = this.createColumns();
    private readonly originalTableRows: Row[] = rows;

    private tableColumns: ColumnType<Row>[] = this.originalTableColumns;
    private tableRows: Row[];

    constructor(props: IndexPageProps) {
        super(props);
        this.tableRows = calculateData(this.originalTableRows, this.state.selectedSubreddits);
    }

    public componentDidMount() {
        const storedSelectedSubreddits = LocalStorage.getObject<string[]>('selectedSubreddits');
        if (storedSelectedSubreddits)
        {
            this.setSelectedSubreddits(storedSelectedSubreddits);
            this.tableColumns = IndexPage.filterOutColumns(this.originalTableColumns, storedSelectedSubreddits);
            this.tableRows = calculateData(this.originalTableRows, storedSelectedSubreddits);
        }
    }

    onFilterChanged(newSelections: CheckboxValueType[]) {
        const newSelectionsStrings = newSelections as string[];
        this.tableColumns = IndexPage.filterOutColumns(this.originalTableColumns, newSelectionsStrings);
        this.tableRows = calculateData(this.originalTableRows, newSelectionsStrings);
        this.setSelectedSubreddits(newSelectionsStrings);
        LocalStorage.setObject('selectedSubreddits', newSelectionsStrings);
    }

    onSearch(searchText: string) {
        this.setSearchText(searchText);
    }

    render() {
        return (<>
            <RSTable
                columns={this.tableColumns}
                rows={this.tableRows.filter(row => row.ticker.toLowerCase().startsWith(this.state.searchText.toLowerCase()))}
                onExpandedRowRender={(row) => <RSExpandedRow allSubmissions={data.submissions} row={row} />}
                header={(_visibleRows) => <>
                    <Input
                        className={'ticker-search'}
                        size="small"
                        placeholder={'Search ticker...'}
                        onChange={(event) => this.onSearch(event.target.value)}
                        prefix={<SearchOutlined />}
                        allowClear
                    />
                    <RSFilter
                        subreddits={data.subreddits}
                        selectedSubreddits={this.state.selectedSubreddits}
                        onChange={values => this.onFilterChanged(values)}
                    />
                    <span className={'updated-at'}>Updated at: {formatDate(new Date(data.updatedAt))}</span>
                </>}
            />
        </>)
    }

    private static filterOutColumns(columns: ColumnType<Row>[], selectedSubreddits: string[]) {
        const filteredColumns = [];
        for (let i = 0; i < columns.length; i++) {
            const columnGroup = columns[i] as ColumnGroupType<Row>;

            // Skip ticker and stock info columns
            if (i < 2) {
                filteredColumns.push(columnGroup);
                continue;
            }

            // Include total column
            const newColumnGroup: ColumnGroupType<Row> = {
                ...columnGroup,
                children: [],
            };
            filteredColumns.push(newColumnGroup);

            for (let j = 1; j < columnGroup.children.length; j++) {
                const subredditColumn = columnGroup.children[j];
                if (selectedSubreddits.some(selected => (subredditColumn.key as string).split('@')[1] === selected)) {
                    newColumnGroup.children.push(subredditColumn);
                }
            }

            if (newColumnGroup.children.length > 1) {
                newColumnGroup.children.splice(0, 0, columnGroup.children[0]);
            }
        }
        return filteredColumns;
    }

    private setSelectedSubreddits(subreddits: string[]) {
        this.setState(() => ({
            selectedSubreddits: subreddits
        }));
    }

    private setSearchText(value: string) {
        this.setState(() => ({
            searchText: value
        }));
    }

    private createColumns(): ColumnType<Row>[] {
        const titleColumn: ColumnType<Row> = {
            title: 'Ticker',
            key: 'ticker',
            fixed: 'left',
            width: 80,
            sorter: (a, b) => b.ticker.localeCompare(a.ticker),
            render: (row: Row) => <Tooltip title={row.stockData?.companyName}>{row.ticker}</Tooltip>
        };

        const stockDataColumnGroup: ColumnGroupType<Row> = {
            key: 'stockData',
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
        };

        const daysGroupColumnGroups: ColumnGroupType<Row>[] = data.days.map((day, dayIndex) => ({
            key: IndexPage.formatKey(['day', dayIndex]),
            title: formatISO(new Date(day), {representation: 'date'}),
            children: [
                {
                    title: 'Total',
                    className: 'total-column',
                    width: 80,
                    key: IndexPage.formatKey([day, 'total']),
                    dataIndex: ['days', dayIndex],
                    sorter: (a: Row, b: Row) => {
                        const aSubmissions = a.days[dayIndex].subreddits
                            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0)
                        const bSubmissions = b.days[dayIndex].subreddits
                            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0)
                        return aSubmissions - bSubmissions;
                    },
                    render: (currentDay: DayWithSubreddits) => {
                        const isLastColumn = dayIndex === data.days.length - 1;
                        const allTickerCountForDay = currentDay.subreddits
                            .reduce((sum ,subreddit) => sum + subreddit.submissionIds.length, 0)
                        return renderCell(allTickerCountForDay, currentDay.totalChange, currentDay.isChangeFinite, isLastColumn);
                    }
                },
                ...data.subreddits.map((subreddit) => {
                    return {
                        title: subreddit,
                        className: 'subreddit-column',
                        width: 80,
                        key: IndexPage.formatKey([day, subreddit]),
                        dataIndex: ['days', dayIndex, 'subreddits'],
                        sorter: (a: Row, b: Row) => {
                            const aSubmissions = a.days[dayIndex].subreddits.find(x => x.subreddit === subreddit)?.submissionIds.length ?? 0;
                            const bSubmissions = b.days[dayIndex].subreddits.find(x => x.subreddit === subreddit)?.submissionIds.length ?? 0;
                            // TODO reset sorting if null
                            return aSubmissions - bSubmissions;
                        },
                        render: (todaysSubreddits: SubredditWithSubmissionIds[]) => {
                            const isLastColumn = dayIndex === data.days.length - 1;
                            const currentSubreddit = todaysSubreddits.find(x => x.subreddit === subreddit);
                            return currentSubreddit && renderCell(currentSubreddit.submissionIds.length, currentSubreddit.change, currentSubreddit.isChangeFinite, isLastColumn);
                        }
                    };
                })]
        } as ColumnGroupType<Row>));

        const columns: ColumnsType<Row> = [
            titleColumn,
            stockDataColumnGroup,
            ...daysGroupColumnGroups
        ];

        (columns.find(x => x.key === 'day@0') as ColumnGroupType<Row>).children[0].defaultSortOrder = 'descend';

        return columns;
    };

    private static formatKey(parts: (string | number)[]): string {
        return parts.join('@');
    }
}

interface IndexPageProps {
}

interface IndexPageState {
    selectedSubreddits: string[];
    searchText: string;
}
