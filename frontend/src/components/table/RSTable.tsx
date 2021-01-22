import classNames from 'classnames';
import {Pagination, Table, Tooltip} from 'antd';
import * as React from 'react';
import {ColumnGroupType, ColumnsType, ColumnType} from 'antd/es/table';
import './RSTable.styles.scss';
import {FunctionComponent, ReactElement, ReactNode, useEffect, useMemo, useState} from 'react';
import {DayWithSubreddits, SubredditWithSubmissionIds, TickerWithSubmissionIdsForEachDay} from '../../models/TableData';
import {Key, SorterResult, TableCurrentDataSource, TablePaginationConfig} from 'antd/lib/table/interface';
import {formatISO} from 'date-fns';
import {calculateData} from '../../helpers/data-calculations';
import {SortOrder} from 'antd/es/table/interface';

const dayColKey = 'days';

interface RSTableProps {
    searchText: string;
    dayGroups: string[];
    availableSubreddits: string[];
    selectedSubreddits: Set<string>;
    data: TickerWithSubmissionIdsForEachDay[];
    onExpandedRowRender: (row: TickerWithSubmissionIdsForEachDay) => JSX.Element;
    dataUpdatedAt?: Date;
    onChange: (pagination: TablePaginationConfig, filters: Record<string, (Key | boolean)[] | null>, sorter: SorterResult<TickerWithSubmissionIdsForEachDay> | SorterResult<TickerWithSubmissionIdsForEachDay>[], extra: TableCurrentDataSource<TickerWithSubmissionIdsForEachDay>) => void
    pageHeaderHeight: number,
    children: {
        footerLeftSide: ReactNode
    }
}

let previouslySelectedSubreddits: Set<string> = new Set<string>();

export const RSTable: FunctionComponent<RSTableProps> = ({searchText, dayGroups, availableSubreddits, selectedSubreddits, data, onExpandedRowRender,
                                                             onChange, pageHeaderHeight, children}) => {

    useEffect(() => setTableHeaderHeight(document.querySelector('.rs-main-data-table .ant-table-header')!.clientHeight), [selectedSubreddits]);

    const [tableHeaderHeight, setTableHeaderHeight] = useState<number>(0);
    const [sortKey, setSortKey] = useState<string>(formatKey([dayColKey, 0, 'total']));
    const [sortOrder, setSortOrder] = useState<SortOrder | undefined>('descend');
    const [page, setPage] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(25);

    const availableColumns = useMemo(() => createColumns(dayGroups, availableSubreddits, () => previouslySelectedSubreddits !== selectedSubreddits), [dayGroups, availableSubreddits]) ;
    const filteredColumns = useMemo(() => filterColumns(availableColumns, selectedSubreddits), [availableColumns, selectedSubreddits]);

    const calculatedRows = useMemo(() => calculateData(data, selectedSubreddits), [data, selectedSubreddits]);
    const filteredOnSearchTextRows = useMemo(() => filterDataOnSearchText(calculatedRows, searchText), [calculatedRows, searchText]);

    const sortedRows = useMemo(() => sort(filteredOnSearchTextRows, sortKey, sortOrder), [filteredOnSearchTextRows, sortKey, sortOrder]);


    const rowsForPage = sortedRows.slice(page * pageSize, page * pageSize + pageSize);
    const totalRows = sortedRows.length;

    previouslySelectedSubreddits = selectedSubreddits;

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
                    setSortOrder(sorter.order);
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
                    console.log(page, pageSize)
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
    else if (key.startsWith(dayColKey)) {
        const [, dayStr, subCol] = key.split('@');
        const day = parseInt(dayStr);

        if (subCol === 'total') {
            return arrCopy.sort((a, b) => {
                const aSubmissions = a.days[day].subreddits
                    .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
                const bSubmissions = b.days[day].subreddits
                    .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
                return (aSubmissions - bSubmissions) * direction;
            });
        }
        else {
            return arrCopy.sort((a, b) => {
                const aSubmissions = a.days[day].subreddits.find(x => x.subreddit === subCol)?.submissionIds.length ?? 0;
                const bSubmissions = b.days[day].subreddits.find(x => x.subreddit === subCol)?.submissionIds.length ?? 0;
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

function createColumns(dayGroupsDesc: string[], availableSubreddits: string[], shouldDayGroupsTotalColumnUpdateFn: () => boolean): ColumnType<TickerWithSubmissionIdsForEachDay>[] {
    const titleColumn: ColumnType<TickerWithSubmissionIdsForEachDay> = {
        title: 'Ticker',
        key: 'ticker',
        fixed: 'left',
        width: 80,
        sorter: (a, b) => 0,
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
                // sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => (a.stockData?.latestPrice || 0) - (b.stockData?.latestPrice || 0),
            },
            {
                title: 'Change',
                key: 'change',
                width: 80,
                dataIndex: ['stockData', 'change'],
                // sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => (a.stockData?.change || 0) - (b.stockData?.change || 0),
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
                // sorter: (a: TickerWithSubmissionIdsForEachDay, b: TickerWithSubmissionIdsForEachDay) => (a.stockData?.changePercent || 0) - (b.stockData?.changePercent || 0),
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
        key: formatKey([dayColKey, dayIndex]),
        title: formatISO(new Date(day), {representation: 'date'}),
        children: [
            {
                title: 'Total',
                className: 'total-column',
                width: 80,
                key: formatKey([dayColKey, dayIndex, 'total']),
                dataIndex: ['days', dayIndex],
                sorter: () => 0,
                shouldCellUpdate: () => {
                    return shouldDayGroupsTotalColumnUpdateFn();
                },
                render: (currentDay: DayWithSubreddits) => {
                    const isLastColumn = dayIndex === dayGroupsDesc.length - 1;
                    const allTickerCountForDay = currentDay.subreddits
                        .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
                    return renderCell(allTickerCountForDay, currentDay.change, currentDay.isChangeFinite, isLastColumn);
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
                        shouldCellUpdate: () => {
                            return false;
                        },
                        render: (todaysSubreddits: SubredditWithSubmissionIds[]) => {
                            const isLastColumn = dayIndex === dayGroupsDesc.length - 1;
                            const currentSubreddit = todaysSubreddits.find(x => x.subreddit === subreddit);
                            return currentSubreddit && renderCell(currentSubreddit.submissionIds.length, currentSubreddit.change, currentSubreddit.isChangeFinite, isLastColumn);
                        },
                    };
                })],
    } as ColumnGroupType<TickerWithSubmissionIdsForEachDay>));

    const columns: ColumnsType<TickerWithSubmissionIdsForEachDay> = [
        titleColumn,
        stockDataColumnGroup,
        ...daysGroupColumnGroups,
    ];

    (columns[2] as ColumnGroupType<TickerWithSubmissionIdsForEachDay>).children[0].defaultSortOrder = 'descend';

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
            <span
                className={changeClassName}>{getChangeText(change, isChangeFinite)}
                </span>
            }
        </>
    )
}

function filterColumns(allColumns: ColumnType<TickerWithSubmissionIdsForEachDay>[], selectedSubreddits: Set<string>) {
    const filteredColumns = [];
    for (let i = 0; i < allColumns.length; i++) {
        const columnGroup = allColumns[i] as ColumnGroupType<TickerWithSubmissionIdsForEachDay>;

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
