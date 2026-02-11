import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { DB } from '@/lib/db-tables';
import { SettingsContent } from './settings-content';
import SettingsLoading from './loading';

export const metadata: Metadata = {
  title: '设置',
  description: '管理你的账户设置和偏好',
};

async function SettingsData() {
  const { authUser, profile } = await getAuthUserWithProfile();
  if (!authUser || !profile) redirect('/login');

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from(DB.user_settings)
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  const hasPasswordAuth = authUser.app_metadata?.providers?.includes('email') ?? true;

  return (
    <SettingsContent
      user={profile}
      settings={settings}
      hasPasswordAuth={hasPasswordAuth}
      userEmail={authUser.email ?? ''}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsData />
    </Suspense>
  );
}
