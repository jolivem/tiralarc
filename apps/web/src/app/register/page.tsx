import { register } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';

export default function RegisterPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <AuthForm
        action={register}
        submitLabel="Créer mon compte"
        fields={[
          { name: 'displayName', label: 'Nom affiché', type: 'text', autoComplete: 'name' },
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
          {
            name: 'password',
            label: 'Mot de passe (8 caractères min.)',
            type: 'password',
            autoComplete: 'new-password',
            required: true,
            minLength: 8,
          },
        ]}
        footer={{ text: 'Déjà inscrit ?', href: '/login', linkLabel: 'Se connecter' }}
      />
    </main>
  );
}
