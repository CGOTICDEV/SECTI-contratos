import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx,html}',
        './public/**/*.html'
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2563EB',
                secondary: '#9333EA',
            },
        },
    },
    plugins: [
        typography,
    ],
};

export default config;
