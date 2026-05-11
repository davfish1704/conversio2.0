/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Google profile pictures (NextAuth Google login)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      // GitHub avatars
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Generic HTTPS avatars
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack: (config) => {
    // Suppress the "Critical dependency" warning from optional requires in AI provider SDKs
    config.module = config.module ?? {}
    config.module.exprContextCritical = false
    return config
  },
}

module.exports = nextConfig
