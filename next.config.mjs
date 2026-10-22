/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Excluir archivos de cache de webpack del output de Cloudflare Pages
      config.output.pathinfo = false;
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
      // Excluir archivos de cache grandes
      config.plugins = config.plugins || [];
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('RemoveLargeFiles', (compilation, callback) => {
            for (const filename of Object.keys(compilation.assets)) {
              if (filename.includes('server-production') && filename.endsWith('.pack')) {
                delete compilation.assets[filename];
              }
            }
            callback();
          });
        }
      });
    }
    return config;
  },
};

export default nextConfig;
