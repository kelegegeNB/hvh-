import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space, Tooltip, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    StopOutlined, 
    SafetyCertificateOutlined, 
    CopyOutlined, 
    CustomerServiceOutlined, 
    LockOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export interface BannedEventDetail {
    message: string;
    detail: string;
    reason?: string;
    endAt?: string;
    type?: 'ip_ban' | 'account_ban' | 'permission_denied' | 'system_error';
    code?: string;
}

export const BANNED_EVENT_NAME = 'ip-banned';

export const IpBanModal: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [info, setInfo] = useState<BannedEventDetail | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleBanned = (event: Event) => {
            // STRICT CHECK: Never show on appeal page
            if (window.location.pathname.startsWith('/appeal')) return;

            const customEvent = event as CustomEvent<BannedEventDetail>;
            setInfo(customEvent.detail);
            setOpen(true);
        };

        window.addEventListener(BANNED_EVENT_NAME, handleBanned);
        return () => {
            window.removeEventListener(BANNED_EVENT_NAME, handleBanned);
        };
    }, []);

    // Double check: Close modal if user navigates to appeal page
    useEffect(() => {
        if (location.pathname.startsWith('/appeal')) {
            setOpen(false);
        }
    }, [location.pathname]);

    const handleAppeal = () => {
        setOpen(false);
        // Pass reason as query param for auto-fill if needed
        const params = new URLSearchParams();
        if (info?.reason) params.set('reason', info.reason);
        navigate(`/appeal?${params.toString()}`);
    };

    const handleCopyError = () => {
        const errorText = `Error: ${info?.message}\nDetail: ${info?.detail}\nReason: ${info?.reason || 'N/A'}\nEndAt: ${info?.endAt || 'Permanent'}`;
        navigator.clipboard.writeText(errorText);
        message.success("错误信息已复制");
    };

    // Determine UI based on error type (defaulting to IP ban if not specified)
    const renderContent = () => {
        const type = info?.type || 'ip_ban';
        
        const config = {
            ip_ban: {
                icon: <StopOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
                title: "访问被拒绝",
                color: '#ff4d4f',
                bg: 'rgba(255, 77, 79, 0.1)',
                actionText: "申请解封",
                showAppeal: true
            },
            account_ban: {
                icon: <LockOutlined style={{ fontSize: 48, color: '#faad14' }} />,
                title: "账号已被封禁",
                color: '#faad14',
                bg: 'rgba(250, 173, 20, 0.1)',
                actionText: "申诉解封",
                showAppeal: true
            },
            permission_denied: {
                icon: <SafetyCertificateOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
                title: "权限不足",
                color: '#1890ff',
                bg: 'rgba(24, 144, 255, 0.1)',
                actionText: "申请权限",
                showAppeal: false // Maybe redirect to upgrade page? Keeping generic for now
            },
            system_error: {
                icon: <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
                title: "系统访问受限",
                color: '#ff4d4f',
                bg: 'rgba(255, 77, 79, 0.1)',
                actionText: "联系客服",
                showAppeal: false
            }
        }[type] || {
            icon: <StopOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
            title: "访问受限",
            color: '#ff4d4f',
            bg: 'rgba(255, 77, 79, 0.1)',
            actionText: "前往申诉",
            showAppeal: true
        };

        return (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ 
                    width: 96, 
                    height: 96, 
                    margin: '0 auto 24px', 
                    background: config.bg, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: `1px solid ${config.color}30`
                }}>
                    {config.icon}
                </div>
                
                <Typography.Title level={3} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
                    {config.title}
                </Typography.Title>
                
                <Typography.Paragraph type="secondary" style={{ marginBottom: 24, fontSize: 16 }}>
                    {info?.detail || '您的访问受到限制'}
                </Typography.Paragraph>

                {info?.reason && (
                    <div style={{ 
                        background: 'rgba(255, 77, 79, 0.04)', 
                        border: '1px solid rgba(255, 77, 79, 0.15)',
                        borderRadius: 12, 
                        padding: '16px',
                        marginBottom: 24,
                        textAlign: 'left',
                        position: 'relative'
                    }}>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography.Text type="danger" strong>
                                    限制原因
                                </Typography.Text>
                                <Tooltip title="复制详细信息">
                                    <Button 
                                        type="text" 
                                        size="small" 
                                        icon={<CopyOutlined />} 
                                        onClick={handleCopyError}
                                        style={{ color: 'var(--text-secondary)' }}
                                    />
                                </Tooltip>
                            </div>
                            <Typography.Text style={{ color: 'var(--text-primary)' }}>
                                {info.reason}
                            </Typography.Text>
                            
                            {info.endAt && (
                                <div style={{ 
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
                                    marginTop: 8, 
                                    paddingTop: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <ClockCircleOutlined style={{ color: 'var(--text-secondary)' }} />
                                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                        解封时间: {dayjs(info.endAt).format('YYYY-MM-DD HH:mm:ss')}
                                    </Typography.Text>
                                </div>
                            )}
                        </Space>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {config.showAppeal ? (
                        <Button 
                            type="primary" 
                            danger 
                            size="large" 
                            icon={<SafetyCertificateOutlined />} 
                            onClick={handleAppeal}
                            block
                            style={{ height: 48, fontSize: 16 }}
                        >
                            {config.actionText}
                        </Button>
                    ) : (
                        <Button 
                            type="primary"
                            size="large"
                            icon={<CustomerServiceOutlined />}
                            onClick={() => window.location.href = 'mailto:support@example.com'}
                            block
                        >
                            联系管理员
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal
            open={open}
            footer={null}
            closable={false}
            maskClosable={false}
            centered
            width={420}
            className="ip-ban-modal"
            styles={{
                content: {
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
                    padding: 0,
                    borderRadius: 20,
                    overflow: 'hidden'
                },
                mask: {
                    backdropFilter: 'blur(4px)',
                    background: 'rgba(0, 0, 0, 0.6)'
                }
            }}
        >
            {renderContent()}
        </Modal>
    );
};
