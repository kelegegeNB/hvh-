import React from "react";
import { Typography, Card, Divider, Skeleton } from "antd";
import { AppLayout } from "../../components/layout/AppLayout";
import { API_BASE } from "../../utils";

function LegalLayout({ title, contentKey, defaultContent }: { title: string, contentKey: string, defaultContent: React.ReactNode }) {
    const [content, setContent] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetch(`${API_BASE}/config/${contentKey}`)
            .then(r => r.json())
            .then(data => {
                if (data.value) setContent(data.value);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [contentKey]);

    return (
        <AppLayout>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <Typography.Title level={3}>{title}</Typography.Title>
                <Card className="card-animate legal-card" bordered={false} style={{ padding: 24 }}>
                    {loading ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                    ) : content ? (
                        <div className="rich-content" dangerouslySetInnerHTML={{ __html: content }} />
                    ) : (
                        defaultContent
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

const defaultPrivacy = (
    <>
        <Typography.Paragraph>
          为保障用户隐私与信息安全，本协议说明本站对信息的收集、使用、存储与保护规则。用户继续访问
          或使用本站服务，即视为已阅读并同意本协议全部条款。
        </Typography.Paragraph>
        <Typography.Title level={5}>一、信息收集范围</Typography.Title>
        <ul className="legal-list">
          <li>用户主动提交的内容、图片与必要的识别信息。</li>
          <li>为安全合规而记录的访问日志、IP 地址、设备与时间信息。</li>
        </ul>
        <Typography.Title level={5}>二、信息使用目的</Typography.Title>
        <ul className="legal-list">
          <li>用于展示与审核内容、提升服务质量、处理纠纷与风险控制。</li>
          <li>除法律法规或监管要求外，不会向第三方披露可识别个人身份的信息。</li>
        </ul>
        <Typography.Title level={5}>三、信息存储与安全</Typography.Title>
        <ul className="legal-list">
          <li>采用合理的安全措施保护数据，降低泄露、篡改或损毁风险。</li>
          <li>因不可抗力或网络攻击导致的风险，本站将依法依规处理。</li>
        </ul>
        <Typography.Title level={5}>四、用户权利</Typography.Title>
        <ul className="legal-list">
          <li>用户可通过联系方式提出查询、修改或删除其发布内容的合理请求。</li>
          <li>本站将在合理期限内完成核验与处理。</li>
        </ul>
        <Typography.Title level={5}>五、协议更新</Typography.Title>
        <ul className="legal-list">
          <li>协议可能因业务或法律变化更新，并以公告或页面更新方式通知。</li>
          <li>更新后继续使用服务视为接受新的协议条款。</li>
        </ul>
        <Divider />
        <Typography.Paragraph type="secondary">最终解释权归本站所有。</Typography.Paragraph>
    </>
);

const defaultTerms = (
    <>
        <Typography.Paragraph>
          本条款适用于用户访问与使用本站服务的全过程。使用本站服务即表示已阅读并同意遵守本条款。
        </Typography.Paragraph>
        <Typography.Title level={5}>一、用户行为规范</Typography.Title>
        <ul className="legal-list">
          <li>发布内容应真实、合法，不侵犯他人权益。</li>
          <li>禁止发布诽谤、侮辱、虚假或违法信息。</li>
          <li>用户应遵守法律法规与本站管理规则。</li>
        </ul>
        <Typography.Title level={5}>二、社区公约与违规内容</Typography.Title>
        <Typography.Paragraph>严禁发布包含以下要素的内容：</Typography.Paragraph>
        <ul className="legal-list">
          <li>政治敏感、破坏国家统一、煽动颠覆政权、泄露国家秘密</li>
          <li>色情、低俗、成人用品推广、未成年人不良诱导</li>
          <li>暴力、恐怖主义、极端主义、犯罪教程</li>
          <li>血腥、虐待、自残、自杀诱导</li>
        </ul>
        <Typography.Title level={5}>三、违规处罚策略</Typography.Title>
        <ul className="legal-list">
          <li>第1次违规：内容下架，予以警告。</li>
          <li>第2次违规：拉黑账号7天，禁止发布内容。</li>
          <li>第3次违规：永久拉黑，封禁设备指纹，禁止关联账号注册。</li>
        </ul>
        <Typography.Title level={5}>四、内容审核与处置</Typography.Title>
        <ul className="legal-list">
          <li>本站有权对内容进行审核、隐藏、删除或调整。</li>
          <li>对违规内容，本站可采取限制访问、封禁或留存证据等措施。</li>
        </ul>
        <Typography.Title level={5}>五、责任与免责声明</Typography.Title>
        <ul className="legal-list">
          <li>站内内容由用户发布，本站不对其真实性作出保证。</li>
          <li>因用户行为或第三方原因造成的损失，本站不承担责任。</li>
          <li>因不可抗力或系统故障导致服务中断，本站不承担由此产生的损失。</li>
        </ul>
        <Typography.Title level={5}>六、条款变更</Typography.Title>
        <ul className="legal-list">
          <li>条款可能因法律或业务变化更新，更新后自发布之日起生效。</li>
          <li>继续使用服务视为接受更新后的条款。</li>
        </ul>
        <Divider />
        <Typography.Paragraph type="secondary">最终解释权归本站所有。</Typography.Paragraph>
    </>
);

const defaultContact = (
    <>
        <Typography.Paragraph>
          如需反馈问题、提交申诉或商务合作，请优先查看“网站更新公告”中的最新联系方式与公告说明。
        </Typography.Paragraph>
        <ul className="legal-list">
          <li>反馈与申诉：请在对应曝光详情页留言，或查看公告中的官方联系方式。</li>
          <li>商务合作：以公告页公布的联系方式为准。</li>
        </ul>
        <Divider />
        <Typography.Paragraph type="secondary">最终解释权归本站所有。</Typography.Paragraph>
    </>
);

export function PrivacyPage() {
  return <LegalLayout title="隐私协议" contentKey="privacy" defaultContent={defaultPrivacy} />;
}

export function TermsPage() {
  return <LegalLayout title="用户条款" contentKey="terms" defaultContent={defaultTerms} />;
}

export function ContactPage() {
  return <LegalLayout title="联系方式" contentKey="contact" defaultContent={defaultContact} />;
}
