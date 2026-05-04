import { useEffect } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useTheme } from '@/hooks/useTheme';
import { I18nProvider } from '@/i18n/provider';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AppShell } from './components/AppShell';

function AppInner() {
  useTheme();
  const projectPath = useProjectStore((s) => s.projectPath);
  const loadRecents = useProjectStore((s) => s.loadRecents);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  return projectPath ? <AppShell /> : <WelcomeScreen />;
}

export function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
