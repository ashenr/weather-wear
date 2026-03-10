import { Button, Center, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { Navigate } from 'react-router-dom'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../contexts/AuthContext'
import { BrandLogo } from '../components/BrandLogo'

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
    <Center minH="100vh" bg="bg.subtle">
      <VStack gap={8} p={10} bg="white" borderRadius="3xl" boxShadow="sm" maxW="md" w="full" mx={4}>
        <VStack gap={4}>
          <BrandLogo width="64" height="64" />
          <Heading size="3xl" color="brand.navy" letterSpacing="tighter">WeatherWear</Heading>
          <Text color="fg.muted" textAlign="center" fontSize="lg">
            Smarter daily outfit choices for any conditions.
          </Text>
        </VStack>
        
        <Button onClick={signIn} size="xl" variant="outline" w="full" colorPalette="gray" borderRadius="xl">
          <FcGoogle size={24} />
          Sign in with Google
        </Button>
      </VStack>
    </Center>
  )
}
