"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { lightTheme } from "@/style/light"
import { Check } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Categorias e seus respectivos serviços
const categoriasEServicos = {
    "Construção e Reparos": [
        "Encanador",
        "Eletricista",
        "Pintor",
        "Pedreiro",
        "Marceneiro",
        "Gesseiro",
        "Vidraceiro",
        "Chaveiro"
    ],
    "Limpeza e Conservação": [
        "Diarista",
        "Jardineiro",
        "Limpeza pós-obra"
    ],
    "Cuidados Pessoais": [
        "Manicure",
        "Cabeleireiro",
        "Personal Trainer",
        "Babá",
        "Cuidador de Idosos"
    ],
    "Educação e Aulas": [
        "Professor Particular",
        "Aulas de Música",
        "Aulas de Idiomas",
        "Reforço Escolar"
    ],
    "Tecnologia": [
        "Técnico de Informática",
        "Designer Gráfico",
        "Fotógrafo",
        "Instalador de Ar Condicionado"
    ],
    "Eventos": [
        "Fotógrafo",
        "Garçom",
        "Segurança",
        "Som e Iluminação"
    ]
}

export function AddressStep() {
    const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("")
    const [servicosFiltrados, setServicosFiltrados] = useState<string[]>([])

    const handleCategoriaChange = (categoria: string) => {
        setCategoriaSelecionada(categoria)
        setServicosFiltrados(categoriasEServicos[categoria as keyof typeof categoriasEServicos] || [])
    }

    const toggleServico = (servico: string) => {
        setServicosSelecionados(prev => 
            prev.includes(servico)
                ? prev.filter(s => s !== servico)
                : [...prev, servico]
        )
    }

    const adicionarServicoSelecionado = () => {
        // Aqui você pode adicionar lógica adicional se necessário
        setCategoriaSelecionada("")
        setServicosFiltrados([])
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Seção de Endereço */}
            <div className="flex flex-col gap-4">
                <Label className="text-base font-semibold">Endereço de Atendimento</Label>
                
                <div className="grid gap-2">
                    <Label htmlFor="WhatsApp">WhatsApp</Label>
                    <Input id="WhatsApp" type="tel" placeholder="(+244) 000-000-000" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input id="endereco" placeholder="Rua, Av, etc" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input id="cidade" placeholder="Sua cidade" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="Bairro">Bairro</Label>
                        <Input id="Bairro" placeholder="Bairro" />
                    </div>
                </div>
                
               
            </div>

            {/* Seção de Seleção de Serviços */}
            <div className="flex flex-col gap-3">
                <div>
                    <Label className="text-base font-semibold">Serviços</Label>
                    <p className="text-sm text-gray-500 mt-1">
                        Selecione os serviços que você oferece por categoria
                    </p>
                </div>

                {/* Select de Categorias - com mesma largura dos inputs */}
                <div className="grid gap-2 w-full">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select onValueChange={handleCategoriaChange} value={categoriaSelecionada}>
                        <SelectTrigger id="categoria" className="w-full">
                            <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                            {Object.keys(categoriasEServicos).map((categoria) => (
                                <SelectItem key={categoria} value={categoria}>
                                    {categoria}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Serviços da Categoria Selecionada */}
                {categoriaSelecionada && servicosFiltrados.length > 0 && (
                    <div className="mt-2">
                        <Label className="text-sm text-gray-600 mb-2 block">
                            Serviços disponíveis em {categoriaSelecionada}:
                        </Label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                            {servicosFiltrados.map((servico) => {
                                const isSelected = servicosSelecionados.includes(servico)
                                
                                return (
                                    <Button
                                        key={servico}
                                        type="button"
                                        variant="outline"
                                        className={`
                                            h-auto py-2 px-3
                                            ${isSelected ? 'border-2' : 'border'}
                                            transition-all duration-200
                                        `}
                                        style={{
                                            borderColor: isSelected ? lightTheme.colors.primary : lightTheme.colors.border,
                                            backgroundColor: 'transparent',
                                            color: isSelected ? lightTheme.colors.primary : 'inherit'
                                        }}
                                        onClick={() => toggleServico(servico)}
                                    >
                                        <span className="flex items-center gap-2">
                                            {isSelected && <Check size={16} />}
                                            {servico}
                                        </span>
                                    </Button>
                                )
                            })}
                        </div>
                        <Button 
                            type="button"
                            variant="ghost"
                            className="mt-2 text-sm"
                            onClick={adicionarServicoSelecionado}
                        >
                            + Adicionar mais serviços de outra categoria
                        </Button>
                    </div>
                )}
                
                {/* Serviços Selecionados */}
                {servicosSelecionados.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Serviços selecionados ({servicosSelecionados.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {servicosSelecionados.map((servico) => (
                                <span
                                    key={servico}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-full text-sm"
                                    style={{ borderColor: lightTheme.colors.primary }}
                                >
                                    {servico}
                                    <button
                                        type="button"
                                        onClick={() => toggleServico(servico)}
                                        className="ml-1 text-gray-500 hover:text-red-500 focus:outline-none"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}