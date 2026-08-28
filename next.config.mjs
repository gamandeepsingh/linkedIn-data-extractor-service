/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // mongodb pulls in a bunch of optional peer deps (kerberos, aws4, snappy...) that
  // we never use. Leaving them external keeps the Vercel bundle from choking on them.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
