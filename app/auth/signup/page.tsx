"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { UserPlus, User, Hash, Mail, Lock } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email)) {
        setError("Please enter a valid email address format.")
        setIsLoading(false)
        return
      }

      const allowedDomains = [
        "gmail.com",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "icloud.com",
        "rediffmail.com",
        "protonmail.com",
        "edu.in",
        "ac.in",
        "edu",
      ]
      const emailDomain = email.split("@")[1]?.toLowerCase()

      const isAllowed =
        allowedDomains.some((domain) => emailDomain === domain || emailDomain.endsWith(domain))

      if (!isAllowed) {
        setError(
          "Please use a valid or college email address (e.g., Gmail, Outlook, or .edu/.ac.in domain)."
        )
        setIsLoading(false)
        return
      }
      
      if (studentId.length < 9) {
        setError("student ID must be at least 9 characters long.")
        setIsLoading(false)
        return
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            full_name: fullName,
            student_id: studentId,
          },
        },
      })
      if (error) throw error
      router.push("/auth/check-email")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-[#7dd3c0]" />
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center border-b border-white/10 pb-6">
            <CardTitle className="font-serif text-3xl text-white mb-2">
              Let's Connect Together
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Create your account to get started
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label 
                  htmlFor="fullName" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-neutral-600 focus:border-[#7dd3c0] focus:ring-[#7dd3c0]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="studentId" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  Student ID
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="123456789"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-neutral-600 focus:border-[#7dd3c0] focus:ring-[#7dd3c0]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@college.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-neutral-600 focus:border-[#7dd3c0] focus:ring-[#7dd3c0]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a secure password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-neutral-600 focus:border-[#7dd3c0] focus:ring-[#7dd3c0]/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#7dd3c0] hover:bg-[#7dd3c0]/90 text-black font-medium text-sm uppercase tracking-[0.1em] transition-all h-11"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-sm text-neutral-400">
                Already have an account?{" "}
                <Link 
                  href="/auth/login" 
                  className="text-[#7dd3c0] hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center mt-8 text-[9px] uppercase tracking-[0.2em] text-neutral-600">
          Join the Community
        </p>
      </div>
    </div>
  )
}