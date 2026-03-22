"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { lightTheme } from "@/style/light"
import { PersonalDataStep } from "@/components/itemsfromsteep/steep1"
import { AddressStep } from "@/components/itemsfromsteep/steep2"
import { DocumentStep } from "../itemsfromsteep/steep3"
import { ConfirmationStep } from "../itemsfromsteep/steep4"
import confetti from "canvas-confetti"

export function FormStepper() {
    const [currentStep, setCurrentStep] = useState<number>(1)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const [documentoFrente, setDocumentoFrente] = useState<string | null>(null)
    const [documentoVerso, setDocumentoVerso] = useState<string | null>(null)
    const [showConfetti, setShowConfetti] = useState<boolean>(false)

    const totalSteps = 4

    // Efeito para disparar confete quando chegar no último passo
    useEffect(() => {
        if (currentStep === totalSteps && !showConfetti) {
            //setShowConfetti(true)
            
            // Disparar confete em cascata
            const duration = 3 * 1000
            const animationEnd = Date.now() + duration
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

            function randomInRange(min: number, max: number) {
                return Math.random() * (max - min) + min
            }

            const interval: NodeJS.Timeout = setInterval(function() {
                const timeLeft = animationEnd - Date.now()

                if (timeLeft <= 0) {
                    return clearInterval(interval)
                }

                const particleCount = 50 * (timeLeft / duration)
                
                // Disparar confete dos dois lados da tela
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                })
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                })
            }, 250)

            // Disparar uma explosão inicial maior
            setTimeout(() => {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#26ccff', '#a25afd', '#ff5e7d', '#ffac46', '#5ef2a2']
                })
            }, 100)

            return () => clearInterval(interval)
        }
    }, [currentStep, totalSteps, showConfetti])

    // Resetar o estado do confete quando voltar para steps anteriores
    useEffect(() => {
        if (currentStep < totalSteps && showConfetti) {
            //setShowConfetti(false)
        }
    }, [currentStep, totalSteps, showConfetti])

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const imageUrl = URL.createObjectURL(file)
            setFotoPreview(imageUrl)
        }
    }

    const handleDocumentoFrente = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const imageUrl = URL.createObjectURL(file)
            setDocumentoFrente(imageUrl)
        }
    }

    const handleDocumentoVerso = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const imageUrl = URL.createObjectURL(file)
            setDocumentoVerso(imageUrl)
        }
    }

    const handleConfirm = () => {
        // Aqui você pode adicionar a lógica de envio do formulário
        console.log("Formulário confirmado!")
        // Disparar confete adicional ao confirmar
        confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.6 },
            colors: ['#26ccff', '#a25afd', '#ff5e7d', '#ffac46', '#5ef2a2']
        })
    }

    // cleanup do blob URL
    useEffect(() => {
        return () => {
            if (fotoPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(fotoPreview)
            }
            if (documentoFrente?.startsWith("blob:")) {
                URL.revokeObjectURL(documentoFrente)
            }
            if (documentoVerso?.startsWith("blob:")) {
                URL.revokeObjectURL(documentoVerso)
            }
        }
    }, [fotoPreview, documentoFrente, documentoVerso])

    return (
        <Card
            className="w-full max-w-6xl mx-auto"
            style={{
                borderRadius: lightTheme.borderRadius.medium,
                border: `1px solid ${lightTheme.colors.border}`,
            }}
        >
            <CardHeader>
                {/* Título indicativo do formulário */}
                <div className="mb-1 text-left">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Formulário de Cadastro
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Preencha os dados para completar seu cadastro
                    </p>
                </div>

                {/* Barra de progresso */}
                <div className="flex gap-1 w-full mb-1">
                    {[1, 2, 3, 4].map((step) => (
                        <div
                            key={step}
                            className="flex-1 transition-all duration-300"
                            style={{
                                height: "20px",
                                borderRadius: lightTheme.borderRadius.small,
                                backgroundColor:
                                    step <= currentStep
                                        ? lightTheme.colors.primary
                                        : lightTheme.colors.border,
                            }}
                        />
                    ))}
                </div>

            </CardHeader>

            <CardContent>
                {currentStep === 1 && (
                    <PersonalDataStep 
                        fotoPreview={fotoPreview}
                        onImageUpload={handleImageUpload}
                    />
                )}

                {currentStep === 2 && <AddressStep />}

                {currentStep === 3 && (
                    <DocumentStep 
                        documentoFrente={documentoFrente}
                        documentoVerso={documentoVerso}
                        onDocumentoFrente={handleDocumentoFrente}
                        onDocumentoVerso={handleDocumentoVerso}
                    />
                )}

                {currentStep === 4 && <ConfirmationStep />}
            </CardContent>

            <CardFooter className="flex justify-between gap-4">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="w-32"
                >
                    Voltar
                </Button>

                {currentStep === totalSteps ? (
                    <Button
                        onClick={handleConfirm}
                        className="w-32"
                        style={{ backgroundColor: lightTheme.colors.primary }}
                    >
                        Confirmar
                    </Button>
                ) : (
                    <Button
                        onClick={nextStep}
                        className="w-32"
                        style={{ backgroundColor: lightTheme.colors.primary }}
                    >
                        Avançar
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}