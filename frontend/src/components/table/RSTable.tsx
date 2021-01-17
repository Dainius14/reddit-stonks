import classNames from 'classnames';
import {Table} from 'antd';
import * as React from 'react';
import {ColumnType} from 'antd/es/table';
import {PanelRender} from 'rc-table/lib/interface';
import './RSTable.styles.scss';
import {createRef, FunctionComponent, useEffect, useState} from 'react';
import {TickerWithSubmissionIdsForEachDay} from '../../models/TableData';
import {RSFilter} from '../filter/RSFilter';
import {formatDate} from '../../utilities';

export const RSTable: FunctionComponent<RSTableProps> = ({loading, columns, rows, onExpandedRowRender, header,
                     dataUpdatedAt}) => {
    const [headerHeight, setHeaderHeight] = useState<number>(0);
    useEffect(() => {
        const headerEl = document.querySelector('.main-data-table .ant-table-header');
        const currentHeight = headerEl!.clientHeight;
        if (currentHeight !== headerHeight) {
            setHeaderHeight(currentHeight);
        }
    })

    return (
        <Table
            className={'main-data-table'}
            rowKey={'ticker'}
            loading={loading}
            rowClassName={(_, i) => classNames({ 'odd-row': i % 2 === 1 })}
            showSorterTooltip={false}
            sortDirections={['descend', 'ascend']}
            size={'small'}
            columns={columns}
            dataSource={rows}
            pagination={{
                defaultPageSize: 50,
                showTotal: (_totalRows) =>
                    <span className={'updated-at'}>
                        { dataUpdatedAt &&
                        `Updated at: ${formatDate(dataUpdatedAt)}`
                        }
                    </span>
            }}
            bordered={true}
            expandable={{
                expandedRowRender: onExpandedRowRender,
            }}
            title={header}
            scroll={{ x: '100vw', y: `calc(100vh - 41px - 24px - 4px - ${headerHeight}px - 1px)`}}
        />
    );
}



interface RSTableProps {
    loading: boolean;
    columns: ColumnType<TickerWithSubmissionIdsForEachDay>[];
    rows: TickerWithSubmissionIdsForEachDay[];
    onExpandedRowRender: (row: TickerWithSubmissionIdsForEachDay) => JSX.Element;
    header: PanelRender<TickerWithSubmissionIdsForEachDay>;
    dataUpdatedAt?: Date;
}
