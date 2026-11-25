import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Esconde o indicador do Next (canto inferior esquerdo) no `next dev`. Ele nunca aparece
  // em produção (`next build` + `next start`); erros de compilação/runtime continuam sendo
  // exibidos no overlay do dev mesmo com isto desligado.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
