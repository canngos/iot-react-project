import React from 'react';

interface Props {
    title: string;
    value: string | number;
    color?: string;
}

const StatusCard: React.FC<Props> = ({ title, value, color = "white" }) => {
    return (
        <div className="card" style={{ backgroundColor: color }}>
            <h3>{title}</h3>
            <div className="big-text">{value}</div>
        </div>
    );
};

export default StatusCard;