import "./globals.css";
import Menu from "./UI/Menu";

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
        <Menu />
        {children}
      </body>
    </html>
  );
}
