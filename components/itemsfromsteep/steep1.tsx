"use client"

import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Upload } from "lucide-react"

interface PersonalDataStepProps {
    fotoPreview: string | null
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function PersonalDataStep({ fotoPreview, onImageUpload }: PersonalDataStepProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center mb-2">
                <div className="relative w-24 h-24 group">
                    <label htmlFor="foto" className="cursor-pointer block w-full h-full">
                        <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-primary transition-colors bg-linear-to-br from-gray-50 to-stone-100 flex items-center justify-center">

                            {fotoPreview ? (
                                <Image
                                    src={fotoPreview}
                                    alt="Foto do usuário"
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center">
                                    <User size={40} className="text-primary/60" />
                                    <span className="text-[10px] text-primary/40 font-medium mt-1">
                                        Foto
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Overlay hover */}
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/80 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                            <div className="text-white transform scale-90 group-hover:scale-100 transition-all flex flex-col items-center">
                                <Upload size={20} />
                                <span className="text-[8px] font-medium mt-0.5">
                                    Upload
                                </span>
                            </div>
                        </div>
                    </label>

                    <input
                        type="file"
                        id="foto"
                        accept="image/*"
                        className="hidden"
                        onChange={onImageUpload}
                    />
                </div>
            </div>

            <p className="text-center text-xs text-gray-500 mb-2">
                Clique na imagem para adicionar uma foto de perfil
            </p>

            <div className="grid gap-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" placeholder="Digite seu nome completo" />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(00) 00000-0000" />
            </div>
        </div>
    )
}