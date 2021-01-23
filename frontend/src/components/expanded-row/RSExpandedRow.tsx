import Title from 'antd/es/typography/Title';
import {Collapse, Table} from 'antd';
import * as React from 'react';
import {formatDateFromUnixSeconds} from '../../utilities';
import {FunctionComponent, useState} from 'react';
import classNames from 'classnames';
import './RSExpandedRow.styles.scss';
import {ColumnType} from 'antd/es/table';
import {TickerWithSubmissionIdsForEachDay} from '../../models/TableData';
import {NewsDTO, SubmissionDTO } from '../../../../backend/src/models/dto';


interface RSExpandedRowProps {
    calculatedRow: TickerWithSubmissionIdsForEachDay,
    rawRow: TickerWithSubmissionIdsForEachDay,
    allSubmissions: Record<string, SubmissionDTO>,
    selectedSubreddits: Set<string>,
    news: NewsDTO[] | undefined;
    newsExpanded: () => void;
}

export const RSExpandedRow: FunctionComponent<RSExpandedRowProps> = ({calculatedRow, rawRow, allSubmissions,
     selectedSubreddits, news, newsExpanded}) => {

    const {allSubredditSubmissions, selectedSubredditSubmissions, selectedSubredditSubmissionGroups} = getSubmissionGroups(rawRow, allSubmissions, selectedSubreddits);

    return (<div className={'rs-expanded-row'}>
        <div className={'stock-header'}>
            <Title level={4} className={'stock-and-company-title'}>
                {calculatedRow.ticker} | {calculatedRow.tickerName}
            </Title>
            <RSStockLink href={`https://finance.yahoo.com/quote/${calculatedRow.ticker}`}>Yahoo Finance</RSStockLink>
            <RSStockLink href={`https://stockanalysis.com/stocks/${calculatedRow.ticker}`}>Stock Analysis</RSStockLink>
            <RSStockLinkSeparator />
            <RSStockLink href={`https://www.google.com/search?q=stock+${calculatedRow.ticker}`}>Google Search Ticker</RSStockLink>
            <RSStockLink href={`https://www.google.com/search?tbm=nws&q=stock+${calculatedRow.ticker}`}>Google News Ticker</RSStockLink>
            {calculatedRow.tickerName &&
            <>
                <RSStockLink href={`https://www.google.com/search?q=${calculatedRow.tickerName}`}>Google Search Company</RSStockLink>
                <RSStockLink href={`https://www.google.com/search?tbm=nws&q=${calculatedRow.tickerName}`}>Google News Company</RSStockLink>
            </>
            }
        </div>

        <Collapse ghost onChange={(panel) => panel.includes('news') && newsExpanded()}>
            <Collapse.Panel key={'news'} header={`News`}>
                <RSNewsTable news={news}/>
            </Collapse.Panel>

            <Collapse.Panel key={'all_subreddits'} header={`All subreddits (${allSubredditSubmissions.length})`}>
                <RSSubmissionTable submissions={allSubredditSubmissions} allSubreddits={true}/>
            </Collapse.Panel>

            <Collapse.Panel key={'selected_subreddits'} header={`Selected subreddits (${selectedSubredditSubmissions.length})`}>
                <RSSubmissionTable submissions={selectedSubredditSubmissions} allSubreddits={true}/>
            </Collapse.Panel>

            {
                selectedSubredditSubmissionGroups.map(([subreddit, submissions]) => {
                    return (
                        <Collapse.Panel header={`r/${subreddit} (${submissions.length})`} key={subreddit}>
                            <RSSubmissionTable submissions={submissions} allSubreddits={false}/>
                        </Collapse.Panel>
                    );
                })
            }
        </Collapse>
    </div>);
}

function getSubmissionGroups(rawRow: TickerWithSubmissionIdsForEachDay, allSubmissions: Record<string, SubmissionDTO>, selectedSubreddits: Set<string>) {
    const allSubredditSubmissions: SubmissionDTO[] = [];
    const selectedSubredditSubmissions: SubmissionDTO[] = [];
    const selectedSubredditSubmissionGroups: Map<string, SubmissionDTO[]> = new Map<string, []>();
    for (const day of rawRow.days) {
        for (const subreddit of day.subreddits) {
            const mappedSubmissions = subreddit.submissionIds.map(id => allSubmissions[id]);

            allSubredditSubmissions.push(...mappedSubmissions)

            if (mappedSubmissions.length > 0 && selectedSubreddits.has(subreddit.subreddit)) {
                selectedSubredditSubmissions.push(...mappedSubmissions);

                const existingSelectedSubredditSubmissionGroup = selectedSubredditSubmissionGroups.get(subreddit.subreddit);
                if (existingSelectedSubredditSubmissionGroup) {
                    existingSelectedSubredditSubmissionGroup.push(...mappedSubmissions);
                }
                else {
                    selectedSubredditSubmissionGroups.set(subreddit.subreddit, [...mappedSubmissions]);
                }
            }
        }
    }

    return {
        allSubredditSubmissions,
        selectedSubredditSubmissions,
        selectedSubredditSubmissionGroups: [...selectedSubredditSubmissionGroups]
    };
}

const RSSubmissionTable: FunctionComponent<{ submissions: SubmissionDTO[], allSubreddits: boolean }> = ({ submissions, allSubreddits }) => {
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
        },
    ];
    if (allSubreddits) {
        columns.splice(1, 0, {
            key: 'subreddit',
            title: 'Subreddit',
            width: 160,
            dataIndex: 'subreddit',
            sortDirections: ['ascend', 'descend', 'ascend'],
            sorter: (a: SubmissionDTO, b: SubmissionDTO) => a.subreddit.localeCompare(b.subreddit),
        });
    }

    return <Table
        className={'extra-small'}
        rowKey={'id'}
        size={'small'}
        sortDirections={['descend', 'ascend', 'descend']}
        dataSource={submissions}
        columns={columns}
    />

}

const RSNewsTable: FunctionComponent<{ news: NewsDTO[] | undefined }> = ({news}) => {
    const columns: ColumnType<NewsDTO>[] = [
        {
            key: 'datetime',
            dataIndex: 'datetime',
            title: 'Date',
            width: 150,
            defaultSortOrder: 'descend',
            render: (created: number) => formatDateFromUnixSeconds(created),
            sorter: (a: NewsDTO, b: NewsDTO) => a.datetime - b.datetime
        },
        {
            key: 'source',
            dataIndex: 'source',
            title: 'Source',
            width: 150,
            sorter: (a: NewsDTO, b: NewsDTO) => a.source.localeCompare(b.source)

        },
        {
            key: 'headline',
            title: 'Headline',
            sorter: (a: NewsDTO, b: NewsDTO) => a.headline.localeCompare(b.headline),
            render: (news: NewsDTO) => <a href={news.url} target="_blank" rel="noreferrer">{news.headline}</a>,
        },
    ];

    return <Table
        className={'extra-small'}
        rowKey={'id'}
        size={'small'}
        dataSource={news}
        columns={columns}
        loading={!news}
    />

}

const RSStockLink: FunctionComponent<{ href: string }> = ({ href, children }) => (
    <a className={'stock-link'} href={href} target="_blank" rel="noreferrer">{children}</a>
);

const RSStockLinkSeparator: FunctionComponent = () => (
    <Title level={5} className={'stock-link'}>|</Title>
);

const RSSubmissionLink: FunctionComponent<{submission: SubmissionDTO}> = ({ submission }) => (
    <a href={createRedditSubmissionLink(submission)}
       className={classNames('submission-link', {removed: submission.is_removed})}
       target="_blank" rel="noreferrer"
    >
        {submission.title}
    </a>
);

const RSAuthorLink: FunctionComponent<{submission: SubmissionDTO}> = ({ submission }) => (
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
