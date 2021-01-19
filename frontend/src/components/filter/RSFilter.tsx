import * as React from 'react';
import {Checkbox} from 'antd';
import {CheckboxValueType} from 'antd/es/checkbox/Group';
import {FunctionComponent} from 'react';

export const RSFilter: FunctionComponent<RSFilterProps> = ({subreddits, selectedSubreddits, onChange}) => {
    return (
        <Checkbox.Group
            options={subreddits}
            value={selectedSubreddits}
            onChange={onChange}
        />
    );
}

interface RSFilterProps {
    subreddits: string[];
    selectedSubreddits: string[];
    onChange: (value: CheckboxValueType[]) => void
}
