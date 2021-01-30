import * as React from 'react';
import {FC, useEffect, useState} from 'react';
import {SortOrder} from 'antd/es/table/interface';
import {RedditStonksApi} from '../../api';
import {ColumnType} from 'antd/es/table';
import {formatDateFromUnixSeconds} from '../../utilities';
import {SorterResult, TablePaginationConfig} from 'antd/lib/table/interface';
import {Table} from 'antd';
import { SubmissionDTO } from '../../../../backend/src/models/dto';
import classNames from 'classnames';

interface SubmissionTableProps {
    ticker: string;
    subreddits: string[];
    totalSubmissions: number;
    from: Date;
    to: Date;
}

export const SubmissionTable: FC<SubmissionTableProps> = ({ticker, subreddits, totalSubmissions, from, to}) => {
    const [sortBy, setSortBy] = useState<string>('created_utc');
    const [order, setOrder] = useState<SortOrder>('descend');
    const [page, setPage] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(10);
    const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const loadSubmissions = async (pageSize: number, page: number, sortBy: string, order: SortOrder) => {
        setLoading(true);
        let submissions: SubmissionDTO[] = [];
        try {
            submissions = await RedditStonksApi.getSubmissions(ticker, from, to, pageSize, page * pageSize, sortBy, toRequestOrder(order), subreddits)
        }
        catch (e) {
            console.error(e);
        }
        setSubmissions(submissions);
        setLoading(false);
    };

    useEffect(() => {
        loadSubmissions(pageSize, page, sortBy, order);
    }, []);

    const columns: ColumnType<SubmissionDTO>[] = [
        {
            key: 'created_utc',
            dataIndex: 'created_utc',
            title: 'Created',
            width: 150,
            defaultSortOrder: 'descend',
            render: (created: number) => formatDateFromUnixSeconds(created),
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.created_utc - b.created_utc
        },
        {
            key: 'score',
            dataIndex: 'score',
            title: 'Upvotes',
            width: 90,
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.score - b.score
        },
        {
            key: 'author',
            title: 'Author',
            width: 150,
            sortDirections: ['ascend', 'descend', 'ascend'],
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.author.localeCompare(b.author),
            render: (submission: SubmissionDTO) => <RSAuthorLink submission={submission}/>
        },
        {
            key: 'title',
                title: 'Title',
            sortDirections: ['ascend', 'descend', 'ascend'],
            render: (submission: SubmissionDTO) => <RSSubmissionLink submission={submission}/>,
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.title.localeCompare(b.title)
        }
    ];
    if (subreddits.length > 1) {
        columns.splice(1, 0, {
            key: 'subreddit',
            title: 'Subreddit',
            width: 160,
            dataIndex: 'subreddit',
            sortDirections: ['ascend', 'descend', 'ascend'],
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.subreddit.localeCompare(b.subreddit),
        });
    }

    const onTableChanged = (pagination: TablePaginationConfig, _filters: any, sorter: SorterResult<SubmissionDTO> | SorterResult<SubmissionDTO>[]) => {
        const page = pagination.current != null ? pagination.current - 1 : 0;
        const pageSize = pagination.pageSize!;
        const sortBy = (sorter as SorterResult<SubmissionDTO>).columnKey as string;
        const order = (sorter as SorterResult<SubmissionDTO>).order!;
        setPage(page);
        setPageSize(pageSize);
        setSortBy(sortBy);
        setOrder(order);
        loadSubmissions(pageSize, page, sortBy, order);
    }


    return <Table
        className={'extra-small'}
        rowKey={'id'}
        size={'small'}
        sortDirections={['descend', 'ascend', 'descend']}
        dataSource={submissions}
        columns={columns}
        loading={loading}
        pagination={{current: page + 1, size: 'small', total: totalSubmissions}}
        onChange={onTableChanged}
    />

}

function toRequestOrder(order: SortOrder) {
    switch (order) {
        case 'ascend': return 'asc';
        case 'descend': return 'desc';
        case null: return 'asc';
    }
}

const RSSubmissionLink: FC<{submission: SubmissionDTO}> = ({ submission }) => (
    <a href={createRedditSubmissionLink(submission)}
        className={classNames('submission-link', {removed: submission.is_removed})}
        target="_blank" rel="noreferrer"
    >
        {submission.title}
    </a>
);

const RSAuthorLink: FC<{submission: SubmissionDTO}> = ({ submission }) => (
    <a href={createRedditUserLink(submission)}
        className={classNames('submission-link')}
        target="_blank" rel="noreferrer"
    >
        {submission.author}
    </a>
);


function createRedditSubmissionLink(submission: SubmissionDTO) {
    return `https://reddit.com/r/${submission.subreddit}/comments/${submission.id}`;
}

function createRedditUserLink(submission: SubmissionDTO) {
    return `https://reddit.com/u/${submission.author}`;
}
