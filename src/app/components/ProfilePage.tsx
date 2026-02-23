import { User } from 'lucide-react';

interface ProfilePageProps {
  profile: any | null;
}

export function ProfilePage({ profile }: ProfilePageProps) {
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secti-muted">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-6 mb-8">
        {profile.photoBase64 ? (
          <img
            src={profile.photoBase64}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-secti-primary">
            {profile.displayName || 'Sem nome'}
          </h2>
          <p className="text-sm text-secti-muted">{profile.email}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-secti-border shadow-card">
        <div className="space-y-4">
          <div>
            <span className="font-bold">Função:</span>{' '}
            <span className="capitalize">{profile.role || 'não informado'}</span>
          </div>
          <div>
            <span className="font-bold">ID:</span> {profile.uid}
          </div>
          <div>
            <span className="font-bold">Criado em:</span>{' '}
            {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
