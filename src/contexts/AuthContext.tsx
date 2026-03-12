import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  type User,
  type ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPhoneNumber,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  sendEmailSignInLink: (email: string) => Promise<void>;
  signInWithPhone: (phone: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Detect and auto-complete email link sign-in when the user returns from
    // clicking the magic link in their inbox. The URL contains auth params
    // (oobCode, apiKey, mode=signIn) that isSignInWithEmailLink recognises.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem('emailForSignIn')
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => window.localStorage.removeItem('emailForSignIn'))
          .catch(() => {})
      }
      // If no email in localStorage (link opened in a different browser),
      // LoginPage detects the sign-in link and shows a re-entry prompt.
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const sendEmailSignInLink = async (email: string) => {
    await sendSignInLinkToEmail(auth, email, {
      // After clicking the link, the user lands back here.
      // window.location.origin works for both dev (localhost:5173) and production.
      url: window.location.origin + '/login',
      handleCodeInApp: true,
    })
    // Save the email so we can retrieve it when the user returns via the link.
    // localStorage persists across page loads in the same browser/device.
    window.localStorage.setItem('emailForSignIn', email)
  }

  const signInWithPhone = (phone: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    return signInWithPhoneNumber(auth, phone, appVerifier)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, sendEmailSignInLink, signInWithPhone }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { RecaptchaVerifier }
