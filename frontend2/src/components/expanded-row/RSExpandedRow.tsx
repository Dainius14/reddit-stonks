import Title from 'antd/es/typography/Title';
import {Collapse, Table} from 'antd';
import * as React from 'react';
import {SubmissionDTO} from '../../pages/IndexPage';
import {formatDateFromUnixSeconds} from '../../utilities';
import {FunctionComponent} from 'react';
import classNames from 'classnames';
import './RSExpandedRow.styles.scss';
import {ColumnType} from 'antd/es/table';
import {TickerWithSubmissionIdsForEachDay} from '../../models/TableData';

export const RSExpandedRow: FunctionComponent<RSExpandedRowProps> = ({row, allSubmissions}) => {
    const submissionGroups: Record<string, SubmissionDTO[]> = {};
    for (const day of row.days) {
        for (const subreddit of day.subreddits) {
            const mappedSubmissions = subreddit.submissionIds.map(id => allSubmissions[id]);
            if (submissionGroups[subreddit.subreddit]) {
                submissionGroups[subreddit.subreddit].push(...mappedSubmissions);
            } else {
                submissionGroups[subreddit.subreddit] = mappedSubmissions;
            }
        }
    }
    const submissionGroupsArray = Object
        .keys(submissionGroups)
        .map(subreddit => {
            const submissions = submissionGroups[subreddit];
            return {subreddit, submissions};
        })
        .filter(x => x.submissions.length > 0);

    console.log(row)
    console.log(submissionGroups)
    console.log(submissionGroupsArray)

    return (<div className={'rs-expanded-row'}>
        <div className={'stock-header'}>
            <Title level={3} className={'stock-and-company-title'}>
                {row.ticker}{row.stockData?.companyName ? ' : ' + row.stockData.companyName : ''}
            </Title>
            <RSStockLink href={`https://finance.yahoo.com/quote/${row.ticker}`}>Yahoo Finance</RSStockLink>
            <RSStockLink href={`https://stockanalysis.com/stocks/${row.ticker}`}>Stock Analysis</RSStockLink>
            <RSStockLinkSeparator />
            <RSStockLink href={`https://www.google.com/search?q=stock+${row.ticker}`}>Google Search Ticker</RSStockLink>
            <RSStockLink href={`https://www.google.com/search?tbm=nws&q=stock+${row.ticker}`}>Google News Ticker</RSStockLink>
            {row.stockData &&
            <>
                <RSStockLink href={`https://www.google.com/search?q=${row.stockData.companyName}`}>Google Search Company</RSStockLink>
                <RSStockLink href={`https://www.google.com/search?tbm=nws&q=${row.stockData.companyName}`}>Google News Company</RSStockLink>
            </>
            }
        </div>

        <Collapse ghost>
            {
                submissionGroupsArray.map(({subreddit, submissions}) => {
                    return (
                        <Collapse.Panel header={`r/${subreddit} (${submissions.length})`} key={subreddit}>
                            <RSSubmissionTable submissions={submissions} />
                        </Collapse.Panel>
                    );
                })
            }
        </Collapse>
    </div>);
}

const RSSubmissionTable: FunctionComponent<{ submissions: SubmissionDTO[] }> = ({ submissions }) => {
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
            key: 'title',
            title: 'Title',
            sortDirections: ['ascend', 'descend', 'ascend'],
            render: (submission: SubmissionDTO) => <RSSubmissionLink submission={submission}/>,
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.title.localeCompare(b.title)
        },
    ];
    console.log(submissions)
    return <Table
        className={'extra-small'}
        rowKey={'id'}
        size={'small'}
        sortDirections={['descend', 'ascend', 'descend']}
        dataSource={submissions}
        columns={columns}
    />

}

interface RSExpandedRowProps {
    row: TickerWithSubmissionIdsForEachDay,
    allSubmissions: Record<string, SubmissionDTO>
}


const RSStockLink: FunctionComponent<{ href: string }> = ({ href, children }) => (
    <Title level={5} className={'stock-link'}>
        <a href={href} target="_blank" rel="noreferrer">{children}</a>
    </Title>
);

const RSStockLinkSeparator: FunctionComponent = () => (
    <Title level={5} className={'stock-link'}>|</Title>
);

const RSSubmissionLink: FunctionComponent<{submission: SubmissionDTO}> = ({ submission }) => (
    <a href={createRedditLink(submission)}
       className={classNames('submission-link', {removed: submission.is_removed})}
       target="_blank" rel="noreferrer"
    >
        {submission.title}
    </a>
);

function createRedditLink(submission: SubmissionDTO) {
    return `https://reddit.com/r/${submission.subreddit}/comments/${submission.id}`;
}
