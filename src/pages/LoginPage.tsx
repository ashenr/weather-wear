import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Center,
  Field,
  Heading,
  HStack,
  Input,
  PinInput,
  Separator,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Navigate } from 'react-router-dom'
import { FcGoogle } from 'react-icons/fc'
import { MdOutlineEmail, MdOutlinePhone } from 'react-icons/md'
import { isSignInWithEmailLink, signInWithEmailLink, type ConfirmationResult } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth, RecaptchaVerifier } from '../contexts/AuthContext'
import { BrandLogo } from '../components/BrandLogo'
import { APP_NAME } from '../config'

type Mode = 'choose' | 'email' | 'phone'

export function LoginPage() {
  const { user, loading, signIn, sendEmailSignInLink, signInWithPhone } = useAuth()

  const [mode, setMode] = useState<Mode>('choose')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  // True when the user opened the sign-in link in a different browser/device
  // (localStorage had no email, so AuthContext couldn't auto-complete)
  const [needsEmailForLink, setNeedsEmailForLink] = useState(false)
  const [phone, setPhone] = useState('+47 ')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpValue, setOtpValue] = useState<string[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Invisible reCAPTCHA is attached to this div
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    // Detect the "different browser" edge case: the URL is a sign-in link but
    // AuthContext couldn't auto-complete it because localStorage had no email.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = window.localStorage.getItem('emailForSignIn')
      if (!savedEmail) {
        setMode('email')
        setNeedsEmailForLink(true)
      }
      // If savedEmail exists, AuthContext already called signInWithEmailLink
      // and onAuthStateChanged will fire shortly — no action needed here.
    }
  }, [])

  useEffect(() => {
    return () => {
      recaptchaVerifierRef.current?.clear()
    }
  }, [])

  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleEmailSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      if (needsEmailForLink) {
        // Complete the sign-in: the user re-entered their email after opening
        // the link in a different browser where localStorage had no email.
        await signInWithEmailLink(auth, normalizedEmail, window.location.href)
        window.localStorage.removeItem('emailForSignIn')
      } else {
        await sendEmailSignInLink(normalizedEmail)
        setEmailSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendCode = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    if (phone.trim().replace(/\D/g, '').length < 7) {
      setError('Please enter a valid phone number including country code.')
      return
    }
    setSubmitting(true)
    try {
      // Clear any previous verifier before creating a new one
      recaptchaVerifierRef.current?.clear()
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
        size: 'invisible',
      })
      recaptchaVerifierRef.current = verifier
      const result = await signInWithPhone(phone.trim(), verifier)
      setConfirmationResult(result)
    } catch (err) {
      recaptchaVerifierRef.current?.clear()
      recaptchaVerifierRef.current = null
      setError(err instanceof Error ? err.message : 'Failed to send code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpComplete = async (values: string[]) => {
    if (!confirmationResult) return
    setError('')
    setSubmitting(true)
    try {
      await confirmationResult.confirm(values.join(''))
      // onAuthStateChanged fires → user is set → <Navigate to="/" /> renders
    } catch {
      setError('Invalid code. Please check and try again.')
      setOtpValue([])
      setSubmitting(false)
    }
  }

  // ── Shared card wrapper ──────────────────────────────────────────────────────
  const card = (content: React.ReactNode) => (
    <Center minH="100vh" bg="bg.subtle">
      <VStack gap={8} p={10} bg="white" borderRadius="3xl" boxShadow="sm" maxW="md" w="full" mx={4}>
        <VStack gap={4}>
          <BrandLogo width="64" height="64" />
          <Heading size="3xl" color="brand.navy" letterSpacing="tighter">{APP_NAME}</Heading>
          <Text color="fg.muted" textAlign="center" fontSize="lg">
            What should you wear today?
          </Text>
        </VStack>
        {content}
      </VStack>
    </Center>
  )

  // ── Mode: choose ─────────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return card(
      <VStack gap={3} w="full">
        <Button onClick={signIn} size="xl" w="full" borderRadius="xl" bg="brand.navy" color="white" _hover={{ opacity: 0.9 }}>
          <FcGoogle size={24} />
          Sign in with Google
        </Button>
        <HStack w="full" gap={3} py={1}>
          <Separator flex="1" />
          <Text color="fg.subtle" fontSize="xs">or continue with</Text>
          <Separator flex="1" />
        </HStack>
        <Button onClick={() => { setMode('email'); setError('') }} size="xl" variant="outline" w="full" colorPalette="gray" borderRadius="xl">
          <MdOutlineEmail size={24} />
          Email link
        </Button>
        <Button onClick={() => { setMode('phone'); setError('') }} size="xl" variant="outline" w="full" colorPalette="gray" borderRadius="xl">
          <MdOutlinePhone size={24} />
          Phone
        </Button>
      </VStack>
    )
  }

  // ── Mode: email ──────────────────────────────────────────────────────────────
  if (mode === 'email') {
    if (emailSent) {
      return card(
        <VStack gap={4} w="full" textAlign="center">
          <Text fontSize="lg" fontWeight="medium">Check your email</Text>
          <Text color="fg.muted">
            We sent a sign-in link to <strong>{email}</strong>. Click the link to sign in.
          </Text>
          <Button variant="ghost" size="sm" onClick={() => { setEmailSent(false); setError('') }}>
            Use a different email
          </Button>
        </VStack>
      )
    }

    return card(
      <VStack gap={4} w="full" as="form" onSubmit={handleEmailSubmit}>
        {needsEmailForLink && (
          <Text color="fg.muted" fontSize="sm" textAlign="center">
            Please re-enter your email address to complete sign-in.
          </Text>
        )}
        <Field.Root invalid={!!error} w="full">
          <Field.Label>Email address</Field.Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <Field.ErrorText>{error}</Field.ErrorText>}
        </Field.Root>
        <Button type="submit" w="full" loading={submitting} borderRadius="xl">
          {needsEmailForLink ? 'Complete sign-in' : 'Send sign-in link'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setMode('choose'); setError(''); setNeedsEmailForLink(false) }}>
          Back
        </Button>
      </VStack>
    )
  }

  // ── Mode: phone ──────────────────────────────────────────────────────────────
  return card(
    <VStack gap={4} w="full">
      {/* Invisible reCAPTCHA mounts here */}
      <div ref={recaptchaContainerRef} />

      {!confirmationResult ? (
        <VStack gap={4} w="full" as="form" onSubmit={handleSendCode}>
          <Field.Root invalid={!!error} w="full">
            <Field.Label>Phone number</Field.Label>
            <Input
              type="tel"
              placeholder="+47 123 45 678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              autoFocus
            />
            {error && <Field.ErrorText>{error}</Field.ErrorText>}
          </Field.Root>
          <Button type="submit" w="full" loading={submitting} borderRadius="xl">
            Send code
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setMode('choose'); setError('') }}>
            Back
          </Button>
        </VStack>
      ) : (
        <VStack gap={4} w="full">
          <Text color="fg.muted" fontSize="sm" textAlign="center">
            Enter the 6-digit code sent to {phone.trim()}
          </Text>
          <Field.Root invalid={!!error}>
            <Center w="full">
              <PinInput.Root
                otp
                count={6}
                value={otpValue}
                onValueChange={e => setOtpValue(e.value)}
                onValueComplete={e => handleOtpComplete(e.value)}
                disabled={submitting}
              >
                <PinInput.HiddenInput />
                <PinInput.Control>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <PinInput.Input key={i} index={i} />
                  ))}
                </PinInput.Control>
              </PinInput.Root>
            </Center>
            {error && <Field.ErrorText>{error}</Field.ErrorText>}
          </Field.Root>
          <Button variant="ghost" size="sm" onClick={() => { setConfirmationResult(null); setOtpValue([]); setError('') }}>
            Resend code
          </Button>
        </VStack>
      )}
    </VStack>
  )
}
