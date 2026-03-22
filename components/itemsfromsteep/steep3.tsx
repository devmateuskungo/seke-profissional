"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { CreditCard, Upload, Camera } from "lucide-react"
import { lightTheme } from "@/style"

interface DocumentStepProps {
    documentoFrente: string | null
    documentoVerso: string | null
    onDocumentoFrente: (e: React.ChangeEvent<HTMLInputElement>) => void
    onDocumentoVerso: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function DocumentStep({ 
    documentoFrente, 
    documentoVerso, 
    onDocumentoFrente, 
    onDocumentoVerso 
}: DocumentStepProps) {
    return (
        <div className="flex flex-col gap-6">
            {/* Título da etapa */}
            <div className="text-left">
                
                <h3 className="text-xl font-semibold text-gray-800">
                    Envio do Documento de Identificação
                </h3>
                <p className="text-sm text-gray-500 mt-1 mx-auto">
                    Para continuar, precisamos verificar sua identidade. 
                    Envie uma foto nítida do seu documento (frente e verso).
                </p>
            </div>

            {/* Cards de upload em coluna */}
            <div className="flex flex-col gap-4 w-full  mx-auto">
                {/* Card Frente */}
                <Card 
                    className="w-full"
                    style={{ 
                        borderColor: documentoFrente ? lightTheme.colors.primary : "#e2e8f0",
                    }}
                >
                    <CardContent className="p-4">
                        <label 
                            htmlFor="documento-frente" 
                            className="cursor-pointer block"
                        >
                            <div className="flex flex-col items-center justify-center h-40 bg-linear-to-br from-gray-50 to-stone-100 rounded-lg p-4">
                                {documentoFrente ? (
                                    <div className="relative w-full h-36">
                                        <Image
                                            src={documentoFrente}
                                            alt="Frente do documento"
                                            fill
                                            unoptimized
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                            <Upload size={28} className="text-[#18B481]" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-800">
                                            Clique para enviar a FRENTE
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Clique aqui ou arraste a imagem
                                        </p>
                                    </>
                                )}
                            </div>
                        </label>

                        <input
                            type="file"
                            id="documento-frente"
                            accept="image/*"
                            className="hidden"
                            onChange={onDocumentoFrente}
                        />
                    </CardContent>
                </Card>

                {/* Card Verso */}
                <Card 
                    className="w-full "
                    style={{ 
                        borderColor: documentoVerso ? lightTheme.colors.primary : "#e2e8f0",
                    }}
                >
                    <CardContent className="p-4">
                        <label 
                            htmlFor="documento-verso" 
                            className="cursor-pointer block"
                        >
                            <div className="flex flex-col items-center justify-center h-40 bg-linear-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                                {documentoVerso ? (
                                    <div className="relative w-full h-36">
                                        <Image
                                            src={documentoVerso}
                                            alt="Verso do documento"
                                            fill
                                            unoptimized
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                                            <Camera size={28} className="text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-600">
                                            Clique para enviar o VERSO
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Clique aqui ou arraste a imagem
                                        </p>
                                    </>
                                )}
                            </div>
                        </label>

                        <input
                            type="file"
                            id="documento-verso"
                            accept="image/*"
                            className="hidden"
                            onChange={onDocumentoVerso}
                        />
                    </CardContent>
                </Card>
            </div>

        </div>
    )
}