import React, {Component} from 'react';
import {Input, Spin, Tooltip} from 'antd';
import {ColumnGroupType, ColumnsType, ColumnType} from 'antd/es/table';
import {CheckboxValueType} from 'antd/es/checkbox/Group';
import {RSTable} from '../components/table/RSTable';
import { RSExpandedRow } from '../components/expanded-row/RSExpandedRow';
import { RSFilter } from '../components/filter/RSFilter';
import {SearchOutlined} from '@ant-design/icons';
import './IndexPage.styles.scss';
import {RedditStonksApi, RequestError} from '../api';
import {LocalStorage} from '../helpers/local-storage';
import {
    DayWithSubreddits,
    SubredditWithSubmissionIds,
    TickerWithSubmissionIdsForEachDay,
} from '../models/TableData';
import classNames from 'classnames';
import {formatISO} from 'date-fns';
import {mapFromTickerGroupDtos} from '../helpers/mappers';
import {calculateData} from '../helpers/data-calculations';

export class IndexPage extends Component<IndexPageProps, IndexPageState> {

    readonly state: IndexPageState = {
        selectedSubreddits: [],
        searchText: '',
        tableDataLoading: false,
        tableColumns: [],
        tableRows: [],
    };

    private originalTableColumns: ColumnType<TickerWithSubmissionIdsForEachDay>[] = [];
    private originalTableRows: TickerWithSubmissionIdsForEachDay[] = [];

    private dayGroupsDesc: string[] = [];
    private tableDataUpdatedAt?: Date;
    private availableSubreddits: string[] = [];
    private submissions: Record<string, SubmissionDTO> = {};

    public async componentDidMount() {
        this.loadSubmissions(5);
        await Promise.allSettled([
            this.loadAvailableSubreddits(),
            this.loadTableData(5),
        ]);

        this.originalTableColumns = IndexPage.createColumns(this.dayGroupsDesc, this.availableSubreddits);
        this.updateTable(this.state.searchText, this.state.selectedSubreddits);
    }

    private async loadTableData(days: number) {
        try {
            this.setTableDataLoading(true);
            const response = await RedditStonksApi.getMainData(days);
            this.originalTableRows = mapFromTickerGroupDtos(response.data);
            this.dayGroupsDesc = response.daysDesc;
            this.tableDataUpdatedAt = new Date(response.updatedAt);
            this.setTableDataLoading(false);
        }
        catch (ex) {
            const e = ex as RequestError;
            console.error(e.message, e.response);
        }
    }

    private async loadAvailableSubreddits() {
        try {
            this.availableSubreddits = await RedditStonksApi.getAvailableSubreddits();

            const savedSelectedSubreddits = LocalStorage.getObject<string[]>('selectedSubreddits');
            const selectedSubreddits = savedSelectedSubreddits
                ? savedSelectedSubreddits.filter(x => this.availableSubreddits.includes(x))
                : this.availableSubreddits;
            this.setSelectedSubreddits(selectedSubreddits);
        }
        catch (ex) {
            const e = ex as RequestError;
            console.error(e.message, e.response);
        }
    }

    private async loadSubmissions(days: number) {
        try {
            this.submissions = await RedditStonksApi.getSubmissions(days);
        }
        catch (ex) {
            const e = ex as RequestError;
            console.error(e.message, e.response);
        }
    }

    private updateTable(searchText: string, selectedSubreddits: string[]) {
        const filteredRows = searchText
            ? this.originalTableRows.filter(x => x.ticker.toLowerCase().startsWith(searchText.toLowerCase()))
            : this.originalTableRows;
        const tableRows = calculateData(filteredRows, selectedSubreddits);
        this.setTableRows(tableRows);

        const tableColumns = this.filterOutColumns(this.originalTableColumns, selectedSubreddits);
        this.setTableColumns(tableColumns);
    }

    onFilterChanged(newSelections: CheckboxValueType[]) {
        const newSelectionsStrings = newSelections as string[];
        this.updateTable(this.state.searchText, newSelectionsStrings);
        this.setSelectedSubreddits(newSelectionsStrings);
        LocalStorage.setObject('selectedSubreddits', newSelectionsStrings);
    }

    onSearch(searchText: string) {
        this.setSearchText(searchText);
        this.updateTable(searchText, this.state.selectedSubreddits);
    }

    render() {
        // TODO find better way to add table sorting later
        if (this.state.tableColumns.length === 0) {
            return <Spin spinning={true} />
        }

        return (<>
            <RSTable
                dataUpdatedAt={this.tableDataUpdatedAt}
                loading={this.state.tableDataLoading}
                columns={this.state.tableColumns}
                rows={this.state.tableRows}
                onChange={(a, b, c, d) => console.log(a,b,c,d)}
                onExpandedRowRender={(row) => <RSExpandedRow allSubmissions={this.submissions} row={row}/>}
                header={(_visibleRows) => <>
                    <Input
                        className={'ticker-search'}
                        size="small"
                        placeholder={'Search ticker...'}
                        onChange={(event) => this.onSearch(event.target.value)}
                        prefix={<SearchOutlined/>}
                        allowClear
                    />
                    <RSFilter
                        subreddits={this.availableSubreddits}
                        selectedSubreddits={this.state.selectedSubreddits}
                        onChange={values => this.onFilterChanged(values)}
                    />
                </>}
            />
        </>);
    }

    private filterOutColumns(columns: ColumnType<TickerWithSubmissionIdsForEachDay>[], selectedSubreddits: string[]) {
        const filteredColumns = [];
        for (let i = 0; i < columns.length; i++) {
            const columnGroup = columns[i] as ColumnGroupType<TickerWithSubmissionIdsForEachDay>;

            // Skip ticker and stock info columns
            if (i < 2) {
                filteredColumns.push(columnGroup);
                continue;
            }

            // Include total column
            const newColumnGroup: ColumnGroupType<TickerWithSubmissionIdsForEachDay> = {
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
            selectedSubreddits: subreddits,
        }));
    }

    private setTableDataLoading(value: boolean) {
        this.setState(() => ({
            tableDataLoading: value,
        }));
    }

    private setSearchText(value: string) {
        this.setState(() => ({
            searchText: value,
        }));
    }

    private setTableRows(value: TickerWithSubmissionIdsForEachDay[]) {
        this.setState(() => ({
            tableRows: value,
        }));
    }

    private setTableColumns(value: ColumnType<TickerWithSubmissionIdsForEachDay>[]) {
        this.setState(() => ({
            tableColumns: value,
        }));
    }

    private static createColumns(dayGroupsDesc: string[], selectedSubreddits: string[]): ColumnType<TickerWithSubmissionIdsForEachDay>[] {
        const titleColumn: ColumnType<TickerWithSubmissionIdsForEachDay> = {
            title: 'Ticker',
            key: 'ticker',
            fixed: 'left',
            width: 80,
            sorter: (a, b) => b.ticker.localeCompare(a.ticker),
            render: (row: TickerWithSubmissionIdsForEachDay) => <Tooltip title={row.stockData?.companyName}>{row.ticker}</Tooltip>,
        };

        const stockDataColumnGroup: ColumnGroupType<TickerWithSubmissionIdsForEachDay> = {
            key: 'stockData',
            title: 'Stock data',
            fixed: 'left',
            children: [
                {
                    title: 'Price',
                    key: 'price',
                    width: 80,
                    dataIndex: ['stockData', 'latestPrice'],
                    sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => (a.stockData?.latestPrice || 0) - (b.stockData?.latestPrice || 0),
                },
                {
                    title: 'Change',
                    key: 'change',
                    width: 80,
                    dataIndex: ['stockData', 'change'],
                    sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => (a.stockData?.change || 0) - (b.stockData?.change || 0),
                    render: (change) => ({
                        props: {
                            className: classNames({'positive-change': change > 0, 'negative-change': change < 0}),
                        },
                        children: change,
                    }),
                },
                {
                    title: 'Change %',
                    key: 'changePercent',
                    width: 80,
                    dataIndex: ['stockData', 'changePercent'],
                    sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => (a.stockData?.changePercent || 0) - (b.stockData?.changePercent || 0),
                    render: (change) => ({
                        props: {
                            className: classNames({'positive-change': change > 0, 'negative-change': change < 0}),
                        },
                        children: Math.round(change * 100 * 100) / 100 + '%',
                    }),
                },
            ],
        };

        const daysGroupColumnGroups: ColumnGroupType<TickerWithSubmissionIdsForEachDay>[] = dayGroupsDesc.map((day, dayIndex) => ({
            key: IndexPage.formatKey(['days', dayIndex]),
            title: formatISO(new Date(day), {representation: 'date'}),
            children: [
                {
                    title: 'Total',
                    className: 'total-column',
                    width: 80,
                    key: IndexPage.formatKey([day, 'total']),
                    dataIndex: ['days', dayIndex],
                    sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => {
                        const aSubmissions = a.days[dayIndex].subreddits
                            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
                        const bSubmissions = b.days[dayIndex].subreddits
                            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
                        return aSubmissions - bSubmissions;
                    },
                    render: (currentDay: DayWithSubreddits) => {
                        const isLastColumn = dayIndex === dayGroupsDesc.length - 1;
                        const allTickerCountForDay = currentDay.subreddits
                            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
                        return this.renderCell(allTickerCountForDay, currentDay.change, currentDay.isChangeFinite, isLastColumn);
                    },
                },
                ...selectedSubreddits.map((subreddit) => {
                    return {
                        title: subreddit,
                        className: 'subreddit-column',
                        width: 80,
                        key: IndexPage.formatKey([day, subreddit]),
                        dataIndex: ['days', dayIndex, 'subreddits'],
                        sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => {
                            const aSubmissions = a.days[dayIndex].subreddits.find(x => x.subreddit === subreddit)?.submissionIds.length ?? 0;
                            const bSubmissions = b.days[dayIndex].subreddits.find(x => x.subreddit === subreddit)?.submissionIds.length ?? 0;
                            // TODO reset sorting if null
                            return aSubmissions - bSubmissions;
                        },
                        render: (todaysSubreddits: SubredditWithSubmissionIds[]) => {
                            const isLastColumn = dayIndex === dayGroupsDesc.length - 1;
                            const currentSubreddit = todaysSubreddits.find(x => x.subreddit === subreddit);
                            return currentSubreddit && this.renderCell(currentSubreddit.submissionIds.length, currentSubreddit.change, currentSubreddit.isChangeFinite, isLastColumn);
                        },
                    };
                })],
        } as ColumnGroupType<TickerWithSubmissionIdsForEachDay>));

        const columns: ColumnsType<TickerWithSubmissionIdsForEachDay> = [
            titleColumn,
            stockDataColumnGroup,
            ...daysGroupColumnGroups,
        ];

        (columns.find(x => x.key === 'days@0') as ColumnGroupType<TickerWithSubmissionIdsForEachDay>).children[0].defaultSortOrder = 'descend';

        return columns;
    };

    private static formatKey(parts: (string | number)[]): string {
        return parts.join('@');
    }

    static renderCell(count: number, change: number, isChangeFinite: boolean, isLastColumn: boolean) {
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
                    className={changeClassName}>{this.getChangeText(change, isChangeFinite)}
                </span>
                }
            </>
        )
    }

    static getChangeText(change: number, isFinite: boolean) {
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
}

interface IndexPageProps {
}

interface IndexPageState {
    selectedSubreddits: string[];
    searchText: string;
    tableDataLoading: boolean;
    tableColumns: ColumnType<TickerWithSubmissionIdsForEachDay>[];
    tableRows: TickerWithSubmissionIdsForEachDay[];
}


export interface SubmissionDTO {
    id: string;
    subreddit: string;
    title: string;
    created_utc: number;
    score: number;
    url: string;
    is_removed: boolean;
    author: string;
}
