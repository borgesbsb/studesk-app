import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuração para servir arquivos estáticos do PDF.js e WebViewer
  async headers() {
    return [
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

    return config;
  },
};

export default nextConfig;
