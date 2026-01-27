import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuração para servir arquivos estáticos do PDF.js e WebViewer
  async headers() {
    return [
      // CORS headers são tratados dinamicamente nas rotas individuais via handleCors()
      // NÃO adicionar headers CORS aqui pois sobrescreve os headers dinâmicos
      {
        source: '/pdf.worker.min.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      {
        source: '/pdf.min.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Headers para WebViewer
      {
        source: '/lib/webviewer/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      // MIME type correto para arquivos WASM (deve vir ANTES da regra geral)
      {
        source: '/ej2-pdfviewer-lib/(.*).wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },

  // Configuração do webpack para resolver problemas com pdfjs-dist
  webpack: (config, { isServer }) => {
    // Resolver problemas com módulos nativos do Node.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        "pdfjs-dist/build/pdf.worker.js": false,
      };
    }

    // Ignorar módulos que causam problemas no cliente
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        canvas: "canvas",
        encoding: "encoding",
      });
    }

    // Configuração para arquivos .node
    config.module.rules.push({
      test: /\.node$/,
      use: "ignore-loader",
    });

    // Prevenir minificação de SyncFusion para preservar qualidade do PDF viewer
    if (!isServer && config.optimization) {
      config.optimization.minimizer = config.optimization.minimizer || [];

      // Encontrar e configurar TerserPlugin para excluir SyncFusion
      config.optimization.minimizer = config.optimization.minimizer.map((plugin: any) => {
        if (plugin && plugin.constructor && plugin.constructor.name === 'TerserPlugin') {
          return new plugin.constructor({
            ...plugin.options,
            exclude: [
              /node_modules\/@syncfusion/,
              /ej2-pdfviewer/
            ],
          });
        }
        return plugin;
      });
    }

    return config;
  },
};

export default nextConfig;
