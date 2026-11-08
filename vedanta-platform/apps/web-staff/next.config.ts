import type { NextConfig } from "next";
const config: NextConfig = { output: "export", trailingSlash: true, images: { unoptimized: true }, basePath: "/pocket" };
export default config;
