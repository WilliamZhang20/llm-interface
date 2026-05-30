import ProviderSetup from '@/components/ProviderSetup'

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>
      <ProviderSetup />
    </div>
  )
}
