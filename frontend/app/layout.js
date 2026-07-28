import './globals.css';

export const metadata = {
  title: 'Data Intelligence — Text-to-SQL',
  description: 'Interface de Inteligência de Dados com conversão de linguagem natural para SQL utilizando Google Gemini 3 Flash e SQLite.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
