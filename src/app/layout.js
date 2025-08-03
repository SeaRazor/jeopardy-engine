import "./globals.css";
import Menu from "./UI/Menu";
import Providers from "./providers";
import { ThemeProvider } from "./util/ThemeContext";

export const metadata = {
  title: "NextJS App",
  description: "A clean NextJS application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ThemeProvider>
          <Providers>
            <Menu />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
