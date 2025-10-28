import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { GraduationCap, Mail, Lock } from 'lucide-react';

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
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
            <Head title="Iniciar Sesión" />
            
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/20">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-600/30">
                            <GraduationCap className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
                            Bienvenido
                        </h1>
                        <p className="text-slate-600 text-sm">Inicia sesión para acceder a tu cuenta</p>
                    </div>

                    {status && (
                        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-green-700 text-sm">
                            {status}
                        </div>
                    )}

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="space-y-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-5">
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        label="Correo Electrónico"
                                        icon={<Mail className="w-5 h-5" />}
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="correo@ejemplo.com"
                                        error={errors.email}
                                    />

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-end mb-1">
                                           
                                            {canResetPassword && (
                                                <TextLink
                                                    href={request()}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
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
                                            label="Contraseña"
                                            icon={<Lock className="w-5 h-5" />}
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            error={errors.password}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={3}
                                        />
                                        <Label htmlFor="remember" className="text-sm text-gray-600 font-medium cursor-pointer">
                                            Recordarme en este dispositivo
                                        </Label>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="mt-8 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white py-6 text-base font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-200"
                                    tabIndex={4}
                                    disabled={processing}
                                    data-test="login-button"
                                >
                                    {processing && <Spinner />}
                                    {processing ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                </Button>

                                {canRegister && (
                                    <div className="text-center text-sm text-slate-600 pt-6 border-t border-gray-200">
                                        ¿No tienes una cuenta?{' '}
                                        <TextLink 
                                            href={register()} 
                                            tabIndex={5}
                                            className="font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text hover:from-blue-700 hover:to-purple-700"
                                        >
                                            Regístrate aquí
                                        </TextLink>
                                    </div>
                                )}
                            </>
                        )}
                    </Form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500">
                        © 2025 InglésProf. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
}
