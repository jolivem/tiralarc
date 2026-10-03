import { login } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <AuthForm
        action={login}
        next={typeof next === 'string' ? next : undefined}
        submitLabel="Se connecter"
        fields={[
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
          {
            name: 'password',
            label: 'Mot de passe',
            type: 'password',
            autoComplete: 'current-password',
            required: true,
          },
        ]}
        footer={{ text: 'Pas encore de compte ?', href: '/register', linkLabel: 'Créer un compte' }}
      />
    </main>
  );
}
