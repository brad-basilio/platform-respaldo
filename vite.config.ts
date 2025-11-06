import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    define: mode === 'production' ? {
        'import.meta.env.VITE_REVERB_HOST': JSON.stringify('unced.online'),
        'import.meta.env.VITE_REVERB_PORT': JSON.stringify('6001'),
        'import.meta.env.VITE_REVERB_SCHEME': JSON.stringify('wss'),
        'import.meta.env.VITE_REVERB_APP_KEY': JSON.stringify('wmcehp1p9o91o5vqewm5'),
    } : {},
}));
