import React from "react";
import { Link } from "react-router-dom";
import { Input, Button, Card, Typography, Tag, Space, Empty, Row, Col, Divider, Pagination, Spin } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE, getAvatarUrl, splitPlatforms, formatDate } from "../../utils";
import { ReportItem, AdItem } from "../../types";

export function HomePage() {
  const [items, setItems] = React.useState<ReportItem[]>([]);
  const [ads, setAds] = React.useState<AdItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pagination, setPagination] = React.useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const fetchReports = (page: number, pageSize: number, query: string) => {
    setLoading(true);
    const searchParams = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });
    if (query) searchParams.append('q', query);

    fetch(`${API_BASE}/reports?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: data.total || 0
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  
  React.useEffect(() => {
    fetchReports(pagination.current, pagination.pageSize, searchQuery);
  }, []); // Initial load

  const handlePageChange = (page: number, pageSize?: number) => {
    const newPageSize = pageSize || pagination.pageSize;
    fetchReports(page, newPageSize, searchQuery);
    setPagination(prev => ({ ...prev, pageSize: newPageSize }));
  };
  
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchReports(1, pagination.pageSize, value);
  };
  
  React.useEffect(() => {
    fetch(`${API_BASE}/promotions/active`, { headers: { "Cache-Control": "no-cache" } })
      .then((r) => r.json())
      .then((data) => setAds(data.items ?? []))
      .catch(() => {});
  }, []);

  return (
    <AppLayout>
      <div className="hero">
        <div className="hero-brand">
          <div className="hero-title">Intelligence Agency 奇源情报局</div>
          <div className="hero-subtitle">记录曝光 · 审核公示 · 安全可信</div>
        </div>
        <div className="hero-actions">
          <Button type="primary" size="large" shape="round">
            <Link to="/publish">+ 提交曝光</Link>
          </Button>
          <Button size="large" shape="round" danger style={{ marginLeft: 16 }}>
             <Link to="/violators">违规公示</Link>
          </Button>
        </div>
      </div>
      
      <div className="search-bar">
        <Input.Search 
            placeholder="搜索人物昵称、ID..." 
            allowClear 
            enterButton="搜索" 
            size="large"
            onSearch={handleSearch}
        />
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={18}>
            <Spin spinning={loading}>
            <div className="grid">
                {items.map((item) => {
                const avatarUrl = getAvatarUrl(item);
                return (
                    <Card key={item.id} className="card-animate report-card" hoverable bordered={false}>
                    <Link to={`/reports/${item.id}`} style={{display: 'block', height: '100%'}}>
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            <div className="report-card-title-row">
                            <div className="avatar-badge">
                                {avatarUrl ? (
                                <img src={avatarUrl} alt={item.targetName} />
                                ) : (
                                item.targetName.slice(0, 1).toUpperCase()
                                )}
                            </div>
                            <div className="report-card-title">
                                {item.title}
                            </div>
                            </div>
                            
                            <div className="report-card-meta">
                            {splitPlatforms(item.platform).map((platform) => (
                                <Tag key={platform} color="blue" bordered={false}>
                                {platform}
                                </Tag>
                            ))}
                            <Tag color={item.status === "approved" ? "green" : "orange"} bordered={false}>
                                {item.status === "approved" ? "已公示" : item.status === "pending" ? "审核中" : "已拒绝"}
                            </Tag>
                            </div>
                            
                            <div className="report-card-user">
                            <Typography.Text strong>{item.targetName}</Typography.Text>
                            <div style={{fontSize: 12, opacity: 0.7}}>发布于 {formatDate(item.createdAt)}</div>
                            </div>
                        </Space>
                    </Link>
                    </Card>
                );
                })}
            </div>
            {!items.length && !loading && <Empty description="暂无曝光数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            
            {items.length > 0 && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <Pagination
                        current={pagination.current}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        onChange={handlePageChange}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条`}
                    />
                </div>
            )}
            </Spin>
        </Col>
        
        <Col xs={24} md={6}>
            <div style={{ position: 'sticky', top: 100 }}>
                <Typography.Title level={5} style={{ marginBottom: 16 }}>广告位置</Typography.Title>
                {ads.length > 0 ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                        {ads.map((ad) => (
                            <a key={ad.id} href={ad.linkUrl} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                <div className="card-animate" style={{ borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                                    <img src={ad.imageUrl} alt={ad.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                    <div style={{ padding: 12, background: 'var(--card-bg)', backdropFilter: 'blur(10px)' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{ad.title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>广告投放</div>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </Space>
                ) : (
                    <Card className="card-animate" bordered={false}>
                        <Empty description="虚位以待" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <Button type="link" href="/contact">联系合作</Button>
                        </div>
                    </Card>
                )}
            </div>
        </Col>
      </Row>
    </AppLayout>
  );
}
