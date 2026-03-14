import React from "react";
import { Link } from "react-router-dom";
import { Input, Button, Card, Typography, Tag, Space, Empty, Row, Col, Divider, Badge } from "antd";
import { FireOutlined, ReloadOutlined } from "@ant-design/icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE, getAvatarUrl, splitPlatforms, formatDate } from "../../utils";
import { ReportItem, AdItem } from "../../types";

export function HotPage() {
  const [items, setItems] = React.useState<ReportItem[]>([]);
  const [ads, setAds] = React.useState<AdItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  
  const fetchData = React.useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/reports?sort=hot`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setLastUpdated(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchData();
    // Auto refresh every 30 minutes
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  React.useEffect(() => {
    fetch(`${API_BASE}/ads/active`)
      .then((r) => r.json())
      .then((data) => setAds(data.items ?? []))
      .catch(() => {});
  }, []);

  return (
    <AppLayout>
      <div className="hero" style={{ padding: '32px 48px' }}>
        <div className="hero-brand">
          <div className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FireOutlined style={{ color: '#ff4d4f' }} /> 热度榜
          </div>
          <div className="hero-subtitle">全网关注 · 实时热议 · 评论排行</div>
        </div>
        <div className="hero-actions">
            <Space>
                <span style={{ fontSize: 12, opacity: 0.6 }}>更新于 {lastUpdated.toLocaleTimeString()}</span>
                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>
            </Space>
        </div>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={18}>
            <div className="grid">
                {items.map((item, index) => {
                const avatarUrl = getAvatarUrl(item);
                return (
                    <Badge.Ribbon text={`TOP ${index + 1}`} color={index < 3 ? "red" : "blue"}>
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
                                <Tag color="volcano" bordered={false}>
                                    {/* Ideally we show comment count here, but ReportItem type might not have it yet. 
                                        Backend sends it in `_count` or we need to update type. 
                                        For now, just show '热议'. */}
                                    🔥 热议中
                                </Tag>
                                </div>
                                
                                <div className="report-card-user">
                                <Typography.Text strong>{item.targetName}</Typography.Text>
                                <div style={{fontSize: 12, opacity: 0.7}}>发布于 {formatDate(item.createdAt)}</div>
                                </div>
                            </Space>
                        </Link>
                        </Card>
                    </Badge.Ribbon>
                );
                })}
            </div>
            {!items.length && <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
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
