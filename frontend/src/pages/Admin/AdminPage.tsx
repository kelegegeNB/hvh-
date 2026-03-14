import React from "react";
import { Layout, Menu, Typography, Button, Form, Input, Select, Table, Space, Tag, Modal, message, List, Switch, Divider, Tabs, Card, Row, Col, Image, InputNumber, DatePicker, Tooltip, Descriptions, Upload } from "antd";
import { 
    DashboardOutlined, 
    FileTextOutlined, 
    UserOutlined, 
    SettingOutlined, 
    LogoutOutlined,
    PlusOutlined,
    DeleteOutlined,
    CheckOutlined,
    CloseOutlined,
    EyeOutlined,
    EditOutlined,
    BookOutlined,
    HistoryOutlined,
    AppstoreOutlined,
    BarsOutlined,
    EyeInvisibleOutlined,
    TeamOutlined,
    WarningOutlined,
    MonitorOutlined,
    StopOutlined,
    SafetyOutlined,
    UploadOutlined
} from "@ant-design/icons";
import Viewer from 'react-viewer';
import { AppLayout } from "../../components/layout/AppLayout";
import { RichTextEditor } from "../../components/common/RichTextEditor";
import { API_BASE, formatDate, splitPlatforms, normalizeIp } from "../../utils";
import { ReportItem, AnnouncementItem, AdItem, UserItem, MusicItem, OperationLogItem, UserLogItem, ExposureViewLogItem, ExposureComplaintItem, IpBlacklistItem, AppealItem } from "../../types";
import { useTheme } from "../../context/ThemeContext";

const { Sider, Content: AntContent } = Layout;
const { RangePicker } = DatePicker;

const ACTION_MAP: Record<string, string> = {
    "create_user": "创建用户",
    "update_user": "更新用户",
    "create_ad": "创建广告",
    "update_ad": "更新广告",
    "delete_ad": "删除广告",
    "create_announcement": "发布公告",
    "update_announcement": "更新公告",
    "delete_announcement": "删除公告",
    "create_music": "添加音乐",
    "update_music": "更新音乐",
    "delete_music": "删除音乐",
    "approve_report": "通过曝光",
    "reject_report": "拒绝曝光",
    "delete_report": "删除曝光",
    "hide_report": "隐藏曝光",
    "show_report": "显示曝光",
    "reorder_reports": "排序曝光",
    "handle_complaint": "处理投诉",
    "update_config": "更新配置",
    "create_platform": "添加平台",
    "delete_platform": "删除平台",
    "ban_ip": "封禁IP",
    "unban_ip": "解封IP"
};

const LoginForm = ({ onLogin, onBootstrap }: { onLogin: (v: any) => void, onBootstrap: (v: any) => void }) => {
    const [loginForm] = Form.useForm();
    const [bootstrapForm] = Form.useForm();
    
    return (
        <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, background: "var(--card-bg)", borderRadius: 16, backdropFilter: "blur(var(--blur-amount))", border: "1px solid var(--border-color)", boxShadow: "var(--card-shadow)" }}>
            <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>后台管理登录</Typography.Title>
            <Tabs items={[
                {
                    key: "login",
                    label: "登录",
                    children: (
                        <Form form={loginForm} layout="vertical" onFinish={onLogin}>
                            <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
                            </Form.Item>
                            <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                                <Input.Password prefix={<FileTextOutlined />} placeholder="Password" size="large" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block size="large">登录</Button>
                        </Form>
                    )
                },
                {
                    key: "bootstrap",
                    label: "初始化",
                    children: (
                        <Form form={bootstrapForm} layout="vertical" onFinish={onBootstrap}>
                            <Form.Item name="username" label="管理员用户名" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                                <Input.Password />
                            </Form.Item>
                            <Form.Item name="adminKey" label="系统密钥 (ADMIN_KEY)" rules={[{ required: true }]}>
                                <Input.Password />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block>创建管理员</Button>
                        </Form>
                    )
                }
            ]} />
        </div>
    );
};

const ReportManager = ({ 
    reports, 
    loading, 
    onRefresh, 
    authFetch 
}: { 
    reports: ReportItem[], 
    loading: boolean, 
    onRefresh: () => void,
    authFetch: (path: string, opt?: any) => Promise<any>
}) => {
    const [detail, setDetail] = React.useState<ReportItem | null>(null);
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('grid');
    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerImages, setViewerImages] = React.useState<{src: string, alt: string}[]>([]);
    const [viewerIndex, setViewerIndex] = React.useState(0);
    
    // Search Filters
    const [searchText, setSearchText] = React.useState("");
    const [searchPublisher, setSearchPublisher] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

    const filteredReports = React.useMemo(() => {
        return reports.filter(item => {
            const matchText = searchText ? (item.title.includes(searchText) || item.targetName.includes(searchText)) : true;
            const matchPublisher = searchPublisher ? (item.publisherIp?.includes(searchPublisher) || false) : true; // Note: publisher name not always available in list, using IP or if we had username
            const matchStatus = statusFilter ? item.status === statusFilter : true;
            return matchText && matchPublisher && matchStatus;
        });
    }, [reports, searchText, searchPublisher, statusFilter]);

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'hide' | 'show') => {
        let method = 'PATCH';
        let path = `/admin/reports/${id}/${action}`;
        let body = undefined;

        if (action === 'delete') {
            method = 'DELETE';
            path = `/admin/reports/${id}`;
        } else if (action === 'hide') {
            path = `/admin/reports/${id}/hide`;
            body = JSON.stringify({ hidden: true });
        } else if (action === 'show') {
            path = `/admin/reports/${id}/hide`;
            body = JSON.stringify({ hidden: false });
        }
        
        try {
            const res = await authFetch(path, { 
                method,
                headers: body ? { "Content-Type": "application/json" } : undefined,
                body
            });
            if (res.ok) {
                message.success("操作成功");
                onRefresh();
                setDetailOpen(false);
            } else {
                message.error("操作失败");
            }
        } catch(e) { message.error("网络错误"); }
    };

    const handleSortChange = async (id: string, newSort: number) => {
        try {
            const res = await authFetch(`/admin/reports/reorder`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: [{ id, sortOrder: newSort }] })
            });
            if (res.ok) {
                message.success("排序已更新");
                onRefresh();
            } else {
                message.error("更新失败");
            }
        } catch(e) { message.error("网络错误"); }
    };

    const openViewer = (images: any[], index: number) => {
        setViewerImages(images.map(img => ({ src: img.url, alt: 'evidence' })));
        setViewerIndex(index);
        setViewerVisible(true);
    };

    const columns = [
        { title: '排序', dataIndex: 'sortOrder', width: 80, render: (v: number, r: ReportItem) => (
            <InputNumber 
                defaultValue={v} 
                onBlur={(e) => handleSortChange(r.id, parseInt(e.target.value))}
                onPressEnter={(e) => handleSortChange(r.id, parseInt(e.currentTarget.value))}
                style={{ width: 60 }}
                size="small"
            />
        )},
        { title: '标题', dataIndex: 'title', ellipsis: true },
        { title: '被曝光人', dataIndex: 'targetName' },
        { 
            title: '平台', 
            dataIndex: 'platform', 
            render: (v: string) => splitPlatforms(v).map(p => <Tag key={p}>{p}</Tag>) 
        },
        { 
            title: '状态', 
            dataIndex: 'status',
            render: (s: string, r: ReportItem) => (
                <Space>
                    <Tag color={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>{s}</Tag>
                    {r.isHidden && <Tag color="red">已隐藏</Tag>}
                </Space>
            )
        },
        { title: '时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            key: 'action',
            render: (_: any, r: ReportItem) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => { setDetail(r); setDetailOpen(true); }}>查看</Button>
                    <Tooltip title={r.isHidden ? "当前已隐藏，点击显示" : "当前显示中，点击隐藏"}>
                        <Button 
                            size="small" 
                            type={r.isHidden ? "primary" : "default"}
                            danger={!r.isHidden} // Red when showing (to hide), or we can invert logic. User said: "Hidden items use specific color (red/orange)". 
                            // Let's make the button reflect the ACTION. If hidden, button says "Show" (primary/green). If showing, button says "Hide" (danger/red).
                            // Wait, user requirement: "已隐藏的曝光项目，其隐藏按钮使用特定颜色（如红色或橙色）标识" -> This usually means the button ITSELF indicates the state or the action.
                            // "未隐藏的曝光项目保持默认按钮颜色"
                            // Let's interpret: 
                            // If Hidden -> Button is Orange/Red (indicating it IS hidden or action is special). 
                            // Actually, standard UI: "Hide" (Action) is Danger. "Show" (Action) is Default/Primary.
                            // Let's try: If Hidden (isHidden=true), Button is "显示" (Primary). If Visible (isHidden=false), Button is "隐藏" (Danger/Orange).
                            // User request: "已隐藏的曝光项目，其隐藏按钮使用特定颜色... 未隐藏...默认". 
                            // This phrasing "其隐藏按钮" might mean the button that toggles visibility.
                            // If I follow strictly:
                            // Hidden Item -> Button color is Red/Orange.
                            // Visible Item -> Button color is Default.
                            onClick={() => handleAction(r.id, r.isHidden ? 'show' : 'hide')}
                            style={{ color: r.isHidden ? 'orange' : undefined, borderColor: r.isHidden ? 'orange' : undefined }}
                        >
                            {r.isHidden ? '显示' : '隐藏'}
                        </Button>
                    </Tooltip>
                    {r.status === 'pending' && (
                        <>
                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleAction(r.id, 'approve')}>通过</Button>
                            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleAction(r.id, 'reject')}>拒绝</Button>
                        </>
                    )}
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => {
                        Modal.confirm({
                            title: '确认删除?',
                            content: '此操作将永久删除该曝光及其所有关联数据，不可恢复！',
                            okText: '确认删除',
                            okType: 'danger',
                            onOk: () => handleAction(r.id, 'delete')
                        });
                    }} />
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Typography.Title level={4} style={{margin:0}}>曝光审核管理</Typography.Title>
                    <Space>
                        <Switch 
                            checkedChildren={<AppstoreOutlined />} 
                            unCheckedChildren={<BarsOutlined />} 
                            checked={viewMode === 'grid'}
                            onChange={(c) => setViewMode(c ? 'grid' : 'list')}
                        />
                        <Button onClick={onRefresh}>刷新</Button>
                    </Space>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Input 
                        placeholder="搜索标题/被曝光人" 
                        style={{ width: 200 }} 
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)} 
                        allowClear
                    />
                    <Input 
                        placeholder="搜索发布者IP" 
                        style={{ width: 150 }} 
                        value={searchPublisher}
                        onChange={e => setSearchPublisher(e.target.value)}
                        allowClear
                    />
                    <Select
                        placeholder="状态筛选"
                        style={{ width: 120 }}
                        allowClear
                        options={[{value:'pending', label:'审核中'}, {value:'approved', label:'已通过'}, {value:'rejected', label:'已拒绝'}]}
                        onChange={setStatusFilter}
                    />
                </div>
            </div>
            
            {viewMode === 'list' ? (
                <Table 
                    dataSource={filteredReports} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 12, showTotal: (total) => `共 ${total} 条` }}
                />
            ) : (
                <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
                    dataSource={filteredReports}
                    loading={loading}
                    pagination={{ pageSize: 12 }}
                    renderItem={(item) => (
                        <List.Item>
                            <Card 
                                hoverable
                                actions={[
                                    <EyeOutlined key="view" onClick={() => { setDetail(item); setDetailOpen(true); }} />,
                                    <Tooltip title={item.isHidden ? "点击显示" : "点击隐藏"}>
                                        <div key="hide" onClick={() => handleAction(item.id, item.isHidden ? 'show' : 'hide')} style={{ color: item.isHidden ? 'orange' : 'inherit' }}>
                                            {item.isHidden ? <EyeInvisibleOutlined style={{color:'orange'}} /> : <EyeOutlined />}
                                        </div>
                                    </Tooltip>,
                                    item.status === 'pending' ? <CheckOutlined key="approve" onClick={() => handleAction(item.id, 'approve')} /> : null,
                                    item.status === 'pending' ? <CloseOutlined key="reject" onClick={() => handleAction(item.id, 'reject')} /> : null,
                                    <DeleteOutlined key="delete" onClick={() => {
                                         Modal.confirm({
                                            title: '确认删除?',
                                            content: '此操作不可恢复，请确认。',
                                            okType: 'danger',
                                            onOk: () => handleAction(item.id, 'delete')
                                        });
                                    }} />
                                ].filter(Boolean)}
                                cover={
                                    item.evidences && item.evidences.length > 0 ? (
                                        <div style={{ height: 160, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
                                            <img alt="example" src={item.evidences[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : (
                                        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', color: '#999' }}>
                                            无图片
                                        </div>
                                    )
                                }
                            >
                                <Card.Meta
                                    title={
                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                            <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%'}}>{item.targetName}</span>
                                            <Tag color={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'orange'}>{item.status}</Tag>
                                        </div>
                                    }
                                    description={
                                        <div style={{height: 44, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                            {item.title}
                                        </div>
                                    }
                                />
                            </Card>
                        </List.Item>
                    )}
                />
            )}
            
            <Modal
                open={detailOpen}
                onCancel={() => setDetailOpen(false)}
                footer={null}
                title="曝光详情"
                width={800}
                centered
            >
                {detail && (
                    <div style={{ padding: 16 }}>
                         <Typography.Title level={4}>{detail.title}</Typography.Title>
                         <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="被曝光人">{detail.targetName}</Descriptions.Item>
                            <Descriptions.Item label="ID/账号">{detail.targetId || '-'}</Descriptions.Item>
                            <Descriptions.Item label="发布时间">{formatDate(detail.createdAt)}</Descriptions.Item>
                            <Descriptions.Item label="发布者IP">{normalizeIp(detail.publisherIp || "")}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={detail.status === 'approved' ? 'green' : detail.status === 'rejected' ? 'red' : 'orange'}>{detail.status}</Tag>
                                {detail.isHidden && <Tag color="red">已隐藏</Tag>}
                            </Descriptions.Item>
                         </Descriptions>
                         <div style={{ background: 'var(--bg-color)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                            {detail.content}
                         </div>
                         {detail.evidences && detail.evidences.length > 0 && (
                             <div>
                                 <Typography.Title level={5}>证据图片 (点击放大)</Typography.Title>
                                 <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                     {detail.evidences.map((e, idx) => (
                                         <div key={e.id} style={{ width: 120, height: 120, overflow: 'hidden', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => openViewer(detail.evidences || [], idx)}>
                                             <img src={e.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                         <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
                             {detail.status === 'pending' && (
                                 <>
                                    <Button type="primary" onClick={() => handleAction(detail.id, 'approve')}>通过审核</Button>
                                    <Button danger onClick={() => handleAction(detail.id, 'reject')}>拒绝</Button>
                                 </>
                             )}
                         </div>
                    </div>
                )}
            </Modal>
            
            <Viewer
                visible={viewerVisible}
                onClose={() => setViewerVisible(false)}
                images={viewerImages}
                activeIndex={viewerIndex}
                zoomable
                rotatable
                scalable
                downloadable
            />
        </div>
    );
};

const UserManager = ({ users, onRefresh, authFetch }: { users: UserItem[], onRefresh: () => void, authFetch: any }) => {
    const [form] = Form.useForm();
    const [modalOpen, setModalOpen] = React.useState(false);

    const handleCreate = async (values: any) => {
        try {
            const res = await authFetch("/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            if (res.ok) {
                message.success("创建成功");
                setModalOpen(false);
                form.resetFields();
                onRefresh();
            } else {
                message.error("创建失败");
            }
        } catch(e) {}
    };

    const handleUpdate = async (id: string, patch: any) => {
        await authFetch(`/admin/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch)
        });
        onRefresh();
    };

    const handlePunish = async (id: string) => {
        try {
            const res = await authFetch(`/admin/users/${id}/punish`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                message.success(`处罚成功 (等级: ${data.level})`);
                onRefresh();
            } else {
                message.error("处罚失败");
            }
        } catch(e) {
            message.error("网络错误");
        }
    };

    const columns = [
        { title: '用户名', dataIndex: 'username' },
        { 
            title: '角色', 
            dataIndex: 'role',
            render: (role: string, r: UserItem) => (
                <Select 
                    value={role} 
                    onChange={v => handleUpdate(r.id, { role: v })}
                    options={[{value:'ADMIN', label:'管理员'}, {value:'MOD', label:'审核员'}, {value:'USER', label:'普通用户'}]}
                    style={{ width: 100 }}
                />
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            render: (status: string, r: UserItem) => (
                <Space>
                    <Switch 
                        checked={status === 'active'} 
                        onChange={c => handleUpdate(r.id, { status: c ? 'active' : 'disabled' })} 
                        checkedChildren="启用" 
                        unCheckedChildren="禁用"
                    />
                    {status === 'banned' && <Tag color="red">封禁中</Tag>}
                </Space>
            )
        },
        { title: '违规次数', dataIndex: 'violationCount', render: (v: number) => <Tag color={v > 0 ? 'orange' : 'default'}>{v || 0}</Tag> },
        { title: '创建时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            render: (_: any, r: UserItem) => (
                <Button 
                    danger 
                    size="small" 
                    onClick={() => {
                        Modal.confirm({
                            title: '确认处罚?',
                            content: `对用户 ${r.username} 进行违规处罚？(当前等级: ${r.violationCount || 0})`,
                            okText: '确认处罚',
                            okType: 'danger',
                            onOk: () => handlePunish(r.id)
                        });
                    }}
                >
                    违规处罚
                </Button>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Typography.Title level={4}>用户管理</Typography.Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新增用户</Button>
            </div>
            <Table dataSource={users} columns={columns} rowKey="id" />
            
            <Modal 
                open={modalOpen} 
                onCancel={() => setModalOpen(false)} 
                title="新增用户" 
                footer={null}
            >
                <Form form={form} onFinish={handleCreate} layout="vertical">
                    <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="role" label="角色" initialValue="USER">
                        <Select options={[{value:'ADMIN', label:'管理员'}, {value:'MOD', label:'审核员'}, {value:'USER', label:'普通用户'}]} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>创建</Button>
                </Form>
            </Modal>
        </div>
    );
};

const ContentManager = ({ authFetch }: { authFetch: any }) => {
    const [key, setKey] = React.useState("slogan");
    const [content, setContent] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const loadContent = React.useCallback(async (k: string) => {
        setLoading(true);
        try {
            const res = await authFetch(`/admin/config`);
            if (res.ok) {
                const data = await res.json();
                const item = data.items.find((i: any) => i.key === k);
                setContent(item?.value || "");
            }
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    React.useEffect(() => {
        loadContent(key);
    }, [key, loadContent]);

    const handleSave = async () => {
        try {
            const res = await authFetch(`/admin/config/${key}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: content })
            });
            if (res.ok) {
                message.success("保存成功");
            } else {
                message.error("保存失败");
            }
        } catch (e) {
            message.error("网络错误");
        }
    };

    return (
        <Card title="内容管理" className="form-panel" style={{ background: 'var(--card-bg)' }}>
            <Tabs 
                activeKey={key} 
                onChange={setKey}
                items={[
                    { key: "slogan", label: "网站标语" },
                    { key: "terms", label: "平台条款" },
                    { key: "privacy", label: "隐私协议" },
                    { key: "service_terms", label: "用户服务条款" },
                    { key: "about", label: "关于我们" },
                    { key: "contact", label: "联系方式" }
                ]}
            />
            <div style={{ marginTop: 16 }}>
                {key === 'slogan' ? (
                    <Input.TextArea rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="请输入网站标语..." />
                ) : (
                    <RichTextEditor value={content} onChange={setContent} placeholder="请输入内容..." />
                )}
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button type="primary" onClick={handleSave} loading={loading}>保存修改</Button>
                </div>
            </div>
        </Card>
    );
};

const LogsManager = ({ authFetch }: { authFetch: any }) => {
    const [logs, setLogs] = React.useState<OperationLogItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [detailItem, setDetailItem] = React.useState<OperationLogItem | null>(null);

    const loadLogs = React.useCallback(async (params: any = {}) => {
        setLoading(true);
        const search = new URLSearchParams();
        if (params.admin) search.append("admin", params.admin);
        if (params.action) search.append("action", params.action);
        if (params.dateRange) {
            search.append("startDate", params.dateRange[0].toISOString());
            search.append("endDate", params.dateRange[1].toISOString());
        }
        
        try {
            const res = await authFetch(`/admin/logs?${search.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.items || []);
            }
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    React.useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const [filters, setFilters] = React.useState<any>({});

    const handleSearch = () => {
        loadLogs(filters);
    };

    const columns = [
        { title: '操作人', dataIndex: 'username' },
        { 
            title: '动作', 
            dataIndex: 'action',
            render: (v: string) => <Tag>{ACTION_MAP[v] || v}</Tag>
        },
        { title: 'IP', dataIndex: 'ip', render: (v: string) => normalizeIp(v) },
        { title: '时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            render: (_: any, r: OperationLogItem) => (
                <Button size="small" onClick={() => setDetailItem(r)}>详情</Button>
            )
        }
    ];

    return (
        <Card title="操作日志" className="form-panel" style={{ background: 'var(--card-bg)' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Input placeholder="管理员用户名" style={{ width: 150 }} onChange={e => setFilters({...filters, admin: e.target.value})} />
                <Select 
                    placeholder="操作类型" 
                    style={{ width: 150 }} 
                    allowClear
                    onChange={v => setFilters({...filters, action: v})}
                    options={Object.entries(ACTION_MAP).map(([k, v]) => ({ value: k, label: v }))}
                />
                <RangePicker onChange={dates => setFilters({...filters, dateRange: dates})} />
                <Button type="primary" onClick={handleSearch}>查询</Button>
                <Button onClick={() => { setFilters({}); loadLogs(); }}>重置</Button>
            </div>
            <Table dataSource={logs} columns={columns} rowKey="id" loading={loading} />
            
            <Modal
                title="日志详情"
                open={!!detailItem}
                onCancel={() => setDetailItem(null)}
                footer={null}
            >
                {detailItem && (
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="操作ID">{detailItem.id}</Descriptions.Item>
                        <Descriptions.Item label="操作人">{detailItem.username}</Descriptions.Item>
                        <Descriptions.Item label="动作">{ACTION_MAP[detailItem.action] || detailItem.action}</Descriptions.Item>
                        <Descriptions.Item label="IP">{normalizeIp(detailItem.ip || "")}</Descriptions.Item>
                        <Descriptions.Item label="时间">{formatDate(detailItem.createdAt)}</Descriptions.Item>
                        <Descriptions.Item label="详情">
                            <pre style={{ maxHeight: 200, overflow: 'auto' }}>
                                {detailItem.details}
                            </pre>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </Card>
    );
};

const UserLogsManager = ({ authFetch }: { authFetch: any }) => {
    const [logs, setLogs] = React.useState<UserLogItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [filters, setFilters] = React.useState<any>({});
    const [detailItem, setDetailItem] = React.useState<UserLogItem | null>(null);

    const loadLogs = React.useCallback(async (params: any = {}) => {
        setLoading(true);
        const search = new URLSearchParams();
        if (params.username) search.append("username", params.username);
        if (params.action) search.append("action", params.action);
        if (params.ip) search.append("ip", params.ip);
        if (params.dateRange) {
            search.append("startDate", params.dateRange[0].toISOString());
            search.append("endDate", params.dateRange[1].toISOString());
        }
        
        try {
            const res = await authFetch(`/admin/user-logs?${search.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.items || []);
            }
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    React.useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleSearch = () => {
        loadLogs(filters);
    };

    const columns = [
        { title: '用户名', dataIndex: 'username', render: (v: string) => v || '游客' },
        { title: '动作', dataIndex: 'action' },
        { title: 'IP', dataIndex: 'ip', render: (v: string) => normalizeIp(v) },
        { title: '设备', dataIndex: 'device', ellipsis: true },
        { 
            title: '详情', 
            dataIndex: 'details', 
            ellipsis: true,
            render: (v: string) => v && v.length > 50 ? v.substring(0, 50) + '...' : v
        },
        { title: '时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            render: (_: any, r: UserLogItem) => (
                <Button size="small" onClick={() => setDetailItem(r)}>详情</Button>
            )
        }
    ];

    return (
        <Card title="用户行为日志" className="form-panel" style={{ background: 'var(--card-bg)' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Input placeholder="用户名" style={{ width: 150 }} onChange={e => setFilters({...filters, username: e.target.value})} />
                <Input placeholder="操作类型" style={{ width: 150 }} onChange={e => setFilters({...filters, action: e.target.value})} />
                <Input placeholder="IP地址" style={{ width: 150 }} onChange={e => setFilters({...filters, ip: e.target.value})} />
                <RangePicker onChange={dates => setFilters({...filters, dateRange: dates})} />
                <Button type="primary" onClick={handleSearch}>查询</Button>
                <Button onClick={() => { setFilters({}); loadLogs(); }}>重置</Button>
            </div>
            <Table dataSource={logs} columns={columns} rowKey="id" loading={loading} />

            <Modal
                title="行为日志详情"
                open={!!detailItem}
                onCancel={() => setDetailItem(null)}
                footer={null}
                width={700}
            >
                {detailItem && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="日志ID">{detailItem.id}</Descriptions.Item>
                        <Descriptions.Item label="用户名">{detailItem.username || '游客'}</Descriptions.Item>
                        <Descriptions.Item label="动作">{detailItem.action}</Descriptions.Item>
                        <Descriptions.Item label="IP">{normalizeIp(detailItem.ip || "")}</Descriptions.Item>
                        <Descriptions.Item label="设备">{detailItem.device}</Descriptions.Item>
                        <Descriptions.Item label="时间">{formatDate(detailItem.createdAt)}</Descriptions.Item>
                        <Descriptions.Item label="详情">
                            <pre style={{ 
                                maxHeight: 300, 
                                overflow: 'auto', 
                                background: 'var(--input-bg)', 
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-color)',
                                padding: 12, 
                                borderRadius: 8,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                            }}>
                                {(() => {
                                    const details = detailItem.details;
                                    if (!details) return "无详情";
                                    try {
                                        // Attempt to format JSON string if valid
                                        return JSON.stringify(JSON.parse(details), null, 2);
                                    } catch (e) {
                                        return details;
                                    }
                                })()}
                            </pre>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </Card>
    );
};

const VisitLogsManager = ({ authFetch }: { authFetch: any }) => {
    const [logs, setLogs] = React.useState<ExposureViewLogItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [filters, setFilters] = React.useState<any>({});

    const loadLogs = React.useCallback(async (params: any = {}) => {
        setLoading(true);
        const search = new URLSearchParams();
        if (params.ip) search.append("ip", params.ip);
        if (params.deviceType) search.append("deviceType", params.deviceType);
        if (params.dateRange) {
            search.append("startDate", params.dateRange[0].toISOString());
            search.append("endDate", params.dateRange[1].toISOString());
        }
        
        try {
            const res = await authFetch(`/admin/visit-logs?${search.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.items || []);
            }
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    React.useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleSearch = () => {
        loadLogs(filters);
    };

    const handleExport = () => {
        const search = new URLSearchParams();
        if (filters.ip) search.append("ip", filters.ip);
        if (filters.dateRange) {
            search.append("startDate", filters.dateRange[0].toISOString());
            search.append("endDate", filters.dateRange[1].toISOString());
        }
        search.append("exportCsv", "true");
        
        // Direct download
        const token = localStorage.getItem("admin_token");
        fetch(`${API_BASE}/admin/visit-logs?${search.toString()}`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "visit_logs.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    };

    const columns = [
        { title: '曝光标题', dataIndex: ['report', 'title'], ellipsis: true },
        { title: '访问IP', dataIndex: 'viewerIp', render: (v: string) => normalizeIp(v) },
        { title: '设备', dataIndex: 'deviceType' },
        { title: '系统/浏览器', render: (_: any, r: ExposureViewLogItem) => `${r.os} / ${r.browser}` },
        { title: '访问时间', dataIndex: 'viewTime', render: (t: string) => formatDate(t) }
    ];

    return (
        <Card title="曝光访问日志" className="form-panel" style={{ background: 'var(--card-bg)' }}>
             <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Input placeholder="IP地址" style={{ width: 150 }} onChange={e => setFilters({...filters, ip: e.target.value})} />
                <Select 
                    placeholder="设备类型" 
                    style={{ width: 120 }} 
                    allowClear
                    onChange={v => setFilters({...filters, deviceType: v})}
                    options={[{value:'mobile', label:'手机'}, {value:'tablet', label:'平板'}, {value:'console', label:'主机'}, {value:'smarttv', label:'电视'}, {value:'wearable', label:'穿戴'}, {value:'embedded', label:'嵌入式'}]} 
                />
                <RangePicker onChange={dates => setFilters({...filters, dateRange: dates})} />
                <Button type="primary" onClick={handleSearch}>查询</Button>
                <Button onClick={handleExport}>导出CSV</Button>
            </div>
            <Table dataSource={logs} columns={columns} rowKey="id" loading={loading} />
        </Card>
    );
};

const ComplaintManager = ({ authFetch }: { authFetch: any }) => {
    const [items, setItems] = React.useState<ExposureComplaintItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [filters, setFilters] = React.useState<any>({});
    const [detail, setDetail] = React.useState<ExposureComplaintItem | null>(null);
    const [processForm] = Form.useForm();

    const loadData = React.useCallback(async (params: any = {}) => {
        setLoading(true);
        const search = new URLSearchParams();
        if (params.status) search.append("status", params.status);
        if (params.keyword) search.append("keyword", params.keyword);
        
        try {
            const res = await authFetch(`/admin/complaints?${search.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleProcess = async (values: any) => {
        if (!detail) return;
        try {
            const res = await authFetch(`/admin/complaints/${detail.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            if (res.ok) {
                message.success("处理成功");
                setDetail(null);
                loadData(filters);
            } else {
                message.error("处理失败");
            }
        } catch(e) {}
    };

    const columns = [
        { title: '曝光标题', dataIndex: ['report', 'title'], ellipsis: true },
        { title: '投诉类型', dataIndex: 'title' },
        { title: '投诉人IP', dataIndex: 'complainantIp', render: (v: string) => normalizeIp(v) },
        { 
            title: '状态', 
            dataIndex: 'status',
            render: (s: string) => (
                <Tag color={s === 'resolved' ? 'green' : s === 'processing' ? 'blue' : 'orange'}>
                    {s === 'resolved' ? '已解决' : s === 'processing' ? '处理中' : '待处理'}
                </Tag>
            )
        },
        { title: '提交时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            render: (_: any, r: ExposureComplaintItem) => (
                <Button size="small" onClick={() => { setDetail(r); processForm.setFieldsValue({ status: r.status, result: r.result }); }}>
                    查看/处理
                </Button>
            )
        }
    ];

    const images = detail?.images ? JSON.parse(detail.images) : [];

    return (
        <Card title="投诉管理" className="form-panel" style={{ background: 'var(--card-bg)' }}>
             <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Select 
                    placeholder="状态" 
                    style={{ width: 120 }} 
                    allowClear
                    onChange={v => setFilters({...filters, status: v})}
                    options={[{value:'pending', label:'待处理'}, {value:'processing', label:'处理中'}, {value:'resolved', label:'已解决'}]} 
                />
                <Input placeholder="关键词搜索" style={{ width: 200 }} onChange={e => setFilters({...filters, keyword: e.target.value})} />
                <Button type="primary" onClick={() => loadData(filters)}>查询</Button>
            </div>
            <Table dataSource={items} columns={columns} rowKey="id" loading={loading} />

            <Modal
                title="投诉处理"
                open={!!detail}
                onCancel={() => setDetail(null)}
                footer={null}
                width={700}
            >
                {detail && (
                    <div>
                        <Typography.Title level={5}>投诉信息</Typography.Title>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="投诉标题">{detail.title}</Descriptions.Item>
                            <Descriptions.Item label="投诉说明">{detail.description}</Descriptions.Item>
                            <Descriptions.Item label="联系方式">{detail.contact}</Descriptions.Item>
                            <Descriptions.Item label="投诉人IP">{normalizeIp(detail.complainantIp)}</Descriptions.Item>
                        </Descriptions>
                        
                        {images.length > 0 && (
                            <div style={{ margin: '16px 0' }}>
                                <p><strong>证据截图:</strong></p>
                                <Space>
                                    {images.map((img: string, idx: number) => (
                                        <Image key={idx} src={img} width={100} />
                                    ))}
                                </Space>
                            </div>
                        )}
                        
                        <Divider />
                        
                        <Typography.Title level={5}>处理结果</Typography.Title>
                        <Form form={processForm} layout="vertical" onFinish={handleProcess}>
                            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                                <Select options={[{value:'pending', label:'待处理'}, {value:'processing', label:'处理中'}, {value:'resolved', label:'已解决'}]} />
                            </Form.Item>
                            <Form.Item name="result" label="处理备注/结果" rules={[{ required: true }]}>
                                <Input.TextArea rows={3} />
                            </Form.Item>
                            {detail.handledBy && (
                                <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 8 }}>
                                    <span style={{ color: '#666' }}>
                                        上次处理: {detail.handledBy} 于 {formatDate(detail.handledAt || "")}
                                    </span>
                                </div>
                            )}
                            <div style={{ textAlign: 'right', marginTop: 16 }}>
                                <Button type="primary" htmlType="submit">保存处理</Button>
                            </div>
                        </Form>
                    </div>
                )}
            </Modal>
        </Card>
    );
};

import { PlatformItem } from "../../types";

const PlatformManager = ({ platforms, onRefresh, authFetch }: { platforms: PlatformItem[], onRefresh: () => void, authFetch: any }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [editItem, setEditItem] = React.useState<PlatformItem | null>(null);

    const handleCreate = async (values: any) => {
        setLoading(true);
        try {
            const res = await authFetch("/platforms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            if (res.ok) {
                message.success("平台添加成功");
                form.resetFields();
                onRefresh();
            } else {
                const data = await res.json();
                if (data.message === "platform_exists") {
                    message.error("平台名称已存在");
                } else {
                    message.error("添加失败");
                }
            }
        } catch(e) {
            message.error("网络错误");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string, values: any) => {
        try {
           const res = await authFetch(`/platforms/${id}`, {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(values)
           });
           if (res.ok) {
               message.success("更新成功");
               setEditItem(null);
               onRefresh();
           } else {
               message.error("更新失败");
           }
       } catch(e) {
           message.error("网络错误");
       }
   };

    const handleDelete = async (id: string) => {
        try {
            const res = await authFetch(`/platforms/${id}`, { method: "DELETE" });
            if (res.ok) {
                message.success("平台已删除");
                onRefresh();
            } else {
                const data = await res.json();
                if (data.message === "platform_in_use") {
                    Modal.error({
                        title: "无法删除",
                        content: `该平台正在被 ${data.count} 条曝光数据使用，无法直接删除。`
                    });
                } else {
                    message.error("删除失败");
                }
            }
        } catch(e) {
            message.error("网络错误");
        }
    };

    const columns = [
        { 
            title: '排序', 
            dataIndex: 'sortOrder', 
            width: 100,
            render: (v: number, r: PlatformItem) => (
                <InputNumber 
                    defaultValue={v} 
                    onBlur={(e) => handleUpdate(r.id, { sortOrder: parseInt(e.target.value) })}
                    onPressEnter={(e) => handleUpdate(r.id, { sortOrder: parseInt(e.currentTarget.value) })}
                    style={{ width: 60 }}
                />
            )
        },
        { title: '平台名称', dataIndex: 'name' },
        { 
            title: '图标', 
            dataIndex: 'icon', 
            render: (v: string) => v ? <img src={v} style={{ width: 24, height: 24 }} alt="icon" /> : '-' 
        },
        { title: '创建时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            render: (_: any, r: PlatformItem) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => setEditItem(r)}>编辑</Button>
                    <Button 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => {
                            Modal.confirm({
                                title: '确认删除?',
                                content: `确定要删除平台 "${r.name}" 吗？此操作将进行关联性检查。`,
                                okType: 'danger',
                                onOk: () => handleDelete(r.id)
                            });
                        }}
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Card title="平台管理" className="form-panel" style={{ background: 'var(--card-bg)' }}>
            <div style={{ marginBottom: 24, maxWidth: 600 }}>
                <Typography.Title level={5}>添加新平台</Typography.Title>
                <Form form={form} layout="inline" onFinish={handleCreate}>
                    <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }, { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/, message: '格式不规范' }]}>
                        <Input placeholder="平台名称 (如 Steam)" />
                    </Form.Item>
                    <Form.Item name="icon">
                        <Input placeholder="图标URL (选填)" />
                    </Form.Item>
                    <Form.Item name="sortOrder" initialValue={0}>
                         <InputNumber placeholder="排序" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>添加</Button>
                    </Form.Item>
                </Form>
            </div>
            <Table dataSource={platforms} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
            
            <Modal
                title="编辑平台"
                open={!!editItem}
                onCancel={() => setEditItem(null)}
                footer={null}
            >
                {editItem && (
                    <Form 
                        initialValues={editItem}
                        onFinish={(v) => handleUpdate(editItem.id, v)}
                        layout="vertical"
                    >
                        <Form.Item name="name" label="平台名称" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="icon" label="图标URL">
                            <Input />
                        </Form.Item>
                        <Form.Item name="sortOrder" label="排序权重 (越大越靠前)">
                            <InputNumber style={{width: '100%'}} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block>保存</Button>
                    </Form>
                )}
            </Modal>
        </Card>
    );
};

// --- New Components for Blacklist & Appeal ---

const BlacklistManager = ({ blacklist, onRefresh, authFetch }: { blacklist: IpBlacklistItem[], onRefresh: () => void, authFetch: any }) => {
    const [form] = Form.useForm();
    const [modalOpen, setModalOpen] = React.useState(false);

    const handleBan = async (values: any) => {
        try {
            const res = await authFetch("/blacklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            if (res.ok) {
                message.success("IP已封禁");
                setModalOpen(false);
                form.resetFields();
                onRefresh();
            } else {
                const data = await res.json();
                message.error(data.message || "操作失败");
            }
        } catch(e) { message.error("网络错误"); }
    };

    const handleUnban = async (id: string) => {
        try {
            const res = await authFetch(`/blacklist/${id}`, { method: "DELETE" });
            if (res.ok) {
                message.success("IP已解封");
                onRefresh();
            } else {
                message.error("解封失败");
            }
        } catch(e) { message.error("网络错误"); }
    };

    const columns = [
        { title: 'IP地址', dataIndex: 'ip', render: (v: string) => <Tag color="red">{normalizeIp(v)}</Tag> },
        { title: '封禁原因', dataIndex: 'reason' },
        { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === 'active' ? 'red' : 'default'}>{s === 'active' ? '生效中' : '已失效'}</Tag> },
        { title: '封禁时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        { title: '结束时间', dataIndex: 'endAt', render: (t: string) => t ? formatDate(t) : '永久' },
        {
            title: '操作',
            render: (_: any, r: IpBlacklistItem) => (
                r.status === 'active' && (
                    <Button size="small" onClick={() => Modal.confirm({ title: '确认解封?', onOk: () => handleUnban(r.id) })}>
                        解封
                    </Button>
                )
            )
        }
    ];

    return (
        <Card title="IP黑名单管理" className="form-panel" style={{ background: 'var(--card-bg)' }}>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" danger icon={<StopOutlined />} onClick={() => setModalOpen(true)}>添加封禁IP</Button>
            </div>
            <Table dataSource={blacklist} columns={columns} rowKey="id" />
            
            <Modal
                title="封禁IP"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleBan}>
                    <Form.Item name="ip" label="IP地址" rules={[{ required: true }, { pattern: /^(\d{1,3}\.){3}\d{1,3}$|([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, message: 'IP格式不正确' }]}>
                        <Input placeholder="例如: 192.168.1.1" />
                    </Form.Item>
                    <Form.Item name="reason" label="封禁原因" rules={[{ required: true }]}>
                        <Input placeholder="例如: 恶意刷量" />
                    </Form.Item>
                    <Form.Item name="duration" label="封禁时长" initialValue="1d">
                        <Select options={[
                            { value: '1h', label: '1小时' },
                            { value: '1d', label: '1天' },
                            { value: '1w', label: '1周' },
                            { value: '1m', label: '1月' },
                            { value: 'permanent', label: '永久' }
                        ]} />
                    </Form.Item>
                    <Form.Item name="message" label="给用户的提示信息">
                        <Input.TextArea placeholder="默认: 您的IP由于多次违反平台规则，已被拉黑" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" danger block>确认封禁</Button>
                </Form>
            </Modal>
        </Card>
    );
};

const AppealManager = ({ appeals, onRefresh, authFetch }: { appeals: AppealItem[], onRefresh: () => void, authFetch: any }) => {
    const handleProcess = async (id: string, status: 'approved' | 'rejected', reply: string) => {
        try {
            const res = await authFetch(`/appeals/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, reply })
            });
            if (res.ok) {
                message.success("处理成功");
                onRefresh();
            } else {
                message.error("处理失败");
            }
        } catch(e) { message.error("网络错误"); }
    };

    const columns = [
        { title: '申诉IP', dataIndex: 'ip', render: (v: string) => normalizeIp(v) },
        { title: '联系方式', dataIndex: 'contact' },
        { title: '申诉内容', dataIndex: 'content', ellipsis: true },
        { 
            title: '状态', 
            dataIndex: 'status', 
            render: (s: string) => (
                <Tag color={s === 'pending' ? 'orange' : s === 'approved' ? 'green' : 'red'}>
                    {s === 'pending' ? '待处理' : s === 'approved' ? '已通过' : '已驳回'}
                </Tag>
            ) 
        },
        { title: '提交时间', dataIndex: 'createdAt', render: (t: string) => formatDate(t) },
        {
            title: '操作',
            render: (_: any, r: AppealItem) => (
                r.status === 'pending' && (
                    <Space>
                        <Button size="small" type="primary" onClick={() => {
                             Modal.confirm({
                                title: '通过申诉',
                                content: '确认通过申诉并解封该IP吗？',
                                onOk: () => handleProcess(r.id, 'approved', '申诉通过，已解封')
                            });
                        }}>通过</Button>
                        <Button size="small" danger onClick={() => {
                            let reply = '';
                            Modal.confirm({
                                title: '驳回申诉',
                                content: <Input.TextArea placeholder="请输入驳回理由" onChange={e => reply = e.target.value} />,
                                onOk: () => handleProcess(r.id, 'rejected', reply || '申诉驳回')
                            });
                        }}>驳回</Button>
                    </Space>
                )
            )
        }
    ];

    return (
        <Card title="申诉管理" className="form-panel" style={{ background: 'var(--card-bg)' }}>
            <Table dataSource={appeals} columns={columns} rowKey="id" />
        </Card>
    );
};

const SystemSettings = ({ 
    announcements, 
    ads, 
    music, 
    onRefresh, 
    authFetch 
}: { 
    announcements: AnnouncementItem[], 
    ads: AdItem[], 
    music: any[], 
    onRefresh: () => void, 
    authFetch: any 
}) => {
    // ... (Existing SystemSettings logic)
    const [announceForm] = Form.useForm();
    const [adForm] = Form.useForm();
    const [musicForm] = Form.useForm();
    const [content, setContent] = React.useState("");

    // Edit states
    const [editAnnounce, setEditAnnounce] = React.useState<AnnouncementItem | null>(null);
    const [editAd, setEditAd] = React.useState<AdItem | null>(null);
    const [editMusic, setEditMusic] = React.useState<any | null>(null);
    const [logoFile, setLogoFile] = React.useState<any>(null);

    // Handlers
    const handleLogoUpload = async () => {
        if (!logoFile) return;
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("type", "main");
        
        try {
            const res = await authFetch("/admin/brand/logo", {
                method: "POST",
                body: formData
            });
            if (res.ok) {
                message.success("Logo上传成功");
                setLogoFile(null);
            } else {
                message.error("上传失败");
            }
        } catch(e) { message.error("网络错误"); }
    };

    const handleCreateAnnounce = async (values: any) => {
        await authFetch("/admin/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, content })
        });
        message.success("公告已发布");
        announceForm.resetFields();
        setContent("");
        onRefresh();
    };

    const handleUpdateAnnounce = async (values: any) => {
        if (!editAnnounce) return;
        await authFetch(`/admin/announcements/${editAnnounce.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, content })
        });
        message.success("公告已更新");
        setEditAnnounce(null);
        setContent("");
        onRefresh();
    };

    const handleDeleteAnnounce = async (id: string) => {
        await authFetch(`/admin/announcements/${id}`, { method: "DELETE" });
        message.success("公告已删除");
        onRefresh();
    };

    const handleCreateAd = async (values: any) => {
        await authFetch("/admin/promotions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
        });
        message.success("广告已创建");
        adForm.resetFields();
        onRefresh();
    };

    const handleUpdateAd = async (values: any) => {
        if (!editAd) return;
        await authFetch(`/admin/promotions/${editAd.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
        });
        message.success("广告已更新");
        setEditAd(null);
        onRefresh();
    };

    const handleDeleteAd = async (id: string) => {
        await authFetch(`/admin/promotions/${id}`, { method: "DELETE" });
        message.success("广告已删除");
        onRefresh();
    };

    const handleCreateMusic = async (values: any) => {
        await authFetch("/admin/music-links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
        });
        message.success("音乐已添加");
        musicForm.resetFields();
        onRefresh();
    };
    
    const handleUpdateMusic = async (values: any) => {
        if (!editMusic) return;
        await authFetch(`/admin/music-links/${editMusic.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
        });
        message.success("音乐已更新");
        setEditMusic(null);
        onRefresh();
    };

    const handleDeleteMusic = async (id: string) => {
        await authFetch(`/admin/music-links/${id}`, { method: "DELETE" });
        message.success("音乐已删除");
        onRefresh();
    };

    return (
        <>
            <Tabs items={[
                {
                    key: "brand",
                    label: "品牌设置",
                    children: (
                        <Card title="Logo 设置" className="form-panel" style={{ background: 'var(--card-bg)' }}>
                            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                                <Upload
                                    listType="picture-card"
                                    beforeUpload={(file: any) => {
                                        setLogoFile(file);
                                        return false;
                                    }}
                                    onRemove={() => setLogoFile(null)}
                                    maxCount={1}
                                    fileList={logoFile ? [logoFile] : []}
                                >
                                    <div>
                                        <UploadOutlined />
                                        <div style={{ marginTop: 8 }}>上传Logo</div>
                                    </div>
                                </Upload>
                                <div>
                                    <Typography.Text type="secondary">建议尺寸: 512x512, SVG或PNG格式</Typography.Text>
                                    <div style={{ marginTop: 16 }}>
                                        <Button type="primary" onClick={handleLogoUpload} disabled={!logoFile}>保存设置</Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                },
                {
                    key: "announce",
                    label: "公告管理",
                    children: (
                        <Row gutter={24}>
                            <Col span={12}>
                                <Card title="发布新公告" className="form-panel" style={{ background: 'var(--card-bg)' }}>
                                    <Form form={announceForm} layout="vertical" onFinish={handleCreateAnnounce}>
                                        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item label="内容">
                                            <RichTextEditor value={content} onChange={setContent} />
                                        </Form.Item>
                                        <Form.Item name="status" label="状态" initialValue="active">
                                            <Select options={[{value:'active', label:'显示'}, {value:'inactive', label:'隐藏'}]} />
                                        </Form.Item>
                                        <Button type="primary" htmlType="submit">发布</Button>
                                    </Form>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <List 
                                    dataSource={announcements}
                                    renderItem={item => (
                                        <List.Item
                                            actions={[
                                                <a key="edit" onClick={() => { setEditAnnounce(item); setContent(item.content); }}>编辑</a>,
                                                <a key="del" onClick={() => Modal.confirm({ title: '确认删除?', onOk: () => handleDeleteAnnounce(item.id) })}>删除</a>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <Space>
                                                        {item.title}
                                                        <Tag color={item.status === 'active' ? 'green' : 'red'}>{item.status === 'active' ? '显示' : '隐藏'}</Tag>
                                                    </Space>
                                                }
                                                description={formatDate(item.createdAt)}
                                            />
                                        </List.Item>
                                    )}
                                />
                            </Col>
                        </Row>
                    )
                },
                {
                    key: "ads",
                    label: "广告管理",
                    children: (
                        <Row gutter={24}>
                             <Col span={12}>
                                <Card title="新增广告" className="form-panel" style={{ background: 'var(--card-bg)' }}>
                                    <Form form={adForm} layout="vertical" onFinish={handleCreateAd}>
                                        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="imageUrl" label="图片URL" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="linkUrl" label="跳转URL" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="position" label="位置" initialValue="home_banner">
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="startAt" label="开始时间" initialValue={new Date().toISOString()}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="endAt" label="结束时间" initialValue={new Date(Date.now() + 31536000000).toISOString()}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="status" label="状态" initialValue="active">
                                            <Select options={[{value:'active', label:'启用'}, {value:'inactive', label:'禁用'}]} />
                                        </Form.Item>
                                        <Button type="primary" htmlType="submit">创建</Button>
                                    </Form>
                                </Card>
                             </Col>
                             <Col span={12}>
                                <List 
                                    dataSource={ads}
                                    renderItem={item => (
                                        <List.Item
                                            actions={[
                                                <a key="edit" onClick={() => setEditAd(item)}>编辑</a>,
                                                <a key="del" onClick={() => Modal.confirm({ title: '确认删除?', onOk: () => handleDeleteAd(item.id) })}>删除</a>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                avatar={<img src={item.imageUrl} style={{width: 60, height: 40, objectFit: 'cover'}} />}
                                                title={
                                                    <Space>
                                                        {item.title}
                                                        <Tag color={item.status === 'active' ? 'green' : 'red'}>{item.status === 'active' ? '启用' : '禁用'}</Tag>
                                                    </Space>
                                                }
                                                description={item.position}
                                            />
                                        </List.Item>
                                    )}
                                />
                             </Col>
                        </Row>
                    )
                },
                {
                    key: "music",
                    label: "音乐设置",
                    children: (
                        <Row gutter={24}>
                            <Col span={12}>
                                <Card title="设置背景音乐" className="form-panel" style={{ background: 'var(--card-bg)' }}>
                                    <Form form={musicForm} layout="vertical" onFinish={handleCreateMusic}>
                                        <Form.Item name="title" label="歌曲名称" rules={[{ required: true }]}>
                                            <Input placeholder="例如: 某某歌曲" />
                                        </Form.Item>
                                        <Form.Item name="url" label="链接或外链代码" rules={[{ required: true }]} help="支持网易云iframe代码或mp3直链">
                                            <Input.TextArea rows={4} placeholder="<iframe>...</iframe> 或 https://..." />
                                        </Form.Item>
                                        <Form.Item name="status" label="状态" initialValue="active">
                                            <Select options={[{value:'active', label:'启用'}, {value:'inactive', label:'禁用'}]} />
                                        </Form.Item>
                                        <Button type="primary" htmlType="submit">保存</Button>
                                    </Form>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <List 
                                    dataSource={music}
                                    renderItem={item => (
                                        <List.Item
                                            actions={[
                                                <a key="edit" onClick={() => setEditMusic(item)}>编辑</a>,
                                                <a key="del" onClick={() => Modal.confirm({ title: '确认删除?', onOk: () => handleDeleteMusic(item.id) })}>删除</a>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={item.title}
                                                description={
                                                    <Space>
                                                        <Tag color={item.status === 'active' ? 'green' : 'red'}>{item.status === 'active' ? '启用' : '禁用'}</Tag>
                                                        <span style={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block'}}>{item.url}</span>
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </Col>
                        </Row>
                    )
                }
            ]} />

            {/* Edit Announcement Modal */}
            <Modal
                title="编辑公告"
                open={!!editAnnounce}
                onCancel={() => { setEditAnnounce(null); setContent(""); }}
                footer={null}
                width={800}
            >
                {editAnnounce && (
                    <Form 
                        layout="vertical" 
                        initialValues={editAnnounce}
                        onFinish={handleUpdateAnnounce}
                    >
                        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="内容">
                            <RichTextEditor value={content} onChange={setContent} />
                        </Form.Item>
                        <Form.Item name="status" label="状态">
                            <Select options={[{value:'active', label:'显示'}, {value:'inactive', label:'隐藏'}]} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit">更新</Button>
                    </Form>
                )}
            </Modal>

            {/* Edit Ad Modal */}
            <Modal
                title="编辑广告"
                open={!!editAd}
                onCancel={() => setEditAd(null)}
                footer={null}
            >
                {editAd && (
                    <Form 
                        layout="vertical" 
                        initialValues={editAd}
                        onFinish={handleUpdateAd}
                    >
                        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="imageUrl" label="图片URL" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="linkUrl" label="跳转URL" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="position" label="位置">
                            <Input />
                        </Form.Item>
                        <Form.Item name="startAt" label="开始时间">
                            <Input />
                        </Form.Item>
                        <Form.Item name="endAt" label="结束时间">
                            <Input />
                        </Form.Item>
                        <Form.Item name="status" label="状态">
                            <Select options={[{value:'active', label:'启用'}, {value:'inactive', label:'禁用'}]} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit">更新</Button>
                    </Form>
                )}
            </Modal>

            {/* Edit Music Modal */}
             <Modal
                title="编辑音乐"
                open={!!editMusic}
                onCancel={() => setEditMusic(null)}
                footer={null}
            >
                {editMusic && (
                    <Form 
                        layout="vertical" 
                        initialValues={editMusic}
                        onFinish={handleUpdateMusic}
                    >
                        <Form.Item name="title" label="歌曲名称" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="url" label="链接或外链代码" rules={[{ required: true }]}>
                            <Input.TextArea rows={4} />
                        </Form.Item>
                        <Form.Item name="status" label="状态">
                            <Select options={[{value:'active', label:'启用'}, {value:'inactive', label:'禁用'}]} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit">更新</Button>
                    </Form>
                )}
            </Modal>
        </>
    );
};

// --- Main Page ---

export function AdminPage() {
    const tokenKey = "admin_token";
    const [token, setToken] = React.useState<string | null>(localStorage.getItem(tokenKey));
    const [user, setUser] = React.useState<{ username: string; role: string } | null>(null);
    const [activeMenu, setActiveMenu] = React.useState("reports");
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // Data states
    const [reports, setReports] = React.useState<ReportItem[]>([]);
    const [users, setUsers] = React.useState<UserItem[]>([]);
    const [announcements, setAnnouncements] = React.useState<AnnouncementItem[]>([]);
    const [ads, setAds] = React.useState<AdItem[]>([]);
    const [music, setMusic] = React.useState<MusicItem[]>([]);
    const [platforms, setPlatforms] = React.useState<PlatformItem[]>([]);
    const [blacklist, setBlacklist] = React.useState<IpBlacklistItem[]>([]);
    const [appeals, setAppeals] = React.useState<AppealItem[]>([]);
    const [loading, setLoading] = React.useState(false);

    const authFetch = React.useCallback(
        (path: string, options?: RequestInit) => {
            const headers = new Headers(options?.headers);
            if (token) {
                headers.set("Authorization", `Bearer ${token}`);
            }
            return fetch(`${API_BASE}${path}`, { ...options, headers });
        },
        [token]
    );

    const checkLogin = React.useCallback(() => {
        if (!token) return;
        authFetch("/auth/me")
            .then(r => {
                if (r.ok) return r.json();
                throw new Error("Invalid token");
            })
            .then(u => setUser(u))
            .catch(() => {
                localStorage.removeItem(tokenKey);
                setToken(null);
                setUser(null);
            });
    }, [token, authFetch]);

    React.useEffect(() => {
        checkLogin();
    }, [checkLogin]);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [rData] = await Promise.all([
                authFetch("/admin/reports").then(r => r.json()),
            ]);
            setReports(rData.items || []);

            if (user.role === 'ADMIN') {
                const [uData, aData, adData, mData, pData, bData, apData] = await Promise.all([
                    authFetch("/admin/users").then(r => r.json()),
                    authFetch("/admin/announcements").then(r => r.json()),
                    authFetch("/admin/promotions").then(r => r.json()),
                    authFetch("/admin/music-links").then(r => r.json()),
                    authFetch("/platforms").then(r => r.json()),
                    authFetch("/blacklist").then(r => r.json()),
                    authFetch("/appeals").then(r => r.json()),
                ]);
                setUsers(uData.items || []);
                setAnnouncements(aData.items || []);
                setAds(adData.items || []);
                setMusic(mData.items || []);
                setPlatforms(pData.items || []);
                setBlacklist(bData.items || []);
                setAppeals(apData.items || []);
            }
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user, authFetch]);

    React.useEffect(() => {
        if (user) loadData();
    }, [user, loadData]);

    const handleLogin = async (values: any) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
        });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(tokenKey, data.token);
            setToken(data.token);
            message.success("登录成功");
        } else {
            message.error("登录失败");
        }
    };

    const handleBootstrap = async (values: any) => {
         const res = await fetch(`${API_BASE}/auth/bootstrap-admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
        });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(tokenKey, data.token);
            setToken(data.token);
            message.success("管理员已创建");
        } else {
            const data = await res.json().catch(() => ({}));
            if (res.status === 409) {
                message.error("初始化失败：管理员已存在");
            } else if (res.status === 401) {
                message.error("初始化失败：系统密钥无效");
            } else {
                message.error(`创建失败: ${data.message || res.statusText}`);
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(tokenKey);
        setToken(null);
        setUser(null);
    };

    if (!user) {
        return (
            <AppLayout>
                <LoginForm onLogin={handleLogin} onBootstrap={handleBootstrap} />
            </AppLayout>
        );
    }

    return (
        <Layout style={{ minHeight: "100vh", background: 'transparent' }}>
            <Sider 
                width={220} 
                theme={isDark ? "dark" : "light"} 
                style={{ 
                    borderRight: '1px solid var(--border-color)', 
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(var(--blur-amount))',
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                <div style={{ padding: 20, textAlign: 'center', background: 'transparent' }}>
                    <Typography.Title level={5} style={{ margin: 0 }}>后台管理</Typography.Title>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        {user.username} ({user.role})
                    </div>
                </div>
                <Menu
                    mode="inline"
                    theme={isDark ? "dark" : "light"}
                    selectedKeys={[activeMenu]}
                    onClick={({ key }) => setActiveMenu(key)}
                    items={[
                        { key: 'reports', icon: <FileTextOutlined />, label: '曝光审核' },
                        ...(user.role === 'ADMIN' || user.role === 'MOD' ? [
                            { key: 'complaints', icon: <WarningOutlined />, label: '投诉管理' }
                        ] : []),
                        ...(user.role === 'ADMIN' ? [
                            { key: 'users', icon: <UserOutlined />, label: '用户管理' },
                            { key: 'platforms', icon: <AppstoreOutlined />, label: '平台管理' },
                            { key: 'user-logs', icon: <TeamOutlined />, label: '用户日志' },
                            { key: 'visit-logs', icon: <MonitorOutlined />, label: '访问日志' },
                            { key: 'content', icon: <BookOutlined />, label: '内容管理' },
                            { key: 'blacklist', icon: <StopOutlined />, label: 'IP黑名单' },
                            { key: 'appeals', icon: <SafetyOutlined />, label: '申诉管理' },
                            { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
                            { key: 'logs', icon: <HistoryOutlined />, label: '操作日志' },
                        ] : []),
                        { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: handleLogout }
                    ]}
                    style={{ background: 'transparent', borderRight: 'none' }}
                />
            </Sider>
            <Layout style={{ background: 'transparent' }}>
                <AntContent 
                    style={{ 
                        margin: '24px 16px', 
                        padding: 24, 
                        background: 'var(--card-bg)', 
                        borderRadius: 16, 
                        backdropFilter: 'blur(var(--blur-amount))', 
                        minHeight: 280,
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--card-shadow)',
                        animation: 'fadeUp 0.4s ease'
                    }}
                >
                    {activeMenu === 'reports' && (
                        <ReportManager 
                            reports={reports} 
                            loading={loading} 
                            onRefresh={loadData} 
                            authFetch={authFetch} 
                        />
                    )}
                    {activeMenu === 'users' && user.role === 'ADMIN' && (
                        <UserManager 
                            users={users} 
                            onRefresh={loadData} 
                            authFetch={authFetch} 
                        />
                    )}
                    {activeMenu === 'platforms' && user.role === 'ADMIN' && (
                        <PlatformManager 
                            platforms={platforms} 
                            onRefresh={loadData} 
                            authFetch={authFetch} 
                        />
                    )}
                    {activeMenu === 'user-logs' && user.role === 'ADMIN' && (
                        <UserLogsManager authFetch={authFetch} />
                    )}
                    {activeMenu === 'visit-logs' && user.role === 'ADMIN' && (
                        <VisitLogsManager authFetch={authFetch} />
                    )}
                    {activeMenu === 'complaints' && (user.role === 'ADMIN' || user.role === 'MOD') && (
                        <ComplaintManager authFetch={authFetch} />
                    )}
                    {activeMenu === 'content' && user.role === 'ADMIN' && (
                        <ContentManager authFetch={authFetch} />
                    )}
                    {activeMenu === 'blacklist' && user.role === 'ADMIN' && (
                        <BlacklistManager blacklist={blacklist} onRefresh={loadData} authFetch={authFetch} />
                    )}
                    {activeMenu === 'appeals' && user.role === 'ADMIN' && (
                        <AppealManager appeals={appeals} onRefresh={loadData} authFetch={authFetch} />
                    )}
                    {activeMenu === 'settings' && user.role === 'ADMIN' && (
                        <SystemSettings 
                            announcements={announcements} 
                            ads={ads} 
                            music={music} 
                            onRefresh={loadData} 
                            authFetch={authFetch} 
                        />
                    )}
                    {activeMenu === 'logs' && user.role === 'ADMIN' && (
                        <LogsManager authFetch={authFetch} />
                    )}
                </AntContent>
            </Layout>
        </Layout>
    );
}
