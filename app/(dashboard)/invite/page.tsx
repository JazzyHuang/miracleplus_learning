import { Metadata } from 'next';
import { InviteContent } from './invite-content';

/**
 * 邀请页面元数据
 */
export const metadata: Metadata = {
  title: '邀请好友 | Miracle Learning',
  description: '邀请好友加入 Miracle Learning，一起学习成长，获得积分奖励',
  openGraph: {
    title: '邀请好友 | Miracle Learning',
    description: '邀请好友加入 Miracle Learning，一起学习成长',
    type: 'website',
  },
};

/**
 * 邀请页面
 */
export default function InvitePage() {
  return <InviteContent />;
}
