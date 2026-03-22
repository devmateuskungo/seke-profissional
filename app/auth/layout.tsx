

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white">
      {/* Lado esquerdo - Formulário */}
      
      <div className="flex w-full md:w-1/2 items-center justify-center  px-6">
        {children}
      </div>

      {/* Lado direito - Imagem e Boas-vindas */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-6">
        <div className="w-full h-full bg-[url('/image-background.png')] bg-cover bg-center bg-no-repeat rounded-2xl overflow-hidden flex items-center justify-center">
          <div className="p-8 text-white max-w-md rounded-xl">
           
          </div>
        </div>
      </div>
    </div>
  );
}
