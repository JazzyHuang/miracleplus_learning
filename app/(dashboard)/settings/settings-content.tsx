'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SettingsNav } from '@/components/settings/settings-nav';
import { ProfileSection } from '@/components/settings/profile-section';
import { SecuritySection } from '@/components/settings/security-section';
import { NotificationSection } from '@/components/settings/notification-section';
import { LearningSection } from '@/components/settings/learning-section';
import { PrivacySection } from '@/components/settings/privacy-section';
import { DataSection } from '@/components/settings/data-section';
import type { User, UserSettings } from '@/types/database';

export type SettingsSection = 'profile' | 'security' | 'notifications' | 'learning' | 'privacy' | 'data';

interface SettingsContentProps {
  user: User;
  settings: UserSettings | null;
  hasPasswordAuth: boolean;
  userEmail: string;
}

export function SettingsContent({ user, settings, hasPasswordAuth, userEmail }: SettingsContentProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      <PageHeader
        icon={Settings}
        title="设置"
        description="管理你的账户和偏好"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsNav active={activeSection} onChange={setActiveSection} />

        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <ProfileSection user={user} bio={user.bio ?? ''} userEmail={userEmail} />
          )}
          {activeSection === 'security' && (
            <SecuritySection email={userEmail} hasPasswordAuth={hasPasswordAuth} />
          )}
          {activeSection === 'notifications' && (
            <NotificationSection settings={settings} />
          )}
          {activeSection === 'learning' && (
            <LearningSection settings={settings} />
          )}
          {activeSection === 'privacy' && (
            <PrivacySection settings={settings} />
          )}
          {activeSection === 'data' && (
            <DataSection userEmail={userEmail} />
          )}
        </div>
      </div>
    </div>
  );
}
