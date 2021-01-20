import Title from 'antd/es/typography/Title';
import {Collapse, Table} from 'antd';
import * as React from 'react';
import {SubmissionDTO} from '../../pages/IndexPage';
import {formatDateFromUnixSeconds} from '../../utilities';
import {FunctionComponent, useMemo} from 'react';
import classNames from 'classnames';
import './RSExpandedRow.styles.scss';
import {ColumnType} from 'antd/es/table';
import {TickerWithSubmissionIdsForEachDay} from '../../models/TableData';


interface RSExpandedRowProps {
    calculatedRow: TickerWithSubmissionIdsForEachDay,
    rawRow: TickerWithSubmissionIdsForEachDay,
    allSubmissions: Record<string, SubmissionDTO>,
    selectedSubreddits: Set<string>
}

export const RSExpandedRow: FunctionComponent<RSExpandedRowProps> = ({calculatedRow, rawRow, allSubmissions, selectedSubreddits}) => {

    const {allSubredditSubmissions, selectedSubredditSubmissions, selectedSubredditSubmissionGroups} = getSubmissionGroups(rawRow, allSubmissions, selectedSubreddits);

    return (<div className={'rs-expanded-row'}>
        <div className={'stock-header'}>
            <Title level={4} className={'stock-and-company-title'}>
                {calculatedRow.ticker}{calculatedRow.stockData?.companyName ? ' : ' + calculatedRow.stockData.companyName : ''}
            </Title>
            <RSStockLink href={`https://finance.yahoo.com/quote/${calculatedRow.ticker}`}>Yahoo Finance</RSStockLink>
            <RSStockLink href={`https://stockanalysis.com/stocks/${calculatedRow.ticker}`}>Stock Analysis</RSStockLink>
            <RSStockLinkSeparator />
            <RSStockLink href={`https://www.google.com/search?q=stock+${calculatedRow.ticker}`}>Google Search Ticker</RSStockLink>
            <RSStockLink href={`https://www.google.com/search?tbm=nws&q=stock+${calculatedRow.ticker}`}>Google News Ticker</RSStockLink>
            {calculatedRow.stockData &&
            <>
                <RSStockLink href={`https://www.google.com/search?q=${calculatedRow.stockData.companyName}`}>Google Search Company</RSStockLink>
                <RSStockLink href={`https://www.google.com/search?tbm=nws&q=${calculatedRow.stockData.companyName}`}>Google News Company</RSStockLink>
            </>
            }
        </div>

        <Collapse ghost>
            <Collapse.Panel key={'all'} header={`All (${allSubredditSubmissions.length})`}>
                <RSSubmissionTable submissions={allSubredditSubmissions} allSubreddits={true}/>
            </Collapse.Panel>

            <Collapse.Panel key={'all_selected'} header={`All selected (${selectedSubredditSubmissions.length})`}>
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
