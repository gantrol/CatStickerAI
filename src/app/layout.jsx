import "./globals.css";
import { Inter } from "next/font/google";
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: '猫猫贴纸：自动遮挡隐私',
  description: '利用AI，用猫咪贴纸挡住你的隐私',
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
