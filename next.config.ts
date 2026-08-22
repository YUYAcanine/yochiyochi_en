/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発サーバーへLAN内の別端末(例: スマホ)からアクセスして動作確認するための許可設定。
  // next dev にのみ影響し、本番ビルド/デプロイ版には影響しない。
  allowedDevOrigins: ["192.168.50.220"],
};

module.exports = nextConfig;

