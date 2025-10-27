import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form, Head, router } from '@inertiajs/react';
import { GraduationCap } from 'lucide-react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: LoginProps) {
    const demoAccounts = [
        { email: 'admin@english.com', password: 'admin123', role: 'Administrador' },
        { email: 'teacher@english.com', password: 'teacher123', role: 'Profesor' },
        { email: 'student@english.com', password: 'student123', role: 'Estudiante' },
    ];

    const handleDemoLogin = (email: string, password: string) => {
        router.post('/login', {
            email,
            password,
            remember: false,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Head title="Iniciar Sesión" />
            
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-6 shadow-lg shadow-blue-600/25">
                            <GraduationCap className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">InglésProf</h1>
                        <p className="text-slate-600">Inicia sesión para continuar tu viaje de aprendizaje</p>
                    </div>

                    {status && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
                            {status}
                        </div>
                    )}

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="flex flex-col gap-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Correo Electrónico</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="email"
                                            placeholder="email@ejemplo.com"
                                            className="bg-slate-50 focus:bg-white"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">Contraseña</Label>
                                            {canResetPassword && (
                                                <TextLink
                                                    href={request()}
                                                    className="ml-auto text-sm"
                                                    tabIndex={5}
                                                >
                                                    ¿Olvidaste tu contraseña?
                                                </TextLink>
                                            )}
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            name="password"
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder="Contraseña"
                                            className="bg-slate-50 focus:bg-white"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={3}
                                        />
                                        <Label htmlFor="remember">Recordarme</Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                    >
                                        {processing && <Spinner />}
                                        Iniciar Sesión
                                    </Button>
                                </div>

                                {canRegister && (
                                    <div className="text-center text-sm text-muted-foreground">
                                        ¿No tienes una cuenta?{' '}
                                        <TextLink href={register()} tabIndex={5}>
                                            Regístrate
                                        </TextLink>
                                    </div>
                                )}
                            </>
                        )}
                    </Form>

                    <div className="mt-6">
                        <div className="text-center text-sm text-slate-600 mb-4 font-medium">
                            Cuentas de Demostración:
                        </div>
                        <div className="space-y-2">
                            {demoAccounts.map((account) => (
                                <button
                                    key={account.role}
                                    type="button"
                                    onClick={() => handleDemoLogin(account.email, account.password)}
                                    className="w-full text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl transition-all border border-slate-200 hover:border-slate-300 font-medium"
                                >
                                    {account.role}: {account.email}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-sm text-slate-600">
                                Admin: <span className="font-semibold text-blue-600">admin123</span> | Profesor: <span className="font-semibold text-green-600">teacher123</span> | Estudiante: <span className="font-semibold text-purple-600">student123</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
