import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { Mail, Lock } from 'lucide-react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({
    status,
    canResetPassword,
}: LoginProps) {
    return (
        <div className="min-h-screen max-h-screen overflow-hidden flex">
            <Head title="Iniciar Sesión - UNCED" />
            
            {/* Left Side - Brand Experience Section */}
            <div className="hidden lg:flex lg:w-3/5 relative bg-[#073372]  overflow-hidden">
                {/* Wave SVG como marca de agua */}
                <div className="absolute inset-0 opacity-100">
                    <img 
                        src="/wave.svg" 
                        alt="" 
                        className="absolute top-0 right-0 w-auto h-96 object-contain transform "
                    />
                </div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col justify-center items-start px-16 py-12 text-white">
                    {/* Logo UNCED */}
                    <div className="mb-8">
                        <img 
                            src="/logo-white.png" 
                            alt="UNCED - Centro de Educación" 
                            className="h-24 w-auto drop-shadow-2xl"
                        />
                    </div>

                    {/* Welcome Title - Avenir Black para títulos */}
                    <div className="mb-12">
                        <h1 className="text-5xl font-black mb-6 drop-shadow-lg tracking-tight" style={{fontFamily: 'Avenir Black, sans-serif'}}>
                            Bienvenido
                        </h1>
                        <p className="text-3xl font-light italic text-white/95 drop-shadow-md">
                            "Tu futuro habla inglés."
                        </p>
                    </div>

                    {/* Manifiesto - Comunicación clara y motivadora */}
                    <div className="max-w-xl space-y-8">
                        <div className="space-y-4">
                            <p className="text-xl font-light leading-relaxed text-white/95">
                                En un mundo globalizado donde el inglés ya no es un valor agregado sino <span className="font-medium">un requisito esencial</span>, UNCED nace para ofrecer una enseñanza flexible, humana y orientada a resultados reales.
                            </p>
                        </div>
                        
                     
                    </div>

                    {/* Cita del Manifiesto - Aspiracional */}
                    <div className="mt-16">
                        <blockquote className="border-l-4 border-white/30 pl-6">
                            <p className="text-lg font-light italic text-white/90 leading-relaxed">
                                "No enseñamos solo inglés.<br />
                                <span className="font-medium text-white">Enseñamos confianza. Enseñamos futuro.</span>"
                            </p>
                        </blockquote>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-2/5 flex items-center justify-center bg-white p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img 
                            src="/logo.png" 
                            alt="UNCED Logo" 
                            className="h-12 w-auto mx-auto mb-4"
                        />
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#073372] via-[#17BC91] to-[#F98613] bg-clip-text text-transparent">
                            Iniciar Sesión
                        </h2>
                    </div>

                    {/* Desktop Title */}
                    <div className="hidden lg:block mb-8">
                        <h2 className="text-5xl font-bold text-[#073372] mb-2" style={{fontFamily: 'Avenir Black, sans-serif'}}>
                            Iniciar Sesión
                        </h2>
                        <p className="text-gray-600">
                            Accede a tu plataforma de aprendizaje
                        </p>
                    </div>

                    {/* Status Message */}
                    {status && (
                        <div className="mb-6 p-4 bg-[#17BC91]/10 border-l-4 border-[#17BC91] rounded-xl text-[#073372] text-sm font-medium">
                            {status}
                        </div>
                    )}

                    {/* Login Form */}
                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="space-y-5"
                    >
                        {({ processing, errors }) => (
                            <>
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
                                    {canResetPassword && (
                                        <div className="text-right">
                                            <TextLink
                                                href={request()}
                                                className="text-sm font-medium text-[#073372] hover:text-[#17BC91] transition-colors"
                                                tabIndex={5}
                                            >
                                                ¿Olvidaste tu contraseña?
                                            </TextLink>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        tabIndex={3}
                                    />
                                    <Label htmlFor="remember" className="text-sm text-gray-600 font-medium cursor-pointer">
                                        Recordarme
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 bg-gradient-to-r from-[#073372] via-[#17BC91] to-[#F98613] hover:from-[#051f45] hover:via-[#129b75] hover:to-[#d96f0a] text-white text-base font-semibold shadow-lg shadow-[#073372]/20 hover:shadow-xl hover:shadow-[#17BC91]/30 transition-all duration-300 rounded-full"
                                    tabIndex={4}
                                    disabled={processing}
                                    data-test="login-button"
                                >
                                    {processing && <Spinner />}
                                    {processing ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                </Button>

                                {/* Footer */}
                                <div className="pt-6 text-center text-xs text-gray-500">
                                    <p>© 2025 UNCED. Todos los derechos reservados.</p>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </div>
    );
}
