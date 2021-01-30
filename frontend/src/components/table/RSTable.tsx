import classNames from 'classnames';
import {Pagination, Table, Tooltip} from 'antd';
import * as React from 'react';
import {FC, FunctionComponent, ReactNode, useEffect, useMemo, useState} from 'react';
import {ColumnGroupType, ColumnsType, ColumnType} from 'antd/es/table';
import './RSTable.styles.scss';
import {
    DayWithSubreddits,
    SubredditWithSubmissionIds,
    TickerWithSubmissionIdsForEachDay,
} from '../../models/TableData';
import {SorterResult} from 'antd/lib/table/interface';
import {formatISO} from 'date-fns';
import {calculateData} from '../../helpers/data-calculations';
import {SortOrder} from 'antd/es/table/interface';
import {RedditStonksApi} from '../../api';
import {StockDataResponseDTO} from '../../../../backend/src/models/dto';
import {RSHeartButton} from '../heart-button/RSHeartButton';


const dayColKey = 'days';
const stockDataRefreshTimeSeconds = 60;

interface RSTableProps {
    searchText: string;
    dayGroups: string[];
    availableSubreddits: string[];
    selectedSubreddits: Set<string>;
    data: TickerWithSubmissionIdsForEachDay[];
    onExpandedRowRender: (row: TickerWithSubmissionIdsForEachDay) => JSX.Element;
    dataUpdatedAt?: Date;
    pageHeaderHeight: number,
    children: {
        footerLeftSide: ReactNode
    },
    lovedTickers: Set<string>
}

let updateStockDataInterval: any;

export const RSTable: FunctionComponent<RSTableProps> = ({searchText, dayGroups, availableSubreddits, selectedSubreddits, data, onExpandedRowRender,
        pageHeaderHeight, children, lovedTickers}) => {

    useEffect(() => setTableHeaderHeight(document.querySelector('.rs-main-data-table .ant-table-header')!.clientHeight), [selectedSubreddits]);

    const [tableHeaderHeight, setTableHeaderHeight] = useState<number>(0);
    const [sortKey, setSortKey] = useState<string>(formatKey([dayColKey, 0, 'total']));
    const [sortOrder, setSortOrder] = useState<SortOrder>('descend');
    const [page, setPage] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(40);
    const [stockData, setStockData] = useState<StockDataResponseDTO>({});

    const availableColumns = useMemo(() => createColumns(dayGroups, availableSubreddits, stockData, lovedTickers), [dayGroups, availableSubreddits, stockData, lovedTickers]) ;
    const filteredColumns = useMemo(() => filterColumns(availableColumns, selectedSubreddits), [availableColumns, selectedSubreddits]);

    const calculatedRows = useMemo(() => calculateData(data, selectedSubreddits), [data, selectedSubreddits]);
    const filteredOnSearchTextRows = useMemo(() => filterDataOnSearchText(calculatedRows, searchText), [calculatedRows, searchText]);

    const sortedRows = useMemo(() => sort(filteredOnSearchTextRows, sortKey, sortOrder), [filteredOnSearchTextRows, sortKey, sortOrder]);

    const rowsForPage = sortedRows.slice(page * pageSize, page * pageSize + pageSize);

    useEffect(() => {
        async function fetchData() {
            if (rowsForPage.length > 0) {
                try {
                    const res = await RedditStonksApi.getStockData(rowsForPage.map(x => x.ticker));
                    setStockData(res);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }

        updateStockDataInterval = clearInterval(updateStockDataInterval);
        fetchData();
        updateStockDataInterval = setInterval(() => fetchData(), stockDataRefreshTimeSeconds * 1000);
    }, [page, pageSize, sortKey, sortOrder, searchText])

    const totalRows = sortedRows.length;

    return (<>
        <Table
            className={'rs-main-data-table'}
            rowKey={'ticker'}
            rowClassName={(_, i) => classNames({ 'odd-row': i % 2 === 1 })}
            showSorterTooltip={false}
            sortDirections={['descend', 'ascend']}
            size={'small'}
            columns={filteredColumns}
            dataSource={rowsForPage}
            pagination={false}
            bordered={true}
            expandable={{
                expandedRowRender: onExpandedRowRender,
            }}
            scroll={{ x: '100vw', y: `calc(100vh - ${pageHeaderHeight}px - 24px - 4px - ${tableHeaderHeight}px)`}}
            onChange={(pagination, filters, sorter, extra) => {
                sorter = sorter as SorterResult<TickerWithSubmissionIdsForEachDay>;
                if (extra.action === 'sort') {
                    setSortKey(sorter.columnKey as string);
                    setSortOrder(sorter.order!);
                }
            }}
        />

        <div className={'rs-main-data-table-footer'}>

            {children.footerLeftSide}

            <Pagination
                className={'rs-main-data-table-pagination'}
                current={page + 1}

                pageSize={pageSize}
                size="small"
                total={totalRows}
                onChange={((page, pageSize) => {
                    setPage(page - 1);
                    setPageSize(pageSize ?? 25);
                })}
            />
        </div>


    </>);
}


function sort(filteredOnSearchTextRows: TickerWithSubmissionIdsForEachDay[], key: string, order: SortOrder | undefined) {
    const direction = order === 'ascend' || !order ? 1 : -1
    const arrCopy =  [...filteredOnSearchTextRows];

    if (key === 'ticker') {
        return arrCopy.sort((a, b) => a.ticker.localeCompare(b.ticker) * direction);
    }
    else if (key === 'all-day-total') {
        return arrCopy.sort((a, b) => (a.submissionCount - b.submissionCount) * direction);
    }
    else if (key.startsWith(dayColKey)) {
        const [, dayStr, subCol] = key.split('@');
        const day = parseInt(dayStr);

        if (subCol === 'total') {
            return arrCopy.sort((a, b) => (a.days[day].submissionCount - b.days[day].submissionCount) * direction);
        }
        else {
            return arrCopy.sort((a, b) => {
                const aSubmissions = a.days[day].subreddits.find(x => x.subreddit === subCol)?.submissionCount ?? 0;
                const bSubmissions = b.days[day].subreddits.find(x => x.subreddit === subCol)?.submissionCount ?? 0;
                return (aSubmissions - bSubmissions) * direction;
            });
        }

    }
    return arrCopy;
}

function filterDataOnSearchText(rows: TickerWithSubmissionIdsForEachDay[], searchText: string) {
    const searchTextLower = searchText.toLowerCase();
    return searchText
        ? rows.filter(x => x.ticker.toLowerCase().startsWith(searchTextLower))
        : rows;
}

function createColumns(dayGroupsDesc: string[], availableSubreddits: string[], stockData: StockDataResponseDTO,
                       lovedTickers: Set<string>): ColumnType<TickerWithSubmissionIdsForEachDay>[] {
    const titleColumn: ColumnType<TickerWithSubmissionIdsForEachDay> = {
        title: 'Ticker',
        key: 'ticker',
        fixed: 'left',
        width: 80,
        sorter: (a, b) => 0,
        render: (row: TickerWithSubmissionIdsForEachDay) => <TickerCell row={row} loved={lovedTickers.has(row.ticker)}/>,
    };

    const stockDataColumnGroup: ColumnType<TickerWithSubmissionIdsForEachDay> =
        {
            title: 'Price',
            key: 'price',
            width: 140,
            dataIndex: ['ticker'],
            render: (ticker: string) => {
                const stock = stockData[ticker];
                if (!stock) return null;

                const changeClassName = classNames(
                    'change',
                    {'positive-change': stock.change > 0, 'negative-change': stock.change < 0}
                );

                return (
                    <>
                        <span className={'price'}>{stock.latestPrice} {stock.currency}</span>
                        <span className={changeClassName}>
                                {stock.change} ({Math.round(stock.changePercent * 100 * 100) / 100} %)
                            </span>
                    </>
                )
            }
        };

    const allDayTotal: ColumnType<TickerWithSubmissionIdsForEachDay> = {
        title: 'All day total',
        className: 'total-all-day-column',
        width: 65,
        key: 'all-day-total',
        dataIndex: 'submissionCount',
        sorter: () => 0,
        shouldCellUpdate: (current: TickerWithSubmissionIdsForEachDay, previous: TickerWithSubmissionIdsForEachDay) => current.days[0].subreddits.length !== previous.days[0].subreddits.length,
    };

    const daysGroupColumnGroups: ColumnGroupType<TickerWithSubmissionIdsForEachDay>[] = dayGroupsDesc.map((day, dayIndex) => ({
        key: formatKey([dayColKey, dayIndex]),
        title: formatISO(new Date(day), {representation: 'date'}),
        children: [
            {
                title: 'Total',
                className: 'total-column',
                width: 85,
                key: formatKey([dayColKey, dayIndex, 'total']),
                dataIndex: ['days', dayIndex],
                sorter: () => 0,
                shouldCellUpdate: (current: TickerWithSubmissionIdsForEachDay, previous: TickerWithSubmissionIdsForEachDay) => current.days[0].subreddits.length !== previous.days[0].subreddits.length,
                render: (currentDay: DayWithSubreddits) => {
                    const isLastColumn = dayIndex === dayGroupsDesc.length - 1;
                    return renderCell(currentDay.submissionCount, currentDay.change, currentDay.isChangeFinite, isLastColumn);
                    },
                },
                ...availableSubreddits.map((subreddit) => {
                    return {
                        title: subreddit,
                        className: 'subreddit-column',
                        width: 80,
                        key: formatKey([dayColKey, dayIndex, subreddit]),
                        dataIndex: ['days', dayIndex, 'subreddits'],
                        sorter: () => 0,
                        shouldCellUpdate: () => false,
                        render: (todaysSubreddits: SubredditWithSubmissionIds[]) => {
                            const isLastColumn = dayIndex === dayGroupsDesc.length - 1;
                            const currentSubreddit = todaysSubreddits.find(x => x.subreddit === subreddit);
                            return currentSubreddit && renderCell(currentSubreddit.submissionCount, currentSubreddit.change, currentSubreddit.isChangeFinite, isLastColumn);
                        },
                    };
                })],
    } as ColumnGroupType<TickerWithSubmissionIdsForEachDay>));

    const columns: ColumnsType<TickerWithSubmissionIdsForEachDay> = [
        titleColumn,
        stockDataColumnGroup,
        allDayTotal,
        ...daysGroupColumnGroups,
    ];

    (columns[3] as ColumnGroupType<TickerWithSubmissionIdsForEachDay>).children[0].defaultSortOrder = 'descend';

    return columns;
}

function formatKey(parts: (string | number)[]): string {
    return parts.join('@');
}

function renderCell(count: number, change: number, isChangeFinite: boolean, isLastColumn: boolean) {
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
                <div
                    className={changeClassName}>{getChangeText(change, isChangeFinite)}
                </div>
            }
        </>
    )
}

function filterColumns(allColumns: ColumnType<TickerWithSubmissionIdsForEachDay>[], selectedSubreddits: Set<string>) {
    const filteredColumns = [];
    for (let i = 0; i < allColumns.length; i++) {
        const columnGroup = allColumns[i] as ColumnGroupType<TickerWithSubmissionIdsForEachDay>;

        // Skip first few columns
        if (i < 3) {
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
            if (selectedSubreddits.has((subredditColumn.key as string).split('@')[2])) {
                newColumnGroup.children.push(subredditColumn);
            }
        }

        if (newColumnGroup.children.length > 1) {
            newColumnGroup.children.splice(0, 0, columnGroup.children[0]);
        }
    }
    return filteredColumns;
}

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

interface TickerCellProps {
    row: TickerWithSubmissionIdsForEachDay;
    loved: boolean;
}

const TickerCell: FC<TickerCellProps> = ({row, loved}) => {
    return <Tooltip title={row.tickerName}>
        {row.ticker}
        {loved && <RSHeartButton className={'rs-main-data-table-remembered-ticker'} isActivated={true}/>}
    </Tooltip>;
}
