import { useState, type FormEvent } from 'react'
import type { AuthUser } from '../types/auth'
import api, { getApiError } from '../api/axios'

function AdminLoginPage({ onSignIn }: { onSignIn: (user: AuthUser) => void }) {
    const [showPassword, setShowPassword] = useState(false)
    const [message, setMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setIsSubmitting(true)
        setMessage('')

        try {
            const { data } = await api.post('/auth/login', { email: form.get('email'), password: form.get('password') })
            onSignIn(data.user)
        } catch (error) {
            setMessage(getApiError(error, 'Unable to reach Fixora. Please try again shortly.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="min-h-screen bg-[#f3f3f4] p-3 font-sans text-[#17181b] sm:p-5">
            <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1440px] overflow-hidden rounded-[26px] bg-[#f7f7f8] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[0.9fr_1.1fr]">
                <section className="flex items-center justify-center px-7 py-12 sm:px-12 lg:px-16 xl:px-24">
                    <div className="w-full max-w-[360px]">
                        <div className="mb-12 inline-flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-[#191a1d]">
                            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#171719] text-sm font-bold text-white">F</span>
                            Fixora
                        </div>

                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#777982]">Administrator access</p>
                        <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#17181b]">Sign in</h1>
                        <p className="mb-8 mt-2 text-[13px] leading-5 text-[#777982]">Sign in to manage your repair jobs and business operations.</p>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <label className="block text-[11px] font-semibold text-[#303137]">
                                Email address
                                <span className="relative mt-2 block">
                                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#858791]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="m5 7 7 5.5L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <input
                                        className="h-11 w-full rounded-[10px] border border-[#e7e7e9] bg-white pl-10 pr-3 text-[12px] font-normal text-[#222329] outline-none transition placeholder:text-[#a0a1a8] focus:border-[#171719] focus:ring-2 focus:ring-[#171719]/10"
                                        type="email"
                                        name="email"
                                        placeholder="admin@fixora.com"
                                        autoComplete="username"
                                        required
                                    />
                                </span>
                            </label>

                            <label className="block text-[11px] font-semibold text-[#303137]">
                                Password
                                <span className="relative mt-2 block">
                                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#858791]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        <circle cx="12" cy="15" r="1" fill="currentColor" />
                                    </svg>
                                    <input
                                        className="h-11 w-full rounded-[10px] border border-[#e7e7e9] bg-white pl-10 pr-16 text-[12px] font-normal tracking-[0.12em] text-[#222329] outline-none transition placeholder:text-[#a0a1a8] focus:border-[#171719] focus:ring-2 focus:ring-[#171719]/10"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#777982] hover:text-[#332773]"
                                        type="button"
                                        onClick={() => setShowPassword((visible) => !visible)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </span>
                            </label>

                            <div className="flex items-center justify-between pt-0.5 text-[11px]">
                                <label className="inline-flex items-center gap-2 text-[#44454b]">
                                    <input className="h-3.5 w-3.5 rounded border-[#c9c9ce] accent-[#171719]" type="checkbox" name="remember" />
                                    Remember me
                                </label>
                                <button className="font-medium text-[#55565d] hover:text-[#171719]" type="button" onClick={() => setMessage('Contact your system administrator to reset your password.')}>Forgot password?</button>
                            </div>

                            <button className="h-11 w-full rounded-[10px] bg-[#171719] text-[12px] font-semibold text-white transition hover:bg-[#303034] focus:outline-none focus:ring-2 focus:ring-[#171719] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Signing in…' : 'Sign in'}
                            </button>
                            <p className="min-h-4 text-[11px] text-[#777982]" role="status" aria-live="polite">{message}</p>
                        </form>

                        <p className="mt-9 text-[10px] text-[#9899a0]">Fixora Admin <span className="px-1.5">/</span> Secure workspace</p>
                    </div>
                </section>

                <aside className="relative isolate hidden min-h-[520px] overflow-hidden rounded-[22px] bg-[#080809] text-white lg:block" aria-label="Fixora admin introduction">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                        <div className="absolute -right-20 -top-16 h-[370px] w-[460px] rotate-[-42deg] border-l-[18px] border-[#303033] opacity-80" />
                        <div className="absolute right-[-100px] top-[20px] h-[330px] w-[460px] rotate-[-42deg] border-l-[7px] border-[#737b79] opacity-70" />
                        <div className="absolute right-[-120px] top-[58px] h-[330px] w-[460px] rotate-[-42deg] border-l-[3px] border-[#4d5555] opacity-80" />
                        <span className="absolute left-[9%] top-[3%] select-none text-[300px] font-black leading-none tracking-[-0.1em] text-[#252527]">F</span>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080809] via-[#080809]/90 to-transparent" />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10 xl:p-14">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c2c2c5]">Fixora <span className="px-1 text-[#77777c]">/</span> Admin workspace</p>
                        <h2 className="max-w-[460px] text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] xl:text-[38px]">Your entire repair business, in sync.</h2>
                        <p className="mt-3 max-w-[410px] text-[12px] leading-5 text-[#a3a2aa]">Manage repair jobs, inventory, purchasing, and billing across every branch, from customer intake through handover.</p>

                        <div className="mt-8 flex items-center justify-between gap-4 rounded-[18px] border border-white/[0.06] bg-[#29292b] px-5 py-5 sm:px-6 sm:py-6">
                            <div>
                                <p className="m-0 text-[15px] font-semibold leading-5">Repairs. Inventory. Billing.</p>
                                <p className="mb-0 mt-2 max-w-[250px] text-[11px] leading-[1.6] text-[#c4c3c8]">Keep each job, stock movement, and customer handover connected.</p>
                            </div>
                            <div className="hidden shrink-0 items-center -space-x-2 sm:flex" aria-label="Team">
                                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#29292b] bg-[#d8c4aa] text-[9px] font-bold text-[#322820]">AM</span>
                                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#29292b] bg-[#8eb7a8] text-[9px] font-bold text-[#17382d]">JS</span>
                                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#29292b] bg-[#c9b8ed] text-[9px] font-bold text-[#30234b]">RK</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    )
}

export default AdminLoginPage
