import { Button, Center, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()

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

  return (
    <Center minH="100vh">
      <VStack gap={6}>
        <Heading size="2xl">Smart Display</Heading>
        <Text color="fg.muted">Oslo clothing recommendations</Text>
        <Button onClick={signIn} size="lg" colorPalette="blue">
          Sign in with Google
        </Button>
      </VStack>
    </Center>
  )
}
