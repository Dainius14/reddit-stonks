import React, {Component, FC} from 'react';
import {Input, Spin, Tooltip} from 'antd';
import {CheckboxValueType} from 'antd/es/checkbox/Group';
import {RSTable} from '../components/table/RSTable';
import { RSExpandedRow } from '../components/expanded-row/RSExpandedRow';
import { RSFilter } from '../components/filter/RSFilter';
import {SearchOutlined} from '@ant-design/icons';
import './IndexPage.styles.scss';
import {RedditStonksApi, RequestError} from '../api';
import {LocalStorage} from '../helpers/local-storage';
import {
    TickerWithSubmissionIdsForEachDay,
} from '../models/TableData';
import {mapFromTickerGroupDtos} from '../helpers/mappers';
import {formatDate} from '../utilities';
import {formatDistanceToNow} from 'date-fns';
import { SubmissionDTO } from '../../../backend/src/models/dto';


interface IndexPageProps {
}

interface IndexPageState {
    headerHeight: number;
    availableSubreddits: string[];
    availableDayGroups: string[];
    selectedSubreddits: Set<string>;
    mainData: TickerWithSubmissionIdsForEachDay[];
    mainDataUpdatedAt?: Date;
    submissionsUpdatedAt?: Date;
    searchText: string;
    tableDataLoading: boolean;
}

export class IndexPage extends Component<IndexPageProps, IndexPageState> {

    readonly state: IndexPageState = {
        headerHeight: 0,
        availableSubreddits: [],
        availableDayGroups: [],
        selectedSubreddits: new Set<string>(),
        mainData: [],
        mainDataUpdatedAt: undefined,
        submissionsUpdatedAt: undefined,
        searchText: '',
        tableDataLoading: true,
    };

    private submissions: Record<string, SubmissionDTO> = {};

    public async componentDidMount() {
        this.setTableDataLoading(true);
        this.loadSubmissions(5);
        await Promise.allSettled([
            this.loadAvailableSubreddits(),
            this.loadTableData(5),
        ]);

        this.setTableDataLoading(false);

        this.setHeaderHeight(document.querySelector('.rs-index-header')!.clientHeight);
        window.addEventListener('resize', () => this.setHeaderHeight(document.querySelector('.rs-index-header')!.clientHeight));
    }

    private async loadTableData(days: number) {
        try {
            const response = await RedditStonksApi.getMainData(days);
            this.setMainData(mapFromTickerGroupDtos(response.data));
            this.setMainDataAndSubmissionsUpdatedAt(new Date(response.lastSubmissionTime), new Date(response.submissionsUpdated));
            this.setAvailableDayGroups(response.daysDesc);
        }
        catch (ex) {
            const e = ex as RequestError;
            console.error(e.message, e.response);
        }
    }

    private async loadAvailableSubreddits() {
        try {
            const availableSubreddits = await RedditStonksApi.getAvailableSubreddits();

            const savedSelectedSubreddits = LocalStorage.getObject<string[]>('selectedSubreddits');
            const selectedSubreddits = savedSelectedSubreddits
                ? savedSelectedSubreddits.filter(x => availableSubreddits.includes(x))
                : availableSubreddits;

            this.setAvailableSubreddits(availableSubreddits);
            this.setSelectedSubreddits(new Set<string>(selectedSubreddits));
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

    onFilterChanged(newSelections: CheckboxValueType[]) {
        const newSelectionsStrings = newSelections as string[];
        this.setSelectedSubreddits(new Set<string>(newSelectionsStrings));
        LocalStorage.setObject('selectedSubreddits', newSelectionsStrings);
    }

    onSearch(searchText: string) {
        this.setSearchText(searchText);
    }

    render() {
        return (<>
            <div className={'rs-index-header'}>
                <Input
                    className={'ticker-search'}
                    size="small"
                    placeholder={'Search ticker...'}
                    onChange={(event) => this.setSearchText(event.target.value)}
                    prefix={<SearchOutlined/>}
                    allowClear
                />
                <RSFilter
                    subreddits={this.state.availableSubreddits}
                    selectedSubreddits={this.state.selectedSubreddits}
                    onChange={values => this.onFilterChanged(values)}
                />
            </div>


            {this.state.tableDataLoading
                ? <div className={'rs-index-table-spinner-container'}><Spin className={'spinner'} spinning={true}/></div>
                : <RSTable
                    searchText={this.state.searchText}
                    dayGroups={this.state.availableDayGroups}
                    availableSubreddits={this.state.availableSubreddits}
                    selectedSubreddits={this.state.selectedSubreddits}
                    data={this.state.mainData}
                    pageHeaderHeight={this.state.headerHeight}
                    onChange={(a, b, c, d) => console.log(a, b, c, d)}
                    onExpandedRowRender={(calculatedRow) => <RSExpandedRow
                        allSubmissions={this.submissions}
                        calculatedRow={calculatedRow}
                        rawRow={this.state.mainData.find(x => x.ticker === calculatedRow.ticker)!}
                        selectedSubreddits={this.state.selectedSubreddits}
                    />}
                >
                    {{
                        footerLeftSide: <FooterLeftSide
                            lastSubmission={this.state.mainDataUpdatedAt!}
                            submissionsUpdated={this.state.submissionsUpdatedAt!}
                        />
                    }}
                </RSTable>
            }
        </>);
    }



    private setAvailableSubreddits(subreddits: string[]) {
        this.setState(() => ({
            availableSubreddits: subreddits,
        }));
    }

    private setSelectedSubreddits(subreddits: Set<string>) {
        this.setState(() => ({
            selectedSubreddits: subreddits,
        }));
    }

    private setAvailableDayGroups(subreddits: string[]) {
        this.setState(() => ({
            availableDayGroups: subreddits,
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

    private setMainData(value: TickerWithSubmissionIdsForEachDay[]) {
        this.setState(() => ({
            mainData: value,
        }));
    }

    private setMainDataAndSubmissionsUpdatedAt(mainDataUpdated: Date, submissionsUpdated: Date) {
        this.setState(() => ({
            mainDataUpdatedAt: mainDataUpdated,
            submissionsUpdatedAt: submissionsUpdated,
        }));
    }

    private setHeaderHeight(value: number) {
        this.setState(() => ({
            headerHeight: value,
        }));
    }

}

interface FooterLeftSideProps {
    lastSubmission: Date;
    submissionsUpdated: Date;
}

const FooterLeftSide: FC<FooterLeftSideProps> = ({lastSubmission, submissionsUpdated}) => {
    return <>
        <Tooltip title={formatDate(lastSubmission, true)}>
            Last submission scraped {formatDistanceToNow(lastSubmission)} ago
        </Tooltip>
        <Tooltip title={formatDate(submissionsUpdated, true)}>
            , submission scores updated {formatDistanceToNow(submissionsUpdated)} ago
        </Tooltip>
    </>;
}
