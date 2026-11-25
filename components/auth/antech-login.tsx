"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { FaFacebook, FaGithub } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import { useToast } from "@/components/ui/toaster"
import { loginWithCredentials } from "@/lib/auth-client"
import { startGoogleAuth } from "@/lib/google-auth-client"
import {
  extractProfileTypeFromProfile,
  persistActiveAccountRole,
  resolveAccountRole,
  type AccountRole,
} from "@/lib/account-role"
import { fetchProfile } from "@/lib/profile-client"
import { extractUserIdFromJwt } from "@/lib/jwt-user-id"

const DEFAULT_REDIRECT = "/"

function AntechIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="relative z-10 h-full w-full max-h-[170px]"
      aria-hidden
    >
      <defs>
        <linearGradient id="chair" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ff7a59" />
          <stop offset="1" stopColor="#ff5f3d" />
        </linearGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* Clouds */}
      <ellipse cx="70" cy="40" rx="22" ry="10" fill="white" opacity="0.9" />
      <ellipse cx="88" cy="38" rx="16" ry="9" fill="white" opacity="0.9" />
      <ellipse cx="230" cy="28" rx="18" ry="8" fill="white" opacity="0.8" />
      <ellipse cx="246" cy="26" rx="14" ry="8" fill="white" opacity="0.8" />
      {/* Decorative dots */}
      <circle cx="40" cy="70" r="3" fill="white" opacity="0.6" />
      <circle cx="280" cy="60" r="4" fill="#fbbf24" opacity="0.8" />
      <circle cx="60" cy="150" r="3" fill="white" opacity="0.5" />
      {/* Chair base */}
      <ellipse cx="190" cy="150" rx="48" ry="10" fill="#1e40af" opacity="0.25" />
      {/* Chair */}
      <path
        d="M150 110 L170 150 L210 150 L190 110 Z"
        fill="url(#chair)"
        opacity="0.9"
      />
      <rect x="148" y="95" width="44" height="16" rx="8" fill="#ff6b3d" />
      <rect x="156" y="88" width="28" height="10" rx="5" fill="#ff7f50" />
      {/* Person */}
      <circle cx="170" cy="78" r="16" fill="#f5c7a3" />
      {/* Hair */}
      <path
        d="M156 68 C160 58 180 56 184 68 C186 76 182 84 174 86 C164 88 154 82 156 68Z"
        fill="#1f2937"
      />
      {/* Body */}
      <path
        d="M158 92 L162 110 L178 110 L182 92 Q170 86 158 92Z"
        fill="url(#shirt)"
      />
      {/* Arms */}
      <path d="M156 98 L146 110 L150 118 L162 106 Z" fill="#f5c7a3" />
      <path d="M184 98 L194 110 L190 118 L178 106 Z" fill="#f5c7a3" />
      {/* Legs */}
      <rect x="164" y="110" width="8" height="14" rx="4" fill="#1e3a8a" />
      <rect x="174" y="110" width="8" height="14" rx="4" fill="#1e40af" />
      {/* Floating element */}
      <circle cx="130" cy="70" r="10" fill="#fbbf24" opacity="0.9" />
      <circle cx="132" cy="68" r="4" fill="white" opacity="0.6" />
    </svg>
  )
}

const RECENT_USERS = [
  { name: "John peter", active: "Active 1 days ago", initials: "JP" },
  { name: "Alina shmon", active: "Active 4 days ago", initials: "AS" },
]

export function AntechLogin() {
  const toast = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  )

  const validate = useCallback(() => {
    const newErrors: { email?: string; password?: string } = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      newErrors.email = "Digite o seu email ou nome de utilizador."
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail) && !/^[a-zA-Z0-9._-]+$/.test(trimmedEmail)) {
        newErrors.email = "Introduza um email ou nome de utilizador válido."
      }
    }

    if (!password) {
      newErrors.password = "Digite a sua palavra-passe."
    } else if (password.length < 6) {
      newErrors.password = "A palavra-passe deve ter pelo menos 6 caracteres."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [email, password])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!validate()) {
        toast.error("Verifique os campos e tente novamente.")
        return
      }

      setIsLoading(true)
      try {
        const result = await loginWithCredentials({
          email: email.trim(),
          password,
        })

        if (result.success) {
          if (typeof window !== "undefined") {
            const token = result.data.token ?? result.data.accessToken
            if (token) window.sessionStorage.setItem("auth_token", token)
            if (result.data.refreshToken) {
              window.sessionStorage.setItem(
                "refresh_token",
                result.data.refreshToken
              )
            }
            const u = result.data.user
            const apiUser = u as { user_id?: string; avatar?: string } | undefined
            const resolvedId =
              u?.id?.trim() ||
              apiUser?.user_id?.trim() ||
              (token ? extractUserIdFromJwt(token) : null) ||
              ""
            const userData = {
              id: resolvedId,
              user_id: resolvedId,
              name: u?.name ?? email.trim().split("@")[0],
              email: u?.email ?? email.trim(),
              image: apiUser?.avatar ?? u?.image,
            }
            window.sessionStorage.setItem("user_data", JSON.stringify(userData))

            if (token) {
              const profileOutcome = await fetchProfile(token, resolvedId)
              let resolvedRole: AccountRole | null = null
              if (profileOutcome.success) {
                const profileType = extractProfileTypeFromProfile(
                  profileOutcome.data
                )
                resolvedRole = resolveAccountRole(profileType)
              }
              if (!resolvedRole) {
                resolvedRole = resolveAccountRole(result.data.user?.profileType)
              }
              if (resolvedRole) persistActiveAccountRole(resolvedRole)
            }
          }
          toast.success("Login realizado com sucesso.")
          window.location.href = DEFAULT_REDIRECT
          return
        }

        toast.error(result.error)
      } catch {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, toast, validate]
  )

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true)
    try {
      const outcome = await startGoogleAuth(DEFAULT_REDIRECT)
      if (outcome.success) {
        window.location.href = outcome.url
        return
      }
      toast.error(outcome.error)
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleSocialClick = useCallback(
    (provider: "facebook" | "github") => {
      toast.info(
        `Autenticação com ${provider === "facebook" ? "Facebook" : "GitHub"} será integrada em breve.`
      )
    },
    [toast]
  )

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-[#f8f9fb] to-[#f1f3f6]">
      <div className="flex min-h-screen w-full flex-col">
        {/* Top banner */}
        <div className="relative h-[38vh] min-h-[260px] w-full bg-[#0789ED]">
          <div className="absolute left-6 top-6 sm:left-10 sm:top-8 lg:left-16 lg:top-10">
            <span className="text-base font-bold tracking-wide text-white sm:text-lg">
              ANTech
            </span>
          </div>

          <div className="absolute left-6 top-20 max-w-[360px] sm:left-10 sm:top-[88px] lg:left-16 lg:top-[104px]">
            <p className="text-[18px] font-semibold text-white sm:text-[22px]">
              Sign in to
            </p>
            <p className="mt-1 text-[13px] text-white/90 sm:text-[14px]">
              Lorem Ipsum is simply
            </p>
            <p className="mt-3 hidden max-w-[320px] text-[8px] leading-[11px] text-white/90 md:block">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been the industry's standard dummy text
              ever since the 1500s, when an unknown printer took a galley of type
              and scrambled it to make a type specimen book.
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex h-[200px] items-end justify-center sm:h-[230px] lg:h-[260px]">
            <div className="h-full w-[320px] sm:w-[380px] lg:w-[440px]">
              <AntechIllustration />
            </div>
          </div>
        </div>

        {/* Bottom area */}
        <div className="relative flex flex-1 flex-col px-6 pb-10 pt-10 sm:px-10 lg:flex-row lg:items-start lg:justify-between lg:px-16">
          <div className="flex flex-col gap-4 lg:w-[55%]">
            <div>
              <p className="text-[14px] font-medium text-slate-900">Login as</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {RECENT_USERS.map((user) => (
                <button
                  key={user.name}
                  type="button"
                  className="relative flex w-[170px] flex-col items-start gap-2 rounded-xl bg-[#f0f7ff] px-4 py-3.5 text-left transition hover:bg-[#e6f2ff]"
                >
                  <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-[#b6d7ff]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0789ED]" />
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-semibold text-[#1d4ed8]">
                    {user.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {user.active}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Login card */}
          <div className="relative z-20 -mt-40 w-full self-end rounded-[19px] bg-white shadow-[0_60px_90px_-60px_rgba(15,23,42,0.8)] sm:-mt-44 sm:w-[310px] lg:absolute lg:-top-[150px] lg:right-16 lg:mt-0">
            <div className="flex flex-col gap-4 p-[24px]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-slate-900">
                    Welcome to <span className="text-[#0789ED]">LOREM</span>
                  </p>
                  <p className="mt-1 text-[30px] font-semibold leading-none text-slate-900">
                    Sign in
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">No Account ?</p>
                  <Link
                    href="/auth/register"
                    className="text-[10px] font-medium text-[#0789ED] hover:underline"
                  >
                    Sign up
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex h-[36px] flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#f0f7ff] text-[11px] font-medium text-slate-700 transition hover:bg-[#e6f2ff] disabled:opacity-60"
                >
                  <FcGoogle className="h-4 w-4" />
                  Sign in with Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialClick("facebook")}
                  disabled={isLoading}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] bg-[#f0f7ff] text-[#1877f2] transition hover:bg-[#e6f2ff] disabled:opacity-60"
                  aria-label="Sign in with Facebook"
                >
                  <FaFacebook className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialClick("github")}
                  disabled={isLoading}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] bg-[#f5f5f5] text-slate-900 transition hover:bg-[#ececec] disabled:opacity-60"
                  aria-label="Sign in with GitHub"
                >
                  <FaGithub className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-600">
                    Enter your username or email address
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    placeholder="Username or email address"
                    className={`h-[30px] rounded-[5px] border px-2 text-[12px] outline-none transition focus:ring-1 focus:ring-[#6B9CFF]/40 ${
                      errors.email
                        ? "border-red-400"
                        : "border-[#6B9CFF]"
                    }`}
                    disabled={isLoading}
                  />
                  {errors.email ? (
                    <p className="text-[9px] text-red-500">{errors.email}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-600">
                    Enter your Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password)
                          setErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      placeholder="Password"
                      className={`h-[30px] w-full rounded-[5px] border px-2 pr-7 text-[12px] outline-none transition focus:ring-1 focus:ring-[#6B9CFF]/40 ${
                        errors.password
                          ? "border-red-400"
                          : "border-slate-200"
                      }`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={
                        showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-[9px] text-red-500">{errors.password}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <Link
                      href="/auth/forgotpassword"
                      className="text-[10px] text-[#0789ED] hover:underline"
                    >
                      Forgot Password
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 h-[29px] w-full rounded-[5px] bg-[#0789ED] text-[12px] font-medium text-white shadow-[0_12px_34px_-18px_rgba(7,137,237,1)] transition hover:bg-[#0679d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0789ED]/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
