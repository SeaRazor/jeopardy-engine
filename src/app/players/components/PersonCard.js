const colors = [
    '#f56a00', '#7265e6', '#ffbf00', '#00a2ae',
    '#f56a00', '#1890ff', '#f5222d', '#52c41a',
    '#faad14', '#2f54eb', '#722ed1', '#eb2f96'
];

export default function PersonCard({ person }) {
    const avatar = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
    const avatarColor = colors[person.id % colors.length];

    return (
        <div className="card">
            <div className="cardBody">
                <div className="avatar" style={{ backgroundColor: avatarColor }}>
                    {avatar}
                </div>
                <div className="cardName">
                    {person.firstName} {person.lastName}
                </div>
            </div>
        </div>
    );
}