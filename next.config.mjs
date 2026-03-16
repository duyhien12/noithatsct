/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['bcryptjs', 'sharp', 'busboy'],
    experimental: {
        serverActions: {
            bodySizeLimit: '4gb',
        },
        // Allow large file uploads through route handlers (no limit)
        proxyClientMaxBodySize: 4 * 1024 * 1024 * 1024, // 4GB
    },
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
