import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { SchemaEditor } from './SchemaEditor';
import { DataView } from './DataView';
import { useProjectStore } from '@/store/project-store';

export function AppShell() {
  const mode = useProjectStore((s) => s.mode);

  return (
    <div className="flex h-full flex-col">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {mode === 'schema' ? <SchemaEditor /> : <DataView />}
        </main>
      </div>
    </div>
  );
}
