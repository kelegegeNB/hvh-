
import React from "react";
import { Layout, Card, Table, Tag, Typography, Button, Input } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE, formatDate } from "../../utils";

export function ViolatorPage() {
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/violators?page=${page}&limit=20`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const columns = [
        { title: 'IP地址', dataIndex: 'ip', render: (v: string) => <Tag color="volcano">{v}</Tag> },
        { title: '违规原因', dataIndex: 'reason' },
        { title: '封禁时间', dataIndex: 'startAt', render: (t: string) => formatDate(t) },
        { 
            title: '解封倒计时', 
            dataIndex: 'endAt', 
            render: (t: string) => {
                if (!t) return <Tag color="red">永久封禁</Tag>;
                const end = new Date(t).getTime();
                const now = Date.now();
                const diffMs = end - now;
                
                if (diffMs <= 0) return <Tag color="default">已过期</Tag>;
                
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                let text = "";
                if (days > 0) {
                    text = `${days}天${hours}小时`;
                } else if (hours > 0) {
                    text = `${hours}小时${minutes}分钟`;
                } else {
                    text = `${minutes > 0 ? minutes : 1}分钟`;
                }
                
                return <Tag color="orange">剩余 {text}</Tag>;
            } 
        }
    ];

    return (
        <AppLayout>
            <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px" }}>
                <Card className="form-panel" style={{ background: 'var(--card-bg)' }}>
                    <div style={{ textAlign: "center", marginBottom: 30 }}>
                        <Typography.Title level={2} style={{ color: '#ff4d4f' }}>违规用户公示</Typography.Title>
                        <Typography.Paragraph type="secondary">
                            以下用户因违反平台规则被封禁，请引以为戒。
                        </Typography.Paragraph>
                    </div>

                    <Table 
                        dataSource={data} 
                        columns={columns} 
                        rowKey="ip" 
                        loading={loading}
                        pagination={{
                            current: page,
                            pageSize: 20,
                            total: total,
                            onChange: setPage,
                            showTotal: (t) => `共 ${t} 条记录`
                        }}
                    />
                </Card>
            </div>
        </AppLayout>
    );
}
