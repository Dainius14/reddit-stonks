import classNames from 'classnames';
import {Table} from 'antd';
import * as React from 'react';
import {ColumnType} from 'antd/es/table';
import {PanelRender} from 'rc-table/lib/interface';

export function RSTable<TRow extends object>(props: {
    columns: ColumnType<TRow>[],
    rows: TRow[],
    onExpandedRowRender: (row: TRow) => JSX.Element,
    header: PanelRender<TRow>
}) {
    return (
        <Table
            rowClassName={(_, i) => classNames({ 'odd-row': i % 2 === 1 })}
            showSorterTooltip={false}
            sortDirections={['descend', 'ascend']}
            size={'small'}
            columns={props.columns}
            dataSource={props.rows}
            pagination={{
                defaultPageSize: 50
            }}
            bordered={true}
            expandable={{
                expandedRowRender: props.onExpandedRowRender,
            }}
            title={props.header}
        />
    );
}
