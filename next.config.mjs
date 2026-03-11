/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['bcryptjs'],
    async redirects() {
        return [
            {
                source: '/',
                has: [{ type: 'host', value: 'field.kientrucsct.com' }],
                destination: '/field',
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
