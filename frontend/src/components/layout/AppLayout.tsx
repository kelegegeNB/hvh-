import React from "react";
import { Layout, Menu, Typography, Button, Tooltip, Checkbox, Space } from "antd";
import { Link, useLocation } from "react-router-dom";
import { BulbOutlined, BulbFilled, DownOutlined, UpOutlined, CloseOutlined } from "@ant-design/icons";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE } from "../../utils";
import "../../styles.css";
import { AnnouncementItem } from "../../types";
import { IpBanModal } from "../common/IpBanModal";

const { Header, Content, Footer } = Layout;

function MusicPlayer() {
    const [music, setMusic] = React.useState<{ url: string; title: string } | null>(null);
    const [error, setError] = React.useState(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    React.useEffect(() => {
        fetch(`${API_BASE}/music-links/active`, { headers: { "Cache-Control": "no-cache" } })
            .then(r => r.json())
            .then(data => {
                if (data.item) {
                    setMusic(data.item);
                    setError(false);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch music:", err);
                setError(true);
            });
    }, []);

    React.useEffect(() => {
        if (music && !music.url.includes("<iframe") && audioRef.current) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented:", error);
                    // Autoplay was prevented. User interaction is required.
                });
            }
        }
    }, [music]);

    if (!music || error) return null;

    const isIframe = music.url.includes("<iframe");

    return (
        <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {isIframe ? (
                <div dangerouslySetInnerHTML={{ __html: music.url }} />
            ) : (
                <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: 12, display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
                    <div style={{fontSize: 12}}>{music.title}</div>
                    <audio 
                        ref={audioRef}
                        controls 
                        src={music.url} 
                        style={{ height: 30, width: 200 }} 
                        onError={(e) => {
                            console.error("Audio load error:", e);
                            // Optional: setError(true) if we want to hide it on error
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function AnnouncementPopup() {
    const [announcement, setAnnouncement] = React.useState<AnnouncementItem | null>(null);
    const [visible, setVisible] = React.useState(false);
    const [dontShowToday, setDontShowToday] = React.useState(false);

    React.useEffect(() => {
        fetch(`${API_BASE}/announcements/active`)
            .then(r => r.json())
            .then(data => {
                console.log("Announcement data:", data);
                if (data.item) {
                    const item = data.item as AnnouncementItem;
                    checkShow(item);
                }
            })
            .catch((err) => console.error("Announcement fetch error:", err));
    }, []);

    const checkShow = (item: AnnouncementItem) => {
        const lastVersion = localStorage.getItem('announcement_version');
        const lastDate = localStorage.getItem('announcement_closed_date');
        const today = new Date().toDateString();

        console.log("Checking announcement show:", { item, lastVersion, lastDate, today });

        // If version changed, always show (reset state)
        if (lastVersion !== item.id) {
            console.log("New version detected, showing announcement");
            setAnnouncement(item);
            setVisible(true);
            return;
        }

        // If "Don't show today" was checked and date matches
        if (lastDate === today) {
            console.log("Announcement hidden for today");
            return;
        }

        setAnnouncement(item);
        setVisible(true);
    };

    const handleClose = () => {
        if (!announcement) return;
        setVisible(false);
        
        // Save version to indicate we've seen this version
        localStorage.setItem('announcement_version', announcement.id);
        
        if (dontShowToday) {
            localStorage.setItem('announcement_closed_date', new Date().toDateString());
        } else {
             // If not "don't show today", we might clear the date so it shows again tomorrow if logic requires, 
             // but here we only block if date matches. If user didn't check it, we don't set date.
             // But if we want it to show *every time* unless checked, we are good.
             // If we want it to show *once per session* unless checked? 
             // The requirement says "Add 'Don't show again today' option". Implies default is showing.
        }
    };

    if (!visible || !announcement) return null;

    return (
        <div className="announcement-overlay">
            <div className="announcement-card card-animate">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
                    <Typography.Title level={4} style={{margin:0}}>{announcement.title}</Typography.Title>
                    <Button type="text" icon={<CloseOutlined />} onClick={handleClose} />
                </div>
                <div className="rich-content" dangerouslySetInnerHTML={{ __html: announcement.content }} style={{maxHeight: '60vh', overflowY: 'auto'}} />
                <div style={{marginTop: 24, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <Checkbox checked={dontShowToday} onChange={e => setDontShowToday(e.target.checked)}>
                        本日不再提示
                    </Checkbox>
                    <Button type="primary" onClick={handleClose}>我知道了</Button>
                </div>
            </div>
        </div>
    );
}

function FooterSection() {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <Footer className={`app-footer ${expanded ? 'expanded' : 'collapsed'}`}>
             <div style={{ maxWidth: 1200, margin: '0 auto', transition: 'all 0.3s ease' }}>
                {!expanded ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                         <div className="footer-text">© 2025-2026 Intelligence Agency 奇源情报局 · Created by 可乐</div>
                         <Space size={24}>
                            <Link to="/privacy" style={{color:'var(--text-secondary)'}}>隐私协议</Link>
                            <Link to="/contact" style={{color:'var(--text-secondary)'}}>联系</Link>
                            <Button type="link" onClick={() => setExpanded(true)} icon={<UpOutlined />}>更多</Button>
                         </Space>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeUp 0.3s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
                            <div style={{ maxWidth: 300 }}>
                                <Typography.Title level={4} style={{ margin: '0 0 12px 0', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Intelligence Agency 奇源情报局
                                </Typography.Title>
                                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                                    致力于维护社区环境，记录不良行为，共建诚信社区。
                                </Typography.Text>
                            </div>
                            
                            <div className="footer-links-group">
                                <div className="footer-col">
                                    <div className="footer-col-title">平台条款</div>
                                    <Link to="/disclaimer">免责声明</Link>
                                    <Link to="/privacy">隐私协议</Link>
                                    <Link to="/terms">用户条款</Link>
                                </div>
                                <div className="footer-col">
                                    <div className="footer-col-title">关于我们</div>
                                    <Link to="/announcements">更新公告</Link>
                                    <Link to="/contact">联系方式</Link>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 24, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="footer-text">
                                © 2025-2026 Intelligence Agency 奇源情报局 · Created by 可乐
                            </div>
                            <Button type="link" onClick={() => setExpanded(false)} icon={<DownOutlined />}>收起</Button>
                        </div>
                    </div>
                )}
             </div>
        </Footer>
    );
}

export function AppLayout(props: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const activeKey = location.pathname === "/" ? "home" 
    : location.pathname.startsWith("/hot") ? "hot"
    : location.pathname.startsWith("/publish") ? "publish"
    : location.pathname.startsWith("/announcements") ? "announce"
    : "home";

  React.useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = (x: number, y: number) => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${x}`);
        root.style.setProperty("--my", `${y}`);
      });
    };
    const onMove = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      update(x, y);
    };
    const onDevice = (event: DeviceOrientationEvent) => {
      const x = ((event.gamma ?? 0) + 45) / 90;
      const y = ((event.beta ?? 0) + 45) / 90;
      update(Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1));
    };
    update(0.5, 0.5);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onDevice, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("deviceorientation", onDevice);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }} className="app-header">
        <div style={{ display: "flex", alignItems: "center" }}>
           <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: "none" }}>
              <img src="/assets/images/logo-main.png" alt="Logo" style={{ height: 32, width: 'auto' }} onError={(e) => {
                  // Fallback if image not found yet
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.querySelector('.text-logo')!.classList.remove('hidden');
              }} />
              <Typography.Title level={3} className="text-logo hidden" style={{ margin: 0, letterSpacing: 1, fontSize: '1.5rem', background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Intelligence Agency 奇源情报局
              </Typography.Title>
           </Link>
        </div>
       
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 16 }}>
            <Menu
              mode="horizontal"
              selectedKeys={[activeKey]}
              items={[
                { key: "home", label: <Link to="/">首页</Link> },
                { key: "hot", label: <Link to="/hot">热度榜</Link> },
                { key: "publish", label: <Link to="/publish">发布曝光</Link> },
                { key: "announce", label: <Link to="/announcements">网站更新公告</Link> }
              ]}
              style={{ flex: 1, minWidth: 0, background: "transparent", borderBottom: "none", justifyContent: "flex-end", marginRight: 16 }}
            />
            
            <Tooltip title={theme === 'dark' ? "切换到亮色模式" : "切换到深色模式"}>
                <Button 
                    shape="circle" 
                    icon={theme === 'dark' ? <BulbFilled /> : <BulbOutlined />} 
                    onClick={toggleTheme}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                />
            </Tooltip>
        </div>
      </Header>
      <Content style={{ padding: "24px 24px 0" }} className="app-content">
        <div 
            key={location.pathname} 
            className="page-enter"
            style={{ maxWidth: 1200, margin: "0 auto", width: "100%", animation: "fadeUp 0.4s ease" }}
        >
            {props.children}
        </div>
      </Content>
      <FooterSection />
      <MusicPlayer />
      <AnnouncementPopup />
      <IpBanModal />
    </Layout>
  );
}
